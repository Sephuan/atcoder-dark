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
  }

  function isDark() {
    return !html.classList.contains(OFF);
  }

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

    // Prefer body; fall back to html
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
      if (area !== "sync" || !changes[STORAGE_KEY]) return;
      setEnabled(changes[STORAGE_KEY].newValue !== false);
    });
  } catch {
    /* ignore */
  }

  // Page-world FAB (page-theme) may post theme changes
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
