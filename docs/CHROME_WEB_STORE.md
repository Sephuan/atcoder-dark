# Chrome Web Store 上架清单

## 打包

```bash
npm run pack
# 输出: dist/atcoder-dark-<version>.zip
```

上传该 zip 到 [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)。

## 商店文案（建议）

### 名称

- EN: **AtCoder Dark**
- 中文: **AtCoder 暗色主题**

### 简短描述（≤132 字符）

**EN:**  
Dark theme for AtCoder. One-click light/dark toggle, bilingual UI, FOUC-free.

**中文:**  
AtCoder 深色主题。一键深浅色切换，中英双语，打开页面无白闪。

### 详细描述

```
AtCoder Dark applies a modern dark theme to atcoder.jp.

Features:
• Dark theme tuned for tasks, standings, submit, ranking, profile, and more
• One-click light / dark switch (toolbar popup + floating button)
• Bilingual UI: English & 简体中文
• Preserves rank colors and AC/WA verdict colors
• Improves readability of code (ACE) and rating charts
• Minimal permissions: storage + atcoder.jp only

How to use:
1. Install the extension
2. Open https://atcoder.jp
3. Toggle theme from the extension icon or the ☀/☾ button

Not affiliated with AtCoder Inc.
```

### 分类

- Primary: Productivity  
- 或: Developer Tools

### 语言

- English  
- 中文（简体）

### 隐私

- Single purpose: **Provide a dark theme for AtCoder**
- Host permission justification: inject CSS/JS only on atcoder.jp
- Storage justification: save theme + language preference
- Privacy policy URL: host `docs/privacy.md` on GitHub Pages / raw.githack / repo `docs/privacy.md`  
  Example after publish:  
  `https://github.com/<user>/atcoder-dark/blob/master/docs/privacy.md`

### 截图要求（需自行准备）

| 资源 | 尺寸 |
|------|------|
| 小宣传图 | 440×280 |
| 大宣传图 | 920×680（可选）|
| 截图 | 1280×800 或 640×400，至少 1 张 |

建议截图页面：Tasks 列表、题目页、Standings、用户 Rating 图。

### 图标

仓库已含 `icons/icon16.png` / `48` / `128`。商店另需 **128×128** 商店图标（可用同一 128）。

## 审核注意

- 不要在描述中承诺与 AtCoder 官方有关
- 权限保持最小；不要申请 `tabs` / `<all_urls>` 除非必要
- 每次上传递增 `manifest.json` 的 `version`
