(() => {
  const OFF = "atcoder-dark-off";
  const FAB_ID = "atcoder-dark-fab";
  const html = document.documentElement;

  function isDark() { return !html.classList.contains(OFF); }
  function paintShell(on) {
    if (on) { html.style.cssText += ";background-color:#0d1117 !important;color-scheme:dark !important;"; }
    else { html.style.removeProperty("background-color"); html.style.removeProperty("color-scheme"); }
  }
  function setEnabled(on) {
    html.classList.toggle(OFF, !on); paintShell(on); refreshFab(); fixAll();
  }

  // Fetch ONLY page 1 of submissions (latest verdict per problem)
  var cache = {};
  async function fetchOnce() {
    try {
      var base = location.pathname.match(/\/contests\/\d+/);
      if (!base) return;
      var r = await fetch(base[0] + "/submissions/me", { credentials: "include" });
      if (!r.ok) return;
      var doc = new DOMParser().parseFromString(await r.text(), "text/html");
      var rows = doc.querySelectorAll("tbody tr");
      for (var i = 0; i < rows.length; i++) {
        var t = rows[i].querySelectorAll("td");
        if (t.length < 7) continue;
        var prob = (t[1].querySelector("a") || {}).textContent || "";
        var letter = prob.trim().split("-")[0].trim();
        var v = t[6].textContent.trim();
        if (letter && !cache[letter]) cache[letter] = v;
      }
    } catch (e) {}
  }

  function fixAll() {
    var trs = document.querySelectorAll("tbody tr");
    for (var i = 0; i < trs.length; i++) {
      var tr = trs[i], bg = tr.style.backgroundColor;
      if (!isDark()) {
        if (/34,\s*197,\s*94/.test(bg)) tr.style.setProperty("background-color", "rgb(212,237,201)", "important");
        else if (/239,\s*68,\s*68/.test(bg)) tr.style.setProperty("background-color", "rgb(255,227,227)", "important");
        var b = tr.querySelector(".atcdr-mark"); if (b) b.remove();
        continue;
      }
      var ac = /212,\s*237,\s*201|#d4edc9/.test(bg);
      var wa = /255,\s*227,\s*227|#ffe3e3|255,\s*200,\s*200/.test(bg);
      if (ac) tr.style.setProperty("background-color", "rgba(34,197,94,0.30)", "important");
      else if (wa) tr.style.setProperty("background-color", "rgba(239,68,68,0.30)", "important");
      var cell = tr.querySelector("td:first-child");
      if (!cell) continue;
      cell.querySelector(".atcdr-mark") && cell.querySelector(".atcdr-mark").remove();
      if (!ac && !wa) continue;
      var s = document.createElement("span");
      s.className = "atcdr-mark";
      s.textContent = ac ? "✓" : "✗";
      s.style.cssText = "margin-right:4px;font-weight:700;vertical-align:middle;color:" + (ac ? "#4ade80" : "#f87171") + ";";
      cell.insertBefore(s, cell.firstChild);
    }
  }

  // FAB
  function refreshFab() { var f = document.getElementById(FAB_ID); if (f) f.textContent = isDark() ? "☀" : "☾"; }
  function mountFab() {
    if (document.getElementById(FAB_ID)) { refreshFab(); return; }
    var f = document.createElement("button"); f.id = FAB_ID; f.type = "button"; f.textContent = "☀";
    f.onclick = function() { setEnabled(!isDark()); try { chrome.storage.sync.set({ enabled: !isDark() }); } catch(e) {} };
    (document.body || document.documentElement).appendChild(f); refreshFab();
  }

  setEnabled(true);
  try { chrome.storage.sync.get({ enabled: true }, function(d) { setEnabled(d.enabled !== false); }); } catch(e) {}
  try { chrome.storage.onChanged.addListener(function(c) { if (c.enabled) setEnabled(c.enabled.newValue); }); } catch(e) {}

  // On tasks page only: fetch verdicts, then fix
  if (location.pathname.indexOf("/tasks") > -1) {
    fetchOnce().then(function() {
      setTimeout(fixAll, 600);
      setTimeout(fixAll, 2500);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountFab);
  else setTimeout(mountFab, 200);
})();
