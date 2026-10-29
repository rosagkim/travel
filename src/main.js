import { marked } from "marked";
import DOMPurify from "dompurify";
import { site } from "./site.config.js";
import "./style.css";

const sources = import.meta.glob("../plan/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const docs = Object.entries(sources)
  .map(([path, raw]) => {
    const filename = path.split("/").pop();
    return {
      id: filename.replace(/\.md$/, ""),
      filename,
      raw,
      title: raw.match(/^# (.+)$/m)?.[1] || filename,
      description:
        raw.split("\n").find((line) => line.trim() && !line.startsWith("#")) ||
        "",
    };
  })
  .sort((a, b) =>
    a.id === "README" ? -1 : b.id === "README" ? 1 : a.id.localeCompare(b.id),
  );

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  external:
    '<path d="M15 3h6v6m0-6-9 9M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  route:
    '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v8a4 4 0 0 0 4 4h6M8 5h6a4 4 0 0 1 0 8h-2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  github:
    '<path d="M9 19c-4.3 1.3-4.3-2.2-6-2.7m12 5v-3.4a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6A4.7 4.7 0 0 0 18.4 6a4.3 4.3 0 0 0-.1-3.3s-1-.3-3.4 1.3a11.4 11.4 0 0 0-6.2 0C6.3 2.4 5.3 2.7 5.3 2.7A4.3 4.3 0 0 0 5.2 6 4.7 4.7 0 0 0 4 9.3c0 4.7 2.8 5.7 5.5 6A3 3 0 0 0 8.7 18v3.3"/>',
};
const icon = (name, extra = "") =>
  `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const docHref = (id) => `#/plan/${encodeURIComponent(id)}`;
const logo =
  '<span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>';

document.querySelector("#app").innerHTML = `
  <button class="sidebar-shade" aria-label="메뉴 닫기" tabindex="-1" hidden></button>
  <aside class="sidebar" id="sidebar" aria-label="주 메뉴">
    <a class="brand" href="#/">${logo}<span>${escape(site.name)}<small>${escape(site.label)}</small></span></a>
    <div class="workspace-label"><span class="status-dot"></span> 나의 서비스 워크스페이스</div>
    <nav class="primary-nav" aria-label="워크스페이스">
      <a href="#/" data-route="/">${icon("grid")}<span>시작 화면</span></a>
      <a href="${docHref("README")}" data-route="/plan/README">${icon("file")}<span>기획 문서</span><span class="nav-count">${docs.length}</span></a>
      <a href="${docHref("04-roadmap")}" data-route="/plan/04-roadmap">${icon("route")}<span>작업 로드맵</span></a>
    </nav>
    <div class="nav-heading">기획 노트 <span>PLAN /</span></div>
    <nav class="document-nav" aria-label="기획 문서 목록">
      ${docs
        .filter((doc) => doc.id !== "README")
        .map(
          (doc, index) =>
            `<a href="${docHref(doc.id)}" data-route="/plan/${escape(doc.id)}"><span class="doc-number">${String(index + 1).padStart(2, "0")}</span><span>${escape(doc.title)}</span></a>`,
        )
        .join("")}
    </nav>
    <div class="sidebar-bottom">
      <div class="sidebar-note"><span class="note-symbol">↗</span><strong>다음 아이디어가 있나요?</strong><p>서비스 개요부터<br>차근차근 적어보세요.</p><a href="${docHref("01-service")}">첫 기획 시작하기 ${icon("arrow")}</a></div>
      <a class="repo-link" href="${escape(site.repository)}" target="_blank" rel="noopener noreferrer">${icon("github")} GitHub 저장소 ${icon("external")}</a>
    </div>
  </aside>
  <div class="workspace">
    <header class="topbar">
      <button class="menu-toggle icon-button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="sidebar">${icon("menu")}</button>
      <div class="breadcrumb"><span>워크스페이스</span><span class="crumb-divider">/</span><strong id="current-title">시작 화면</strong></div>
      <div class="search-wrap">
        <label class="search-box">${icon("search")}<input id="doc-search" type="search" placeholder="기획 문서 검색" aria-label="기획 문서 검색" autocomplete="off" aria-controls="search-results" aria-expanded="false"/><kbd>/</kbd></label>
        <div class="search-results" id="search-results" role="region" aria-label="문서 검색 결과" hidden></div>
      </div>
      <span class="topbar-badge">나의 첫 서비스 <span class="status-dot"></span></span>
    </header>
    <main id="main-content" tabindex="-1"></main>
    <footer class="footer"><span>${escape(site.name)} <span class="footer-dot">·</span> 기획에서 배포까지</span><a href="${escape(site.repository)}" target="_blank" rel="noopener noreferrer">함께 만들어가는 첫 버전 ${icon("external")}</a></footer>
  </div>`;

const main = document.querySelector("main");
const search = document.querySelector("#doc-search");
const searchResults = document.querySelector("#search-results");
const menuButton = document.querySelector(".menu-toggle");
const shade = document.querySelector(".sidebar-shade");

function overview() {
  return `
    <section class="page-intro"><div><p class="eyebrow">YOUR NEXT CHAPTER</p><h1>새로운 서비스의 시작</h1><p>흩어진 아이디어를 하나의 서비스로 연결해 보세요.</p></div><a class="subtle-link" href="${docHref("README")}">워크스페이스 사용법 ${icon("external")}</a></section>
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy"><span class="hero-label"><span></span> 아이디어가 자라는 공간</span><h2 id="hero-title">좋은 아이디어를,<br>작동하는 서비스로.</h2><p>${escape(site.description)}</p><a class="button button-light" href="${docHref("01-service")}">서비스 기획 시작하기 ${icon("arrow")}</a><span class="hero-footnote">작게 시작하고, 하나씩 완성하세요.</span></div>
      <div class="flow-board" aria-label="기획, 구현, 공개의 세 단계"><div class="board-caption"><span>FROM IDEA TO LIVE</span><span class="board-dots">•••</span></div><div class="flow-step"><div class="flow-icon">${icon("file")}</div><div><span>01 · THINK</span><strong>생각을 기록하고</strong><small>서비스의 방향을 정해요</small></div><span class="step-check">${icon("check")}</span></div><div class="flow-connector"></div><div class="flow-step"><div class="flow-icon">${icon("code")}</div><div><span>02 · BUILD</span><strong>화면으로 옮기고</strong><small>핵심 기능을 하나씩 만들어요</small></div><span class="step-check">${icon("check")}</span></div><div class="flow-connector"></div><div class="flow-step final-step"><div class="flow-icon">${icon("external")}</div><div><span>03 · SHIP</span><strong>세상에 내보내요</strong><small>첫 버전을 공개하고 개선해요</small></div><span class="ship-spark">✳</span></div><span class="board-sticker">한 걸음씩, 꾸준히 ↗</span></div>
    </section>
    <section class="quick-stats" aria-label="워크스페이스 정보"><div><span class="stat-icon">${icon("file")}</span><div><span>정리된 기획</span><strong>${docs.length}<small>개의 문서</small></strong></div></div><div><span class="stat-icon">${icon("route")}</span><div><span>지금 할 일</span><strong class="stat-text">서비스 방향 정하기</strong></div><a href="${docHref("04-roadmap")}" aria-label="작업 로드맵 열기">${icon("arrow")}</a></div><div><span class="stat-icon">${icon("code")}</span><div><span>변경을 공개하는 방법</span><strong class="stat-text">main 푸시 후 자동 배포</strong></div></div></section>
    <section class="documents-section"><div class="section-heading"><div><p class="eyebrow">PLAN YOUR SERVICE</p><h2>기획을 시작할 준비가 됐어요</h2><p>문서를 따라 생각을 정리하면, 만들 것이 선명해집니다.</p></div><a class="subtle-link" href="${docHref("README")}">작성 가이드 ${icon("arrow")}</a></div><div class="document-grid">${docs
      .filter((doc) => doc.id !== "README")
      .map(
        (doc, index) =>
          `<a class="document-card" href="${docHref(doc.id)}"><div class="card-top"><span class="card-icon">${icon(index === 3 ? "route" : index === 4 ? "check" : "file")}</span><span class="card-index">0${index + 1}</span></div><h3>${escape(doc.title)}</h3><p>${escape(doc.description)}</p><span class="card-link">문서 열기 ${icon("arrow")}</span></a>`,
      )
      .join(
        "",
      )}<a class="document-card guide-card" href="${docHref("README")}"><span class="guide-asterisk">✳</span><h3>처음이라면,<br>여기서 시작하세요.</h3><p>기획부터 구현까지 이어지는<br>작업 방법을 확인해 보세요.</p><span class="card-link">기획 문서 안내 ${icon("arrow")}</span></a></div></section>
    <section class="workflow-strip"><div class="workflow-heading"><span class="stat-icon">${icon("route")}</span><div><strong>기록에서 배포까지, 하나의 흐름으로</strong><p>기획과 코드를 같은 저장소에서 관리하세요.</p></div></div><div class="workflow-steps"><span>기획 <code>plan/</code></span><b>→</b><span>구현 <code>src/</code></span><b>→</b><span>푸시 <code>main</code></span><b>→</b><span class="workflow-end">공개 ${icon("external")}</span></div></section>`;
}

function documentPage(doc) {
  const index = docs.indexOf(doc);
  const previous = docs[index - 1];
  const next = docs[index + 1];
  return `<section class="doc-page"><div class="doc-toolbar"><a href="#/" class="back-link">← 시작 화면</a><a class="subtle-link" href="${escape(site.repository)}/blob/main/plan/${encodeURIComponent(doc.filename)}" target="_blank" rel="noopener noreferrer">원본 문서 ${icon("external")}</a></div><p class="eyebrow">PLANNING NOTES <span>/</span> ${escape(doc.filename)}</p><article class="markdown">${DOMPurify.sanitize(marked.parse(doc.raw, { gfm: true }))}</article><nav class="doc-pagination" aria-label="이전 다음 문서">${previous ? `<a href="${docHref(previous.id)}"><small>← 이전 문서</small><strong>${escape(previous.title)}</strong></a>` : "<span></span>"}${next ? `<a href="${docHref(next.id)}"><small>다음 문서 →</small><strong>${escape(next.title)}</strong></a>` : "<span></span>"}</nav></section>`;
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "메뉴 열기");
  shade.hidden = true;
}

