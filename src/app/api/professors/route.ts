import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OutreachArchetype, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");
    const tier = searchParams.get("tier");
    const archetype = searchParams.get("archetype") as OutreachArchetype | null;

    const whereClause: Prisma.ProfessorWhereInput = {};
    if (country) {
      whereClause.university = { country };
    }
    if (archetype) {
      whereClause.university = {
        ...(whereClause.university as Prisma.UniversityWhereInput),
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load professors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
