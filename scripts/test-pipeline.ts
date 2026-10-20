import { prisma } from "../src/lib/prisma";
import { OpenAlexService } from "../src/lib/academic/openalex";
import { OpportunityScorer } from "../src/lib/ai/opportunity-scorer";
import { EmailGenerator } from "../src/lib/ai/email-generator";
import { OutreachArchetype, EmailConfidenceStatus } from "@prisma/client";

async function runTests() {
  console.log("=== Running Pipeline Verification Tests ===");

  // 1. Verify User Profile in DB
  const user = await prisma.user.findFirst({
    include: { academicProfile: true },
  });
  console.log(`[Test 1] User found: ${user?.name}, CGPA: ${user?.academicProfile?.cgpa}`);
  if (!user || !user.academicProfile) throw new Error("Student profile missing in DB");

  // 2. Test OpenAlex Author Search (e.g. Yoshua Bengio or Clinical ML researcher)
  console.log("[Test 2] Testing OpenAlex API lookup...");
  const author = await OpenAlexService.searchAuthor("Yoshua Bengio", "Montreal");
  console.log(`[Test 2 Result] Author found: ${author?.displayName}, Works: ${author?.worksCount}`);
  if (author) {
    const works = await OpenAlexService.getRecentWorks(author.id, 2);
    console.log(`[Test 2 Result] Recent works fetched: ${works.length}, Top paper: ${works[0]?.title}`);
  }

  // 3. Test Opportunity Scorer on a Healthcare AI professor profile
  console.log("[Test 3] Testing Opportunity Scorer calculation...");
  const mockPubs = [
    {
      id: "pub-1",
      title: "Machine Learning for Clinical Prediction of Renal and Chronic Diseases",
      publicationYear: 2025,
      citedByCount: 42,
      concepts: [{ displayName: "Healthcare AI", score: 0.95 }],
    },
  ];

  const scoreResult = OpportunityScorer.calculateScore({
    profile: user.academicProfile,
    professorName: "Dr. Catherine Chen",
    country: "Canada",
    outreachArchetype: OutreachArchetype.PROFESSOR_LED,
    researchInterests: ["Machine Learning", "Healthcare AI", "Clinical Decision Support"],
    webText: "Our lab focuses on clinical prediction and healthcare machine learning. We have funded research assistantships for graduate students supported by NSERC and CIHR grants. Seeking motivated Master's students.",
    publications: mockPubs,
    emailConfidence: EmailConfidenceStatus.VERIFIED_OFFICIAL,
    acceptingMastersStatus: "CONFIRMED_OPEN",
    fundingEvidenceText: "Funded research assistantships for graduate students supported by NSERC and CIHR grants",
  });

  console.log(`[Test 3 Result] Total Opportunity Score: ${scoreResult.totalScore}/100 (Tier ${scoreResult.tier})`);
  console.log(`[Test 3 Breakdown] Research: ${scoreResult.researchScore}/30, Technical: ${scoreResult.technicalScore}/15, Funding: ${scoreResult.fundingScore}/20, Supervision: ${scoreResult.supervisionScore}/10`);

  // 4. Test Email Generator with Easter-Egg Codeword injection
  console.log("[Test 4] Testing Email Generator with secret subject tag injection...");
  const emailDraft = EmailGenerator.generateDraft({
    profile: user.academicProfile,
    professorName: "Dr. Catherine Chen",
    universityName: "University of Toronto",
    country: "Canada",
    outreachArchetype: OutreachArchetype.PROFESSOR_LED,
    facultyUrl: "https://web.cs.toronto.edu/people/faculty",
    publications: mockPubs,
    requiredSubjectTag: "[MSc-2027-Lab]",
    studentName: user.name,
    mode: "BALANCED",
  });

  console.log(`[Test 4 Result] Generated Subject: ${emailDraft.subject}`);
  console.log(`[Test 4 Result] Word Count: ${emailDraft.wordCount} words (Target: 150-250)`);
  console.log(`[Test 4 Result] Quality Check Passed: ${emailDraft.qualityPassed}`);
  console.log(`[Test 4 Result] Claim Citations count: ${emailDraft.claimCitations.length}`);

  if (!emailDraft.subject.includes("[MSc-2027-Lab]")) {
    throw new Error("Codeword tag injection failed!");
  }
  if (emailDraft.wordCount < 100 || emailDraft.wordCount > 300) {
    throw new Error(`Word count ${emailDraft.wordCount} out of acceptable range!`);
  }

  console.log("\n>>> ALL PIPELINE TESTS PASSED SUCCESSFULLY! <<<");
}

runTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
