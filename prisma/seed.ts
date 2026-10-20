import { PrismaClient, OutreachArchetype } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with default user and academic profile...");

  // Create or update default User
  const user = await prisma.user.upsert({
    where: { email: "syied.salim@example.com" },
    update: {},
    create: {
      name: "Mohammad Syied Bin Salim",
      email: "syied.salim@example.com",
      country: "Bangladesh",
    },
  });

  // Create or update Academic Profile
  const profile = await prisma.academicProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      degree: "BSc in Computer Science and Engineering",
      university: "Port City International University, Bangladesh",
      graduationYear: 2024,
      cgpa: 3.35,
      cgpaScale: 4.0,
      thesisTitle: "Early Prediction of Chronic Kidney Disease Using Machine Learning and Deep Learning",
      thesisAbstract:
        "Investigated early risk prediction of Chronic Kidney Disease (CKD) using machine learning algorithms and artificial neural networks on clinical datasets, incorporating rigorous missing-value imputation, feature scaling, PCA, and comparative evaluations across KNN, Random Forest, XGBoost, and Deep Neural Networks.",
      thesisMethods: [
        "Machine Learning",
        "Deep Learning",
        "Python",
        "Data Preprocessing",
        "Missing-value Imputation",
        "Categorical Encoding",
        "Feature Scaling",
        "PCA",
        "KNN",
        "Random Forest",
        "Gradient Boosting",
        "XGBoost",
        "Artificial Neural Networks",
      ],
      skills: [
        "React",
        "Next.js",
        "Node.js",
        "TypeScript",
        "PostgreSQL",
        "Prisma",
        "REST APIs",
        "Authentication",
        "ERP Systems",
        "Automation",
        "Python",
        "Machine Learning",
        "Deep Learning",
        "Data Science",
      ],
      researchInterests: [
        { name: "Artificial Intelligence", weight: 10 },
        { name: "Machine Learning", weight: 10 },
        { name: "Deep Learning", weight: 10 },
        { name: "AI for Healthcare", weight: 9 },
        { name: "Data Science", weight: 8 },
        { name: "Natural Language Processing", weight: 7 },
        { name: "Computer Vision", weight: 7 },
        { name: "Software Engineering for AI", weight: 6 },
      ],
      targetCountries: [
        "Germany",
        "USA",
        "Canada",
        "UK",
        "Sweden",
        "Finland",
        "Norway",
        "Netherlands",
        "Denmark",
        "Australia",
        "Japan",
        "South Korea",
      ],
      fullyFundedOnly: true,
      acceptTuitionWaiver: true,
      acceptPartialFunding: false,
      acceptSelfFunded: false,
    },
  });

  // Seed reference universities with their outreach archetype
  const universities = [
    {
      name: "University of Toronto",
      country: "Canada",
      city: "Toronto",
      website: "https://www.utoronto.ca",
      domain: "utoronto.ca",
      outreachArchetype: OutreachArchetype.PROFESSOR_LED,
      fundingInformation: "Thesis MSc in CS provides a standard funding package (~$22,000+ stipend + tuition) guaranteed by the department/supervisor.",
    },
    {
      name: "Technical University of Munich (TUM)",
      country: "Germany",
      city: "Munich",
      website: "https://www.tum.de",
      domain: "tum.de",
      outreachArchetype: OutreachArchetype.CENTRAL_HIWI,
      fundingInformation: "Central MSc admissions via portal; professors recruit paid student research assistants (HiWi) for active lab projects.",
    },
    {
      name: "KTH Royal Institute of Technology",
      country: "Sweden",
      city: "Stockholm",
      website: "https://www.kth.se",
      domain: "kth.se",
      outreachArchetype: OutreachArchetype.SCHOLARSHIP_LED,
      fundingInformation: "Non-EU students apply for Swedish Institute and KTH Tuition Fee Waivers via central portal.",
    },
    {
      name: "Korea Advanced Institute of Science and Technology (KAIST)",
      country: "South Korea",
      city: "Daejeon",
      website: "https://www.kaist.ac.kr",
      domain: "kaist.ac.kr",
      outreachArchetype: OutreachArchetype.PROFESSOR_LED,
      fundingInformation: "KAIST International Student Scholarship covers full tuition + monthly stipend provided via lab research projects (BK21/NRF).",
    },
    {
      name: "Georgia Institute of Technology",
      country: "USA",
      city: "Atlanta",
      website: "https://www.gatech.edu",
      domain: "gatech.edu",
      outreachArchetype: OutreachArchetype.PROFESSOR_LED,
      fundingInformation: "Graduate Research Assistantships (GRA) and Teaching Assistantships (GTA) provide full tuition remission plus monthly stipend.",
    },
  ];

  for (const uni of universities) {
    await prisma.university.upsert({
      where: { name: uni.name },
      update: uni,
      create: uni,
    });
  }

  console.log(`Database seeded successfully! User: ${user.name}, Profile ID: ${profile.id}`);
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
