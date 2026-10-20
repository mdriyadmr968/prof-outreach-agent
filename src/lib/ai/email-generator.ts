import { AcademicProfile, OutreachArchetype } from "@prisma/client";
import { OpenAlexWork } from "../academic/openalex";

export interface GeneratedEmailDraft {
  subject: string;
  body: string;
  mode: "PROFESSOR_FIRST" | "FUNDING_FIRST" | "BALANCED";
  wordCount: number;
  claimCitations: {
    claim: string;
    sourceUrl: string;
    sourceQuote?: string;
  }[];
  qualityPassed: boolean;
  qualityFeedback: string[];
}

export class EmailGenerator {
  /**
   * Generates a concise (150-250 words), evidence-based outreach email
   */
  public static generateDraft(params: {
    profile: AcademicProfile;
    professorName: string;
    department?: string;
    universityName: string;
    country: string;
    outreachArchetype: OutreachArchetype;
    facultyUrl: string;
    publications: OpenAlexWork[];
    requiredSubjectTag?: string;
    studentName?: string;
    mode?: "PROFESSOR_FIRST" | "FUNDING_FIRST" | "BALANCED";
  }): GeneratedEmailDraft {
    const {
      profile,
      professorName,
      department,
      universityName,
      country,
      outreachArchetype,
      facultyUrl,
      publications,
      requiredSubjectTag,
      studentName = "Mohammad Syied Bin Salim",
      mode = "BALANCED",
    } = params;

    // Pick top relevant publication for citation
    const featuredPub = publications[0];
    const pubTitle = featuredPub ? `"${featuredPub.title}"` : "your recent clinical machine learning publications";
    const pubUrl = featuredPub?.doi ? `https://doi.org/${featuredPub.doi}` : facultyUrl;

    // Clean up professor surname
    const nameParts = professorName.trim().split(" ");
    const lastName = nameParts[nameParts.length - 1];
    const greeting = `Dear Professor ${lastName},`;

    // Adaptive subject line with easter-egg codeword injection if present
    const baseSubject = `Prospective Master's Student Interested in Healthcare Machine Learning`;
    const subject = requiredSubjectTag ? `${requiredSubjectTag} ${baseSubject}` : baseSubject;

    // Country & Archetype adaptive inquiry phrasing
    let inquiryParagraph = "";
    if (outreachArchetype === OutreachArchetype.PROFESSOR_LED) {
      if (mode === "FUNDING_FIRST") {
        inquiryParagraph = `I would be grateful to know whether you anticipate taking Master's students for the upcoming intake, particularly through funded research assistantships (RA) or active project grants in your laboratory.`;
      } else {
        inquiryParagraph = `I would be grateful to know whether you expect to supervise Master's students for the upcoming intake and whether there may be opportunities to join your group through a funded research assistantship or graduate scholarship.`;
      }
    } else if (outreachArchetype === OutreachArchetype.CENTRAL_HIWI) {
      inquiryParagraph = `As I prepare my application for the Master's program at ${universityName}, I would be grateful to learn if your group offers prospective Master's thesis supervision or student research assistant (HiWi) positions on active research projects.`;
    } else {
      inquiryParagraph = `I am preparing applications for Master's study and institutional scholarships, and would be eager to know if your group is open to supervising research-focused Master's students in this area.`;
    }

    // Highlighting thesis + engineering capability
    const body = `${greeting}

I am a Computer Science and Engineering graduate from Port City International University in Bangladesh with research experience in applied machine learning and clinical predictive modeling. My undergraduate thesis focused on ${profile.thesisTitle.toLowerCase()}, where I developed and evaluated comparative ML algorithms (XGBoost, Random Forest, and Neural Networks) with clinical data preprocessing pipelines.

I read your work on ${pubTitle} with great interest. The methodologies you employed strongly resonated with my background in handling clinical features and predictive risk stratification. In addition to ML modeling, I bring solid full-stack software engineering experience (TypeScript, Next.js, PostgreSQL), allowing me to actively contribute to building production tools, data pipelines, and research benchmarks for your group.

${inquiryParagraph}

I have attached my CV for your review and would be delighted to share my transcript or a concise research proposal if helpful. Thank you for your time and consideration.

Best regards,
${studentName}
BSc in Computer Science and Engineering`;

    const wordCount = body.trim().split(/\s+/).length;

    // Build claim-to-source traceability matrix
    const claimCitations = [
      {
        claim: `Reference to recent publication: ${pubTitle}`,
        sourceUrl: pubUrl,
        sourceQuote: featuredPub?.title || "Official Faculty Publications Page",
      },
      {
        claim: `Supervision inquiry aligned with ${universityName}`,
        sourceUrl: facultyUrl,
        sourceQuote: `Official faculty listing at ${facultyUrl}`,
      },
      {
        claim: `Student background (Thesis & Methods)`,
        sourceUrl: "Student Profile",
        sourceQuote: profile.thesisTitle,
      },
    ];

    // Quick quality checks
    const qualityFeedback: string[] = [];
    if (wordCount > 250) {
      qualityFeedback.push(`Word count is ${wordCount} (target: 150-250 words).`);
    }
    if (!body.includes("attached my CV")) {
      qualityFeedback.push("Missing mention of CV attachment.");
    }
    if (requiredSubjectTag && !subject.includes(requiredSubjectTag)) {
      qualityFeedback.push(`Required subject tag ${requiredSubjectTag} was not placed in subject.`);
    }

    const qualityPassed = qualityFeedback.length === 0;

    return {
      subject,
      body,
      mode,
      wordCount,
      claimCitations,
      qualityPassed,
      qualityFeedback,
    };
  }
}
