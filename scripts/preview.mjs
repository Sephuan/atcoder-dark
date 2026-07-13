/**
 * Headless preview: inject dark.css into a local AtCoder HTML fixture
 * and capture screenshots (and optionally live atcoder.jp).
 *
 * Usage:
 *   node scripts/preview.mjs
 *   node scripts/preview.mjs --live   # try real site (may hit CF)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const screenshotsDir = path.join(root, "screenshots");
const cssPath = path.join(root, "styles", "dark.css");
const fixturePath = path.join(root, "fixtures", "tasks.html");

const live = process.argv.includes("--live");

fs.mkdirSync(screenshotsDir, { recursive: true });

const darkCss = fs.readFileSync(cssPath, "utf8");

async function applyDark(page) {
  await page.evaluate((css) => {
    document.documentElement.classList.add("atcoder-dark");
    let style = document.getElementById("atcoder-dark-preview");
    if (!style) {
      style = document.createElement("style");
      style.id = "atcoder-dark-preview";
      document.documentElement.appendChild(style);
    }
    style.textContent = css;
  }, darkCss);
}

async function shot(page, name) {
  const out = path.join(screenshotsDir, name);
  await page.screenshot({ path: out, fullPage: true });
  console.log("saved", out);
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
  defaultViewport: { width: 1280, height: 900 },
});

try {
  const page = await browser.newPage();

  if (live) {
    console.log("Loading live atcoder.jp …");
    await page.goto("https://atcoder.jp/contests/abc466/tasks", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForSelector("#main-container", { timeout: 30000 }).catch(() => {});
    await shot(page, "live-before.png");
    await applyDark(page);
    await new Promise((r) => setTimeout(r, 400));
    await shot(page, "live-after.png");
  } else {
    if (!fs.existsSync(fixturePath)) {
      console.error("Missing fixture:", fixturePath);
      process.exit(1);
    }
    const fileUrl = "file://" + fixturePath;
    console.log("Loading fixture", fileUrl);
    await page.goto(fileUrl, { waitUntil: "domcontentloaded" });
    await shot(page, "fixture-before.png");
    await applyDark(page);
    await new Promise((r) => setTimeout(r, 200));
    await shot(page, "fixture-after.png");
  }

  console.log("done");
} finally {
  await browser.close();
}
