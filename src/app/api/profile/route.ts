import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      include: { academicProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    return NextResponse.json({ user, profile: user.academicProfile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await prisma.user.findFirst({
      include: { academicProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    // Update user display name if provided
    if (body.name && typeof body.name === "string" && body.name.trim().length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: body.name.trim() },
      });
    }

    const existing = user.academicProfile;

    // Safely parse numerical values
    const gradYearParsed = parseInt(body.graduationYear, 10);
    const graduationYear = !isNaN(gradYearParsed) ? gradYearParsed : (existing?.graduationYear ?? 2024);

    const cgpaParsed = parseFloat(body.cgpa);
    const cgpa = !isNaN(cgpaParsed) ? cgpaParsed : (existing?.cgpa ?? 3.5);

    // Ensure researchInterests are preserved if omitted in the payload
    const researchInterests =
      body.researchInterests !== undefined
        ? body.researchInterests
        : (existing?.researchInterests ?? []);

    const updatedProfile = await prisma.academicProfile.upsert({
      where: { userId: user.id },
      update: {
        degree: body.degree ?? existing?.degree ?? "BSc in Computer Science",
        university: body.university ?? existing?.university ?? "University",
        graduationYear,
        cgpa,
        thesisTitle: body.thesisTitle ?? existing?.thesisTitle ?? "",
        thesisAbstract: body.thesisAbstract !== undefined ? body.thesisAbstract : existing?.thesisAbstract,
        thesisMethods: body.thesisMethods || existing?.thesisMethods || [],
        skills: body.skills || existing?.skills || [],
        researchInterests,
        targetCountries: body.targetCountries || existing?.targetCountries || [],
        fullyFundedOnly: body.fullyFundedOnly ?? existing?.fullyFundedOnly ?? true,
        acceptTuitionWaiver: body.acceptTuitionWaiver ?? existing?.acceptTuitionWaiver ?? true,
        acceptPartialFunding: body.acceptPartialFunding ?? existing?.acceptPartialFunding ?? false,
        acceptSelfFunded: body.acceptSelfFunded ?? existing?.acceptSelfFunded ?? false,
      },
      create: {
        userId: user.id,
        degree: body.degree || "BSc in Computer Science",
        university: body.university || "University",
        graduationYear,
        cgpa,
        thesisTitle: body.thesisTitle || "Undergraduate Thesis",
        thesisAbstract: body.thesisAbstract || "",
        thesisMethods: body.thesisMethods || [],
        skills: body.skills || [],
        researchInterests,
        targetCountries: body.targetCountries || [],
        fullyFundedOnly: body.fullyFundedOnly ?? true,
        acceptTuitionWaiver: body.acceptTuitionWaiver ?? true,
        acceptPartialFunding: body.acceptPartialFunding ?? false,
        acceptSelfFunded: body.acceptSelfFunded ?? false,
      },
    });

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
