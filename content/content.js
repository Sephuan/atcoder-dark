(() => {
  const OFF = "atcoder-dark-off";
  const STORAGE_KEY = "enabled";
  const LS_KEY = "atcoder-dark-enabled";
  const FAB_ID = "atcoder-dark-fab";
  const html = document.documentElement;

  // Inject CreateJS color patch into page world (before rating-*.js)
  try {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("content/page-theme.js");
    s.async = false;
    (document.documentElement || document).appendChild(s);
  } catch {
    /* not extension / puppeteer */
  }

  function paintShell(on) {
    if (on) {
      html.style.setProperty("background-color", "#0d1117", "important");
      html.style.setProperty("color-scheme", "dark", "important");
    } else {
      html.style.removeProperty("background-color");
      html.style.removeProperty("color-scheme");
    }
  }

  function setEnabled(enabled) {
    html.classList.toggle(OFF, !enabled);
    paintShell(enabled);
    try {
      localStorage.setItem(LS_KEY, enabled ? "1" : "0");
    } catch {
      /* ignore */
    }
    refreshFab();
    schedulePaintVerdicts();
  }

  function isDark() {
    return !html.classList.contains(OFF);
  }

  // ── Task-list AC/WA coloring (independent of AtCoder Extension) ──
  // AtCoder Extension keys rows by task *name* via split("-")[1], which
  // breaks on hyphenated titles like "Fill-Rect Query" → never greens E.
  // We key by task path (/contests/…/tasks/abc464_e) instead.

  /** @type {Map<string, string> | null} path -> best status */
  let myResults = null;
  let resultsLoading = false;

  function contestFromPath() {
    const m = location.pathname.match(/^\/contests\/([^/]+)\/tasks\/?$/);
    return m ? m[1] : null;
  }

  function taskPathFromHref(href) {
    try {
      return new URL(href, location.origin).pathname.replace(/\/$/, "");
    } catch {
      return "";
    }
  }

  function parseStatus(tr) {
    const spans = tr.querySelectorAll("span");
    for (let i = 0; i < spans.length; i++) {
      const t = (spans[i].textContent || "").trim();
      if (
        /^(AC|WA|TLE|MLE|RE|CE|QLE|OLE|IE|WJ|WR|Judging|Waiting)/i.test(t)
      ) {
        return t.toUpperCase().startsWith("JUDG")
          ? "WJ"
          : t.toUpperCase().startsWith("WAIT")
            ? "WJ"
            : t;
      }
    }
    return "";
  }

  async function fetchMyResults(contest) {
    const results = new Map();
    let page = 1;
    let maxPage = 1;

    while (page <= maxPage && page <= 40) {
      const url = `/contests/${contest}/submissions/me?page=${page}`;
      let res;
      try {
        res = await fetch(url, { credentials: "same-origin" });
      } catch {
        break;
      }
      if (!res.ok) break;

      const doc = new DOMParser().parseFromString(await res.text(), "text/html");

      doc.querySelectorAll(".pagination a, .pager a").forEach((a) => {
        const n = parseInt((a.textContent || "").trim(), 10);
        if (!isNaN(n) && n > maxPage) maxPage = n;
      });

      const rows = doc.querySelectorAll("table tbody tr");
      if (!rows.length && page === 1) break;

      for (let i = 0; i < rows.length; i++) {
        const tr = rows[i];
        const taskA = tr.querySelector('a[href*="/tasks/"]');
        if (!taskA) continue;
        const path = taskPathFromHref(taskA.getAttribute("href") || "");
        if (!path) continue;
        const status = parseStatus(tr);
        if (!status || status === "WJ" || status === "WR") continue;

        if (status === "AC") {
          results.set(path, "AC");
        } else if (!results.has(path)) {
          results.set(path, status);
        }
      }

      page++;
    }

    return results;
  }

  function paintTaskRows() {
    if (!myResults || !myResults.size) return;

    const rows = document.querySelectorAll("table tbody tr");
    for (let i = 0; i < rows.length; i++) {
      const tr = rows[i];
      const taskA = tr.querySelector('a[href*="/tasks/"]');
      if (!taskA) continue;
      const path = taskPathFromHref(taskA.getAttribute("href") || "");
      const st = myResults.get(path);
      if (!st) continue;

      if (st === "AC") {
        const color = isDark()
          ? "rgba(34, 197, 94, 0.30)"
          : "#d4edc9";
        tr.style.setProperty("background-color", color, "important");
      } else {
        const color = isDark()
          ? "rgba(239, 68, 68, 0.30)"
          : "#ffe3e3";
        tr.style.setProperty("background-color", color, "important");
      }
    }
  }

  // Remap light greens/reds left by AtCoder Extension (non-hyphenated names)
  const AC_BG =
    /212\s*,\s*237\s*,\s*201|#d4edc9|220\s*,\s*240\s*,\s*210|#dcf0d2/i;
  const WA_BG =
    /255\s*,\s*227\s*,\s*227|#ffe3e3|255\s*,\s*200\s*,\s*200|248\s*,\s*215\s*,\s*218|#f8d7da/i;

  function remapExtensionRows() {
    if (!isDark()) return;
    const trs = document.querySelectorAll("tbody tr");
    for (let i = 0; i < trs.length; i++) {
      const tr = trs[i];
      const bg = tr.style.backgroundColor || "";
      if (!bg) continue;
      // Skip rows we already painted with our rgba (don't thrash)
      if (/34\s*,\s*197\s*,\s*94|239\s*,\s*68\s*,\s*68/.test(bg)) continue;
      if (AC_BG.test(bg)) {
        tr.style.setProperty(
          "background-color",
          "rgba(34, 197, 94, 0.30)",
          "important"
        );
      } else if (WA_BG.test(bg)) {
        tr.style.setProperty(
          "background-color",
          "rgba(239, 68, 68, 0.30)",
          "important"
        );
      }
    }
  }

  function paintVerdicts() {
    paintTaskRows();
    remapExtensionRows();
  }

  let paintTimer = 0;
  function schedulePaintVerdicts() {
    if (paintTimer) return;
    paintTimer = setTimeout(() => {
      paintTimer = 0;
      paintVerdicts();
    }, 80);
  }

  async function ensureMyResults() {
    const contest = contestFromPath();
    if (!contest) return;
    if (resultsLoading) return;
    if (myResults) {
      schedulePaintVerdicts();
      return;
    }
    resultsLoading = true;
    try {
      myResults = await fetchMyResults(contest);
      schedulePaintVerdicts();
    } catch {
      myResults = new Map();
    } finally {
      resultsLoading = false;
    }
  }

  // Watch task table rebuilds (AtCoder Extension replaces innerHTML)
  let rowObserver = null;
  let armAttempts = 0;
  function armRowObserver() {
    if (rowObserver) return;
    const tables = document.querySelectorAll("table");
    if (!tables.length) {
      if (armAttempts++ < 20) setTimeout(armRowObserver, 500);
      return;
    }
    try {
      rowObserver = new MutationObserver(() => schedulePaintVerdicts());
      for (let i = 0; i < tables.length; i++) {
        rowObserver.observe(tables[i], {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["style"],
        });
      }
    } catch {
      /* ignore */
    }
  }

  // ── Floating toggle ──
  let fab = null;

  function refreshFab() {
    fab = document.getElementById(FAB_ID);
    if (!fab) return;
    const dark = isDark();
    fab.textContent = dark ? "☀" : "☾";
    fab.title = dark
      ? "Switch to light theme / 切换浅色"
      : "Switch to dark theme / 切换深色";
    fab.setAttribute("aria-label", fab.title);
    fab.classList.toggle("is-light", !dark);
  }

  function mountFab() {
    if (document.getElementById(FAB_ID)) {
      fab = document.getElementById(FAB_ID);
      refreshFab();
      return true;
    }
    if (!document.documentElement) return false;

    fab = document.createElement("button");
    fab.id = FAB_ID;
    fab.type = "button";
    fab.textContent = "☀";
    fab.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = !isDark();
        setEnabled(next);
        try {
          chrome.storage.sync.set({ [STORAGE_KEY]: next });
        } catch {
          /* ignore */
        }
      },
      true
    );

    const root = document.body || document.documentElement;
    root.appendChild(fab);
    refreshFab();
    return true;
  }

  function ensureFab() {
    if (mountFab()) return;
    const iv = setInterval(() => {
      if (mountFab()) clearInterval(iv);
    }, 200);
    setTimeout(() => clearInterval(iv), 10000);
  }

  // Default dark
  setEnabled(true);

  try {
    chrome.storage.sync.get({ [STORAGE_KEY]: true }, (data) => {
      setEnabled(data[STORAGE_KEY] !== false);
    });
  } catch {
    /* keep default */
  }

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || !changes[STORAGE_KEY]) return;
      setEnabled(changes[STORAGE_KEY].newValue !== false);
    });
  } catch {
    /* ignore */
  }

  window.addEventListener("message", (ev) => {
    if (ev.source !== window) return;
    const d = ev.data;
    if (!d || d.source !== "atcoder-dark" || d.type !== "theme") return;
    setEnabled(!!d.enabled);
    try {
      chrome.storage.sync.set({ [STORAGE_KEY]: !!d.enabled });
    } catch {
      /* ignore */
    }
  });

  function onReady() {
    ensureFab();
    armRowObserver();
    ensureMyResults();
    // Extension finishes late (paginated /submissions/me fetches)
    setTimeout(ensureMyResults, 1500);
    setTimeout(schedulePaintVerdicts, 500);
    setTimeout(schedulePaintVerdicts, 2000);
    setTimeout(schedulePaintVerdicts, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
  } else {
    onReady();
  }
  window.addEventListener(
    "load",
    () => {
      ensureFab();
      ensureMyResults();
      schedulePaintVerdicts();
    },
    { once: true }
  );
  setTimeout(ensureFab, 300);
})();
