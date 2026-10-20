import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.outreach.update({
      where: { id },
      data: {
        subject: body.subject !== undefined ? body.subject : undefined,
        body: body.body !== undefined ? body.body : undefined,
        status: body.status !== undefined ? body.status : undefined,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
        sentAt: body.status === "SENT" ? new Date() : undefined,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : undefined,
        followUpCount: body.followUpCount !== undefined ? body.followUpCount : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.outreach.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Draft deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
