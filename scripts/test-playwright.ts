import { PlaywrightFetcher } from "../src/lib/scraper/playwright-fetcher";
import { prisma } from "../src/lib/prisma";

async function testPlaywright() {
  console.log("=== Testing Playwright Scraper Engine ===");
  const testUrl = "https://example.com";
  console.log(`Fetching ${testUrl}...`);
  const result = await PlaywrightFetcher.fetchPage(testUrl);
  console.log(`Page title: ${result.title}`);
  console.log(`Domain: ${result.domain}`);
  console.log(`Extracted text preview: ${result.rawText.slice(0, 100).replace(/\n/g, " ")}`);
  console.log(`Links found: ${result.links.length}`);
  console.log(">>> Playwright engine executed cleanly! <<<");
}

testPlaywright()
  .catch((e) => {
    console.error("Playwright test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
