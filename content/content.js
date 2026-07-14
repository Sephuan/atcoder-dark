(() => {
  const OFF = "atcoder-dark-off";
  const FAB_ID = "atcoder-dark-fab";
  const html = document.documentElement;

  function isDark() { return !html.classList.contains(OFF); }

  function paintShell(on) {
    if (on) {
      html.style.setProperty("background-color", "#0d1117", "important");
      html.style.setProperty("color-scheme", "dark", "important");
    } else {
      html.style.removeProperty("background-color");
      html.style.removeProperty("color-scheme");
    }
  }

  function setEnabled(on) {
    html.classList.toggle(OFF, !on);
    paintShell(on);
    refreshFab();
    fixRows();
  }

  // AtCoder Extension colors rows: #d4edc9 = AC, #ffe3e3 = WA/TLE/MLE/RE
  function fixRows() {
    var trs = document.querySelectorAll("tbody tr");
    for (var i = 0; i < trs.length; i++) {
      var bg = trs[i].style.backgroundColor || "";
      if (!isDark()) {
        // Restore original light colors
        if (/34,\s*197,\s*94/.test(bg)) trs[i].style.setProperty("background-color", "rgb(212, 237, 201)", "important");
        else if (/239,\s*68,\s*68/.test(bg)) trs[i].style.setProperty("background-color", "rgb(255, 227, 227)", "important");
        continue;
      }
      if (/212,\s*237,\s*201|#d4edc9/.test(bg)) {
        trs[i].style.setProperty("background-color", "rgba(34, 197, 94, 0.30)", "important");
      } else if (/255,\s*227,\s*227|#ffe3e3|255,\s*200,\s*200/.test(bg)) {
        trs[i].style.setProperty("background-color", "rgba(239, 68, 68, 0.30)", "important");
      }
    }
  }

  // Run a few times to catch async coloring from AtCoder Extension
  setTimeout(fixRows, 500);
  setTimeout(fixRows, 1500);
  setTimeout(fixRows, 4000);

  function toggle() {
    var next = isDark() ? false : true; // next state
    setEnabled(next);
    try { chrome.storage.sync.set({ enabled: next }); } catch(e) {}
  }
  function refreshFab() {
    var fab = document.getElementById(FAB_ID);
    if (!fab) return;
    fab.textContent = isDark() ? "☀" : "☾";
  }
  function mountFab() {
    if (document.getElementById(FAB_ID)) { refreshFab(); return; }
    var fab = document.createElement("button");
    fab.id = FAB_ID; fab.type = "button"; fab.textContent = "☀";
    fab.addEventListener("click", toggle);
    (document.body || document.documentElement).appendChild(fab);
    refreshFab();
  }

  setEnabled(true);
  try { chrome.storage.sync.get({ enabled: true }, function(d) { setEnabled(d.enabled !== false); }); } catch(e) {}
  try { chrome.storage.onChanged.addListener(function(c) { if (c.enabled) refreshFab(); }); } catch(e) {}

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountFab);
  else setTimeout(mountFab, 200);
})();
