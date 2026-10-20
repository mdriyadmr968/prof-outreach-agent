import { NextRequest, NextResponse } from "next/server";
import { OpenAlexService } from "@/lib/academic/openalex";
import { prisma } from "@/lib/prisma";
import { OutreachArchetype } from "@prisma/client";

const COUNTRY_CODE_MAP: Record<string, { code: string; archetype: OutreachArchetype }> = {
  canada: { code: "CA", archetype: OutreachArchetype.PROFESSOR_LED },
  germany: { code: "DE", archetype: OutreachArchetype.CENTRAL_HIWI },
  usa: { code: "US", archetype: OutreachArchetype.PROFESSOR_LED },
  "united states": { code: "US", archetype: OutreachArchetype.PROFESSOR_LED },
  "south korea": { code: "KR", archetype: OutreachArchetype.PROFESSOR_LED },
  korea: { code: "KR", archetype: OutreachArchetype.PROFESSOR_LED },
  sweden: { code: "SE", archetype: OutreachArchetype.SCHOLARSHIP_LED },
  finland: { code: "FI", archetype: OutreachArchetype.SCHOLARSHIP_LED },
  uk: { code: "GB", archetype: OutreachArchetype.SCHOLARSHIP_LED },
  "united kingdom": { code: "GB", archetype: OutreachArchetype.SCHOLARSHIP_LED },
  australia: { code: "AU", archetype: OutreachArchetype.SCHOLARSHIP_LED },
  japan: { code: "JP", archetype: OutreachArchetype.PROFESSOR_LED },
};

export async function POST(req: NextRequest) {
  try {
    const { topic = "machine learning healthcare", country = "Canada", limit = 6 } = await req.json();

    const countryKey = country.toLowerCase().trim();
    const countryConfig = COUNTRY_CODE_MAP[countryKey] || {
      code: "CA",
      archetype: OutreachArchetype.PROFESSOR_LED,
    };

    console.log(`[Discover] Querying OpenAlex for topic="${topic}" in ${country} (${countryConfig.code})...`);
    const authors = await OpenAlexService.discoverProfessorsByTopicAndCountry(
      topic,
      countryConfig.code,
      limit
    );

    const discoveredProfessors = [];

    for (const author of authors) {
      const universityName = author.lastKnownInstitution?.displayName || `${country} University`;

      // Upsert University
      const university = await prisma.university.upsert({
        where: { name: universityName },
        update: {
          country,
          outreachArchetype: countryConfig.archetype,
        },
        create: {
          name: universityName,
          country,
          website: `https://${author.lastKnownInstitution?.ror || "example.edu"}`,
          outreachArchetype: countryConfig.archetype,
        },
      });

      // Get recent works
      const works = await OpenAlexService.getRecentWorks(author.id, 3);

      discoveredProfessors.push({
        openAlexId: author.id,
        name: author.displayName,
        orcid: author.orcid,
        worksCount: author.worksCount,
        citedByCount: author.citedByCount,
        university: university.name,
        country: university.country,
        outreachArchetype: university.outreachArchetype,
        topics: author.topics.map((t) => t.displayName),
        recentPublications: works.map((w) => ({
          title: w.title,
          year: w.publicationYear,
          citations: w.citedByCount,
          url: w.primaryLocation?.landingPageUrl || (w.doi ? `https://doi.org/${w.doi}` : undefined),
        })),
      });
    }

    return NextResponse.json({
      success: true,
      count: discoveredProfessors.length,
      data: discoveredProfessors,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Discovery search failed";
    console.error("[POST /api/discover] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
