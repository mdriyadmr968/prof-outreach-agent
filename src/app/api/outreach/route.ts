import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OutreachStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as OutreachStatus | null;

    const where: Prisma.OutreachWhereInput = {};
    if (status) {
      where.status = status;
    }

    const outreaches = await prisma.outreach.findMany({
      where,
      include: {
        professor: {
          include: {
            university: true,
            opportunity: true,
          },
        },
        replies: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, count: outreaches.length, data: outreaches });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load outreach records";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
