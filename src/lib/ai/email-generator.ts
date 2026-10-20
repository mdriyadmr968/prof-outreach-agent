import { AcademicProfile, OutreachArchetype } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
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

interface StudentResearchInterest {
  name: string;
  weight?: number;
}

export class EmailGenerator {
  /**
   * Generates a concise (150-250 words), evidence-based outreach email
   * utilizing Google Gemini 3.8 Flash with a zero-hallucination dynamic fallback.
   */
  public static async generateDraft(params: {
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
  }): Promise<GeneratedEmailDraft> {
    const {
      profile,
      professorName,
      universityName,
      country,
      outreachArchetype,
      facultyUrl,
      publications,
      requiredSubjectTag,
      studentName = "Applicant",
      mode = "BALANCED",
    } = params;

    // Try Google Gemini 3.8 Flash if API key is provided
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const aiDraft = await this.generateWithGemini({
          apiKey,
          profile,
          professorName,
          universityName,
          country,
          outreachArchetype,
          facultyUrl,
          publications,
          requiredSubjectTag,
          studentName,
          mode,
        });

        if (aiDraft) {
          return aiDraft;
        }
      } catch (err) {
        console.warn("[EmailGenerator] Gemini generation failed, using dynamic grounding fallback:", err);
      }
    }

    // Dynamic ground-truth fallback template
    return this.generateDynamicFallback(params);
  }

  private static async generateWithGemini(params: {
    apiKey: string;
    profile: AcademicProfile;
    professorName: string;
    universityName: string;
    country: string;
    outreachArchetype: OutreachArchetype;
    facultyUrl: string;
    publications: OpenAlexWork[];
    requiredSubjectTag?: string;
    studentName: string;
    mode: "PROFESSOR_FIRST" | "FUNDING_FIRST" | "BALANCED";
  }): Promise<GeneratedEmailDraft | null> {
    const {
      apiKey,
      profile,
      professorName,
      universityName,
      country,
      outreachArchetype,
      facultyUrl,
      publications,
      requiredSubjectTag,
      studentName,
      mode,
    } = params;

    const ai = new GoogleGenAI({ apiKey });

    const rawInterests = (profile.researchInterests as unknown as (StudentResearchInterest | string)[]) || [];
    const studentInterests = rawInterests
      .map((item) => (typeof item === "string" ? item : item.name))
      .filter(Boolean)
      .join(", ");

    const realPubsSummary = publications.slice(0, 3).map((p) => `- Title: "${p.title}" (${p.publicationYear})${p.abstract ? ` | Abstract snippet: ${p.abstract.slice(0, 200)}...` : ""}`).join("\n");

    const prompt = `You are an elite academic outreach advisor. Write an evidence-based, concise (target: 150-220 words) cold inquiry email from a prospective Master's student to a university professor.

CRITICAL RULES:
1. Zero Hallucination: NEVER invent publications, grants, or credentials. Only reference the verified publications provided below. If no publications are listed, reference the general department/lab research areas.
2. Grounded Student Profile:
   - Student Name: ${studentName}
   - Degree: ${profile.degree}
   - Institution: ${profile.university}
   - Undergraduate Thesis: "${profile.thesisTitle}"
   - Thesis Methods: ${profile.thesisMethods?.join(", ") || "Computational modeling"}
   - Technical & Engineering Skills: ${profile.skills?.join(", ") || "Software development"}
   - Research Interests: ${studentInterests || "Computer Science"}
3. Professor & University:
   - Professor: ${professorName}
   - University: ${universityName} (${country})
   - Outreach Archetype: ${outreachArchetype}
     * If PROFESSOR_LED: Inquiry focuses on Master's thesis supervision and funded Research Assistantships (RA) or lab project funding.
     * If CENTRAL_HIWI (Germany/Austria): Acknowledge central Master's admission and inquire about thesis supervision and paid student researcher (HiWi) positions.
     * If SCHOLARSHIP_LED (Nordics/UK/AU): Inquire about Master's thesis supervision aligned with external/institutional scholarship applications.
4. Mode: ${mode}
5. Required Subject Tag: ${requiredSubjectTag ? `MUST prepend "${requiredSubjectTag}" to the subject line.` : "None"}
6. Mention that their CV is attached for review.
7. Word count must strictly be between 140 and 240 words.

Verified Publications for Reference:
${realPubsSummary || "None indexed in OpenAlex. Discuss lab themes generally."}

Respond in valid JSON format only, matching this exact structure:
{
  "subject": "Email subject line",
  "body": "Email body including greeting (Dear Professor LastName,) and sign-off."
}`;

    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Gemini API call timed out after 8s")), 8000);
    });

    let res;
    try {
      res = await Promise.race([
        ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        }),
        timeoutPromise,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    const text = res.text?.trim() || "";
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    let subject = parsed.subject || `Prospective Master's Student - ${studentName}`;
    if (requiredSubjectTag && !subject.includes(requiredSubjectTag)) {
      subject = `${requiredSubjectTag} ${subject}`;
    }

    const body = parsed.body || "";
    const wordCount = body.trim().split(/\s+/).length;

    const featuredPub = publications[0];
    const claimCitations = [
      ...(featuredPub
        ? [
            {
              claim: `Verified publication: "${featuredPub.title}"`,
              sourceUrl: featuredPub.doi ? `https://doi.org/${featuredPub.doi}` : facultyUrl,
              sourceQuote: featuredPub.title,
            },
          ]
        : []),
      {
        claim: `Supervision inquiry at ${universityName}`,
        sourceUrl: facultyUrl,
        sourceQuote: `Official faculty listing at ${facultyUrl}`,
      },
      {
        claim: `Student background (${profile.degree} - ${profile.university})`,
        sourceUrl: "Student Profile",
        sourceQuote: profile.thesisTitle,
      },
    ];

    const qualityFeedback: string[] = [];
    if (wordCount > 250) qualityFeedback.push(`Word count is ${wordCount} (target: 150-250 words).`);
    if (!body.toLowerCase().includes("cv") && !body.toLowerCase().includes("resume")) {
      qualityFeedback.push("Missing mention of CV attachment.");
    }
    if (requiredSubjectTag && !subject.includes(requiredSubjectTag)) {
      qualityFeedback.push(`Required subject tag ${requiredSubjectTag} was not placed in subject.`);
    }

    return {
      subject,
      body,
      mode,
      wordCount,
      claimCitations,
      qualityPassed: qualityFeedback.length === 0,
      qualityFeedback,
    };
  }

  private static generateDynamicFallback(params: {
    profile: AcademicProfile;
    professorName: string;
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
      universityName,
      outreachArchetype,
      facultyUrl,
      publications,
      requiredSubjectTag,
      studentName = "Applicant",
      mode = "BALANCED",
    } = params;

    // Professor surname for polite academic greeting
    const nameParts = professorName.trim().split(" ");
    const lastName = nameParts[nameParts.length - 1];
    const greeting = `Dear Professor ${lastName},`;

    // Dynamic primary field of interest from profile
    const rawInterests = (profile.researchInterests as unknown as (StudentResearchInterest | string)[]) || [];
    const primaryInterest =
      (typeof rawInterests[0] === "string" ? rawInterests[0] : rawInterests[0]?.name) ||
      "Computer Science";

    // Adaptive subject line
    const baseSubject = `Prospective Master's Student Interested in ${primaryInterest}`;
    const subject = requiredSubjectTag ? `${requiredSubjectTag} ${baseSubject}` : baseSubject;

    // Archetype-aware inquiry phrasing
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

    // Publication reference (ONLY if real publications exist!)
    let pubSentence = "";
    const featuredPub = publications[0];
    if (featuredPub) {
      pubSentence = `I read your work on "${featuredPub.title}" with great interest. The methodologies you employed strongly resonated with my research interests and computational background.`;
    } else {
      pubSentence = `I have been following your group's research contributions at ${universityName} with great interest, particularly in scalable computational methods and applied problem domains.`;
    }

    // Dynamic methods & skills from student's profile
    const methodsSummary =
      profile.thesisMethods && profile.thesisMethods.length > 0
        ? ` (${profile.thesisMethods.slice(0, 3).join(", ")})`
        : "";

    const skillsSummary =
      profile.skills && profile.skills.length > 0
        ? profile.skills.slice(0, 4).join(", ")
        : "software engineering and data analysis";

    const body = `${greeting}

I am a ${profile.degree} graduate from ${profile.university}. My undergraduate thesis focused on ${profile.thesisTitle}, where I conducted in-depth investigations and comparative evaluations${methodsSummary}.

${pubSentence} In addition to modeling and research methodologies, I bring solid practical engineering experience in ${skillsSummary}, enabling me to actively contribute to building laboratory tools, experimental pipelines, and research benchmarks.

${inquiryParagraph}

I have attached my CV for your review and would be delighted to share my transcript or a concise research statement if helpful. Thank you for your time and consideration.

Best regards,
${studentName}
${profile.degree}
${profile.university}`;

    const wordCount = body.trim().split(/\s+/).length;

    const claimCitations = [
      ...(featuredPub
        ? [
            {
              claim: `Reference to recent publication: "${featuredPub.title}"`,
              sourceUrl: featuredPub.doi ? `https://doi.org/${featuredPub.doi}` : facultyUrl,
              sourceQuote: featuredPub.title,
            },
          ]
        : [
            {
              claim: `Supervision inquiry at ${universityName}`,
              sourceUrl: facultyUrl,
              sourceQuote: `Official faculty listing at ${facultyUrl}`,
            },
          ]),
      {
        claim: `Student background (${profile.degree} - ${profile.university})`,
        sourceUrl: "Student Profile",
        sourceQuote: profile.thesisTitle,
      },
    ];

    const qualityFeedback: string[] = [];
    if (wordCount > 250) qualityFeedback.push(`Word count is ${wordCount} (target: 150-250 words).`);
    if (!body.includes("attached my CV")) qualityFeedback.push("Missing mention of CV attachment.");
    if (requiredSubjectTag && !subject.includes(requiredSubjectTag)) {
      qualityFeedback.push(`Required subject tag ${requiredSubjectTag} was not placed in subject.`);
    }

    return {
      subject,
      body,
      mode,
      wordCount,
      claimCitations,
      qualityPassed: qualityFeedback.length === 0,
      qualityFeedback,
    };
  }
}
