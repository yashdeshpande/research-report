import { PrismaClient } from "./generated/client";

const db = new PrismaClient();

async function main() {
  // Clear existing data
  await db.chatMessage.deleteMany();
  await db.documentChunk.deleteMany();
  await db.projectInsight.deleteMany();
  await db.reportContributor.deleteMany();
  await db.researchPlanRevision.deleteMany();
  await db.researchPlan.deleteMany();
  await db.report.deleteMany();
  await db.project.deleteMany();
  await db.productArea.deleteMany();
  await db.researcher.deleteMany();

  console.log("✓ Cleared existing data");

  // Create researchers
  const researcher1 = await db.researcher.create({
    data: {
      name: "Alice Johnson",
      email: "alice@example.com",
      passwordHash: "$2b$10$abc123", // placeholder hash
    },
  });

  const researcher2 = await db.researcher.create({
    data: {
      name: "Bob Smith",
      email: "bob@example.com",
      passwordHash: "$2b$10$def456", // placeholder hash
    },
  });

  const researcher3 = await db.researcher.create({
    data: {
      name: "Carol Williams",
      email: "carol@example.com",
      passwordHash: "$2b$10$ghi789", // placeholder hash
    },
  });

  console.log("✓ Created 3 researchers");

  // Create product areas
  const paymentArea = await db.productArea.create({
    data: {
      name: "Payments",
      description: "Research on payment flows and checkout optimization",
      createdById: researcher1.id,
    },
  });

  const checkoutArea = await db.productArea.create({
    data: {
      name: "Checkout Experience",
      description: "User experience research for the checkout funnel",
      createdById: researcher2.id,
    },
  });

  const loyaltyArea = await db.productArea.create({
    data: {
      name: "Loyalty Program",
      description: "Customer retention and rewards research",
      createdById: researcher3.id,
    },
  });

  console.log("✓ Created 3 product areas");

  // Create projects
  const paymentProject1 = await db.project.create({
    data: {
      name: "Mobile Payment Methods Q1 2026",
      description: "Research on preferred mobile payment methods for Gen Z users",
      productAreaId: paymentArea.id,
      createdById: researcher1.id,
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-03-31"),
    },
  });

  const paymentProject2 = await db.project.create({
    data: {
      name: "Payment Decline Recovery",
      description: "Study on handling failed payment attempts and recovery flows",
      productAreaId: paymentArea.id,
      createdById: researcher2.id,
      startDate: new Date("2026-02-01"),
      endDate: null,
    },
  });

  const checkoutProject = await db.project.create({
    data: {
      name: "Checkout Conversion Optimization",
      description: "A/B testing and UX improvements to reduce cart abandonment",
      productAreaId: checkoutArea.id,
      createdById: researcher1.id,
      startDate: new Date("2025-11-01"),
      endDate: new Date("2026-04-30"),
    },
  });

  const loyaltyProject = await db.project.create({
    data: {
      name: "Loyalty Tier System UX",
      description: "Research on user perception of tiered reward structures",
      productAreaId: loyaltyArea.id,
      createdById: researcher3.id,
      startDate: new Date("2026-01-20"),
      endDate: null,
    },
  });

  console.log("✓ Created 4 projects");

  // Create reports
  const report1 = await db.report.create({
    data: {
      title: "User Interview Summary: Mobile Payments",
      fileName: "interviews-mobile-payments.pdf",
      fileUrl: "https://storage.example.com/reports/interviews-mobile-payments.pdf",
      fileSize: 2450000,
      notes: "15 participants, ages 18-35, from urban areas. Key finding: Apple Pay preferred but Google Pay adoption growing.",
      status: "PUBLISHED",
      projectId: paymentProject1.id,
      createdById: researcher1.id,
      publishedAt: new Date("2026-02-10"),
    },
  });

  const report2 = await db.report.create({
    data: {
      title: "Payment Decline Patterns Analysis",
      fileName: "decline-patterns-2026.pdf",
      fileUrl: "https://storage.example.com/reports/decline-patterns-2026.pdf",
      fileSize: 1820000,
      notes: "Analysis of 50K payment decline events. 40% user recovers after first attempt, 25% abandon.",
      status: "PUBLISHED",
      projectId: paymentProject2.id,
      createdById: researcher2.id,
      publishedAt: new Date("2026-02-28"),
    },
  });

  const report3 = await db.report.create({
    data: {
      title: "A/B Test Results: Simplified Checkout",
      fileName: "ab-test-simplified-checkout.pdf",
      fileUrl: "https://storage.example.com/reports/ab-test-simplified-checkout.pdf",
      fileSize: 1200000,
      notes: "Removing address confirmation step reduced steps from 5 to 4. 12% improvement in conversion rate.",
      status: "DRAFT",
      projectId: checkoutProject.id,
      createdById: researcher1.id,
    },
  });

  const report4 = await db.report.create({
    data: {
      title: "Tier System Focus Group Notes",
      fileName: "focus-group-tiers.pdf",
      fileUrl: "https://storage.example.com/reports/focus-group-tiers.pdf",
      fileSize: 950000,
      notes: "8 focus group participants. Preference for transparent tier requirements over hidden status.",
      status: "ARCHIVED",
      projectId: loyaltyProject.id,
      createdById: researcher3.id,
      publishedAt: new Date("2026-01-25"),
    },
  });

  console.log("✓ Created 4 reports");

  console.log("\n✅ Database seeded successfully!");
  console.log(`
  Researchers: 3
  Product Areas: 3
  Projects: 4
  Reports: 4
  
  Ready to use!
  `);
}

main()
  .catch((err) => {
    console.error("Error seeding database:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
