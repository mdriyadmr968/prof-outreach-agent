import { NextRequest, NextResponse } from "next/server";
import { EmailService } from "@/lib/email/gmail-client";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { outreachId, scheduleForDate } = await req.json();

    if (!outreachId) {
      return NextResponse.json({ error: "outreachId is required" }, { status: 400 });
    }

    const outreach = await prisma.outreach.findUnique({
      where: { id: outreachId },
      include: { professor: true },
    });

    if (!outreach) {
      return NextResponse.json({ error: "Outreach record not found" }, { status: 404 });
    }

    // If user scheduled for later (e.g. 8:30 AM professor's local time)
    if (scheduleForDate) {
      const scheduled = await prisma.outreach.update({
        where: { id: outreachId },
        data: {
          status: "APPROVED",
          scheduledFor: new Date(scheduleForDate),
        },
      });
      return NextResponse.json({
        success: true,
        message: `Email approved and queued for ${new Date(scheduleForDate).toLocaleString()}`,
        outreach: scheduled,
      });
    }

    // Direct immediate send
    const result = await EmailService.sendApprovedEmail({
      outreachId: outreach.id,
      to: outreach.emailTo,
      subject: outreach.subject,
      body: outreach.body,
    });

    return NextResponse.json({
      success: true,
      message: `Email sent to ${outreach.emailTo}!`,
      data: result,
    });
  } catch (err: any) {
    console.error("[POST /api/send] error:", err);
    return NextResponse.json({ error: err.message || "Failed to send email" }, { status: 400 });
  }
}
