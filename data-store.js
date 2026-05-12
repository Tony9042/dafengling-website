/* ============================================================
   data-store.js — 統一的資料存取層
   ------------------------------------------------------------
   提供一致的 API 介面，自動依照 firebase-config.js 是否設定
   切換「Firebase 雲端模式」或「localStorage 單機模式」。
   前台 main.js 和後台 admin.js 都透過這個模組讀寫資料。
   ============================================================ */

(function (global) {
  "use strict";

  const SITE_VERSION = "3.0.0"; // 全站統一版本號（前後台共用）

  /* ----- 預設資料（雲端讀不到時的後備內容） ----- */
  const DEFAULTS = {
    logo: "./assets/images/logo.png",
    storyImg: "./assets/images/story.jpg",
    esgImg: "./assets/images/esg.png",
    hero: {
      title: "種下一個約定 讓豐收降臨",
      sub: "轉廢為能，點土成金。與土地共創永續循環的美好未來。",
      cta1: { text: "了解我們的故事", href: "#story" },
      cta2: { text: "探索產品服務", href: "#offerings" },
      slides: [
        "./assets/images/slide1.png",
        "./assets/images/slide2.png",
        "./assets/images/slide3.png",
      ],
    },
    story: {
      strap: "在繁華的都市角落與廣袤的田野之間，我們記得與土地最初的約定",
      p1: "我們的故事，始於創辦人對土地深切的疼惜與承諾……",
      p2: "減碳與豐收不必二選一。透過循環農業與科學堆肥，讓土壤更健康、社會更永續。",
      values: [
        "廢棄物變成有價值資源",
        "科技與自然的完美結合",
        "創造在地共好與就業",
        "環境保護",
      ],
      core: [
        "將碳穩定封存於土壤中，邁向碳中和",
        "提供作物穩定、長效的營養來源",
        "與社區、農友合作，建立共享生態圈",
      ],
    },
    offerings: {
      cards: [
        {
          badge: "核心產品",
          title: "碳穩穩有機質肥料",
          sub: "為您的餐桌穩住健康",
          img: "./assets/images/product1.png",
          bullets: [
            "改善土壤健康，提供長效營養",
            "適用於農田與家庭園藝",
            "固碳減排，打造會呼吸的農田",
          ],
        },
        {
          badge: "專業服務",
          title: "有機廢棄物回收服務",
          sub: "舉手之勞，永續之鑰",
          img: "./assets/images/product2.png",
          bullets: [
            "社區合作，建立共好生態圈",
            "完整回收處理流程",
            "促進循環經濟，資源永續利用",
          ],
        },
      ],
    },
    esgText: [
      "我們致力於將有機廢棄物轉化為資源，減少掩埋與焚燒，透過碳穩穩封存於土壤。",
      "與社區、農場合作，建立回收網絡與教育推廣。",
      "透明治理、誠信經營，建立長期信任。",
    ],
    contact: {
      phone: "+886-7-657-7151",
      mail: "info@dafengling.com",
      addr: "台灣台北市信義區永續大道123號",
      lineText: "@dafengling",
      lineLink: "",
    },
    bg: {
      story:     { url: "./assets/images/bg-story.png",   opacity: 0.15 },
      offerings: { url: "./assets/images/bg-offer.webp",  opacity: 0.12 },
      news:      { url: "./assets/images/bg-news.png",    opacity: 0.12 },
      esg:       { url: "./assets/images/bg-esg.png",     opacity: 0.12 },
      contact:   { url: "./assets/images/bg-contact.jpg", opacity: 0.25 },
    },
    news: [
      {
        badge: "公司新聞",
        date: "2024-03-15",
        title: "大豐臨與在地農場簽署合作備忘錄",
        excerpt: "攜手推動有機農業發展，建立友善循環生態系統。",
        content: "大豐臨宣布與在地農場簽定合作備忘錄，將共同推動廚餘資源化與有機耕作示範計畫……",
      },
      {
        badge: "成果分享",
        date: "2024-03-10",
        title: "碳穩穩肥料助力農友增產30%",
        excerpt: "合作農友反映作物品質穩定提升。",
        content: "本季成效顯示，施用碳穩穩後土壤有機質含量提升，作物生長更健壯，平均收成提升約30％……",
      },
      {
        badge: "活動資訊",
        date: "2024-03-20",
        title: "永續農業實訪節目將播出",
        excerpt: "邀請專家共同探討循環經濟的未來。",
        content: "節目將帶您走進堆肥場、農場與社區合作點，了解從廚餘到肥料的完整旅程……",
      },
    ],
  };

  /* ----- localStorage 快取輔助（即時讀取/離線後備） ----- */
  const CACHE_KEY = "dafengling.cache.v3";

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn("快取寫入失敗（容量已滿），不影響雲端儲存", e);
      return false;
    }
  }

  /* ----- 模式判斷 ----- */
  const useFirebase = !!(global.FIREBASE_READY && global.firebase);

  /* ============================================================
     Firebase 模式
     ============================================================ */
  let fbApp, fbDB, fbAuth;

  function initFirebase() {
    if (!useFirebase) return;
    if (!fbApp) {
      fbApp = firebase.initializeApp(global.FIREBASE_CONFIG);
      fbDB = firebase.firestore();
      fbAuth = firebase.auth();
    }
  }

  async function fbReadContent() {
    initFirebase();
    const snap = await fbDB.collection("site").doc("content").get();
    if (!snap.exists) return null;
    return snap.data();
  }

  async function fbWriteContent(content) {
    initFirebase();
    content._updatedAt = new Date().toISOString();
    await fbDB.collection("site").doc("content").set(content, { merge: true });
    return content._updatedAt;
  }

  /**
   * 上傳一張圖片到 Cloudinary（免費替代 Firebase Storage），回傳公開網址
   * @param {File} file
   * @param {string} pathHint  例如 "logo" / "slides/0" / "bg/story"（會放在 Cloudinary 資料夾分類）
   */
  async function cloudinaryUploadImage(file, pathHint) {
    const cfg = global.CLOUDINARY_CONFIG || {};
    if (!cfg.cloudName || !cfg.uploadPreset) {
      throw new Error("Cloudinary 未設定（請填 firebase-config.js 裡的 CLOUDINARY_CONFIG）");
    }

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", cfg.uploadPreset);
    // 用 pathHint 把圖片分類到資料夾，方便日後在 Cloudinary 後台管理
    form.append("folder", `dafengling/${pathHint.replace(/\/.*/, "")}`);

    const url = `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`;
    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Cloudinary 上傳失敗（${res.status}）：${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.secure_url;
  }

  /* ============================================================
     對外 API（不論是 Firebase 模式或 localStorage 模式都統一）
     ============================================================ */
  const DataStore = {
    SITE_VERSION,
    DEFAULTS,

    mode() {
      return useFirebase ? "firebase" : "local";
    },

    /**
     * 讀取所有內容。Firebase 模式會先抓雲端、寫進快取；失敗或 localStorage 模式則用快取/預設值。
     * @returns {Promise<object>}
     */
    async loadAll() {
      if (useFirebase) {
        try {
          const cloud = await fbReadContent();
          if (cloud) {
            writeCache(cloud);
            return mergeWithDefaults(cloud);
          }
        } catch (e) {
          console.warn("雲端讀取失敗，改用本地快取：", e);
        }
      }
      const cached = readCache();
      return mergeWithDefaults(cached || {});
    },

    /**
     * 儲存全部內容（後台儲存按鈕呼叫）
     * Firebase 模式會寫到雲端，所有裝置立即同步；
     * localStorage 模式只會寫進當前瀏覽器。
     */
    async saveAll(content) {
      writeCache(content);
      if (useFirebase) {
        return await fbWriteContent(content);
      }
      return new Date().toISOString();
    },

    /**
     * 後台用：把使用者選的檔案上傳並回傳網址（雲端模式）
     * 或讀成 base64 dataURL（localStorage 模式）
     */
    async uploadImage(file, pathHint) {
      if (!file) return "";
      if (useFirebase) {
        return await cloudinaryUploadImage(file, pathHint);
      }
      return await fileToBase64(file);
    },

    /* ----- 認證（只有 Firebase 模式才有用） ----- */
    auth: {
      isFirebaseMode: useFirebase,
      async login(email, password) {
        initFirebase();
        if (!useFirebase) throw new Error("Firebase 未設定，無法登入");
        await fbAuth.signInWithEmailAndPassword(email, password);
      },
      async logout() {
        initFirebase();
        if (!useFirebase) return;
        await fbAuth.signOut();
      },
      onChange(cb) {
        initFirebase();
        if (!useFirebase) {
          // localStorage 模式視為「已登入」，方便本地測試
          cb({ email: "(本地模式)" });
          return () => {};
        }
        return fbAuth.onAuthStateChanged((user) => cb(user));
      },
      currentUser() {
        initFirebase();
        if (!useFirebase) return { email: "(本地模式)" };
        return fbAuth.currentUser;
      },
      async resetPassword(email) {
        initFirebase();
        if (!useFirebase) throw new Error("Firebase 未設定");
        await fbAuth.sendPasswordResetEmail(email);
      },
    },
  };

  /* ----- 合併使用者資料 + 預設值，確保前台不會因為缺欄位崩潰 ----- */
  function mergeWithDefaults(user) {
    const out = JSON.parse(JSON.stringify(DEFAULTS));
    if (!user || typeof user !== "object") return out;
    for (const k of Object.keys(user)) {
      const v = user[k];
      if (v == null || v === "") continue;
      out[k] = v;
    }
    // bg 子物件特殊處理（避免漏一個 section 整個 bg 都被覆蓋掉）
    if (user.bg && typeof user.bg === "object") {
      out.bg = { ...DEFAULTS.bg };
      for (const section of Object.keys(user.bg)) {
        out.bg[section] = { ...DEFAULTS.bg[section], ...user.bg[section] };
      }
    }
    return out;
  }

  /* ----- 圖片壓縮工具（後台用，避免上傳過大檔案） ----- */
  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  /**
   * 把圖片檔案壓縮成不超過 maxWidth 寬度的 JPG/PNG
   * @param {File} file
   * @param {number} maxWidth 預設 1600
   * @param {number} quality 0~1，預設 0.82
   * @returns {Promise<File>}
   */
  async function compressImage(file, maxWidth = 1600, quality = 0.82) {
    if (!file.type.startsWith("image/")) return file;
    // 已經很小就不再壓
    if (file.size < 200 * 1024) return file;

    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = URL.createObjectURL(file);
    });

    const scale = Math.min(1, maxWidth / img.width);
    if (scale === 1 && file.size < 800 * 1024) return file;

    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);

    // PNG 保留透明度，否則用 JPG
    const wantPng = /png|webp/i.test(file.type);
    const mime = wantPng ? "image/png" : "image/jpeg";
    const blob = await new Promise((res) => canvas.toBlob(res, mime, quality));
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.\w+$/, wantPng ? ".png" : ".jpg"), {
      type: mime,
      lastModified: Date.now(),
    });
  }

  DataStore.compressImage = compressImage;
  DataStore.fileToBase64 = fileToBase64;

  global.DataStore = DataStore;
})(window);
