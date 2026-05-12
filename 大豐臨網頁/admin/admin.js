/* ============================================================
   admin.js — 後台邏輯
   ------------------------------------------------------------
   主要改變（相對於舊版）：
   ① 不再直接寫 localStorage，改用 DataStore.saveAll() 同步到雲端
   ② 加入 Firebase Auth 登入保護
   ③ 加入「未儲存」狀態追蹤、離開頁面前提醒
   ④ 加入圖片自動壓縮
   ⑤ 顯示最後同步時間
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
let state = null;            // 目前載入的完整資料
let isDirty = false;         // 是否有未儲存的變更

/* ============================================================
   登入 / 登出
   ============================================================ */
function showLogin() {
  $("#loginOverlay").classList.remove("hidden");
  $("#adminApp").style.display = "none";
  if (!DataStore.auth.isFirebaseMode) {
    $("#localModeHint").style.display = "block";
  }
}

function hideLogin() {
  $("#loginOverlay").classList.add("hidden");
  $("#adminApp").style.display = "block";
}

async function attemptLogin() {
  const email = $("#loginEmail").value.trim();
  const pwd = $("#loginPassword").value;
  $("#loginErr").textContent = "";

  if (!DataStore.auth.isFirebaseMode) {
    // 本機模式：不檢查密碼，直接進入（給尚未設定 Firebase 的階段測試用）
    hideLogin();
    await bootstrap();
    return;
  }

  if (!email || !pwd) {
    $("#loginErr").textContent = "請輸入帳號與密碼";
    return;
  }

  try {
    busy("登入中…");
    await DataStore.auth.login(email, pwd);
    // onChange 會自動觸發 bootstrap
  } catch (e) {
    $("#loginErr").textContent = friendlyAuthError(e);
  } finally {
    busyEnd();
  }
}

async function forgotPassword() {
  const email = $("#loginEmail").value.trim();
  if (!email) {
    $("#loginErr").textContent = "請先在 Email 欄位輸入您的信箱";
    return;
  }
  if (!DataStore.auth.isFirebaseMode) {
    $("#loginErr").textContent = "本機模式不支援密碼重設";
    return;
  }
  try {
    await DataStore.auth.resetPassword(email);
    toast("已寄出重設信，請查看 Email", "ok");
  } catch (e) {
    $("#loginErr").textContent = friendlyAuthError(e);
  }
}

function friendlyAuthError(e) {
  const code = e?.code || "";
  if (code.includes("invalid-email")) return "Email 格式不正確";
  if (code.includes("user-not-found")) return "找不到此帳號";
  if (code.includes("wrong-password") || code.includes("invalid-credential"))
    return "密碼錯誤";
  if (code.includes("too-many-requests")) return "嘗試太多次，請稍後再試";
  return e?.message || "登入失敗，請再試一次";
}

/* ============================================================
   主流程
   ============================================================ */
async function bootstrap() {
  $("#modeChip").textContent =
    DataStore.mode() === "firebase" ? "模式：雲端同步" : "模式：本機（單機）";

  const user = DataStore.auth.currentUser();
  $("#whoText").textContent = user?.email ? `登入：${user.email}` : "";

  busy("讀取資料…");
  try {
    state = await DataStore.loadAll();
    fillForm(state);
    updateLastSavedText();
    markClean();
  } catch (e) {
    toast("讀取資料失敗：" + e.message, "err");
  } finally {
    busyEnd();
  }
}

/* ============================================================
   把資料填進表單
   ============================================================ */
