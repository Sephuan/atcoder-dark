# AtCoder Dark

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest](https://img.shields.io/badge/Manifest-V3-green.svg)](manifest.json)

Chrome extension that applies a modern **dark theme** to [AtCoder](https://atcoder.jp).

> Not affiliated with AtCoder Inc.

## Features

- Dark theme for tasks, standings, submit, ranking, profile, settings, and more
- **One-click** light / dark toggle (toolbar popup + floating ☀/☾ button)
- **Bilingual UI**: English & 简体中文
- Preserves rank colors and AC/WA verdict colors
- Better contrast for ACE code view and rating charts
- **Compatible with AtCoder Extension** — row verdict backgrounds (#d4edc9 AC / #ffe3e3 non-AC) are remapped to semi-transparent dark-mode colors; rating chart (CreateJS) text and rank colors are patched for readability
- FOUC-free: first paint is already dark
- Minimal permissions: `storage` + `atcoder.jp` only

## Install

### Chrome Web Store

*(Link after publication)*

### Developer mode (from source)

1. Clone this repo  
2. Open `chrome://extensions`  
3. Enable **Developer mode**  
4. **Load unpacked** → select this repository root  

## Usage

1. Open any `https://atcoder.jp/*` page  
2. Theme is **on by default**  
3. Toggle via extension popup or the floating button (bottom-right)  

### Language

| Option | Behavior |
|--------|----------|
| **Auto** | Follow browser UI language |
| **中文** | Force Chinese |
| **English** | Force English |

## Privacy

See [docs/privacy.md](docs/privacy.md).  
Settings stay in your browser; nothing is sent to the extension author.

## Development

```bash
# optional: local preview browser (system Chrome + puppeteer-core)
npm install
npm run login
```

```bash
# build Chrome Web Store zip → dist/atcoder-dark-<version>.zip
npm run pack
```

Store listing checklist: [docs/CHROME_WEB_STORE.md](docs/CHROME_WEB_STORE.md)

### Layout

```
manifest.json       MV3 manifest
content/            content script + CreateJS chart patch
styles/             preload.css + dark.css
popup/              theme + language UI
lib/i18n.js         EN / zh_CN strings
_locales/           Chrome Web Store / toolbar i18n
icons/              16 / 48 / 128
docs/               privacy + store notes
scripts/            pack + optional dev tooling
```

## License

[MIT](LICENSE) © Sephuan
