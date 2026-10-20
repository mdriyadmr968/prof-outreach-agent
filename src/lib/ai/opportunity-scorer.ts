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

export class OpportunityScorer {
  /**
   * Calculates a granular 0-100 score based on Section 12 specifications
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
      researchInterests,
      webText,
      publications,
      emailConfidence,
      acceptingMastersStatus,
      fundingEvidenceText,
    } = params;

    const lowerWeb = webText.toLowerCase();
    const studentInterests = (profile.researchInterests as any[]) || [];
    const thesisText = `${profile.thesisTitle} ${profile.thesisAbstract || ""}`.toLowerCase();
    const skills = profile.skills.map((s) => s.toLowerCase());

    // 1. Research Relevance (max 30)
    let researchScore = 8; // baseline
    const matchedTopics: string[] = [];

    // Check thesis topic alignment (e.g., healthcare AI, clinical prediction, disease prediction, ML/DL)
    if (
      thesisText.includes("kidney") ||
      thesisText.includes("chronic") ||
      thesisText.includes("disease") ||
      thesisText.includes("health") ||
      thesisText.includes("clinical") ||
      thesisText.includes("medical")
    ) {
      if (
        lowerWeb.includes("health") ||
        lowerWeb.includes("clinical") ||
        lowerWeb.includes("medical") ||
        lowerWeb.includes("biomedical") ||
        lowerWeb.includes("patient") ||
        lowerWeb.includes("disease")
      ) {
        researchScore += 14;
        matchedTopics.push("Healthcare / Clinical AI");
      }
    }

    if (
      lowerWeb.includes("machine learning") ||
      lowerWeb.includes("deep learning") ||
      lowerWeb.includes("artificial intelligence") ||
      lowerWeb.includes("data science")
    ) {
      researchScore += 8;
      matchedTopics.push("Machine Learning / Deep Learning");
    }

    researchScore = Math.min(30, researchScore);

    // 2. Technical Overlap (max 15)
    let technicalScore = 0;
    const matchedMethods: string[] = [];
    const methodsToCheck = [
      "python",
      "deep learning",
      "neural network",
      "machine learning",
      "xgboost",
      "random forest",
      "classification",
      "prediction",
      "preprocessing",
      "transformer",
      "pytorch",
      "tensorflow",
    ];

    for (const m of methodsToCheck) {
      if (lowerWeb.includes(m)) {
        technicalScore += 2;
        matchedMethods.push(m);
      }
    }

    // Full-stack engineering bonus (building lab tools / clinical web platforms)
    if (
      lowerWeb.includes("software") ||
      lowerWeb.includes("system") ||
      lowerWeb.includes("platform") ||
      lowerWeb.includes("tool") ||
      lowerWeb.includes("application") ||
      lowerWeb.includes("benchmark")
    ) {
      technicalScore += 3;
      matchedMethods.push("Lab System & Web Platform Engineering");
    }
    technicalScore = Math.min(15, Math.max(5, technicalScore));

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
    } else if (outreachArchetype === OutreachArchetype.PROFESSOR_LED && (country === "Canada" || country === "South Korea")) {
      fundingScore = 14; // In Canada & South Korea, CS thesis Master's are funded by default
    } else if (outreachArchetype === OutreachArchetype.CENTRAL_HIWI) {
      fundingScore = 12; // Tuition-free + paid HiWi opportunities
    }

    // 5. Master's Supervision Compatibility (max 10)
    let supervisionScore = 7;
    if (acceptingMastersStatus === "CONFIRMED_OPEN") {
      supervisionScore = 10;
    } else if (acceptingMastersStatus === "PHD_ONLY") {
      supervisionScore = 2;
    } else if (acceptingMastersStatus === "NOT_ACCEPTING") {
      supervisionScore = 0;
    } else if (lowerWeb.includes("master") || lowerWeb.includes("graduate students")) {
      supervisionScore = 9;
    }

    // 6. International Student Compatibility (max 5)
    let internationalScore = 4;
    if (
      lowerWeb.includes("international") ||
      country === "Canada" ||
      country === "Germany" ||
      country === "South Korea" ||
      country === "USA"
    ) {
      internationalScore = 5;
    }

    // 7. Program Compatibility (max 5)
    let programScore = 4;
    if (lowerWeb.includes("computer science") || lowerWeb.includes("informatics") || lowerWeb.includes("engineering")) {
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

    // Publication Relevance Attribution
    const matchedPublications = publications.slice(0, 3).map((pub) => {
      let reason = "Aligns with core machine learning and applied intelligent systems techniques.";
      const lowerTitle = pub.title.toLowerCase();
      if (
        lowerTitle.includes("health") ||
        lowerTitle.includes("clinical") ||
        lowerTitle.includes("medical") ||
        lowerTitle.includes("disease") ||
        lowerTitle.includes("patient")
      ) {
        reason = "Direct thematic synergy with your undergraduate thesis in clinical prediction and healthcare AI.";
      } else if (lowerTitle.includes("deep learning") || lowerTitle.includes("neural")) {
        reason = "Matches your deep neural network modeling and feature representation experience.";
      }
      return {
        title: pub.title,
        year: pub.publicationYear,
        relevanceReason: reason,
      };
    });

    const reasoning = `Strong research synergy in [${matchedTopics.join(", ")}]. Overlapping technical capabilities: ${matchedMethods.slice(0, 4).join(", ")}. ${recentPubs.length} recent publication(s) within active 3-year window.`;

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