function fillForm(d) {
  // 圖片預覽
  $("#logoPrev").src = d.logo || "";
  $("#storyPrev").src = d.storyImg || "";
  $("#esgPrev").src = d.esgImg || "";

  // 故事
  const s = d.story || {};
  $("#storyStrap").value = s.strap || "";
  $("#storyP1").value = s.p1 || "";
  $("#storyP2").value = s.p2 || "";
  $("#storyValues").value = (s.values || []).join("\n");
  $("#storyCore").value = (s.core || []).join("\n");

  // 產品
  const cards = (d.offerings && d.offerings.cards) || [{}, {}];
  fillCard("A", cards[0] || {});
  fillCard("B", cards[1] || {});

  // ESG
  const et = Array.isArray(d.esgText) ? d.esgText : [];
  $("#e1").value = et[0] || "";
  $("#e2").value = et[1] || "";
  $("#e3").value = et[2] || "";

  // 聯絡
  const c = d.contact || {};
  $("#phone").value = c.phone || "";
  $("#mail").value = c.mail || "";
  $("#addr").value = c.addr || "";
  $("#lineText").value = c.lineText || "";
  $("#lineLink").value = c.lineLink || "";

  // Hero
  const h = d.hero || {};
  $("#heroTitle").value = h.title || "";
  $("#heroSub").value = h.sub || "";
  $("#cta1Text").value = h.cta1?.text || "";
  $("#cta1Href").value = h.cta1?.href || "";
  $("#cta2Text").value = h.cta2?.text || "";
  $("#cta2Href").value = h.cta2?.href || "";

  const slidesWrap = $("#slidesWrap");
  slidesWrap.innerHTML = "";
  (h.slides || []).forEach((src) => slidesWrap.appendChild(createSlideRow(src)));

  // News
  const newsWrap = $("#newsList");
  newsWrap.innerHTML = "";
  (d.news || []).forEach((n) => newsWrap.appendChild(createNewsRow(n)));

  // 背景圖
  const bg = d.bg || {};
  fillBg("Story", bg.story);
  fillBg("Offer", bg.offerings);
  fillBg("News", bg.news);
  fillBg("Esg", bg.esg);
  fillBg("Contact", bg.contact);
}

function fillCard(p, card) {
  $(`#${p}-badge`).value = card.badge || "";
  $(`#${p}-title`).value = card.title || "";
  $(`#${p}-sub`).value = card.sub || "";
  $(`#${p}-bullets`).value = (card.bullets || []).join("\n");
  $(`#${p}-imgUrl`).value =
    card.img && /^https?:\/\//.test(card.img) ? card.img : "";
}

function fillBg(name, bg) {
  if (!bg) return;
  $(`#bg${name}Prev`).src = bg.url || "";
  $(`#bg${name}Url`).value = bg.url || "";
  $(`#op${name}`).value = bg.opacity ?? "";
}

/* ============================================================
   動態列（輪播圖、新聞）
   ============================================================ */
function createSlideRow(src) {
  const box = document.createElement("div");
  box.className = "row-box slide-row";
  box.innerHTML = `
    <div class="row-head">
      <span>輪播圖片</span>
      <div class="row-actions">
        <button type="button" class="btn-remove">刪除此張</button>
      </div>
    </div>
    <div class="field">
      <label>圖片網址（已上傳的圖會顯示在這）</label>
      <input type="url" class="slide-url" value="${escapeAttr(src || "")}">
    </div>
    <div class="field">
      <label>或上傳新圖片（會覆蓋上面的網址）</label>
      <input type="file" class="slide-file" accept="image/*">
    </div>
  `;
  box.querySelector(".btn-remove").onclick = () => {
    box.remove();
    markDirty();
  };
  box.addEventListener("input", markDirty);
  return box;
}

function createNewsRow(n) {
  n = n || {};
  const box = document.createElement("div");
  box.className = "row-box card";
  box.innerHTML = `
    <div class="row-head">
      <span>消息項目</span>
      <div class="row-actions">
        <button type="button" class="btn-remove">刪除此則</button>
      </div>
    </div>
    <div class="field-inline">
      <div class="field">
        <label>標籤</label>
        <input type="text" class="news-badge" value="${escapeAttr(n.badge || "")}">
      </div>
      <div class="field">
        <label>日期</label>
        <input type="text" class="news-date" value="${escapeAttr(n.date || "")}" placeholder="2024-03-10">
      </div>
    </div>
    <div class="field">
      <label>標題</label>
      <input type="text" class="news-title" value="${escapeAttr(n.title || "")}">
    </div>
    <div class="field">
      <label>摘要（卡片上的短文字）</label>
      <textarea class="news-excerpt">${escapeHtml(n.excerpt || "")}</textarea>
    </div>
    <div class="field">
      <label>詳細內容（彈窗內文字，可多行）</label>
      <textarea class="news-content">${escapeHtml(n.content || "")}</textarea>
    </div>
    <div class="field">
      <label>外部連結（選填）</label>
      <input type="url" class="news-link" value="${escapeAttr(n.link || "")}">
    </div>
  `;
  box.querySelector(".btn-remove").onclick = () => {
    box.remove();
    markDirty();
  };
  box.addEventListener("input", markDirty);
  return box;
}

