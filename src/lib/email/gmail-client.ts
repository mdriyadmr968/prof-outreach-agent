import { prisma } from "../prisma";

export interface SendEmailParams {
  outreachId: string;
  to: string;
  subject: string;
  body: string;
  isFollowUp?: boolean;
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
        reason: `Professor already contacted on ${sentDate}. Prevent duplicate sending.`,
      };
    }

    return { canSend: true };
  }

  /**
   * Sends or simulates sending an approved email with safety guardrails
   */
  public static async sendApprovedEmail(params: SendEmailParams) {
    const { outreachId, to, subject, body, isFollowUp = false } = params;

    // 1. Check suppression list
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

    // 3. Mark outreach as SENT with sensible follow-up schedule (7-10 days later)
    const now = new Date();
    const followUpDate = new Date();
    followUpDate.setDate(now.getDate() + 8); // Schedule follow-up in 8 days

    const updated = await prisma.outreach.update({
      where: { id: outreachId },
      data: {
        status: "SENT",
        sentAt: now,
        followUpDate,
        followUpCount: isFollowUp ? { increment: 1 } : 0,
        rfcMessageId: `<outreach-${outreachId}@prof-outreach.local>`,
      },
    });

    console.log(`[EmailService] Email sent successfully to ${to}. Next follow-up due on ${followUpDate.toISOString().split("T")[0]}.`);

    return {
      success: true,
      sentAt: now,
      followUpDate,
      outreach: updated,
    };
  }
}
