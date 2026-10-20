import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PlaywrightFetcher } from "@/lib/scraper/playwright-fetcher";
import { OpenAlexService } from "@/lib/academic/openalex";
import { OpportunityScorer } from "@/lib/ai/opportunity-scorer";
import { EmailGenerator } from "@/lib/ai/email-generator";
import { OutreachArchetype, EmailConfidenceStatus, AcceptingStatus, Prisma } from "@prisma/client";

function normalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${path}`;
  } catch {
    return rawUrl.trim().replace(/\/+$/, "");
  }
}

function cleanProfessorName(name: string): string {
  return name
    .replace(/^(prof\.|dr\.|professor|doctor)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, universityNameInput, countryInput, professorNameInput } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // 1. Fetch academic profile
    const user = await prisma.user.findFirst({
      include: { academicProfile: true },
    });

    if (!user || !user.academicProfile) {
      return NextResponse.json(
        { error: "No academic profile found. Please seed or configure profile first." },
        { status: 400 }
      );
    }

    // 2. Fetch page using Playwright (1-attempt auto-solve + desktop headed browser fallback)
    const pageData = await PlaywrightFetcher.fetchPage(url);

    // Determine Professor Name
    let professorName = professorNameInput;
    if (!professorName) {
      // Clean up from title or page heading
      const cleanTitle = pageData.title.replace(/(Prof\.|Dr\.|Faculty|Department|Home|Page|University|Profile)/gi, "").trim();
      const parts = cleanTitle.split(/[-–|]/);
      professorName = parts[0]?.trim() || "Professor";
    }

    // Determine University and Country Archetype
    const hostname = pageData.domain.toLowerCase();
    let country = countryInput || "USA";
    let outreachArchetype: OutreachArchetype = OutreachArchetype.PROFESSOR_LED;

    if (hostname.endsWith(".ca")) {
      country = "Canada";
      outreachArchetype = OutreachArchetype.PROFESSOR_LED;
    } else if (hostname.endsWith(".de")) {
      country = "Germany";
      outreachArchetype = OutreachArchetype.CENTRAL_HIWI;
    } else if (hostname.endsWith(".se")) {
      country = "Sweden";
      outreachArchetype = OutreachArchetype.SCHOLARSHIP_LED;
    } else if (hostname.endsWith(".kr")) {
      country = "South Korea";
      outreachArchetype = OutreachArchetype.PROFESSOR_LED;
    } else if (hostname.endsWith(".fi")) {
      country = "Finland";
      outreachArchetype = OutreachArchetype.SCHOLARSHIP_LED;
    } else if (hostname.endsWith(".uk") || hostname.endsWith(".ac.uk")) {
      country = "UK";
      outreachArchetype = OutreachArchetype.SCHOLARSHIP_LED;
    }

    const universityName = universityNameInput || (country === "Germany" ? "German University" : "University");

    // 3. Upsert University
    const university = await prisma.university.upsert({
      where: { name: universityName },
      update: {
        domain: pageData.domain,
        country,
        outreachArchetype,
      },
      create: {
        name: universityName,
        website: `https://${pageData.domain}`,
        domain: pageData.domain,
        country,
        outreachArchetype,
      },
    });

    // 4. Fetch Publications via OpenAlex
    const openAlexAuthor = await OpenAlexService.searchAuthor(professorName, universityName);
    const publications = openAlexAuthor ? await OpenAlexService.getRecentWorks(openAlexAuthor.id, 5) : [];

    // Best email found
    const bestEmailObj = pageData.emailsFound.sort((a, b) => b.confidence - a.confidence)[0];
    const email = bestEmailObj?.email || null;
    const emailConfidence =
      bestEmailObj && bestEmailObj.confidence >= 90
        ? EmailConfidenceStatus.VERIFIED_OFFICIAL
        : bestEmailObj && bestEmailObj.confidence >= 80
        ? EmailConfidenceStatus.VERIFIED_UNIVERSITY_DIRECTORY
        : bestEmailObj
        ? EmailConfidenceStatus.PROBABLE
        : EmailConfidenceStatus.UNVERIFIED;

    // 5. Calculate Opportunity Score
    const scoreResult = OpportunityScorer.calculateScore({
      profile: user.academicProfile,
      professorName,
      country,
      outreachArchetype,
      researchInterests: openAlexAuthor?.topics.map((t) => t.displayName) || ["Machine Learning"],
      webText: pageData.rawText,
      publications,
      emailConfidence,
      acceptingMastersStatus: pageData.prospectiveRules.acceptingMastersStatus,
      fundingEvidenceText: pageData.fundingEvidence,
    });

    // 6. Generate Personalized Email Draft (AI Powered + Dynamic Grounded Fallback)
    const emailDraft = await EmailGenerator.generateDraft({
      profile: user.academicProfile,
      professorName,
      universityName,
      country,
      outreachArchetype,
      facultyUrl: url,
      publications,
      requiredSubjectTag: pageData.prospectiveRules.requiredSubjectTag,
      studentName: user.name,
      mode: "BALANCED",
    });

    // 7. Multi-Field Professor Deduplication & Persistence
    const normalizedTargetUrl = normalizeUrl(url);
    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    const openAlexId = openAlexAuthor?.id || null;
    const orcidId = openAlexAuthor?.orcid || null;
    const cleanedName = cleanProfessorName(professorName);

    // Search for existing professor across multiple identifiers
    const orConditions: Prisma.ProfessorWhereInput[] = [
      { profileUrl: normalizedTargetUrl },
      { profileUrl: url },
    ];

    if (normalizedEmail) {
      orConditions.push({ email: { equals: normalizedEmail, mode: "insensitive" } });
    }

    if (openAlexId) {
      orConditions.push({ openAlexId });
    }

    if (orcidId) {
      orConditions.push({ orcidId });
    }

    // Name + University match
    orConditions.push({
      AND: [
        { universityId: university.id },
        {
          OR: [
            { name: { equals: professorName, mode: "insensitive" } },
            { name: { equals: cleanedName, mode: "insensitive" } },
            { name: { contains: cleanedName, mode: "insensitive" } },
          ],
        },
      ],
    });

    const existingProfessor = await prisma.professor.findFirst({
      where: { OR: orConditions },
    });

    let professor;
    if (existingProfessor) {
      professor = await prisma.professor.update({
        where: { id: existingProfessor.id },
        data: {
          email: email || existingProfessor.email,
          emailConfidence: email ? emailConfidence : existingProfessor.emailConfidence,
          emailSourceUrl: url,
          profileUrl: normalizedTargetUrl,
          researchSummary: scoreResult.reasoning,
          fundingEvidence: pageData.fundingEvidence || existingProfessor.fundingEvidence || "Active department grants identified",
          acceptingMastersStatus: pageData.prospectiveRules.acceptingMastersStatus as AcceptingStatus,
          prospectiveStudentRules: pageData.prospectiveRules.verbatimQuote || existingProfessor.prospectiveStudentRules,
          requiredSubjectTag: pageData.prospectiveRules.requiredSubjectTag || existingProfessor.requiredSubjectTag,
          openAlexId: openAlexId || existingProfessor.openAlexId,
          orcidId: orcidId || existingProfessor.orcidId,
        },
      });
    } else {
      professor = await prisma.professor.upsert({
        where: {
          name_universityId: {
            name: professorName,
            universityId: university.id,
          },
        },
        update: {
          email,
          emailConfidence,
          emailSourceUrl: url,
          profileUrl: normalizedTargetUrl,
          researchSummary: scoreResult.reasoning,
          fundingEvidence: pageData.fundingEvidence || "Active department grants identified",
          acceptingMastersStatus: pageData.prospectiveRules.acceptingMastersStatus as AcceptingStatus,
          prospectiveStudentRules: pageData.prospectiveRules.verbatimQuote,
          requiredSubjectTag: pageData.prospectiveRules.requiredSubjectTag,
          openAlexId,
          orcidId,
        },
        create: {
          name: professorName,
          universityId: university.id,
          email,
          emailConfidence,
          emailSourceUrl: url,
          profileUrl: normalizedTargetUrl,
          researchSummary: scoreResult.reasoning,
          fundingEvidence: pageData.fundingEvidence || "Active department grants identified",
          acceptingMastersStatus: pageData.prospectiveRules.acceptingMastersStatus as AcceptingStatus,
          prospectiveStudentRules: pageData.prospectiveRules.verbatimQuote,
          requiredSubjectTag: pageData.prospectiveRules.requiredSubjectTag,
          openAlexId,
          orcidId,
        },
      });
    }

    // Save publications
    await prisma.publication.deleteMany({ where: { professorId: professor.id } });
    for (const pub of publications) {
      await prisma.publication.create({
        data: {
          professorId: professor.id,
          title: pub.title,
          year: pub.publicationYear,
          venue: pub.primaryLocation?.sourceName,
          url: pub.primaryLocation?.landingPageUrl || (pub.doi ? `https://doi.org/${pub.doi}` : null),
          abstract: pub.abstract,
          relevanceReason: scoreResult.matchedPublications.find((m) => m.title === pub.title)?.relevanceReason,
        },
      });
    }

    // Save Opportunity
    const opportunity = await prisma.opportunity.upsert({
      where: { professorId: professor.id },
      update: {
        researchScore: scoreResult.researchScore,
        technicalScore: scoreResult.technicalScore,
        activityScore: scoreResult.activityScore,
        fundingScore: scoreResult.fundingScore,
        supervisionScore: scoreResult.supervisionScore,
        internationalScore: scoreResult.internationalScore,
        programScore: scoreResult.programScore,
        emailScore: scoreResult.emailScore,
        totalScore: scoreResult.totalScore,
        tier: scoreResult.tier,
        reasoning: scoreResult.reasoning,
        potentialConcerns: scoreResult.potentialConcerns,
      },
      create: {
        professorId: professor.id,
        researchScore: scoreResult.researchScore,
        technicalScore: scoreResult.technicalScore,
        activityScore: scoreResult.activityScore,
        fundingScore: scoreResult.fundingScore,
        supervisionScore: scoreResult.supervisionScore,
        internationalScore: scoreResult.internationalScore,
        programScore: scoreResult.programScore,
        emailScore: scoreResult.emailScore,
        totalScore: scoreResult.totalScore,
        tier: scoreResult.tier,
        reasoning: scoreResult.reasoning,
        potentialConcerns: scoreResult.potentialConcerns,
      },
    });

    // 8. Upsert Outreach Draft (Prevent duplicate creation & protect SENT/APPROVED records)
    const existingOutreach = await prisma.outreach.findFirst({
      where: {
        userId: user.id,
        professorId: professor.id,
      },
      orderBy: { createdAt: "desc" },
    });

    let outreach;
    let pipelineNotice: string | undefined = undefined;

    if (!existingOutreach) {
      // Create new DRAFT
      outreach = await prisma.outreach.create({
        data: {
          userId: user.id,
          professorId: professor.id,
          emailTo: email || "unverified@domain.edu",
          subject: emailDraft.subject,
          body: emailDraft.body,
          mode: emailDraft.mode,
          status: "DRAFT",
          qualityPassed: emailDraft.qualityPassed,
          qualityNotes: emailDraft.qualityFeedback.join("; "),
          claimCitations: emailDraft.claimCitations as unknown as Prisma.InputJsonValue,
        },
      });
    } else if (existingOutreach.status === "DRAFT") {
      // Active DRAFT exists: update it with fresh analysis rather than duplicating
      outreach = await prisma.outreach.update({
        where: { id: existingOutreach.id },
        data: {
          emailTo: email || existingOutreach.emailTo,
          subject: emailDraft.subject,
          body: emailDraft.body,
          mode: emailDraft.mode,
          qualityPassed: emailDraft.qualityPassed,
          qualityNotes: emailDraft.qualityFeedback.join("; "),
          claimCitations: emailDraft.claimCitations as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      // Already SENT, APPROVED, or in downstream pipeline: do not overwrite; notify the user
      outreach = existingOutreach;
      pipelineNotice = `Professor already in pipeline (Status: ${existingOutreach.status}). Showing existing record.`;
    }

    return NextResponse.json({
      success: true,
      pipelineNotice,
      data: {
        professor: {
          id: professor.id,
          name: professor.name,
          university: university.name,
          country: university.country,
          outreachArchetype: university.outreachArchetype,
          email: professor.email,
          emailConfidence: professor.emailConfidence,
          profileUrl: professor.profileUrl,
          acceptingMastersStatus: professor.acceptingMastersStatus,
          prospectiveStudentRules: professor.prospectiveStudentRules,
          requiredSubjectTag: professor.requiredSubjectTag,
        },
        opportunity: {
          id: opportunity.id,
          totalScore: opportunity.totalScore,
          tier: opportunity.tier,
          breakdown: {
            research: scoreResult.researchScore,
            technical: scoreResult.technicalScore,
            activity: scoreResult.activityScore,
            funding: scoreResult.fundingScore,
            supervision: scoreResult.supervisionScore,
            international: scoreResult.internationalScore,
            program: scoreResult.programScore,
            email: scoreResult.emailScore,
          },
          reasoning: opportunity.reasoning,
          potentialConcerns: opportunity.potentialConcerns,
        },
        publications,
        outreach: {
          id: outreach.id,
          status: outreach.status,
          subject: outreach.subject,
          body: outreach.body,
          wordCount: outreach.body.trim().split(/\s+/).length,
          claimCitations: outreach.claimCitations,
          qualityPassed: outreach.qualityPassed,
          qualityNotes: outreach.qualityNotes ? [outreach.qualityNotes] : emailDraft.qualityFeedback,
        },
        pipelineNotice,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to analyze page";
    console.error("[POST /api/analyze] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