function closeSearch() {
  searchResults.hidden = true;
  search.setAttribute("aria-expanded", "false");
}

function render(focus = false) {
  let route;
  try {
    route = decodeURIComponent(location.hash.slice(1) || "/");
  } catch {
    route = "/missing";
  }
  const doc = route.startsWith("/plan/")
    ? docs.find((item) => item.id === route.slice(6))
    : null;
  const title =
    doc?.title || (route === "/" ? "시작 화면" : "문서를 찾을 수 없습니다");
  document.querySelector("#current-title").textContent = title;
  document.title = `${title} · ${site.name}`;
  main.innerHTML =
    route === "/"
      ? overview()
      : doc
        ? documentPage(doc)
        : `<div class="empty-page"><span class="guide-asterisk">↗</span><h1>문서를 찾을 수 없습니다</h1><p>문서가 이동했거나 주소가 바뀌었을 수 있어요.</p><a class="button button-green" href="#/">시작 화면으로 돌아가기 ${icon("arrow")}</a></div>`;
  document.querySelectorAll("[data-route]").forEach((link) => {
    const active = link.dataset.route === route;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  main.querySelectorAll(".markdown a").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (/^(?:\.\/)?[^/#?]+\.md(?:#.*)?$/.test(href)) {
      link.href = docHref(
        href.replace(/^\.\//, "").split("#")[0].replace(/\.md$/, ""),
      );
    } else if (/^https?:\/\//i.test(href)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  });
  main.querySelectorAll(".markdown table").forEach((table) => {
    const wrapper = document.createElement("div");
    wrapper.className = "table-scroll";
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "표, 가로로 스크롤할 수 있습니다");
    table.before(wrapper);
    wrapper.append(table);
  });
  closeMenu();
  closeSearch();
  search.value = "";
  if (focus) {
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

search.addEventListener("input", () => {
  const query = search.value.trim().toLocaleLowerCase("ko");
  if (!query) return closeSearch();
  const matches = docs.filter((doc) =>
    `${doc.title} ${doc.raw}`.toLocaleLowerCase("ko").includes(query),
  );
  searchResults.innerHTML = `<p class="search-summary" role="status">${matches.length}개의 문서</p>${matches.length ? matches.map((doc) => `<a href="${docHref(doc.id)}">${icon("file")}<span><strong>${escape(doc.title)}</strong><small>${escape(doc.description)}</small></span>${icon("arrow")}</a>`).join("") : '<p class="search-empty">검색 결과가 없습니다. 다른 단어로 찾아보세요.</p>'}`;
  searchResults.hidden = false;
  search.setAttribute("aria-expanded", "true");
});
searchResults.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeSearch();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-wrap")) closeSearch();
  if (event.target.closest(".sidebar a")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSearch();
    closeMenu();
  }
  if (
    event.key === "/" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    event.preventDefault();
    search.focus();
  }
});
menuButton.addEventListener("click", () => {
  const open = !document.body.classList.contains("menu-open");
  document.body.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  shade.hidden = !open;
});
shade.addEventListener("click", closeMenu);
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  main.focus();
});
window.addEventListener("hashchange", () => render(true));
render();
