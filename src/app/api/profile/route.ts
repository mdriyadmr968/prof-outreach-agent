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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await prisma.user.findFirst();

    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const updatedProfile = await prisma.academicProfile.upsert({
      where: { userId: user.id },
      update: {
        degree: body.degree,
        university: body.university,
        graduationYear: parseInt(body.graduationYear, 10),
        cgpa: parseFloat(body.cgpa),
        thesisTitle: body.thesisTitle,
        thesisAbstract: body.thesisAbstract,
        thesisMethods: body.thesisMethods || [],
        skills: body.skills || [],
        researchInterests: body.researchInterests || [],
        targetCountries: body.targetCountries || [],
        fullyFundedOnly: body.fullyFundedOnly ?? true,
        acceptTuitionWaiver: body.acceptTuitionWaiver ?? true,
        acceptPartialFunding: body.acceptPartialFunding ?? false,
        acceptSelfFunded: body.acceptSelfFunded ?? false,
      },
      create: {
        userId: user.id,
        degree: body.degree,
        university: body.university,
        graduationYear: parseInt(body.graduationYear, 10),
        cgpa: parseFloat(body.cgpa),
        thesisTitle: body.thesisTitle,
        thesisAbstract: body.thesisAbstract,
        thesisMethods: body.thesisMethods || [],
        skills: body.skills || [],
        researchInterests: body.researchInterests || [],
        targetCountries: body.targetCountries || [],
        fullyFundedOnly: body.fullyFundedOnly ?? true,
        acceptTuitionWaiver: body.acceptTuitionWaiver ?? true,
        acceptPartialFunding: body.acceptPartialFunding ?? false,
        acceptSelfFunded: body.acceptSelfFunded ?? false,
      },
    });

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
