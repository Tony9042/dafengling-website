# 大豐臨網站 — 整理後總覽

> 版本：3.0.0  
> 整理日期：2026-05-11

---

## 資料夾結構

```
大豐臨網頁/
├── index.html              ← 前台首頁
├── style.css               ← 樣式（版型不動）
├── main.js                 ← 前台邏輯（修正版本 bug、改用 DataStore）
├── data-store.js           ← 🆕 統一資料層（前後台共用）
├── firebase-config.js      ← 🆕 Firebase 設定（需手動填入）
├── assets/
│   └── images/             ← 圖片（已去除重複，只留一份）
├── admin/
│   ├── admin_console.html  ← 後台（加入登入畫面）
│   └── admin.js            ← 後台邏輯
├── docs/
│   ├── 00_README.md                 ← 本檔
│   ├── 01_Firebase建立步驟.md        ← 給開發者
│   ├── 02_GitHub_Pages部署步驟.md    ← 給開發者
│   ├── 03_客戶端後台操作說明.md       ← 給客戶
│   ├── 原始資料備份.json             ← 舊版的 localStorage 匯出
│   ├── 網頁修改20251020.docx
│   └── 網頁標題與內文.docx
└── backup-原始版本-20260511/  ← 整理前的完整備份（可刪）
```

---

## 解決了哪些問題

| 原本的問題 | 修正方式 |
| --- | --- |
| 改版本號就把使用者資料清空 | 拿掉 `localStorage.clear()`，改用智慧合併 |
| `index.html` 第 201 行 `<a>` 沒關閉 | 修正 HTML 結構 |
| 兩個資料夾、檔案重複 | 合併成單一資料夾 + 共用 assets/images |
| 後台改的資料前台看不到（不同瀏覽器/裝置） | Firebase 雲端同步，所有裝置即時更新 |
| 任何人知道後台網址都能改 | Firebase Auth 帳密登入保護 |
| 沒有「未儲存」警告 | 加入未儲存狀態追蹤 + 離開頁面警告 |
| 沒有最後更新時間 | 顯示「最後同步」時間 |
| 大圖上傳很慢 | 自動壓縮（最大 1600px） |
| 檔名筆誤 `admin_consloe.txt` | 已刪除（內容在 backup） |

---

## 下一步該做什麼

1. **建立 Firebase 專案** → 看 `01_Firebase建立步驟.md`
2. **部署到 GitHub Pages** → 看 `02_GitHub_Pages部署步驟.md`
3. **把後台操作說明交給客戶** → `03_客戶端後台操作說明.md`

---

## 本機測試

不必設定 Firebase 也能立即試用！

1. 用瀏覽器打開 `index.html`（雙擊或拖進瀏覽器）
2. 右下角「⚙️」按鈕進後台
3. 因為 `firebase-config.js` 還沒填，會以「本機模式」運作（資料只存在當下瀏覽器）
4. 改完按「儲存」→ 前台重新整理就能看到效果

設定好 Firebase 之後會自動切換成「雲端模式」，所有裝置即時同步。

---

## 程式檔說明

| 檔案 | 行數（約） | 角色 |
| --- | --- | --- |
| `index.html` | 200 | 前台頁面結構（純靜態 HTML） |
| `style.css` | 480 | 樣式（**未變動**，沿用原版） |
| `main.js` | 200 | 前台渲染邏輯 |
| `admin/admin_console.html` | 380 | 後台頁面結構 |
| `admin/admin.js` | 430 | 後台邏輯（含登入、儲存、上傳） |
| `data-store.js` | 250 | 資料抽象層（Firebase ↔ 本機自動切換） |
| `firebase-config.js` | 30 | Firebase 設定金鑰 |
