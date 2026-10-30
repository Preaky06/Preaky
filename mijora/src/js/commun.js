// Comportements communs à toutes les pages : menu mobile, recherche, favoris, newsletter.
import { annoncer, chargerIndex } from "./outils.js";
import { favoris } from "./favoris-store.js";
import { brancherSuggestions } from "./recherche.js";
import { CONFIG } from "./config.js";
import { client } from "./supabase.js";

// ---------------------------------------------------------------- menu mobile
const boutonMenu = document.querySelector(".outil-menu");
const nav = document.getElementById("nav");
boutonMenu?.addEventListener("click", () => {
  const ouvert = nav.classList.toggle("ouvert");
  boutonMenu.setAttribute("aria-expanded", String(ouvert));
  boutonMenu.setAttribute("aria-label", ouvert ? "Fermer le menu" : "Ouvrir le menu");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav?.classList.contains("ouvert")) {
    nav.classList.remove("ouvert");
    boutonMenu.setAttribute("aria-expanded", "false");
    boutonMenu.focus();
  }
});

// ---------------------------------------------------------------- recherche globale
const dialogue = document.querySelector(".recherche-dialog");
const champGlobal = document.getElementById("recherche-globale");
document.querySelectorAll("[data-ouvrir-recherche]").forEach((b) => b.addEventListener("click", () => {
  if (typeof dialogue.showModal === "function") dialogue.showModal();
  else dialogue.setAttribute("open", "");
  champGlobal.focus();
  chargerIndex().catch(() => {});
}));
document.querySelector("[data-fermer-recherche]")?.addEventListener("click", () => dialogue.close());
dialogue?.addEventListener("click", (e) => { if (e.target === dialogue) dialogue.close(); });
if (champGlobal) brancherSuggestions(champGlobal, document.getElementById("recherche-globale-liste"), chargerIndex());

// Champs avec suggestions (accueil, explorateur)
document.querySelectorAll("input[data-suggestions]:not([data-suggestions-local])").forEach((input) => {
  const liste = document.getElementById(input.getAttribute("aria-controls"));
  input.addEventListener("focus", () => chargerIndex().catch(() => {}), { once: true });
  brancherSuggestions(input, liste, chargerIndex());
});

// ---------------------------------------------------------------- favoris
function majFavoris() {
  const tous = favoris.tous();
  document.querySelectorAll("[data-fav]").forEach((b) => {
    const actif = tous.includes(b.dataset.fav);
    b.setAttribute("aria-pressed", String(actif));
    const texte = b.querySelector("[data-fav-texte]");
    if (texte) texte.textContent = actif ? "Dans vos favoris" : "Ajouter aux favoris";
  });
  document.querySelectorAll("[data-compteur-favoris]").forEach((c) => {
    c.hidden = !tous.length;
    c.textContent = String(tous.length);
  });
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-fav]");
  if (!b) return;
  e.preventDefault();
  const { actif, ok } = favoris.basculer(b.dataset.fav);
  if (!ok) annoncer("Impossible d'enregistrer sur cet appareil : le stockage du navigateur est bloqué.");
  else annoncer(actif ? "Ajouté à vos favoris" : "Retiré de vos favoris");
});
document.addEventListener("mijora:favoris", majFavoris);
document.addEventListener("mijora:cartes", majFavoris);
majFavoris();

// ---------------------------------------------------------------- newsletter
const formNews = document.querySelector("[data-newsletter]");
if (formNews) {
  const bouton = formNews.querySelector("button");
  const etat = formNews.querySelector("[data-newsletter-etat]");
  const actif = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
  bouton.disabled = !actif;
  if (actif) etat.textContent = "Une lettre par mois. Désinscription en un clic.";
  formNews.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!actif) return;
    const email = formNews.email.value.trim();
    if (!formNews.email.checkValidity() || !email) {
      etat.textContent = "Saisissez une adresse e-mail valide, par exemple prenom@exemple.fr.";
      formNews.email.focus();
      return;
    }
    bouton.disabled = true;
    try {
      const sb = await client();
      const { error } = await sb.from("newsletter_subscribers").insert({ email });
      if (error && error.code !== "23505") throw error;
      etat.textContent = "C'est noté : vous recevrez la prochaine lettre.";
      formNews.reset();
    } catch {
      etat.textContent = "L'inscription n'a pas abouti. Réessayez dans quelques minutes.";
    } finally {
      bouton.disabled = false;
    }
  });
}
