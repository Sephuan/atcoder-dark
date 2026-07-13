/**
 * Connect to the running login browser, visit all major AtCoder entry points,
 * screenshot, and report elements that still look "light".
 * No downloads — uses existing puppeteer-core + open Chrome.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portFile = path.join(root, ".chrome-profile", "DevToolsActivePort");
const cssPath = path.join(root, "styles", "dark.css");
const outDir = path.join(root, "screenshots");
fs.mkdirSync(outDir, { recursive: true });

const port = fs.readFileSync(portFile, "utf8").trim().split("\n")[0];
const browser = await puppeteer.connect({
  browserURL: `http://127.0.0.1:${port}`,
  defaultViewport: null,
});

const css = fs.readFileSync(cssPath, "utf8");

const pages = [
  ["home", "https://atcoder.jp/home"],
  ["contests", "https://atcoder.jp/contests/"],
  ["contest-top", "https://atcoder.jp/contests/abc466"],
  ["tasks", "https://atcoder.jp/contests/abc466/tasks"],
  ["task-a", "https://atcoder.jp/contests/abc466/tasks/abc466_a"],
  ["submit", "https://atcoder.jp/contests/abc466/submit"],
  ["submissions", "https://atcoder.jp/contests/abc466/submissions"],
  ["submissions-me", "https://atcoder.jp/contests/abc466/submissions/me"],
  ["standings", "https://atcoder.jp/contests/abc466/standings"],
  ["custom-test", "https://atcoder.jp/contests/abc466/custom_test"],
  ["clarifications", "https://atcoder.jp/contests/abc466/clarifications"],
  ["editorial", "https://atcoder.jp/contests/abc466/editorial"],
  ["score", "https://atcoder.jp/contests/abc466/score"],
  ["ranking", "https://atcoder.jp/ranking"],
  ["user", "https://atcoder.jp/users/Sephuan"],
  ["settings", "https://atcoder.jp/settings"],
  ["posts", "https://atcoder.jp/posts"],
];

async function inject(page) {
  await page.evaluate((cssText) => {
    document.documentElement.classList.add("atcoder-dark");
    let el = document.getElementById("atcoder-dark-live");
    if (!el) {
      el = document.createElement("style");
      el.id = "atcoder-dark-live";
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = cssText;
  }, css);
}

async function analyzeLight(page) {
  return page.evaluate(() => {
    function lum(c) {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      const [r, g, b] = m.slice(1).map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }
    const bad = [];
    const nodes = document.querySelectorAll(
      "body, #main-div, #main-container, .panel, .table, .navbar, .modal-content, .well, .form-control, pre, code, .alert, .list-group-item, .dropdown-menu, .nav-tabs, .cnvtb-fixed, .jumbotron, .thumbnail, footer, .ace_editor, #task-statement, .insert-participant-box, .btn-default, thead, tbody tr, .pagination > li > a"
    );
    const seen = new Set();
    for (const el of nodes) {
      const st = getComputedStyle(el);
      const bg = st.backgroundColor;
      const L = lum(bg);
      if (L === null || L < 0.72) continue;
      // skip invisible
      if (st.display === "none" || st.visibility === "hidden") continue;
      const tag = el.tagName.toLowerCase();
      const cls = (el.className && String(el.className).slice?.(0, 60)) || "";
      const id = el.id || "";
      const key = `${tag}.${cls}#${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      bad.push({
        tag,
        id,
        cls,
        bg,
        L: Math.round(L * 100) / 100,
        text: (el.innerText || "").slice(0, 40).replace(/\s+/g, " "),
      });
      if (bad.length >= 40) break;
    }
    return {
      title: document.title,
      url: location.href,
      user: typeof userScreenName !== "undefined" ? userScreenName : null,
      lightCount: bad.length,
      light: bad,
    };
  });
}

const page = (await browser.pages())[0] || (await browser.newPage());
const report = [];

for (const [name, url] of pages) {
  process.stdout.write(`→ ${name} … `);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 800));
    await inject(page);
    await new Promise((r) => setTimeout(r, 200));
    const info = await analyzeLight(page);
    const shot = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    report.push({ name, ...info, shot });
    console.log(
      `ok light=${info.lightCount} user=${info.user || "-"} title=${info.title.slice(0, 40)}`
    );
    if (info.lightCount) {
      for (const x of info.light.slice(0, 8)) {
        console.log(
          `   LIGHT L=${x.L} <${x.tag}#${x.id}.${x.cls}> bg=${x.bg} “${x.text}”`
        );
      }
    }
  } catch (e) {
    console.log("FAIL", e.message);
    report.push({ name, url, error: e.message });
  }
}

const reportPath = path.join(outDir, "light-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log("\nreport:", reportPath);
// keep browser open — disconnect only
browser.disconnect();
