import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OutreachStatus } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const validStatuses = Object.values(OutreachStatus);
    const status = body.status && validStatuses.includes(body.status) ? (body.status as OutreachStatus) : undefined;

    const updated = await prisma.outreach.update({
      where: { id },
      data: {
        subject: body.subject !== undefined ? body.subject : undefined,
        body: body.body !== undefined ? body.body : undefined,
        status,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
        sentAt: body.status === "SENT" ? new Date() : undefined,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : undefined,
        followUpCount: body.followUpCount !== undefined ? body.followUpCount : undefined,
      },
      include: {
        professor: {
          include: {
            university: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update outreach record";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.outreach.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Draft deleted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete outreach record";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
