/**
 * Bilingual UI: English + 简体中文.
 * Locale: "auto" | "en" | "zh_CN"  (stored as chrome.storage.sync.locale)
 */
(function (global) {
  const LOCALE_KEY = "locale";
  const STRINGS = {
    en: {
      extName: "AtCoder Dark",
      extDesc: "Dark theme for AtCoder — one-click light/dark switch",
      popupTitle: "AtCoder Dark",
      popupSub: "One-click light / dark",
      themeDark: "Dark",
      themeLight: "Light",
      statusDark: "Theme: Dark",
      statusLight: "Theme: Light",
      hintFab: "You can also use the ☀/☾ button on the page",
      langLabel: "Language",
      langAuto: "Auto",
      langEn: "English",
      langZh: "中文",
      fabTitleDark: "Switch to light theme",
      fabTitleLight: "Switch to dark theme",
      fabAria: "Toggle light / dark theme",
    },
    zh_CN: {
      extName: "AtCoder 暗色主题",
      extDesc: "AtCoder 深色主题 — 一键切换深浅色",
      popupTitle: "AtCoder 暗色",
      popupSub: "深浅色一键切换",
      themeDark: "深色",
      themeLight: "浅色",
      statusDark: "当前：深色模式",
      statusLight: "当前：浅色模式",
      hintFab: "页面右下角也有 ☀/☾ 浮动按钮",
      langLabel: "语言",
      langAuto: "自动",
      langEn: "English",
      langZh: "中文",
      fabTitleDark: "切换到浅色主题",
      fabTitleLight: "切换到深色主题",
      fabAria: "切换深色 / 浅色主题",
    },
  };

  function browserLang() {
    try {
      const lang = (
        (typeof chrome !== "undefined" &&
          chrome.i18n &&
          chrome.i18n.getUILanguage &&
          chrome.i18n.getUILanguage()) ||
        (typeof navigator !== "undefined" && navigator.language) ||
        "en"
      ).toLowerCase();
      if (lang.startsWith("zh")) return "zh_CN";
      return "en";
    } catch {
      return "en";
    }
  }

  /** Optional page hint (e.g. zh pages). AtCoder ja stays on browser UI lang. */
  function pageLang() {
    try {
      const htmlLang = (
        document.documentElement.getAttribute("lang") || ""
      ).toLowerCase();
      if (htmlLang.startsWith("zh")) return "zh_CN";
    } catch {
      /* ignore */
    }
    return null;
  }

  function resolveLocale(pref) {
    if (pref === "en" || pref === "zh_CN") return pref;
    // auto: browser UI language (Chrome zh → 中文, else English)
    return pageLang() || browserLang();
  }

  function t(key, pref) {
    const loc = resolveLocale(pref);
    const table = STRINGS[loc] || STRINGS.en;
    return table[key] || STRINGS.en[key] || key;
  }

  function getLocalePref(cb) {
    try {
      chrome.storage.sync.get({ [LOCALE_KEY]: "auto" }, (data) => {
        cb(data[LOCALE_KEY] || "auto");
      });
    } catch {
      cb("auto");
    }
  }

  function setLocalePref(pref, cb) {
    try {
      chrome.storage.sync.set({ [LOCALE_KEY]: pref }, () => cb && cb());
    } catch {
      cb && cb();
    }
  }

  global.AtCoderDarkI18n = {
    LOCALE_KEY,
    STRINGS,
    t,
    resolveLocale,
    browserLang,
    pageLang,
    getLocalePref,
    setLocalePref,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