/* ============================================================
   儲存（核心：把表單收成物件 → 上傳圖片 → 寫進雲端）
   ============================================================ */
async function saveAll() {
  busy("儲存中…");
  try {
    const content = JSON.parse(JSON.stringify(state || DataStore.DEFAULTS));

    // ----- 主要圖片 -----
    const logoFile = $("#logoFile").files[0];
    const storyFile = $("#storyFile").files[0];
    const esgFile = $("#esgFile").files[0];
    if (logoFile) {
      const f = await DataStore.compressImage(logoFile, 600, 0.9);
      content.logo = await DataStore.uploadImage(f, "logo");
    }
    if (storyFile) {
      const f = await DataStore.compressImage(storyFile);
      content.storyImg = await DataStore.uploadImage(f, "story");
    }
    if (esgFile) {
      const f = await DataStore.compressImage(esgFile);
      content.esgImg = await DataStore.uploadImage(f, "esg");
    }

    // ----- Hero -----
    content.hero = content.hero || {};
    content.hero.title = $("#heroTitle").value.trim();
    content.hero.sub = $("#heroSub").value.trim();
    content.hero.cta1 = { text: $("#cta1Text").value.trim(), href: $("#cta1Href").value.trim() };
    content.hero.cta2 = { text: $("#cta2Text").value.trim(), href: $("#cta2Href").value.trim() };

    const slideRows = Array.from(document.querySelectorAll("#slidesWrap .slide-row"));
    const slides = [];
    for (let i = 0; i < slideRows.length; i++) {
      const row = slideRows[i];
      const urlInput = row.querySelector(".slide-url");
      const file = row.querySelector(".slide-file").files[0];
      let url = urlInput.value.trim();
      if (file) {
        const f = await DataStore.compressImage(file);
        url = await DataStore.uploadImage(f, `slides/${i}`);
        urlInput.value = url; // 上傳後把網址回填到欄位上，避免下次儲存又重新上傳
      }
      if (url) slides.push(url);
    }
    content.hero.slides = slides;

    // ----- Story -----
    content.story = content.story || {};
    content.story.strap = $("#storyStrap").value.trim();
    content.story.p1 = $("#storyP1").value.trim();
    content.story.p2 = $("#storyP2").value.trim();
    content.story.values = $("#storyValues").value
      .split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 4);
    content.story.core = $("#storyCore").value
      .split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 3);

    // ----- Offerings -----
    content.offerings = content.offerings || { cards: [{}, {}] };
    content.offerings.cards = content.offerings.cards.slice(0, 2);
    for (const p of ["A", "B"]) {
      const idx = p === "A" ? 0 : 1;
      const card = content.offerings.cards[idx] || {};
      card.badge = $(`#${p}-badge`).value.trim();
      card.title = $(`#${p}-title`).value.trim();
      card.sub = $(`#${p}-sub`).value.trim();
      card.bullets = $(`#${p}-bullets`).value
        .split("\n").map((s) => s.trim()).filter(Boolean);
      const file = $(`#${p}-imgFile`).files[0];
      const url = $(`#${p}-imgUrl`).value.trim();
      if (file) {
        const f = await DataStore.compressImage(file);
        card.img = await DataStore.uploadImage(f, `cards/${p}`);
      } else if (url) {
        card.img = url;
      }
      content.offerings.cards[idx] = card;
    }

    // ----- ESG -----
    content.esgText = [
      $("#e1").value.trim(),
      $("#e2").value.trim(),
      $("#e3").value.trim(),
    ];

    // ----- Contact -----
    content.contact = {
      phone: $("#phone").value.trim(),
      mail: $("#mail").value.trim(),
      addr: $("#addr").value.trim(),
      lineText: $("#lineText").value.trim(),
      lineLink: $("#lineLink").value.trim(),
    };

    // ----- 背景圖 -----
    content.bg = content.bg || {};
    const bgMap = {
      story: "Story",
      offerings: "Offer",
      news: "News",
      esg: "Esg",
      contact: "Contact",
    };
    for (const key of Object.keys(bgMap)) {
      const suf = bgMap[key];
      let url = $(`#bg${suf}Url`).value.trim();
      const file = $(`#bg${suf}File`).files[0];
      if (file) {
        const f = await DataStore.compressImage(file);
        url = await DataStore.uploadImage(f, `bg/${key}`);
        $(`#bg${suf}Url`).value = url;
      }
      const op = parseFloat($(`#op${suf}`).value);
      content.bg[key] = {
        url: url || content.bg[key]?.url || "",
        opacity: isNaN(op) ? (content.bg[key]?.opacity ?? 0.15) : op,
      };
    }

    // ----- News -----
    const newsRows = Array.from(document.querySelectorAll("#newsList .row-box"));
    const news = [];
    for (const row of newsRows) {
      const title = row.querySelector(".news-title").value.trim();
      if (!title) continue;
      news.push({
        badge: row.querySelector(".news-badge").value.trim(),
        date: row.querySelector(".news-date").value.trim(),
        title,
        excerpt: row.querySelector(".news-excerpt").value.trim(),
        content: row.querySelector(".news-content").value.trim(),
        link: row.querySelector(".news-link").value.trim(),
      });
    }
    content.news = news;

    // ----- 寫入 -----
    const ts = await DataStore.saveAll(content);
    content._updatedAt = ts;
    state = content;
    markClean();
    updateLastSavedText();
    toast("✅ 已儲存並同步" + (DataStore.mode() === "firebase" ? "到雲端" : "（本機模式）"), "ok");
    // 清掉檔案欄位（避免重複上傳）
    document.querySelectorAll('input[type="file"]').forEach((el) => (el.value = ""));
  } catch (e) {
    console.error(e);
    toast("儲存失敗：" + e.message, "err");
  } finally {
    busyEnd();
  }
}

