# 部署到 GitHub Pages（公開上線）

> 預估時間：約 10 分鐘  
> 部署後會得到一個像 `https://username.github.io/dafengling/` 的網址

---

## 前置作業

確認你已經做完：
1. [x] Firebase 設定完成（`firebase-config.js` 填好了）
2. [x] 後台可以登入、儲存
3. [x] 前台可以看到改完後的內容

你需要一個 [GitHub](https://github.com/) 帳號（免費註冊）。

---

## 步驟 1：建立 GitHub Repository（儲存庫）

1. 登入 GitHub → 右上角 `+` → **New repository**
2. Repository name 填：`dafengling-website`（或你想要的名字）
3. Public（公開）— **重要**：GitHub Pages 免費方案只支援 public
4. **不要勾** Add README / .gitignore / license
5. 點「Create repository」

---

## 步驟 2：上傳整個資料夾

### 簡單做法：用網頁上傳

1. 在剛建立的 repository 頁面，找「**uploading an existing file**」連結
2. 把整個 `大豐臨網頁/` 資料夾**裡面的所有檔案和子資料夾**拖進去
   - ✅ `index.html`、`main.js`、`style.css`、`data-store.js`、`firebase-config.js`
   - ✅ `assets/`、`admin/`、`docs/`
   - ❌ **不要上傳** `backup-原始版本-*/` 和舊的 `dafenglin-index/`、`dafenglin-admin_console/`（如果還在的話）
3. 等檔案全部上傳完
4. 下方 Commit message 填 `Initial commit` → 點「**Commit changes**」

### 進階做法：用 Git 命令列

```bash
cd "C:\Users\user\Desktop\宥廷-資料\dafenglin-website\大豐臨網頁"
git init
git add index.html style.css main.js data-store.js firebase-config.js assets admin docs
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的帳號/dafengling-website.git
git push -u origin main
```

---

## 步驟 3：啟用 GitHub Pages

1. 在 repository 頁面 → 上方 **Settings**
2. 左側選單 → **Pages**
3. Source 選 「Deploy from a branch」
4. Branch 選 `main`，資料夾選 `/ (root)`
5. 點「**Save**」
6. 等 1-2 分鐘 → 重新整理頁面 → 上方會出現你的網址：  
   `https://你的帳號.github.io/dafengling-website/`

---

## 步驟 4：到 Firebase 新增允許的網域

GitHub Pages 啟用後，第一次打開後台會發現登入失敗——這是因為 Firebase 只允許「授權的網域」登入。

1. 到 [Firebase Console](https://console.firebase.google.com/) → 你的專案
2. **Authentication** → **Settings** 分頁 → **Authorized domains**
3. 點「**Add domain**」 → 輸入 `你的帳號.github.io` → 儲存

完成！現在登入就會正常運作。

---

## 步驟 5：（選做）綁定自訂網域

如果客戶有自己的網域（例如 `www.dafengling.com`）：

1. 在 repository → Settings → Pages → Custom domain 填入網域
2. 在網域服務商（GoDaddy、Cloudflare 等）設定 DNS：
   ```
   類型  名稱   值
   CNAME www    你的帳號.github.io
   ```
3. 等 DNS 生效（10 分鐘 - 24 小時）
4. 勾選「Enforce HTTPS」

---

## 步驟 6：日常更新工作流程

**改網頁文字、圖片、版型** → 編輯本地檔案 → 上傳到 GitHub（網頁拖檔或 `git push`）→ 幾秒後網站自動更新

**客戶改後台內容** → 直接在後台登入修改 → 即時同步到所有訪客（不必重新部署網站）

---

## 上線檢查清單

- [ ] `firebase-config.js` 已填入真實設定
- [ ] Firestore / Storage / Auth 都已啟用
- [ ] 已建立管理員帳號
- [ ] GitHub Pages 顯示綠色勾勾，網址可開
- [ ] 已把網域加入 Firebase Authorized domains
- [ ] 前台 `https://.../index.html` 顯示正常
- [ ] 後台 `https://.../admin/admin_console.html` 可登入、可儲存
- [ ] 已把客戶的登入帳密交給客戶
- [ ] 已給客戶看一次「客戶端操作說明」

---

## 故障排除

**前台打不開、CSS 沒套用？**  
→ 通常是路徑大小寫問題。GitHub Pages 區分大小寫，確認檔名是 `style.css` 不是 `Style.css`。

**後台一直跳「unauthorized-domain」？**  
→ 沒做步驟 4，請到 Firebase Auth → Settings → Authorized domains 加入你的網址。

**圖片上傳失敗，Console 顯示 CORS 錯誤？**  
→ 通常是 Firebase Storage 規則設定有問題。檢查 `01_Firebase建立步驟.md` 步驟 4 的規則是否貼對。
