import { Elysia } from "elysia";
import puppeteer, { type Browser } from "puppeteer";
import { createLogger } from "@logger";
import { upload } from "@storage";
import { renderOgHtml } from "./template";

const log = createLogger("og");
const PORT = 3004;

let browser: Browser;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    log.info("Browser launched");
  }
  return browser;
}

async function generateOgImage(
  slug: string,
  title: string,
  tags: string[]
): Promise<string> {
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });

    const html = renderOgHtml({ title, tags });
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const png = await page.screenshot({ type: "png" }) as Buffer;

    const key = `og/${slug}.png`;
    await upload(key, png, "image/png");

    log.info({ key, slug }, "OG image generated and uploaded");
    return key;
  } finally {
    await page.close();
  }
}

const app = new Elysia()
  .post("/generate", async ({ body }) => {
    const { slug, title, tags } = body as {
      slug: string;
      title: string;
      tags?: string[];
    };

    if (!slug || !title) {
      return { error: "slug and title are required" };
    }

    const key = await generateOgImage(slug, title, tags ?? []);
    return { key };
  })
  .listen(PORT);

log.info({ port: PORT }, "OG image service started");

// Graceful shutdown
process.on("SIGINT", async () => {
  if (browser) await browser.close();
  process.exit(0);
});