/* ============================================================
   匯出 / 匯入 / 重置
   ============================================================ */
function exportAll() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `dafengling-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

function importAll(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      // 容錯：支援舊格式（每個 key 一個 entry）和新格式（單一物件）
      const merged = normalizeImported(data);
      state = merged;
      fillForm(state);
      markDirty();
      toast("✅ 匯入完成，請按「儲存」確認", "ok");
    } catch (e) {
      toast("匯入失敗：JSON 格式不正確", "err");
    }
  };
  r.readAsText(file);
}

function normalizeImported(data) {
  if (data && data.hero && data.story) return data; // 新格式
  // 舊格式：key 為 site.xxx
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "site.logo") out.logo = v;
    else if (k === "site.storyImg") out.storyImg = v;
    else if (k === "site.esgImg") out.esgImg = v;
    else if (k === "site.hero") out.hero = typeof v === "string" ? JSON.parse(v) : v;
    else if (k === "site.story") out.story = typeof v === "string" ? JSON.parse(v) : v;
    else if (k === "site.offerings") out.offerings = typeof v === "string" ? JSON.parse(v) : v;
    else if (k === "site.esgText") out.esgText = typeof v === "string" ? JSON.parse(v) : v;
    else if (k === "site.contact") out.contact = typeof v === "string" ? JSON.parse(v) : v;
    else if (k === "site.news") out.news = typeof v === "string" ? JSON.parse(v) : v;
    else if (/^bg\.(\w+)\.url$/.test(k)) {
      const m = k.match(/^bg\.(\w+)\.url$/);
      out.bg = out.bg || {};
      out.bg[m[1]] = out.bg[m[1]] || {};
      out.bg[m[1]].url = v;
    } else if (/^bg\.(\w+)\.opacity$/.test(k)) {
      const m = k.match(/^bg\.(\w+)\.opacity$/);
      out.bg = out.bg || {};
      out.bg[m[1]] = out.bg[m[1]] || {};
      out.bg[m[1]].opacity = parseFloat(v);
    }
  }
  return out;
}

async function resetToDefaults() {
  if (!confirm("確定要重置為預設範例內容嗎？（按下「儲存」前都可以反悔，匯出檔可還原）")) return;
  state = JSON.parse(JSON.stringify(DataStore.DEFAULTS));
  fillForm(state);
  markDirty();
  toast("已套用預設內容，記得按「儲存」才會生效", "ok");
}

/* ============================================================
   未儲存狀態追蹤
   ============================================================ */
function markDirty() {
  if (isDirty) return;
  isDirty = true;
  const chip = $("#dirtyChip");
  chip.classList.remove("synced");
  chip.classList.add("dirty");
  chip.textContent = "● 有未儲存的變更";
}

function markClean() {
  isDirty = false;
  const chip = $("#dirtyChip");
  chip.classList.add("synced");
  chip.classList.remove("dirty");
  chip.textContent = "所有變更已儲存";
}

function updateLastSavedText() {
  const t = state?._updatedAt;
  if (!t) {
    $("#lastSavedText").textContent = "尚未儲存過";
    return;
  }
  const d = new Date(t);
  $("#lastSavedText").textContent =
    `最後同步：${d.toLocaleString("zh-TW", { hour12: false })}`;
}

window.addEventListener("beforeunload", (e) => {
  if (isDirty) {
    e.preventDefault();
    e.returnValue = "";
    return "";
  }
});

/* ============================================================
   Toast / Busy 工具
   ============================================================ */
let toastTimer;
function toast(msg, kind) {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast show" + (kind === "err" ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

function busy(msg) {
  $("#busyText").textContent = msg || "處理中…";
  $("#busy").classList.remove("hidden");
}
function busyEnd() {
  $("#busy").classList.add("hidden");
}

function escapeAttr(s) {
  return String(s ?? "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================================================
   啟動
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // 按鈕綁定
  $("#loginBtn").onclick = attemptLogin;
  $("#forgotBtn").onclick = forgotPassword;
  $("#loginPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") attemptLogin();
  });
  $("#logoutBtn").onclick = async () => {
    if (isDirty && !confirm("有未儲存的變更，確定要登出嗎？")) return;
    await DataStore.auth.logout();
    location.reload();
  };
  $("#addSlide").onclick = () => { $("#slidesWrap").appendChild(createSlideRow("")); markDirty(); };
  $("#addNews").onclick = () => { $("#newsList").appendChild(createNewsRow({})); markDirty(); };
  $("#save").onclick = saveAll;
  $("#reload").onclick = async () => {
    if (isDirty && !confirm("有未儲存的變更，確定要重新載入嗎？")) return;
    await bootstrap();
    toast("已重新載入", "ok");
  };
  $("#export").onclick = exportAll;
  $("#clear").onclick = resetToDefaults;
  $("#import").addEventListener("change", (e) => {
    if (e.target.files[0]) importAll(e.target.files[0]);
    e.target.value = "";
  });

  // 監聽輸入變化
  document.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      if (el.closest("#loginOverlay")) return;
      markDirty();
    });
    el.addEventListener("change", () => {
      if (el.closest("#loginOverlay")) return;
      markDirty();
    });
  });

  // 圖片預覽（檔案選擇時即時預覽）
  bindFilePreview("logoFile", "logoPrev");
  bindFilePreview("storyFile", "storyPrev");
  bindFilePreview("esgFile", "esgPrev");
  bindFilePreview("bgStoryFile", "bgStoryPrev");
  bindFilePreview("bgOfferFile", "bgOfferPrev");
  bindFilePreview("bgNewsFile", "bgNewsPrev");
  bindFilePreview("bgEsgFile", "bgEsgPrev");
  bindFilePreview("bgContactFile", "bgContactPrev");

  // 啟動登入流程
  DataStore.auth.onChange((user) => {
    if (user) {
      hideLogin();
      bootstrap();
    } else {
      showLogin();
    }
  });
});

function bindFilePreview(fileId, previewId) {
  const fEl = document.getElementById(fileId);
  const pEl = document.getElementById(previewId);
  if (!fEl || !pEl) return;
  fEl.addEventListener("change", () => {
    const f = fEl.files[0];
    if (!f) return;
    pEl.src = URL.createObjectURL(f);
  });
}
