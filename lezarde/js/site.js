// Page d'accueil : menu mobile, apparitions au défilement, carrousel des étapes.
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initMenu() {
  const top = document.querySelector("[data-top]");
  const btn = document.querySelector("[data-menu]");
  if (!top || !btn) return;
  const set = (open) => {
    top.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
  };
  btn.addEventListener("click", () => set(!top.classList.contains("is-open")));
  top.querySelectorAll(".seg a").forEach((a) => a.addEventListener("click", () => set(false)));
  document.addEventListener("keydown", (e) => e.key === "Escape" && set(false));
}

// Le contenu est toujours visible ; seuls les blocs encore sous la ligne de flottaison
// se soulèvent légèrement quand ils arrivent à l'écran.
function initReveal() {
  if (reduced || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-anim");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  document.querySelectorAll("[data-reveal]").forEach((el) => el.getBoundingClientRect().top > innerHeight && io.observe(el));
}

function initCarousel() {
  const root = document.querySelector("[data-carousel]");
  if (!root) return;
  const track = root.querySelector("[data-track]");
  const prev = root.querySelector("[data-prev]");
  const next = root.querySelector("[data-next]");
  const status = root.querySelector("[data-status]");
  const progress = root.querySelector("[data-progress]");
  const total = track.children.length;
  const step = () => track.children[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0);
  const perView = () => Math.max(1, Math.round(Number(getComputedStyle(track).getPropertyValue("--cols")) || 1));

  const update = () => {
    const first = Math.min(total - 1, Math.round(track.scrollLeft / step()));
    const last = Math.min(total, first + perView());
    status.textContent = last - first > 1 ? `Étapes ${first + 1} à ${last} sur ${total}` : `Étape ${first + 1} sur ${total}`;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    progress.style.width = `${(last / total) * 100}%`;
  };
  const go = (dir) => track.scrollBy({ left: dir * step() * perView(), behavior: reduced ? "auto" : "smooth" });
  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));
  let frame;
  track.addEventListener("scroll", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();
}

initMenu();
initReveal();
initCarousel();
