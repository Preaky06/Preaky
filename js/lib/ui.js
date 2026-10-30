// Comportements communs aux deux pages : en-tête, apparitions au défilement, toast.
import { icon } from "./icons.js";

export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Une nouvelle page s'ouvre en haut, y compris dans un aperçu intégré qui garderait
// la position de la page précédente. Retour arrière, rechargement et liens « #… » non concernés.
function arriveAtTop() {
  const nav = performance.getEntriesByType?.("navigation")?.[0];
  if (location.hash || (nav && nav.type !== "navigate")) return;
  window.scrollTo(0, 0);
  document.documentElement.scrollIntoView({ block: "start", behavior: "instant" });
}

// Pendant qu'une fenêtre (dialog) est ouverte, la page derrière ne défile plus
function lockScrollWithDialogs() {
  const sync = () => document.documentElement.classList.toggle("is-locked", Boolean(document.querySelector("dialog[open]")));
  const mo = new MutationObserver(sync);
  document.querySelectorAll("dialog").forEach((d) => mo.observe(d, { attributes: true, attributeFilter: ["open"] }));
}

export function initHeader() {
  arriveAtTop();
  lockScrollWithDialogs();
  const header = document.querySelector(".header");
  if (!header) return;
  const burger = header.querySelector(".burger");

  // data-solid : en-tête toujours opaque (page dont le haut est sombre)
  if (!header.hasAttribute("data-solid")) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const close = () => {
    header.classList.remove("is-open");
    burger?.setAttribute("aria-expanded", "false");
  };
  burger?.addEventListener("click", () => {
    const open = header.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
  });
  header.querySelectorAll(".nav a").forEach((a) => a.addEventListener("click", close));
  document.addEventListener("keydown", (e) => e.key === "Escape" && close());

  // Lien actif selon la section visible
  const links = [...header.querySelectorAll('.nav a[href^="#"]')];
  const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  if (!sections.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
      }
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  sections.forEach((s) => io.observe(s));
}

export function initReveal(root = document) {
  const items = root.querySelectorAll("[data-reveal], [data-split]");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  // Ce qui est déjà à l'écran au chargement apparaît tout de suite
  const fold = window.innerHeight;
  items.forEach((el) => {
    if (el.getBoundingClientRect().top < fold) el.classList.add("is-in");
    else io.observe(el);
  });
}

let toastTimer;
export function toast(message, { tone = "ok" } = {}) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
  }
  // Une fenêtre ouverte passe au-dessus de tout : le toast doit être dedans pour rester visible
  const host = document.querySelector("dialog[open]") || document.body;
  if (el.parentElement !== host) host.append(el);
  el.innerHTML = `${icon(tone === "warn" ? "alert" : "check")}<span>${message}</span>`;
  el.dataset.tone = tone;
  el.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-on"), tone === "warn" ? 5200 : 2600);
}

// Défilement fluide (page d'accueil). Désactivé si l'utilisateur limite les animations.
export function initSmoothScroll() {
  if (reducedMotion || typeof window.Lenis !== "function") return null;
  const lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = a.getAttribute("href");
      if (target.length < 2) return;
      const el = document.querySelector(target);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: target === "#top" ? 0 : -72 });
      history.replaceState(null, "", target);
    });
  });
  return lenis;
}

// Compte jusqu'à la valeur quand l'élément entre à l'écran.
export function countUp(el, to) {
  const fmt = (n) => n.toLocaleString("fr-FR");
  if (reducedMotion) {
    el.textContent = fmt(to);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 1200);
      el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  io.observe(el);
}
