/**
 * Чистый фронтенд: HTML + CSS + JS.
 * Работает на GitHub Pages и локально (достаточно открыть через любой статический хостинг).
 * Тексты лежат в папке content/*.md
 */

const SECTIONS = [
  {
    title: "Курс — основные темы",
    items: [
      { id: "marshrutizaciya", title: "Маршрутизация (RIP, OSPF, EIGRP…)", file: "marshrutizaciya-konspekt.md" },
      { id: "kommutaciya", title: "Коммутация и VLAN", file: "kommutaciya-vlan-konspekt.md" },
      { id: "wifi", title: "Беспроводные сети (Wi‑Fi)", file: "wifi-besprovodnye-seti-konspekt.md" },
      { id: "granica", title: "Граница сети", file: "granica-seti-konspekt.md" },
      { id: "arkhitektura", title: "Архитектура КС", file: "arkhitektura-korporativnoj-seti-konspekt.md" },
      { id: "sostavnye", title: "Составные части сети", file: "sostavnye-chasti-seti-konspekt.md" },
      { id: "proektirovanie", title: "Проектирование КС", file: "proektirovanie-ks-konspekt.md" },
      { id: "skc", title: "СКС и кабельные среды", file: "skc-kabelnye-sredy-konspekt.md" },
      { id: "setevoe-po", title: "Сетевое ПО", file: "setevoe-po-konspekt.md" },
      { id: "raspredelenie", title: "Распределение функций управления", file: "raspredelenie-funkcij-upravleniya-konspekt.md" },
    ],
  },
  {
    title: "Безопасность и сервисы",
    items: [
      { id: "vpn", title: "VPN в КС", file: "vpn-v-ks-konspekt.md" },
      { id: "nat", title: "Служба NAT", file: "nat-sluzhba-konspekt.md" },
      { id: "mse", title: "Межсетевые экраны", file: "mezhsetevoj-ekran-konspekt.md" },
      { id: "segmentaciya", title: "Сегментирование и доступ", file: "segmentaciya-dostup-konspekt.md" },
      { id: "vlan-rezerv", title: "VLAN: сегментация и резерв", file: "vlan-segmentaciya-rezerv-konspekt.md" },
    ],
  },
  {
    title: "Контрольная работа",
    items: [
      { id: "primery-kr", title: "Возможные темы КР", file: "primery-tem-kontrolnoj.md" },
      { id: "otvety-kr", title: "Ответы к заданиям КР", file: "otvety-kontrolnaya.md" },
    ],
  },
];

const CONTENT_DIR = "content/";

const navEl = document.getElementById("nav");
const searchEl = document.getElementById("search");
const welcomeEl = document.getElementById("welcome");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const contentEl = document.getElementById("content");
const sidebarEl = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");

const cache = new Map();

/** URL к markdown относительно текущей страницы (подходит для GitHub Pages в подпапке) */
function contentUrl(filename) {
  return new URL(CONTENT_DIR + filename, window.location.href).href;
}

marked.setOptions({
  gfm: true,
  breaks: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

function buildNav() {
  const frag = document.createDocumentFragment();

  for (const section of SECTIONS) {
    const group = document.createElement("div");
    group.className = "nav__group";

    const title = document.createElement("div");
    title.className = "nav__group-title";
    title.textContent = section.title;
    group.appendChild(title);

    for (const item of section.items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav__btn";
      btn.dataset.id = item.id;
      btn.dataset.title = item.title;
      btn.textContent = item.title;
      btn.addEventListener("click", () => loadDoc(item));
      group.appendChild(btn);
    }

    frag.appendChild(group);
  }

  navEl.appendChild(frag);
}

function setActive(id) {
  navEl.querySelectorAll(".nav__btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.id === id);
  });
}

function showState(state) {
  welcomeEl.classList.toggle("hidden", state !== "welcome");
  loadingEl.classList.toggle("hidden", state !== "loading");
  errorEl.classList.toggle("hidden", state !== "error");
  contentEl.classList.toggle("hidden", state !== "content");
}

async function loadDoc(item) {
  setActive(item.id);
  showState("loading");
  errorEl.textContent = "";

  if (window.innerWidth <= 768) {
    sidebarEl.classList.remove("open");
  }

  const hash = `#${item.id}`;
  if (location.hash !== hash) {
    history.pushState({ id: item.id }, "", hash);
  }

  const url = contentUrl(item.file);

  try {
    let md = cache.get(url);
    if (!md) {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Не удалось загрузить «${item.title}» (${res.status}). Проверьте, что в репозитории есть папка content/.`);
      }
      md = await res.text();
      cache.set(url, md);
    }

    contentEl.innerHTML = marked.parse(md);
    contentEl.querySelectorAll("pre code").forEach((block) => {
      if (!block.classList.contains("hljs")) {
        hljs.highlightElement(block);
      }
    });

    document.title = `${item.title} — Конспекты`;
    showState("content");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    errorEl.textContent = e.message;
    showState("error");
  }
}

function findItemById(id) {
  for (const section of SECTIONS) {
    const item = section.items.find((i) => i.id === id);
    if (item) return item;
  }
  return null;
}

function applySearch(query) {
  const q = query.trim().toLowerCase();
  navEl.querySelectorAll(".nav__btn").forEach((btn) => {
    const match = !q || btn.dataset.title.toLowerCase().includes(q);
    btn.classList.toggle("hidden", !match);
  });
  navEl.querySelectorAll(".nav__group").forEach((group) => {
    const visible = group.querySelectorAll(".nav__btn:not(.hidden)").length > 0;
    group.style.display = visible ? "" : "none";
  });
}

searchEl.addEventListener("input", () => applySearch(searchEl.value));

sidebarToggle.addEventListener("click", () => {
  sidebarEl.classList.toggle("open");
});

window.addEventListener("popstate", () => {
  const id = location.hash.slice(1);
  const item = id ? findItemById(id) : null;
  if (item) loadDoc(item);
  else {
    setActive(null);
    showState("welcome");
    document.title = "Конспекты — сети и КС";
  }
});

buildNav();

const initialId = location.hash.slice(1);
const initial = initialId ? findItemById(initialId) : null;
if (initial) {
  loadDoc(initial);
} else {
  showState("welcome");
}
