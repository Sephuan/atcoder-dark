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
    // Re-scan rows after toggling theme
    setTimeout(forceVerdictRows, 50);
    setTimeout(forceVerdictRows, 300);
    setTimeout(forceVerdictRows, 1000);
    setTimeout(addMarkers, 600);
    setTimeout(addMarkers, 2000);
  }

  function isDark() {
    return !html.classList.contains(OFF);
  }

  /* ------------------------------------------------------------------ *
   * Restore verdict markers (Companion markers are wiped by OnCoder      *
   * Extension's innerHTML rebuild). Fetch our own submissions and       *
   * prepend a small badge to each problem row's first cell.            *
   * ------------------------------------------------------------------ */
  const verdictCache = new Map();

  function extractProblemLetter(href) {
    const m = href && href.match(/tasks\/abc\d+_[a-z]/i);
    return m ? m[0].split("_")[1].toUpperCase() : null;
  }

  async function fetchVerdicts() {
    if (!location.pathname.includes("/contests/")) return;
    const base = location.href.split("/tasks")[0].split("?")[0];
    const subUrl = base + "/submissions/me";
    const best = new Map(); // problem letter -> best verdict
    const order = ["AC", "WA", "TLE", "MLE", "RE", "CE", "WJ", "WR", "OLE", "IE"];
    try {
      for (let page = 1; page <= 20; page++) {
        const resp = await fetch(`${subUrl}?page=${page}`, { credentials: "include" });
        if (!resp.ok) break;
        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const trs = doc.querySelectorAll("tbody tr");
        if (!trs.length) break;
        for (const tr of trs) {
          const tds = tr.querySelectorAll("td");
          if (tds.length < 7) continue;
          const probHref = tds[1] && tds[1].querySelector("a") && tds[1].querySelector("a").getAttribute("href");
          const letter = extractProblemLetter(probHref);
          const verdict = (tds[6] && tds[6].textContent.trim()) || "";
          if (!letter || !verdict) continue;
          const prev = best.get(letter);
          if (!prev || order.indexOf(verdict) < order.indexOf(prev)) {
            best.set(letter, verdict);
          }
        }
        // stop if last seen
        if (trs.length < 20) break;
      }
    } catch (_) {
      /* ignore */
    }
    verdictCache.clear();
    best.forEach((v, k) => verdictCache.set(k, v));
  }

  function badgeColor(verdict) {
    if (verdict === "AC") return isDark() ? "#22c55e" : "#15803d";
    return isDark() ? "#ef4444" : "#991b1b";
  }

  function addMarkers() {
    if (!document.querySelector("table")) return;
    document.querySelectorAll("tbody tr").forEach((tr) => {
      const firstCell = tr.querySelector("td:first-child");
      if (!firstCell) return;
      const link = firstCell.querySelector("a");
      const letter = extractProblemLetter(link && link.getAttribute("href"));
      if (!letter) return;
      // Remove any previous badge we added (idempotent)
      firstCell.querySelector(".atcoder-dark-verdict-badge")?.remove();
      const verdict = verdictCache.get(letter);
      if (!verdict) return;
      if (verdict === "WJ" || verdict === "WR") return; // pending, no badge
      const isAc = verdict === "AC";
      const badge = document.createElement("span");
      badge.className = "atcoder-dark-verdict-badge";
      badge.textContent = isAc ? "✓" : "✗";
      badge.title = verdict;
      Object.assign(badge.style, {
        display: "inline-block",
        marginRight: "4px",
        fontSize: "14px",
        fontWeight: "700",
        lineHeight: "1",
        color: badgeColor(verdict),
        textShadow: isDark() ? "0 0 4px rgba(0,0,0,0.6)" : "none",
        verticalAlign: "middle",
      });
      firstCell.prepend(badge);
    });
  }

  // Refresh markers on poll too
    document.querySelectorAll("tbody tr").forEach((tr) => {
      const bg = tr.style.backgroundColor || "";

      if (isDark()) {
        // AC / solved — bright semi-transparent green. Extension uses #d4edc9
        if (/212,\s*237,\s*201/.test(bg) || /220,\s*240,\s*210/.test(bg) || /#d4edc9/i.test(bg)) {
          tr.style.setProperty("background-color", "rgba(34, 197, 94, 0.30)", "important");
        }
        // WA / TLE / MLE / RE / non-AC non-WJ — Extension lumps these as #ffe3e3.
        // Same treatment so any failed submission row is visibly marked.
        else if (/255,\s*227,\s*227/.test(bg) || /#ffe3e3/i.test(bg) || /#fcd/i.test(bg) || /255,\s*200,\s*200/.test(bg) || /#f8d7da/i.test(bg)) {
          tr.style.setProperty("background-color", "rgba(239, 68, 68, 0.30)", "important");
        }
      } else {
        // LIGHT mode — restore original light green if we ever touched it
        if (/#22c55e/i.test(bg)) {
          tr.style.setProperty("background-color", "rgb(212, 237, 201)", "important");
        } else if (/#ef4444/i.test(bg)) {
          tr.style.setProperty("background-color", "rgb(255, 200, 200)", "important");
        }
      }
    });
  }

  // Poll to override Companion / AtCoderExtension inline row backgrounds.
  // Polling beats async/timing issues from those extensions' API callbacks.
  let pollCount = 0;
  const pollHandle = setInterval(() => {
    forceVerdictRows();
    addMarkers();
    pollCount++;
    // Stop polling after ~15s; rely on observer afterwards
    if (pollCount > 30) clearInterval(pollHandle);
  }, 500);

  // Watch for rows added / colored by Companion / AtCoderExtension
  const rowObserver = new MutationObserver(() => forceVerdictRows());

  function startRowObserver() {
    const tbody = document.querySelector("tbody") || document.body;
    if (!tbody) return;
    rowObserver.observe(tbody, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startRowObserver, { once: true });
  } else {
    startRowObserver();
  }
  window.addEventListener("load", startRowObserver);

  // Fetch verdicts then inject markers (after OnCoder Extension rebuilds table)
  fetchVerdicts().then(() => {
    setTimeout(addMarkers, 800);
    setTimeout(addMarkers, 3000);
    setTimeout(addMarkers, 8000);
  });

  // ── Floating toggle (content-script world shares page DOM) ──
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
    setTimeout(() => clearInterval(iv), 20000);
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
      if (area !== "sync") return;
      if (changes[STORAGE_KEY]) setEnabled(changes[STORAGE_KEY].newValue !== false);
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureFab, { once: true });
  } else {
    ensureFab();
  }
  window.addEventListener("load", ensureFab, { once: true });
  setTimeout(ensureFab, 300);
  setTimeout(ensureFab, 1000);
})();
