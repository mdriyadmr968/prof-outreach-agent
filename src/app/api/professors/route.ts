import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");
    const tier = searchParams.get("tier");
    const archetype = searchParams.get("archetype");

    const whereClause: any = {};
    if (country) {
      whereClause.university = { country };
    }
    if (archetype) {
      whereClause.university = {
        ...whereClause.university,
        outreachArchetype: archetype,
      };
    }
    if (tier) {
      whereClause.opportunity = { tier };
    }

    const professors = await prisma.professor.findMany({
      where: whereClause,
      include: {
        university: true,
        opportunity: true,
        publications: {
          orderBy: { year: "desc" },
          take: 3,
        },
        outreach: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: {
        opportunity: {
          totalScore: "desc",
        },
      },
    });

    return NextResponse.json({ success: true, count: professors.length, data: professors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
