const STORAGE_KEY = "enabled";
const { t, getLocalePref, setLocalePref, resolveLocale } = AtCoderDarkI18n;

const btnDark = document.getElementById("btn-dark");
const btnLight = document.getElementById("btn-light");
const status = document.getElementById("status");
const title = document.getElementById("title");
const sub = document.getElementById("sub");
const hint = document.getElementById("hint");
const langLabel = document.getElementById("lang-label");
const langAuto = document.getElementById("lang-auto");
const langZh = document.getElementById("lang-zh");
const langEn = document.getElementById("lang-en");

let localePref = "auto";
let enabled = true;

function applyI18n() {
  document.documentElement.lang =
    resolveLocale(localePref) === "zh_CN" ? "zh-CN" : "en";
  document.title = t("extName", localePref);
  title.textContent = t("popupTitle", localePref);
  sub.textContent = t("popupSub", localePref);
  btnDark.textContent = "☾ " + t("themeDark", localePref);
  btnLight.textContent = "☀ " + t("themeLight", localePref);
  hint.textContent = t("hintFab", localePref);
  langLabel.textContent = t("langLabel", localePref);
  langAuto.textContent = t("langAuto", localePref);
  langZh.textContent = t("langZh", localePref);
  langEn.textContent = t("langEn", localePref);
  status.textContent = enabled
    ? t("statusDark", localePref)
    : t("statusLight", localePref);

  langAuto.classList.toggle("active", localePref === "auto");
  langZh.classList.toggle("active", localePref === "zh_CN");
  langEn.classList.toggle("active", localePref === "en");
}

function renderTheme() {
  btnDark.classList.toggle("active", enabled);
  btnLight.classList.toggle("active", !enabled);
  status.textContent = enabled
    ? t("statusDark", localePref)
    : t("statusLight", localePref);
}

function setEnabled(next) {
  enabled = next;
  chrome.storage.sync.set({ [STORAGE_KEY]: next }, () => renderTheme());
}

chrome.storage.sync.get({ [STORAGE_KEY]: true, locale: "auto" }, (data) => {
  enabled = data[STORAGE_KEY] !== false;
  localePref = data.locale || "auto";
  applyI18n();
  renderTheme();
});

btnDark.addEventListener("click", () => setEnabled(true));
btnLight.addEventListener("click", () => setEnabled(false));

function onLocale(pref) {
  localePref = pref;
  setLocalePref(pref, () => applyI18n());
}

langAuto.addEventListener("click", () => onLocale("auto"));
langZh.addEventListener("click", () => onLocale("zh_CN"));
langEn.addEventListener("click", () => onLocale("en"));
