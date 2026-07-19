# Changelog

## 1.2.3 — 2026-07-16

- Preserve red emphasis in problem statements (updated constraints): KaTeX inherits author color instead of forcing body text color

## 1.2.2 — 2026-07-16

- Dark theme for **AtCoder Analytics** profile panel (`.ac-analytics` cards, status, table, tooltip, charts via `currentColor`)

## 1.2.1 — 2026-07-15

- Tasks list: paint AC/WA rows ourselves via `/submissions/me` (task path keys), so hyphenated titles like “Fill-Rect Query” still get green
- Fix AtCoder Extension light-green rows being crushed by stripe / catch-all CSS
- Stop whole-document MutationObserver and tighten CreateJS/FAB polling (less freeze on navigation)
- Inline `code` keeps red accent; task figures invert for dark bg; Submit links no longer get pagination pill chrome

## 1.2.0 — 2026-07-13

- Verdict compatibility layer: AC/WA/TLE/MLE/RE/CE/WJ high-contrast + glow
- Bilingual UI verified across popup + floating button

## 1.1.0 — 2026-07-13

- Initial public release packaging
- Dark theme for AtCoder (MV3)
- Light / dark one-click toggle (popup + floating button)
- Bilingual UI: English & 简体中文
- ACE / Select2 / rating chart (CreateJS) contrast improvements
- FOUC-free `document_start` injection
- Privacy policy and Chrome Web Store packaging script
