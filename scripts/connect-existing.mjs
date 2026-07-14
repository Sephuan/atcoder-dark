/**
 * Connect Puppeteer to your ALREADY-RUNNING Chrome (real profile, all extensions).
 *
 * 1. Close all Chrome windows (or use a separate profile dir below).
  * 2. Launch Chrome with remote debugging:
 *      /usr/bin/google-chrome --remote-debugging-port=9222
 *    (your real profile + all extensions will be active)
 * 3. Then run:
 *      node scripts/connect-existing.mjs
 *
 * Optional env:
 *   CONNECT_URL  - remote debugging ws endpoint (auto-detect if omitted)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cssPath = path.join(root, "styles", "dark.css");
const preloadPath = path.join(root, "styles/preload.css");
const pageThemePath = path.join(root, "content/page-theme.js");

async function resolveWsUrl() {
  if (process.env.CONNECT_URL) return process.env.CONNECT_URL;
  for (const port of [9222, 9223, 9224]) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) {
        const j = await r.json();
        return j.webSocketDebuggerUrl;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

const wsUrl = await resolveWsUrl();
if (!wsUrl) {
  console.error(
    "[connect] Could not find a running Chrome with --remote-debugging-port."
  );
  console.error("  Launch Chrome like this, then re-run:");
  console.error("    /usr/bin/google-chrome --remote-debugging-port=9222");
  process.exit(1);
}

console.log("[connect] attaching to", wsUrl);
const browser = await puppeteer.connect({ browserURL: wsUrl });

function readThemeCss() {
  const pre = fs.existsSync(preloadPath) ? fs.readFileSync(preloadPath, "utf8") : "";
  return pre + "\n" + fs.readFileSync(cssPath, "utf8");
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
      html.style.setProperty("background-color", "#0d1117", "important");
      html.style.setProperty("color-scheme", "dark", "important");
      let el = document.getElementById("atcoder-dark-live");
      if (!el) {
        el = document.createElement("style");
        el.id = "atcoder-dark-live";
        (document.head || document.documentElement).appendChild(el);
      }
      if (el.textContent !== CSS) el.textContent = CSS;
    } catch (_) {}
  };
  apply();
  document.addEventListener("readystatechange", apply);
  document.addEventListener("DOMContentLoaded", apply, { once: true });
}

let themeCss = readThemeCss();
let lastMtime = fs.statSync(cssPath).mtimeMs;
const wired = new WeakSet();

async function wirePage(p) {
  if (!p || wired.has(p)) return;
  wired.add(p);
  const src = readPageTheme();
  if (src) {
    await p.evaluateOnNewDocument((s) => {
      window.__atcoderDarkCanvasBoot = false;
      try { (0, eval)(s); } catch (_) {}
    }, src);
  }
  await p.evaluateOnNewDocument(installTheme, themeCss);
  p.on("framenavigated", async (frame) => {
    if (frame !== p.mainFrame()) return;
    await applyNow(p);
  });
}

async function applyNow(p) {
  try {
    await p.evaluate(installTheme, themeCss);
    await p.evaluate(() => {
      const ID = "atcoder-dark-fab";
      if (document.getElementById(ID)) return;
      const root = document.body || document.documentElement;
      if (!root) return;
      const fab = document.createElement("button");
      fab.id = ID;
      fab.type = "button";
      fab.textContent = "☀";
      fab.title = "Toggle light / dark";
      fab.addEventListener("click", (e) => {
        e.preventDefault();
        const dark = document.documentElement.classList.toggle("atcoder-dark-off");
        fab.textContent = dark ? "☾" : "☀";
      });
      root.appendChild(fab);
    });
  } catch (_) {}
}

for (const p of await browser.pages()) await wirePage(p);
browser.on("targetcreated", async (t) => {
  const p = await t.page().catch(() => null);
  if (p) await wirePage(p);
});

// Find active atcoder tab (or first page)
const pages = await browser.pages();
const atc = pages.find((p) => p.url().includes("atcoder")) || pages[0];

// Navigate if requested
const target = process.argv[2];
if (target) {
  await atc.goto(target, { waitUntil: "domcontentloaded", timeout: 120000 }).catch(
    (e) => console.warn("[connect] nav:", e.message)
  );
} else {
  await applyNow(atc);
}

console.log("[connect] tab:", atc.url());
console.log("[connect] dark.css hot-reloads every 2s");
console.log("[connect] inspect verdict AC/WA colors now.");

// Hot-reload loop
const iv = setInterval(async () => {
  let st;
  try { st = fs.statSync(cssPath); } catch { return; }
  if (st.mtimeMs !== lastMtime) {
    lastMtime = st.mtimeMs;
    themeCss = readThemeCss();
    for (const p of await browser.pages()) await applyNow(p);
    console.log("[connect] hot-reload @", new Date().toLocaleTimeString());
  }
}, 2000);

// Capture verdict classes once after load
setTimeout(async () => {
  const info = await atc.evaluate(() => {
    const all = [...document.querySelectorAll("td a, td")];
    const cls = new Set();
    const samples = [];
    for (const el of all) {
      const t = (el.textContent || "").trim();
      if (/^(AC|WA|TLE|MLE|RE|CE|WJ|WR)$/i.test(t)) {
        (el.className || "").split(/\s+/).filter(Boolean).forEach((c) => cls.add(c));
        if (samples.length < 20)
          samples.push({
            cls: el.className,
            text: t,
            color: getComputedStyle(el).color,
            tag: el.tagName,
          });
      }
    }
    // also collect extension-injected style samples
    const sheets = [...document.querySelectorAll("style")]
      .map((s) => s.textContent || "")
      .filter((t) => /AC|WA|verdict|label|tce|wa/.test(t))
      .slice(0, 10)
      .map((t) => t.slice(0, 300));
    return { classes: [...cls], samples, sheets };
  });
  console.log("\n=== VERDICT DEBUG ===");
  console.log(JSON.stringify(info, null, 2));
  console.log("===================\n");
}, 4000);

browser.on("disconnected", () => {
  clearInterval(iv);
  console.log("[connect] disconnected");
});
process.on("SIGINT", () => {
  clearInterval(iv);
  browser.disconnect();
  process.exit(0);
});
