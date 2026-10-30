// Copier, ouvrir dans une IA, télécharger.

// Au-delà, certains services refusent l'adresse : on copie le prompt et on ouvre la page vide.
const MAX_URL_LENGTH = 7000;

export const TARGETS = {
  claude: { nom: "Claude", base: "https://claude.ai/new", param: "q" },
  chatgpt: { nom: "ChatGPT", base: "https://chatgpt.com/", param: "q" },
};

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
    (document.querySelector("dialog[open]") || document.body).append(area);
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

export function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
