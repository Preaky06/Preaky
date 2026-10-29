// Assemblage d'un prompt à partir de son modèle et des valeurs saisies.
import { VARIABLES } from "../data/variables.js";

const TOKEN = /\{\{(\w+)\}\}/g;

// Au-delà, certains services refusent l'adresse : on copie le prompt et on ouvre la page vide.
const MAX_URL_LENGTH = 7000;

export const TARGETS = {
  claude: { nom: "Claude", base: "https://claude.ai/new", param: "q" },
  chatgpt: { nom: "ChatGPT", base: "https://chatgpt.com/", param: "q" },
};

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Texte d'interface échappé, avec les espaces insécables de la typographie française.
export function typo(str) {
  return escapeHtml(str).replace(/ ([?!:;»])/g, " $1").replace(/« /g, "« ");
}

// Champs du prompt, dans l'ordre où ils apparaissent, sans doublon.
export function keysOf(prompt) {
  return [...new Set([...prompt.prompt.matchAll(TOKEN)].map((m) => m[1]))];
}

function slot(key, values) {
  const value = String(values[key] ?? "").trim();
  const def = VARIABLES[key];
  if (value) return { text: value, state: "ok" };
  if (def?.optional) return { text: "non précisé", state: "opt" };
  return { text: `[À COMPLÉTER : ${def?.label ?? key}]`, state: "miss" };
}

// Texte à copier, version HTML surlignée pour l'aperçu, et champs obligatoires vides.
export function compile(prompt, values) {
  const missing = [];
  const text = prompt.prompt.replace(TOKEN, (_, key) => {
    const s = slot(key, values);
    if (s.state === "miss" && !missing.includes(key)) missing.push(key);
    return s.text;
  });

  const html = prompt.prompt
    .split("\n")
    .map((line) => {
      let out = "";
      let last = 0;
      for (const m of line.matchAll(TOKEN)) {
        out += escapeHtml(line.slice(last, m.index));
        const s = slot(m[1], values);
        out += `<mark class="v v--${s.state}" data-key="${m[1]}">${escapeHtml(s.text)}</mark>`;
        last = m.index + m[0].length;
      }
      out += escapeHtml(line.slice(last));
      if (line.startsWith("## ")) return `<span class="p-h">${out}</span>`;
      if (/^<\/?\w+>$/.test(line)) return `<span class="p-tag">${out}</span>`;
      return out;
    })
    .join("\n");

  return { text, html, missing };
}

export function targetUrl(target, text) {
  const t = TARGETS[target];
  const url = `${t.base}?${t.param}=${encodeURIComponent(text)}`;
  return url.length > MAX_URL_LENGTH ? { url: t.base, tooLong: true } : { url, tooLong: false };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Repli pour les navigateurs qui refusent l'API presse-papiers
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}
