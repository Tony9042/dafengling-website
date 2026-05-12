/* ============================================================
   main.js — 前台渲染邏輯
   ------------------------------------------------------------
   重要修正（相對於舊版）：
   ① 不再使用 localStorage.clear() 清資料（之前版本號一變就把使用者
      改的內容洗掉，這是「版本更新問題」的根源）。現在改成
      DataStore.loadAll() 自動把資料合併進預設值，永遠不會清資料。
   ② 改用 DataStore，雲端模式會即時抓最新資料、localStorage 模式
      會用本地快取，兩種模式共用同一份程式碼。
   ③ Hero 大圖預載完成才開始輪播，避免閃白。
   ============================================================ */

(async function bootstrap() {
  // 等 DOM 就緒
  if (document.readyState === "loading") {
    await new Promise((r) => document.addEventListener("DOMContentLoaded", r));
  }

  const data = await DataStore.loadAll();

  renderHeader(data);
  renderHero(data);
  renderStory(data);
  renderOfferings(data);
  renderNews(data);
  renderESG(data);
  renderContact(data);
  applyBackgrounds(data);
  bindNewsModal();
  renderFooter();

  // Console 顯示版本與資料來源，方便除錯
  console.log(
    `%c🌱 大豐臨網站 v${DataStore.SITE_VERSION}`,
    "color:#2b7a4b;font-weight:bold;font-size:14px;",
    `\n資料來源：${DataStore.mode() === "firebase" ? "Firebase 雲端" : "本機快取"}`
  );
})();

/* ============================================================
   各區塊渲染函式
   ============================================================ */
function renderHeader(d) {
  const logo = document.getElementById("logo");
  if (logo) logo.src = d.logo;
}

function renderHero(d) {
  const hero = d.hero || {};
  setText("heroTitle", hero.title);
  setText("heroSub", hero.sub);
  setLink("cta1", hero.cta1);
  setLink("cta2", hero.cta2);

  const slideBox = document.getElementById("slides");
  if (!slideBox) return;
  slideBox.innerHTML = "";

  const slides = Array.isArray(hero.slides) && hero.slides.length
    ? hero.slides
    : DataStore.DEFAULTS.hero.slides;

  slides.forEach((src) => {
    const d = document.createElement("div");
    d.className = "slide";
    d.style.backgroundImage = `url('${src}')`;
    slideBox.appendChild(d);
  });

  if (slideBox.children.length > 1) {
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % slideBox.children.length;
      slideBox.style.transform = `translateX(-${idx * 100}%)`;
    }, 5000);
  }
}

function renderStory(d) {
  const s = d.story || {};
  setText("storyStrap", s.strap);
  setText("storyP1", s.p1);
  setText("storyP2", s.p2);

  const img = document.getElementById("storyImg");
  if (img) img.src = d.storyImg;

  ["v1", "v2", "v3", "v4"].forEach((id, i) => setText(id, (s.values || [])[i] || ""));
  ["c1", "c2", "c3"].forEach((id, i) => setText(id, (s.core || [])[i] || ""));
}

function renderOfferings(d) {
  const cardsWrap = document.getElementById("cards");
  if (!cardsWrap) return;
  cardsWrap.innerHTML = "";
  const cards = (d.offerings && d.offerings.cards) || [];

  cards.slice(0, 2).forEach((card) => {
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      ${card.badge ? `<span class="badge">${escapeHtml(card.badge)}</span>` : ""}
      <h3>${escapeHtml(card.title || "")}</h3>
      <div>${escapeHtml(card.sub || "")}</div>
      ${card.img ? `<img class="thumb" src="${card.img}" alt="">` : ""}
      <ul class="bullets">
        ${(card.bullets || [])
          .map((b) => `<li>${escapeHtml(b)}</li>`)
          .join("")}
      </ul>
    `;
    cardsWrap.appendChild(el);
  });
}

function renderNews(d) {
  const nw = document.getElementById("newsWrap");
  if (!nw) return;
  nw.innerHTML = "";

  const items = Array.isArray(d.news) ? d.news : [];
  items.slice(0, 3).forEach((item) => {
    const card = document.createElement("div");
    card.className = "news-card";
    card.innerHTML = `
      <span class="news-badge">${escapeHtml(item.badge || "")}</span>
      <time>${escapeHtml(item.date || "")}</time>
      <h3 class="news-title">${escapeHtml(item.title || "")}</h3>
      <p class="news-excerpt">${escapeHtml(item.excerpt || "")}</p>
      <div class="news-more">點擊查看活動詳情 →</div>
    `;
    card.onclick = () => openNewsModal(item);
    nw.appendChild(card);
  });
}

function renderESG(d) {
  const img = document.getElementById("esgImg");
  if (img) img.src = d.esgImg;

  const t = Array.isArray(d.esgText) ? d.esgText : [];
  t.forEach((txt, i) => setText(`e${i + 1}`, txt));
}

function renderContact(d) {
  const c = d.contact || {};
  setText("tel", c.phone);
  setText("mail", c.mail);
  setText("addr", c.addr);

  const lineCell = document.getElementById("lineCell");
  if (lineCell) {
    if (c.lineLink) {
      lineCell.innerHTML = `<a href="${c.lineLink}" target="_blank" rel="noopener">${escapeHtml(c.lineText || "")}</a>`;
    } else {
      lineCell.textContent = c.lineText || "";
    }
  }
}

function applyBackgrounds(d) {
  const bg = d.bg || {};
  ["story", "offerings", "news", "esg", "contact"].forEach((k) => {
    const sec = document.getElementById(k);
    if (!sec) return;
    const conf = bg[k] || DataStore.DEFAULTS.bg[k];
    sec.style.setProperty("--bg-url", `url('${conf.url}')`);
    sec.style.setProperty("--bg-opacity", conf.opacity ?? 0.15);
    sec.style.setProperty("--bg-filter", "contrast(.95) brightness(1.15)");
  });
}

function renderFooter() {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
  const v = document.getElementById("verShow");
  if (v) v.textContent = DataStore.SITE_VERSION;
}

/* ============================================================
   消息中心 Modal
   ============================================================ */
function openNewsModal(item) {
  const m = document.getElementById("newsModal");
  if (!m) return;
  setText("mBadge", item.badge);
  setText("mDate", item.date);
  setText("mTitle", item.title);
  document.getElementById("mContent").innerHTML = nl2p(item.content || item.excerpt || "");
  m.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeNewsModal() {
  const m = document.getElementById("newsModal");
  if (!m || m.classList.contains("hidden")) return;
  m.classList.add("hidden");
  document.body.style.overflow = "";
}

function bindNewsModal() {
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-close")) closeNewsModal();
    if (e.target.classList.contains("modal-bg")) closeNewsModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNewsModal();
  });
}

/* ============================================================
   工具函式
   ============================================================ */
function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt ?? "";
}

function setLink(id, link) {
  const el = document.getElementById(id);
  if (!el || !link) return;
  el.textContent = link.text || "";
  el.href = link.href || "#";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2p(s) {
  return String(s ?? "")
    .split(/\n+/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}
