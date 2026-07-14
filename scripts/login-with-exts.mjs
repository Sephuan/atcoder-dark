/**
 * Launch system Chrome with AtCoder Dark + the two conflicting extensions
 * (AtCoder Extension, Atcoder Companion) so we can reproduce & debug conflicts.
 *
 * Usage:
 *   node scripts/login-with-exts.mjs
 *   node scripts/login-with-exts.mjs https://atcoder.jp/contests/abc466/standings
 *
 * Stop: close window or touch .stop-browser
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const profileDir = path.join(root, ".chrome-profile");
const cssPath = path.join(root, "styles", "dark.css");
const preloadPath = path.join(root, "styles", "preload.css");
const pageThemePath = path.join(root, "content", "page-theme.js");
const stopFlag = path.join(root, ".stop-browser");
const chromePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  process.env.CHROME_PATH ||
  "/usr/bin/google-chrome";

if (!fs.existsSync(chromePath)) {
  console.error("[login-exts] system Chrome not found at", chromePath);
  process.exit(1);
}

// Resolve extension paths from the user's main Chrome profile
const mainProfile = path.join(
  process.env.HOME,
  ".config/google-chrome/Default/Extensions"
);
const EXT_IDS = {
  atcoderExtension: "jjhihgijhmdclifgifcphgpdcecejoip",
  atcoderCompanion: "bflhekmjlbpdlibcmojpikplaldgceec",
};

function resolveExt(relativeId) {
  const base = path.join(mainProfile, relativeId);
  if (!fs.existsSync(base)) return null;
  const versions = fs
    .readdirSync(base)
    .filter((d) => fs.statSync(path.join(base, d)).isDirectory())
    .sort()
    .reverse();
  if (!versions.length) return null;
  return path.join(base, versions[0]);
}

const extAtCoderExt = resolveExt(EXT_IDS.atcoderExtension);
const extCompanion = resolveExt(EXT_IDS.atcoderCompanion);

console.log("[login-exts] extensions to load:");
console.log("  AtCoder Extension :", extAtCoderExt || "NOT FOUND");
console.log("  Atcoder Companion :", extCompanion || "NOT FOUND");

fs.mkdirSync(profileDir, { recursive: true });
if (fs.existsSync(stopFlag)) fs.unlinkSync(stopFlag);

function readThemeCss() {
  const preload = fs.existsSync(preloadPath)
    ? fs.readFileSync(preloadPath, "utf8")
    : "";
  return preload + "\n" + fs.readFileSync(cssPath, "utf8");
}

function readPageTheme() {
  return fs.existsSync(pageThemePath) ? fs.readFileSync(pageThemePath, "utf8") : "";
}

function installTheme(cssText) {
  const CSS = cssText;
  const apply = () => {
    try {
      const html = document.documentElement;
      if (!html) return;
      html.classList.remove("atcoder-dark-off");
      html.style.setProperty("background-color", "#0d1117", "important");
      html.style.setProperty("color-scheme", "dark", "important");
      let el = document.getElementById("atcoder-dark-live");
      if (!el) {
        el = document.createElement("style");
        el.id = "atcoder-dark-live";
        if (html.firstChild) html.insertBefore(el, html.firstChild);
        else html.appendChild(el);
      }
      if (el.textContent !== CSS) el.textContent = CSS;
      if (document.body) {
        document.body.style.setProperty(
          "background-color",
          "#0d1117",
          "important"
        );
      }
    } catch (_) {
      /* ignore */
    }
  };
  apply();
  try {
    new MutationObserver(apply).observe(document.documentElement, {
      childList: true,
    });
  } catch (_) {}
  document.addEventListener("readystatechange", apply);
  document.addEventListener("DOMContentLoaded", apply, { once: true });
}

const browser = await puppeteer.launch({
  headless: false,
  executablePath: chromePath,
  userDataDir: profileDir,
  defaultViewport: null,
  args: [
    "--no-first-run",
    "--no-default-browser-check",
    "--start-maximized",
    "--disable-blink-features=AutomationControlled",
    "--password-store=gnome-libsecret",
    // Extensions are pre-installed in the profile's Extensions/ folder
    // and registered in Preferences — do NOT pass --load-extension here.
  ],
  ignoreDefaultArgs: [
    "--enable-automation",
    "--password-store=basic",
    "--use-mock-keychain",
  ],
});

