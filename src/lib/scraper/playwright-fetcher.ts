import { chromium, BrowserContext, Page } from "playwright";
import { prisma } from "../prisma";

export interface PageExtractResult {
  url: string;
  domain: string;
  title: string;
  contentMarkdown: string;
  rawText: string;
  emailsFound: { email: string; source: string; confidence: number }[];
  prospectiveRules: {
    acceptingMastersStatus: "CONFIRMED_OPEN" | "PHD_ONLY" | "NOT_ACCEPTING" | "PORTAL_ONLY" | "UNKNOWN";
    requiredSubjectTag?: string;
    verbatimQuote?: string;
  };
  fundingEvidence?: string;
  labInfo?: { name?: string; url?: string };
  links: string[];
}

// Common university & challenge signatures
const CHALLENGE_SELECTORS = [
  "iframe[src*='challenges.cloudflare.com']",
  "iframe[src*='turnstile']",
  "div.cf-turnstile",
  "#cf-please-wait",
  "#challenge-stage",
  "div[class*='recaptcha']",
  "iframe[title*='reCAPTCHA']",
  "iframe[src*='hcaptcha']",
  "button:has-text('Verify you are human')",
  "button:has-text('I am not a robot')",
];

const EMAIL_REVEAL_SELECTORS = [
  "button:has-text('Reveal email')",
  "button:has-text('Show email')",
  "a:has-text('Show email')",
  "span[data-email]",
  ".email-protected",
];

export class PlaywrightFetcher {
  private static async getDomainSession(domain: string) {
    try {
      const session = await prisma.domainSession.findUnique({
        where: { domain },
      });
      return session?.storageStateJson ? (session.storageStateJson as any) : undefined;
    } catch {
      return undefined;
    }
  }

  private static async saveDomainSession(domain: string, context: BrowserContext) {
    try {
      const storageState = await context.storageState();
      await prisma.domainSession.upsert({
        where: { domain },
        update: {
          storageStateJson: storageState as any,
          updatedAt: new Date(),
        },
        create: {
          domain,
          storageStateJson: storageState as any,
        },
      });
    } catch (err) {
      console.warn(`[PlaywrightFetcher] Could not save domain session for ${domain}:`, err);
    }
  }

