/* Firebase + Cloudinary 設定檔
   ============================================================
   第一次使用必看：
   1) 到 https://console.firebase.google.com/ 用 Google 帳號登入
   2) 建立新專案 → 註冊 Web App → 把 7 個金鑰貼到下方 FIREBASE_CONFIG
   3) 啟用兩項服務：
        - Firestore Database（左側「資料庫和儲存空間」→ Firestore）
        - Authentication（左側「安全性」→ Authentication）
   4) 到 https://cloudinary.com 註冊免費帳號（圖片儲存用）
        - Dashboard 抄 Cloud name
        - Settings → Upload → 建立 Unsigned 的 Upload preset
        - 把兩個值填到下方 CLOUDINARY_CONFIG
   5) 安全性規則請參照 docs/01_Firebase建立步驟.md
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyA0KRj_3WxNtYGdPB6vEttQrXqtQMAaHlI",
  authDomain: "dafengling-website.firebaseapp.com",
  projectId: "dafengling-website",
  storageBucket: "dafengling-website.firebasestorage.app",
  messagingSenderId: "1046186639067",
  appId: "1:1046186639067:web:a3ffff71ab4bd67795d6fe",
  measurementId: "G-K8G714SQ5R"
};

window.CLOUDINARY_CONFIG = {
  cloudName: "dfgsg8vla",
  uploadPreset: "dafengling_unsigned"
};

// 自動偵測：填好上面兩段才會啟用「雲端同步模式」（請勿修改下方）
window.FIREBASE_READY =
  !window.FIREBASE_CONFIG.apiKey.includes("PASTE_YOUR_API_KEY") &&
  !!(window.CLOUDINARY_CONFIG.cloudName && window.CLOUDINARY_CONFIG.uploadPreset);
