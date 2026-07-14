/**
 * PAGE context (not extension isolated world).
 * 1) Patches CreateJS colors for rating / distribution canvases (high contrast).
 * 2) Mounts floating light/dark toggle (works even when extensions are disabled).
 */
(function () {
  if (window.__atcoderDarkCanvasBoot) return;
  window.__atcoderDarkCanvasBoot = true;

  const OFF = "atcoder-dark-off";
  const LS_KEY = "atcoder-dark-enabled";

  const isOff = () => document.documentElement.classList.contains(OFF);

  // High-contrast text on dark canvas
  const TEXT = {
    "#000": "#f0f6fc",
    "#000000": "#f0f6fc",
    black: "#f0f6fc",
    "#888": "#c9d1d9",
    "#888888": "#c9d1d9",
    "#666": "#c9d1d9",
    "#666666": "#c9d1d9",
    "#333": "#e6edf3",
    "#333333": "#e6edf3",
    // pure blue used for some rating markers — too dark on dark bg
    "#0000FF": "#79c0ff",
    "#00F": "#79c0ff",
    blue: "#79c0ff",
  };

  /**
   * Rank colors — high contrast + clearly different hues on dark bg.
   * Official ladder: gray → brown → green → cyan → blue → yellow → orange → red
   * Brown / yellow / orange used to look alike; keep them far apart in hue.
   */
  const RANK = {
    "#808080": "#a8b0b8", // gray   0+     cool gray
    "#804000": "#9a5b2e", // brown  400+   earthy brown (no gold/yellow)
    "#008000": "#2fbf71", // green  800+
    "#00C0C0": "#20c8c8", // cyan   1200+
    "#0000FF": "#4d8af0", // blue   1600+
    "#C0C000": "#f5d000", // yellow 2000+  pure lemon (not orange)
    "#FF8000": "#ff6a00", // orange 2400+  vivid red-orange (not gold)
    "#FF0000": "#ff4d4d", // red    2800+
  };

  const FILL_EXTRA = {
    "#FFF": "#21262d",
    "#FFFFFF": "#21262d",
    white: "#21262d",
    "#fff": "#21262d",
  };

  // Grid / borders: visible but not harsh
  const STROKE = {
    "#000": "#adbac7",
    "#000000": "#adbac7",
    "#FFF": "#6e7681",
    "#FFFFFF": "#6e7681",
    "#fff": "#6e7681",
    "#AAA": "#8b949e",
    "#aaa": "#8b949e",
    "#888": "#8b949e",
    "#888888": "#8b949e",
    "#ddd": "#484f58",
    "#DDD": "#484f58",
    "#DDDDDD": "#484f58",
  };

  function lookup(map, color) {
    if (color == null || typeof color !== "string" || isOff()) return color;
    const k = color.trim();
    return map[k] || map[k.toUpperCase()] || map[k.toLowerCase()] || color;
  }

  function mapText(c) {
    if (isOff()) return c;
    const m = lookup(TEXT, c);
    if (m !== c) return m;
    // also lift rank pure colors when used as text (e.g. top "802")
    return lookup(RANK, c) !== c ? lookup(RANK, c) : c;
  }

  function mapFill(c) {
    if (isOff()) return c;
    if (lookup(RANK, c) !== c) return lookup(RANK, c);
    return lookup(FILL_EXTRA, c);
  }

  function mapStroke(c) {
    return lookup(STROKE, c);
  }

  function wrapText(cj) {
    const Orig = cj.Text;
    if (!Orig || Orig.__adWrapped) return;

    function Text(text, font, color) {
      Orig.call(this, text, font, mapText(color || "#000"));
    }
    Text.prototype = Orig.prototype;
    Text.prototype.constructor = Text;
    Text.__adWrapped = true;
    try {
      Object.setPrototypeOf(Text, Orig);
    } catch (_) {
      /* ignore */
    }
    cj.Text = Text;
  }

  function wrapGraphics(cj) {
    const G = cj.Graphics && cj.Graphics.prototype;
    if (!G || G.__adWrapped) return;
    G.__adWrapped = true;

    function wrapMethod(name, mapper) {
      if (typeof G[name] !== "function") return;
      const orig = G[name];
      if (orig.__adWrapped) return;
      const wrapped = function (color) {
        return orig.call(this, mapper(color));
      };
      wrapped.__adWrapped = true;
      G[name] = wrapped;
    }

    wrapMethod("f", mapFill);
    wrapMethod("beginFill", mapFill);
    wrapMethod("s", mapStroke);
    wrapMethod("beginStroke", mapStroke);
  }

  function patchCreatejs(cj) {
    if (!cj) return false;
    let ok = false;
    if (cj.Text) {
      wrapText(cj);
      ok = true;
    }
    if (cj.Graphics) {
      wrapGraphics(cj);
      ok = true;
    }
    if (ok) {
      cj.__adColorPatched = true;
      window.__atcoderDarkCanvasPatched = true;
    }
    return ok;
  }

  let _cj = window.createjs;
  if (_cj) patchCreatejs(_cj);
  try {
    Object.defineProperty(window, "createjs", {
      configurable: true,
      enumerable: true,
      get() { return _cj; },
      set(v) { _cj = v; patchCreatejs(v); },
    });
  } catch (_) {}

  const iv = setInterval(() => {
    const cj = window.createjs;
    if (!cj) return;
    patchCreatejs(cj);
    if (cj.Text && cj.Text.__adWrapped && cj.Graphics && cj.Graphics.prototype.__adWrapped) {
      clearInterval(iv);
    }
  }, 50);

  window.addEventListener("load", () => {
    patchCreatejs(window.createjs);
    setTimeout(() => patchCreatejs(window.createjs), 0);
    setTimeout(() => patchCreatejs(window.createjs), 200);
    setTimeout(() => patchCreatejs(window.createjs), 1000);
  });
  setTimeout(() => clearInterval(iv), 30000);

  window.addEventListener("load", () => {
    patchCreatejs(window.createjs);
    setTimeout(() => patchCreatejs(window.createjs), 0);
    setTimeout(() => patchCreatejs(window.createjs), 50);
  });
  setTimeout(() => clearInterval(iv), 20000);

  // ── Floating theme toggle (always present in this page context) ──
  function setDark(enabled) {
    document.documentElement.classList.toggle(OFF, !enabled);
    if (enabled) {
      document.documentElement.style.setProperty(
        "background-color",
        "#0d1117",
        "important"
      );
      document.documentElement.style.setProperty(
        "color-scheme",
        "dark",
        "important"
      );
    } else {
      document.documentElement.style.removeProperty("background-color");
      document.documentElement.style.removeProperty("color-scheme");
    }
    try {
      localStorage.setItem(LS_KEY, enabled ? "1" : "0");
    } catch (_) {
      /* ignore */
    }
    try {
      window.postMessage(
        { source: "atcoder-dark", type: "theme", enabled: !!enabled },
        "*"
      );
    } catch (_) {
      /* ignore */
    }
    refreshFab();
  }

  function isDark() {
    return !document.documentElement.classList.contains(OFF);
  }

  let fab = null;

  function refreshFab() {
    if (!fab) return;
    const dark = isDark();
    fab.textContent = dark ? "☀" : "☾";
    fab.title = dark ? "Switch to light / 切换浅色" : "Switch to dark / 切换深色";
    fab.setAttribute("aria-label", fab.title);
    fab.style.background = dark ? "#161b22" : "#ffffff";
    fab.style.color = dark ? "#e6edf3" : "#1f2328";
    fab.style.borderColor = dark ? "#30363d" : "#d0d7de";
  }

  function mountFab() {
    if (document.getElementById("atcoder-dark-fab")) {
      fab = document.getElementById("atcoder-dark-fab");
      refreshFab();
      return;
    }
    if (!document.body) return;

    fab = document.createElement("button");
    fab.id = "atcoder-dark-fab";
    fab.type = "button";
    Object.assign(fab.style, {
      position: "fixed",
      right: "16px",
      bottom: "100px",
      zIndex: "2147483646",
      width: "48px",
      height: "48px",
      borderRadius: "50%",
      border: "1px solid #30363d",
      background: "#161b22",
      color: "#e6edf3",
      fontSize: "22px",
      lineHeight: "1",
      cursor: "pointer",
      boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
      display: "grid",
      placeItems: "center",
      padding: "0",
      margin: "0",
    });
    fab.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDark(!isDark());
    });
    document.body.appendChild(fab);
    refreshFab();
  }

  // Restore theme from localStorage (for non-extension / puppeteer window)
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "0") setDark(false);
    else setDark(true);
  } catch (_) {
    setDark(true);
  }

  function tryMountFab() {
    try {
      mountFab();
    } catch (_) {
      /* ignore */
    }
    return !!document.getElementById("atcoder-dark-fab");
  }

  // Body may not exist yet at document_start — observe until mounted
  if (!tryMountFab()) {
    document.addEventListener("DOMContentLoaded", tryMountFab, { once: true });
    window.addEventListener("load", tryMountFab, { once: true });
    const bootIv = setInterval(() => {
      if (tryMountFab()) clearInterval(bootIv);
    }, 200);
    setTimeout(() => clearInterval(bootIv), 30000);
    try {
      new MutationObserver(() => {
        if (tryMountFab()) {
          /* keep observer for SPA-ish replacements */
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {
      /* ignore */
    }
  }

  // Expose for manual re-inject
  window.__atcoderDarkMountFab = tryMountFab;
  window.__atcoderDarkSetDark = setDark;
})();