  /**
   * Fetches and parses a faculty/lab/university webpage with:
   * 1. Persistent cookie reuse
   * 2. 1-Attempt automated CAPTCHA resolution
   * 3. Fallback to local headed browser window on user's desktop if auto attempt fails
   */
  public static async fetchPage(targetUrl: string): Promise<PageExtractResult> {
    const parsedUrl = new URL(targetUrl);
    const domain = parsedUrl.hostname;

    // Check saved session
    const savedState = await this.getDomainSession(domain);

    let browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    let context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      storageState: savedState,
      viewport: { width: 1280, height: 800 },
    });

    let page = await context.newPage();

    try {
      console.log(`[PlaywrightFetcher] Visiting ${targetUrl} (headless)...`);
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Check if security challenge is present
      const hasChallenge = await this.detectChallenge(page);

      if (hasChallenge) {
        console.log(`[PlaywrightFetcher] Security challenge detected on ${domain}. Starting Attempt #1 (automated solve)...`);

        const autoSolved = await this.attemptAutoSolve(page);

        if (!autoSolved) {
          console.warn(
            `[PlaywrightFetcher] Automated solve failed (maxAutoAttempts=1 reached). Launching headed window on desktop for user verification...`
          );

          // Close headless and launch headed browser for user to solve
          await browser.close();

          browser = await chromium.launch({
            headless: false,
            args: ["--disable-blink-features=AutomationControlled"],
          });

          context = await browser.newContext({
            userAgent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            storageState: savedState,
            viewport: { width: 1280, height: 800 },
          });

          page = await context.newPage();
          await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

          // Wait for user to complete the challenge
          await this.waitForUserSolve(page);
          console.log(`[PlaywrightFetcher] Challenge successfully solved by user! Persisting clearance session.`);
        } else {
          console.log(`[PlaywrightFetcher] Challenge auto-solved on Attempt #1!`);
        }

        // Save clearance state for future visits
        await this.saveDomainSession(domain, context);
      }

      // Handle any obfuscated "Click to reveal email" elements
      await this.handleEmailReveals(page);

      // Extract structured content
      const result = await this.extractPageData(page, targetUrl, domain);

      // Save updated cookies
      await this.saveDomainSession(domain, context);

      return result;
    } finally {
      await browser.close().catch(() => {});
    }
  }

  private static async detectChallenge(page: Page): Promise<boolean> {
    try {
      for (const sel of CHALLENGE_SELECTORS) {
        const count = await page.locator(sel).count();
        if (count > 0) return true;
      }
      const title = await page.title();
      if (
        title.toLowerCase().includes("just a moment") ||
        title.toLowerCase().includes("security check") ||
        title.toLowerCase().includes("attention required") ||
        title.toLowerCase().includes("cloudflare")
      ) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private static async attemptAutoSolve(page: Page): Promise<boolean> {
    try {
      // 1. Wait 4 seconds for proof-of-work JS challenges
      await page.waitForTimeout(4000);
      if (!(await this.detectChallenge(page))) {
        return true;
      }

      // 2. Try clicking turnstile or standard checkbox frame once
      for (const frame of page.frames()) {
        try {
          const checkbox = frame.locator("input[type='checkbox'], #cf-stage, .ctp-checkbox-label");
          if ((await checkbox.count()) > 0 && (await checkbox.first().isVisible())) {
            await checkbox.first().click({ delay: 100 });
            await page.waitForTimeout(4000);
            if (!(await this.detectChallenge(page))) {
              return true;
            }
          }
        } catch {}
      }

      // Check if title cleared
      const title = await page.title();
      if (
        !title.toLowerCase().includes("just a moment") &&
        !title.toLowerCase().includes("security check") &&
        !title.toLowerCase().includes("attention required")
      ) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private static async waitForUserSolve(page: Page): Promise<void> {
    // Wait up to 2 minutes for user to solve challenge in headed window
    const maxWaitMs = 120000;
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      const stillHasChallenge = await this.detectChallenge(page);
      if (!stillHasChallenge) {
        await page.waitForTimeout(2000); // let page settle
        return;
      }
      await page.waitForTimeout(1500);
    }
    throw new Error("Timeout waiting for user to solve security verification in browser window.");
  }

  private static async handleEmailReveals(page: Page): Promise<void> {
    try {
      for (const sel of EMAIL_REVEAL_SELECTORS) {
        const buttons = page.locator(sel);
        const count = await buttons.count();
        for (let i = 0; i < Math.min(count, 5); i++) {
          try {
            if (await buttons.nth(i).isVisible()) {
              await buttons.nth(i).click({ timeout: 1000 }).catch(() => {});
            }
          } catch {}
        }
      }
    } catch {}
  }

  private static async extractPageData(page: Page, url: string, domain: string): Promise<PageExtractResult> {
    const title = await page.title();

    // Extract text content and structured info directly from DOM
    const data = await page.evaluate(() => {
      // Remove scripts, styles, noscript, nav, footer from body copy
      const clone = document.body.cloneNode(true) as HTMLElement;
      const elementsToRemove = clone.querySelectorAll("script, style, noscript, svg, nav, footer, header");
      elementsToRemove.forEach((el) => el.remove());

      const rawText = clone.innerText || "";

      // Extract all emails matching regex
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const emailMatches = Array.from(new Set(rawText.match(emailRegex) || []));

      // Extract mailto links
      const mailtoLinks = Array.from(document.querySelectorAll("a[href^='mailto:']")).map((a) => {
        const href = a.getAttribute("href") || "";
        return href.replace("mailto:", "").split("?")[0].trim();
      });

      const allEmails = Array.from(new Set([...emailMatches, ...mailtoLinks])).filter((e) => {
        const lower = e.toLowerCase();
        return (
          !lower.endsWith(".png") &&
          !lower.endsWith(".jpg") &&
          !lower.includes("example.com") &&
          !lower.includes("sentry") &&
          !lower.includes("wixpress")
        );
      });

      // Extract outgoing links
      const allLinks = Array.from(document.querySelectorAll("a[href]"))
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => href.startsWith("http"));

      return { rawText, allEmails, allLinks };
    });

    // Score email confidence
    const emailsFound = data.allEmails.map((email) => {
      const emailDomain = email.split("@")[1]?.toLowerCase() || "";
      const isEdu =
        emailDomain.endsWith(".edu") ||
        emailDomain.endsWith(".ac.uk") ||
        emailDomain.endsWith(".ca") ||
        emailDomain.endsWith(".de") ||
        emailDomain.endsWith(".se") ||
        emailDomain.endsWith(".fi") ||
        emailDomain.endsWith(".nl") ||
        emailDomain.endsWith(".kr") ||
        emailDomain.endsWith(".jp") ||
        emailDomain.endsWith(".au");

      let confidence = 70;
      let source = "General Webpage Text";

      if (domain.includes(emailDomain) || emailDomain.includes(domain)) {
        confidence = 95;
        source = "Official University Domain Faculty Page";
      } else if (isEdu) {
        confidence = 90;
        source = "Academic Institutional Domain (.edu/.ac.uk/.de)";
      }

      return { email, source, confidence };
    });

    // Prospective student easter eggs & rule detector
    const prospectiveRules = this.detectProspectiveStudentRules(data.rawText);

    // Funding statement detector
    const fundingEvidence = this.detectFundingStatements(data.rawText);

    // Markdown summary
    const contentMarkdown = `# ${title}\n\n**Source URL:** ${url}\n\n${data.rawText.slice(0, 8000)}`;

    return {
      url,
      domain,
      title,
      contentMarkdown,
      rawText: data.rawText,
      emailsFound,
      prospectiveRules,
      fundingEvidence,
      links: data.allLinks.slice(0, 50),
    };
  }

  private static detectProspectiveStudentRules(text: string) {
    const lower = text.toLowerCase();
    let acceptingMastersStatus: "CONFIRMED_OPEN" | "PHD_ONLY" | "NOT_ACCEPTING" | "PORTAL_ONLY" | "UNKNOWN" = "UNKNOWN";
    let requiredSubjectTag: string | undefined = undefined;
    let verbatimQuote: string | undefined = undefined;

    // Check for explicit "not accepting" notices
    if (
      lower.includes("not accepting new students") ||
      lower.includes("not taking students") ||
      lower.includes("on sabbatical") ||
      lower.includes("no openings for master")
    ) {
      acceptingMastersStatus = "NOT_ACCEPTING";
      const match = text.match(/(.{0,80}(?:not accepting|not taking|on sabbatical|no openings).{0,120})/i);
      verbatimQuote = match ? match[1].trim() : "Professor website indicates no current openings.";
    } else if (lower.includes("only recruiting phd") || lower.includes("phd students only")) {
      acceptingMastersStatus = "PHD_ONLY";
      verbatimQuote = "Lab is currently only recruiting PhD students, not Master's students.";
    } else if (
      lower.includes("apply through the department") ||
      lower.includes("do not email me directly") ||
      lower.includes("fill out this form") ||
      lower.includes("google form")
    ) {
      acceptingMastersStatus = "PORTAL_ONLY";
      const match = text.match(/(.{0,80}(?:apply through|do not email|fill out this form|google form).{0,120})/i);
      verbatimQuote = match ? match[1].trim() : "Professor requests applications via portal/form rather than direct email.";
    } else if (
      lower.includes("looking for motivated master") ||
      lower.includes("seeking master's students") ||
      lower.includes("openings for graduate students") ||
      lower.includes("accepting master")
    ) {
      acceptingMastersStatus = "CONFIRMED_OPEN";
      const match = text.match(/(.{0,80}(?:looking for|seeking|openings for|accepting).{0,120})/i);
      verbatimQuote = match ? match[1].trim() : "Website explicitly mentions recruiting prospective graduate/Master's students.";
    }

    // Check for codeword / subject tag easter eggs
    // e.g. "include [AI-2027] in your subject line" or "subject line: Prospective Student"
    const subjectRegex = /(?:subject\s*(?:line)?|include|tag)[^.\n]{1,60}(?:\[([A-Z0-9_\-\s]+)\]|["']([A-Z0-9_\-\s]+)["'])/i;
    const subjectMatch = text.match(subjectRegex);
    if (subjectMatch) {
      requiredSubjectTag = subjectMatch[1] ? `[${subjectMatch[1].trim()}]` : `[${subjectMatch[2].trim()}]`;
    }

    return {
      acceptingMastersStatus,
      requiredSubjectTag,
      verbatimQuote,
    };
  }

  private static detectFundingStatements(text: string): string | undefined {
    const fundingRegex =
      /(.{0,100}(?:funded by|research grant|nsf grant|nih grant|nserc|dfg|horizon europe|research assistantship|ra position|stipend available).{0,120})/i;
    const match = text.match(fundingRegex);
    return match ? match[1].trim() : undefined;
  }
}
