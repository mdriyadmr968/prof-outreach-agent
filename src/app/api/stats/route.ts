import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalProfessors = await prisma.professor.count();
    const tierAProfessors = await prisma.opportunity.count({ where: { tier: "A" } });
    const tierBProfessors = await prisma.opportunity.count({ where: { tier: "B" } });
    const highRelevance = tierAProfessors + tierBProfessors;

    const approvedDrafts = await prisma.outreach.count({ where: { status: "APPROVED" } });
    const sentEmails = await prisma.outreach.count({ where: { status: "SENT" } });
    const pendingDrafts = await prisma.outreach.count({ where: { status: "DRAFT" } });

    // Follow-ups due
    const now = new Date();
    const followUpsDue = await prisma.outreach.count({
      where: {
        status: "SENT",
        followUpDate: { lte: now },
      },
    });

    const repliesCount = await prisma.reply.count();
    const positiveReplies = await prisma.reply.count({
      where: {
        classification: {
          in: ["POSITIVE_INTERESTED", "INTERVIEW_INVITATION", "FUNDING_AVAILABLE"],
        },
      },
    });

    // Check sent today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sentToday = await prisma.outreach.count({
      where: {
        status: "SENT",
        sentAt: { gte: startOfDay },
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalProfessors,
        highRelevance,
        pendingDrafts,
        approvedDrafts,
        sentEmails,
        sentToday,
        dailyLimit: 5,
        followUpsDue,
        repliesCount,
        positiveReplies,
        interviews: 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
