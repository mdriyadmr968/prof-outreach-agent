import { AcademicProfile, EmailConfidenceStatus, OutreachArchetype } from "@prisma/client";
import { OpenAlexWork } from "../academic/openalex";

export interface ScoreBreakdown {
  researchScore: number;     // max 30
  technicalScore: number;    // max 15
  activityScore: number;     // max 10
  fundingScore: number;      // max 20
  supervisionScore: number;  // max 10
  internationalScore: number;// max 5
  programScore: number;      // max 5
  emailScore: number;        // max 5
  totalScore: number;        // 0 - 100
  tier: "A" | "B" | "C" | "D" | "F";
  reasoning: string;
  potentialConcerns: string;
  matchedPublications: {
    title: string;
    year: number;
    relevanceReason: string;
  }[];
}

interface StudentResearchInterest {
  name: string;
  weight?: number;
}

export class OpportunityScorer {
  /**
   * Calculates a granular 0-100 score dynamically grounded in the student's actual profile
   */
  public static calculateScore(params: {
    profile: AcademicProfile;
    professorName: string;
    country: string;
    outreachArchetype: OutreachArchetype;
    researchInterests: string[];
    webText: string;
    publications: OpenAlexWork[];
    emailConfidence: EmailConfidenceStatus;
    acceptingMastersStatus: string;
    fundingEvidenceText?: string;
  }): ScoreBreakdown {
    const {
      profile,
      country,
      outreachArchetype,
      researchInterests: profInterests,
      webText,
      publications,
      emailConfidence,
      acceptingMastersStatus,
      fundingEvidenceText,
    } = params;

    const lowerWeb = webText.toLowerCase();

    // 1. Normalize student's research interests from profile
    const rawInterests = (profile.researchInterests as unknown as (StudentResearchInterest | string)[]) || [];
    const studentInterests: string[] = rawInterests.map((item) =>
      typeof item === "string" ? item.toLowerCase() : item.name?.toLowerCase() || ""
    ).filter(Boolean);

    const thesisTitleLower = (profile.thesisTitle || "").toLowerCase();
    const thesisAbstractLower = (profile.thesisAbstract || "").toLowerCase();
    const fullThesisText = `${thesisTitleLower} ${thesisAbstractLower}`;

    // 1. Research Relevance (max 30)
    let researchScore = 6; // baseline
    const matchedTopics: string[] = [];

    // Check overlap with professor's OpenAlex topics or stated interests
    for (const interest of profInterests) {
      const lowerProfInt = interest.toLowerCase();
      // Match against student research interests
      const matchedInterest = studentInterests.find(
        (si) => lowerProfInt.includes(si) || si.includes(lowerProfInt)
      );
      if (matchedInterest) {
        researchScore += 6;
        if (!matchedTopics.includes(interest)) matchedTopics.push(interest);
      }
      // Match against thesis
      if (fullThesisText.includes(lowerProfInt) || lowerProfInt.split(" ").some((w) => w.length > 4 && fullThesisText.includes(w))) {
        researchScore += 5;
        if (!matchedTopics.includes(interest)) matchedTopics.push(interest);
      }
    }

    // Check student interests appearing on professor webpage
    for (const interest of studentInterests) {
      if (lowerWeb.includes(interest)) {
        researchScore += 4;
        const capitalized = interest.charAt(0).toUpperCase() + interest.slice(1);
        if (!matchedTopics.includes(capitalized)) matchedTopics.push(capitalized);
      }
    }

    // Check thesis keywords appearing on professor webpage
    const thesisKeywords = thesisTitleLower
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ""))
      .filter((w) => w.length > 4 && !["using", "based", "study", "analysis", "approach"].includes(w));

    let thesisHits = 0;
    for (const kw of thesisKeywords) {
      if (lowerWeb.includes(kw)) {
        thesisHits++;
      }
    }
    if (thesisHits >= 2) {
      researchScore += 6;
    } else if (thesisHits === 1) {
      researchScore += 3;
    }

    researchScore = Math.min(30, Math.max(6, researchScore));

    // 2. Technical Overlap (max 15)
    let technicalScore = 4;
    const matchedMethods: string[] = [];

    // Check student's declared thesis methods
    const studentMethods = (profile.thesisMethods || []).map((m) => m.toLowerCase());
    for (const method of studentMethods) {
      if (method.length > 2 && lowerWeb.includes(method)) {
        technicalScore += 3;
        const capitalized = method.charAt(0).toUpperCase() + method.slice(1);
        if (!matchedMethods.includes(capitalized)) matchedMethods.push(capitalized);
      }
    }

    // Check student's declared technical skills
    const studentSkills = (profile.skills || []).map((s) => s.toLowerCase());
    for (const skill of studentSkills) {
      if (skill.length > 2 && lowerWeb.includes(skill)) {
        technicalScore += 2;
        const capitalized = skill.charAt(0).toUpperCase() + skill.slice(1);
        if (!matchedMethods.includes(capitalized)) matchedMethods.push(capitalized);
      }
    }

    technicalScore = Math.min(15, Math.max(4, technicalScore));

    // 3. Recent Activity (max 10)
    let activityScore = 4;
    const currentYear = new Date().getFullYear();
    const recentPubs = publications.filter((p) => p.publicationYear >= currentYear - 2);
    if (recentPubs.length >= 3) {
      activityScore = 10;
    } else if (recentPubs.length >= 1) {
      activityScore = 8;
    } else if (publications.length > 0) {
      activityScore = 6;
    }

    // 4. Funding Evidence (max 20)
    let fundingScore = 5;
    if (fundingEvidenceText || lowerWeb.includes("funded by") || lowerWeb.includes("grant")) {
      fundingScore = 18;
      if (lowerWeb.includes("research assistant") || lowerWeb.includes("ra position") || lowerWeb.includes("stipend")) {
        fundingScore = 20;
      }
    } else if (outreachArchetype === OutreachArchetype.PROFESSOR_LED && (country === "Canada" || country === "South Korea" || country === "USA")) {
      fundingScore = 14; // In Canada & South Korea, CS thesis Master's are funded by default
    } else if (outreachArchetype === OutreachArchetype.CENTRAL_HIWI) {
      fundingScore = 12; // Tuition-free + paid HiWi opportunities
    } else if (outreachArchetype === OutreachArchetype.SCHOLARSHIP_LED) {
      fundingScore = 10;
    }

    // 5. Master's Supervision Compatibility (max 10)
    let supervisionScore = 6;
    if (acceptingMastersStatus === "CONFIRMED_OPEN") {
      supervisionScore = 10;
    } else if (acceptingMastersStatus === "PHD_ONLY") {
      supervisionScore = 2;
    } else if (acceptingMastersStatus === "NOT_ACCEPTING") {
      supervisionScore = 0;
    } else if (lowerWeb.includes("master") || lowerWeb.includes("graduate students")) {
      supervisionScore = 8;
    }

    // 6. International Student Compatibility (max 5)
    let internationalScore = 3;
    const targetCountries = (profile.targetCountries || []).map((c) => c.toLowerCase());
    if (targetCountries.includes(country.toLowerCase())) {
      internationalScore = 5;
    } else if (
      lowerWeb.includes("international") ||
      ["Canada", "Germany", "South Korea", "USA", "Sweden", "Finland", "UK"].includes(country)
    ) {
      internationalScore = 4;
    }

    // 7. Program Compatibility (max 5)
    let programScore = 4;
    const degreeLower = (profile.degree || "").toLowerCase();
    if (
      (degreeLower.includes("computer") && (lowerWeb.includes("computer science") || lowerWeb.includes("informatics"))) ||
      (degreeLower.includes("engineering") && lowerWeb.includes("engineering"))
    ) {
      programScore = 5;
    }

    // 8. Email Confidence (max 5)
    let emailScore = 1;
    if (emailConfidence === EmailConfidenceStatus.VERIFIED_OFFICIAL) {
      emailScore = 5;
    } else if (emailConfidence === EmailConfidenceStatus.VERIFIED_UNIVERSITY_DIRECTORY) {
      emailScore = 4;
    } else if (emailConfidence === EmailConfidenceStatus.PROBABLE) {
      emailScore = 3;
    }

    const totalScore = Math.min(
      100,
      Math.round(
        researchScore +
          technicalScore +
          activityScore +
          fundingScore +
          supervisionScore +
          internationalScore +
          programScore +
          emailScore
      )
    );

    let tier: "A" | "B" | "C" | "D" | "F" = "F";
    if (totalScore >= 90) tier = "A";
    else if (totalScore >= 80) tier = "B";
    else if (totalScore >= 70) tier = "C";
    else if (totalScore >= 60) tier = "D";

    // Dynamic Publication Relevance Attribution
    const matchedPublications = publications.slice(0, 3).map((pub) => {
      const lowerTitle = pub.title.toLowerCase();
      const lowerAbstract = (pub.abstract || "").toLowerCase();
      const combinedPub = `${lowerTitle} ${lowerAbstract}`;

      // Check overlap with student thesis
      const pubKeywords = thesisKeywords.filter((k) => combinedPub.includes(k));
      let reason = "Aligns with your foundational computing and computational research background.";

      if (pubKeywords.length > 0) {
        reason = `Direct thematic synergy with your thesis focus on [${pubKeywords.join(", ")}].`;
      } else {
        const matchingMethod = studentMethods.find((m) => combinedPub.includes(m));
        if (matchingMethod) {
          reason = `Employs ${matchingMethod}, directly matching your technical research methods.`;
        } else {
          const matchingInterest = studentInterests.find((i) => combinedPub.includes(i));
          if (matchingInterest) {
            reason = `Explores topics in ${matchingInterest}, aligning with your stated research directions.`;
          }
        }
      }

      return {
        title: pub.title,
        year: pub.publicationYear,
        relevanceReason: reason,
      };
    });

    const displayTopics = matchedTopics.length > 0 ? matchedTopics.slice(0, 4).join(", ") : "Computing & AI";
    const displayMethods = matchedMethods.length > 0 ? matchedMethods.slice(0, 4).join(", ") : "applied software & technical methodologies";

    const reasoning = `Synergy identified in [${displayTopics}]. Overlapping technical capabilities: ${displayMethods}. ${recentPubs.length} recent publication(s) within active window.`;

    let potentialConcerns = "";
    if (acceptingMastersStatus === "PHD_ONLY") {
      potentialConcerns = "Website suggests current focus on PhD students. Master's supervision must be tactfully confirmed.";
    } else if (acceptingMastersStatus === "NOT_ACCEPTING") {
      potentialConcerns = "Notice found indicating sabbatical or limited current intake.";
    } else if (fundingScore < 12) {
      potentialConcerns = "Public funding evidence is indirect. Inquire about RA openings or department assistantships.";
    } else {
      potentialConcerns = "Verify specific departmental application deadlines for international applicants.";
    }

    return {
      researchScore,
      technicalScore,
      activityScore,
      fundingScore,
      supervisionScore,
      internationalScore,
      programScore,
      emailScore,
      totalScore,
      tier,
      reasoning,
      potentialConcerns,
      matchedPublications,
    };
  }
}
