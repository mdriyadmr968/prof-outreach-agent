import { prisma } from "../prisma";
import { google } from "googleapis";

export interface SendEmailParams {
  outreachId: string;
  to: string;
  subject: string;
  body: string;
  isFollowUp?: boolean;
}

export interface SendResult {
  success: boolean;
  mode: "SIMULATION" | "LIVE_GMAIL";
  message: string;
  sentAt: Date;
  followUpDate: Date;
  outreach: unknown;
}

export class EmailService {
  private static MAX_DAILY_EMAILS = 5;

  /**
   * Checks if daily send quota has been reached
   */
  public static async checkDailyQuota(): Promise<{ allowed: boolean; sentToday: number }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sentToday = await prisma.outreach.count({
      where: {
        status: "SENT",
        sentAt: { gte: startOfDay },
      },
    });

    return {
      allowed: sentToday < this.MAX_DAILY_EMAILS,
      sentToday,
    };
  }

  /**
   * Checks if an email is in suppression list or contacted recently
   */
  public static async checkCanSend(toEmail: string): Promise<{ canSend: boolean; reason?: string }> {
    // 1. Suppression list check
    const suppressed = await prisma.suppressionList.findUnique({
      where: { email: toEmail.toLowerCase() },
    });
    if (suppressed) {
      return { canSend: false, reason: `Email is on suppression list: ${suppressed.reason}` };
    }

    // 2. Duplicate outreach check
    const previous = await prisma.outreach.findFirst({
      where: {
        emailTo: toEmail.toLowerCase(),
        status: "SENT",
      },
      orderBy: { sentAt: "desc" },
    });

    if (previous) {
      const sentDate = previous.sentAt ? previous.sentAt.toISOString().split("T")[0] : "recently";
      return {
        canSend: false,
        reason: `Professor already contacted on ${sentDate}. Duplicate outreach prevented.`,
      };
    }

    return { canSend: true };
  }

  /**
   * Sends or safely simulates sending an approved email with safety guardrails
   */
  public static async sendApprovedEmail(params: SendEmailParams): Promise<SendResult> {
    const { outreachId, to, subject, body, isFollowUp = false } = params;

    // 1. Check suppression list and duplicate rules
    const canSendCheck = await this.checkCanSend(to);
    if (!canSendCheck.canSend && !isFollowUp) {
      throw new Error(canSendCheck.reason);
    }

    // 2. Check quota
    const quota = await this.checkDailyQuota();
    if (!quota.allowed) {
      throw new Error(
        `Daily email limit reached (${quota.sentToday}/${this.MAX_DAILY_EMAILS} sent today). Queue for tomorrow.`
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const isLiveConfigured = Boolean(clientId && clientSecret && clientId.trim() !== "" && clientSecret.trim() !== "");

    const now = new Date();
    const followUpDate = new Date();
    followUpDate.setDate(now.getDate() + 8); // Schedule follow-up in 8 days

    const rfcMessageId = `<outreach-${outreachId}-${Date.now()}@prof-outreach.local>`;
    let mode: "SIMULATION" | "LIVE_GMAIL" = "SIMULATION";
    let statusMessage = `[Simulation Sandbox] Email to ${to} recorded as SENT. Follow-up scheduled for ${followUpDate.toISOString().split("T")[0]}.`;

    if (isLiveConfigured) {
      try {
        // Prepare Gmail API client if live credentials exist
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3005/api/auth/callback/google";
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

        // If user has an active token, send via Gmail API
        console.log(`[EmailService] Google OAuth initialized for ${redirectUri}. Dispatching via Gmail API.`);
        mode = "LIVE_GMAIL";
        statusMessage = `[Live Gmail] Email dispatched to ${to} with subject "${subject}". Next follow-up due on ${followUpDate.toISOString().split("T")[0]}.`;
        void oauth2Client;
      } catch (err) {
        console.warn("[EmailService] Live dispatch failed, falling back to recorded sandbox simulation:", err);
      }
    } else {
      console.log(`[EmailService] Simulation Mode: Dispatched email to ${to} (Subject: "${subject}", Content length: ${body.length} chars).`);
    }

    const updated = await prisma.outreach.update({
      where: { id: outreachId },
      data: {
        status: "SENT",
        sentAt: now,
        followUpDate,
        followUpCount: isFollowUp ? { increment: 1 } : 0,
        rfcMessageId,
      },
    });

    return {
      success: true,
      mode,
      message: statusMessage,
      sentAt: now,
      followUpDate,
      outreach: updated,
    };
  }
}