let themeCss = readThemeCss();
let lastMtime = fs.statSync(cssPath).mtimeMs;
const wired = new WeakSet();

async function wirePage(p) {
  if (!p || wired.has(p)) return;
  wired.add(p);

  const pageThemeSrc = readPageTheme();
  if (pageThemeSrc) {
    await p.evaluateOnNewDocument((src) => {
      window.__atcoderDarkCanvasBoot = false;
      try {
        (0, eval)(src);
      } catch (_) {}
    }, pageThemeSrc);
  }
  await p.evaluateOnNewDocument(installTheme, themeCss);
  await p.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  p.on("framenavigated", async (frame) => {
    if (frame !== p.mainFrame()) return;
    await applyNow(p, themeCss);
  });
}

async function applyNow(page, cssText) {
  try {
    await page.evaluate(installTheme, cssText);
    await page.evaluate(() => {
      const ID = "atcoder-dark-fab";
      const OFF = "atcoder-dark-off";
      if (document.getElementById(ID)) return;
      const root = document.body || document.documentElement;
      if (!root) return;
      const fab = document.createElement("button");
      fab.id = ID;
      fab.type = "button";
      fab.textContent = document.documentElement.classList.contains(OFF)
        ? "☾"
        : "☀";
      fab.title = "Toggle light / dark";
      fab.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dark = document.documentElement.classList.toggle(OFF);
        fab.textContent = dark ? "☾" : "☀";
        fab.classList.toggle("is-light", dark);
        try {
          localStorage.setItem("atcoder-dark-enabled", dark ? "0" : "1");
        } catch (_) {}
      });
      root.appendChild(fab);
    });
  } catch {
    /* navigated away */
  }
}

for (const p of await browser.pages()) {
  await wirePage(p);
}

browser.on("targetcreated", async (target) => {
  const p = await target.page().catch(() => null);
  if (p) await wirePage(p);
});

const page = (await browser.pages())[0] || (await browser.newPage());
await wirePage(page);

const startUrl =
  process.argv[2] || "https://atcoder.jp/contests/abc466/standings";

console.log("[login-exts] chrome:", chromePath);
console.log("[login-exts] profile:", profileDir);
console.log("[login-exts] opening", startUrl);
console.log("[login-exts] dark.css hot-reloads every 2s");
console.log("[login-exts] close window or touch .stop-browser to quit\n");

await page
  .goto(startUrl, { waitUntil: "domcontentloaded", timeout: 120000 })
  .catch((e) => console.warn("[login-exts] nav:", e.message));

await applyNow(page, themeCss);

async function hotReload() {
  let st;
  try {
    st = fs.statSync(cssPath);
  } catch {
    return;
  }
  if (st.mtimeMs === lastMtime) return;
  lastMtime = st.mtimeMs;
  themeCss = readThemeCss();
  for (const p of await browser.pages()) {
    await applyNow(p, themeCss);
  }
  console.log("[login-exts] hot-reload @", new Date().toLocaleTimeString());
}

const timer = setInterval(async () => {
  if (fs.existsSync(stopFlag)) {
    console.log("[login-exts] stop flag, closing");
    clearInterval(timer);
    await browser.close().catch(() => {});
    process.exit(0);
  }
  await hotReload();
  try {
    const info = await page.evaluate(() => ({
      url: location.href,
      user: typeof userScreenName !== "undefined" ? userScreenName : null,
      fab: !!document.getElementById("atcoder-dark-fab"),
    }));
    if (info.user && globalThis.__lastUser !== info.user) {
      globalThis.__lastUser = info.user;
      console.log(`[login-exts] session: ${info.user} @ ${info.url}`);
    }
  } catch {
    /* ignore */
  }
}, 2000);

browser.on("disconnected", () => {
  clearInterval(timer);
  console.log("[login-exts] browser closed");
  process.exit(0);
});

process.on("SIGINT", async () => {
  clearInterval(timer);
  await browser.close().catch(() => {});
  process.exit(0);
});
