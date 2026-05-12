# Firebase + Cloudinary 建立步驟（給開發者用）

> 預估時間：約 15 分鐘  
> 全部免費（Firebase Spark + Cloudinary 免費方案），完全不必綁定信用卡  
> ⚠ 註：Firebase Storage 從 2024 下半年起需要升級到付費方案，所以圖片儲存改用 Cloudinary

---

## 步驟 1：建立 Firebase 專案

1. 用 Google 帳號登入 [Firebase Console](https://console.firebase.google.com/)
2. 點「**新增專案**」
3. 專案名稱填 `dafengling-website`（或任何你喜歡的名字）
4. **關閉** Google Analytics（這個專案用不到，關掉比較簡單）
5. 等待 30 秒建立完成 → 點「**繼續**」

---

## 步驟 2：註冊 Web App，取得設定金鑰

1. 在專案首頁的「**新增應用程式**」選 `</>`（Web 圖示）
2. App 暱稱填 `dafengling-web`
3. **不要勾選** 「同時為此應用程式設定 Firebase Hosting」
4. 點「**註冊應用程式**」
5. Firebase 會顯示一段範例程式碼，**只要看到 `firebaseConfig = { ... }` 大括號裡的那 7 個欄位**（apiKey、authDomain、projectId、storageBucket、messagingSenderId、appId、measurementId）
6. 打開 `firebase-config.js`，把這 7 個欄位的值對應貼到 `window.FIREBASE_CONFIG = { ... }` 裡面
   - ⚠ **不要把 `import ... from "firebase/app"` 那幾行貼進來** — 我們用的是 compat 載入方式，不需要那些 import
7. 點「**繼續至主控台**」

---

## 步驟 3：啟用 Firestore Database

1. 左側選單 → **資料庫和儲存空間** → **Firestore**
2. 點「**建立資料庫**」
3. 位置選 `asia-east1`（台灣/香港）或 `asia-northeast1`（日本/韓國）
4. 選「**從測試模式開始**」（等下會改安全規則）
5. 點「**啟用**」

啟用後切到「**規則**」分頁，貼上以下規則：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 網站內容：任何人可讀，只有登入的管理員可寫
    match /site/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

點「**發布**」儲存。

---

## 步驟 4：設定 Cloudinary（圖片儲存）

> 為什麼用 Cloudinary：Firebase Storage 現在要付費方案才能用，而 Cloudinary 提供 25GB 完全免費的圖片儲存服務，對小型網站來說永遠用不完。

1. 到 [cloudinary.com](https://cloudinary.com) 用 Email 註冊免費帳號
2. 進入 Dashboard，抄下「**Cloud name**」
3. 左側 **Settings**（齒輪圖示）→ **Upload** 分頁 → 滾到「Upload presets」
4. 點「**Add upload preset**」
5. Preset 名稱填一個好記的（例如 `dafengling_unsigned`）
6. **Signing Mode** 改成 **Unsigned**（重要！這樣前端才能直接上傳）
7. 點右上「**Save**」
8. 打開 `firebase-config.js`，把 Cloud name 和 Preset 名稱填進 `CLOUDINARY_CONFIG`：

```javascript
window.CLOUDINARY_CONFIG = {
  cloudName: "你的 cloud name",
  uploadPreset: "dafengling_unsigned"
};
```

---

## 步驟 5：啟用 Authentication 並建立管理員帳號

1. 左側選單 → **安全性** → **Authentication**
2. 點「**開始使用**」
3. 「**Sign-in method**」分頁 → 找到「**電子郵件/密碼**」 → 啟用 → 儲存
4. 切到「**Users**」分頁 → 「**新增使用者**」
5. 填入管理員的 Email 與密碼（**這就是後台登入帳號**）
6. 把這組帳密交給客戶

---

## 步驟 6：測試是否設定成功

1. 打開 `firebase-config.js`，確認：
   - `FIREBASE_CONFIG` 的 7 個欄位都填好了
   - `CLOUDINARY_CONFIG` 的兩個欄位（cloudName、uploadPreset）也填好了
2. 用瀏覽器打開 `admin/admin_console.html`
3. 應該會看到登入畫面，輸入剛剛建立的帳密 → 進入後台
4. 隨便改一個欄位 → 按「儲存」→ 看到「✅ 已儲存並同步到雲端」
5. 上傳一張新圖片 → 儲存 → 預覽圖會變成 `https://res.cloudinary.com/...`（Cloudinary 的網址）
6. 打開 `index.html` → 該欄位內容和新圖應該都更新了 ✓

---

## 常見問題

**Q：圖片上傳卡很久？**  
A：Cloudinary 上傳通常 1-3 秒。系統會在上傳前自動把圖片壓縮到 1600px 以內。

**Q：客戶忘記密碼？**  
A：在登入畫面點「忘記密碼？」，輸入 Email 後系統會寄重設信。

**Q：要新增第二個管理員？**  
A：到 Firebase Console → Authentication → Users → 「新增使用者」。

**Q：要看誰改了什麼？**  
A：Firebase Console → Firestore Database → 看到 `site/content` 文件的 `_updatedAt` 欄位是最後更新時間。

**Q：能不能不要 Firebase，直接用 JSON 檔？**  
A：可以。把 `firebase-config.js` 裡的 `apiKey` 保持 `PASTE_YOUR_API_KEY_HERE`，系統會自動切換成「本機模式」：後台改完只存在當下這台瀏覽器（不會雲端同步）。
