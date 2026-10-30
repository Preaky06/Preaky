// Outils partagés côté navigateur : liens, stockage local, échappement, notifications.

const html = document.documentElement;
const MODE = html.dataset.mode || "prod";
const RACINE = html.dataset.racine ?? "/";

// Route du site (« /pays/japon ») → lien utilisable depuis la page courante
export function lien(route) {
  const m = route.match(/^([^?#]*)(.*)$/);
  const [chemin, suite] = [m[1], m[2]];
  if (MODE === "prod") return chemin + suite;
  const f = chemin === "/" ? "index.html" : chemin.replace(/^\//, "") + (/\.[a-z0-9]+$/i.test(chemin) ? "" : ".html");
  return RACINE + f + suite;
}

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const normaliser = (s) => String(s ?? "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ").replace(/[^a-z0-9 -]/g, " ").replace(/\s+/g, " ").trim();

// Le stockage local peut être indisponible (navigation privée, données bloquées) : tout est protégé.
export function lire(cle, defaut) {
  try {
    const v = localStorage.getItem(cle);
    return v ? JSON.parse(v) : defaut;
  } catch {
    return defaut;
  }
}
export function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch {
    return false;
  }
}

let minuteur;
export function annoncer(texte) {
  const t = document.querySelector(".toast");
  if (!t) return;
  t.textContent = texte;
  t.hidden = false;
  clearTimeout(minuteur);
  minuteur = setTimeout(() => (t.hidden = true), 3200);
}

// Index de recherche, chargé une seule fois
let promesse;
export function chargerIndex() {
  promesse ??= fetch(lien("/donnees/recherche.json")).then((r) => {
    if (!r.ok) throw new Error("Index introuvable");
    return r.json();
  });
  return promesse;
}

// Copie dans le presse-papiers, avec repli sur la sélection du texte
export async function copier(texte) {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    const zone = document.createElement("textarea");
    zone.value = texte;
    zone.setAttribute("readonly", "");
    zone.style.position = "fixed";
    zone.style.opacity = "0";
    document.body.append(zone);
    zone.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    zone.remove();
    return ok;
  }
}

export const ICONES = {
  coeur: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z"/></svg>',
  horloge: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/></svg>',
  fermer: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>',
};
