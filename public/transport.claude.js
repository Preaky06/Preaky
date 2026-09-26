// Transport « claude.ai » : la page appelle Claude directement, avec le compte
// claude.ai de la personne qui l'utilise (capacité `sample`). Pas de serveur,
// pas de clé API. Remplace transport.js dans la version publiée sur claude.ai.
import { ANALYSIS_SCHEMA, ANALYSIS_SYSTEM, CHAT_SYSTEM, LANGUAGES } from "../lib/prompts.js";
import { mockAnalysis, mockAnswer } from "../lib/mock.js";

const use = (name) => (window.claude?.use ? window.claude.use(name).catch(() => null) : Promise.resolve(null));
const sampleP = use("sample");
const downloadsP = use("downloads");

const MAX_DOC_CHARS = 40_000;   // la requête entière est limitée à 64 Kio
const MAX_PDF_PAGES = 30;
const PDF_ERROR = "Ce PDF n'a pas pu être lu ici. Faites des captures d'écran des pages et ajoutez-les comme photos.";

export const transport = {
  kind: "claude",
  features: { consent: false, print: false, ics: false, history: false, themeToggle: false, serviceWorker: false, share: false },

  async health() {
    const sample = await sampleP;
    if (!sample) return { demo: true, host: "outside" };
    const limits = await sample.limits().catch(() => null);
    return { demo: false, images: !!limits?.images, maxImages: limits?.images?.maxCount || 0 };
  },

  async analyze(body, onEvent, signal) {
    const sample = await sampleP;
    if (!sample) {
      let closed = false;
      signal?.addEventListener("abort", () => { closed = true; });
      await mockAnalysis(onEvent, () => closed);
      if (closed) throw abortError();
      return;
    }
    onEvent("phase", { phase: "thinking" });
    let doc;
    try { doc = await prepareDocument(body, onEvent); }
    catch { onEvent("error", { message: PDF_ERROR }); return; }
    const prompt = analysisPrompt(doc, body);
    let writing = false;
    try {
      const raw = await sample.json(prompt, {
        modelTier: "complex",
        images: doc.images.length ? doc.images : undefined,
        cache: false,
        signal,
        onText: ({ text }) => {
          if (!writing) { writing = true; onEvent("phase", { phase: "writing" }); }
          onEvent("progress", { chars: text.length });
        },
      });
      onEvent("result", { result: normalize(raw), model: "claude" });
    } catch (e) {
      if (e?.code === "cancelled") throw abortError();
      onEvent("error", { message: errorMessage(e) });
    }
  },

  async ask(body, onEvent, signal) {
    const sample = await sampleP;
    if (!sample) {
      let closed = false;
      signal?.addEventListener("abort", () => { closed = true; });
      await mockAnswer(onEvent, () => closed, body.question, "Ouvrez cette page dans claude.ai pour obtenir de vraies réponses.");
      return;
    }
    let doc;
    try { doc = await prepareDocument(body); }
    catch { doc = { text: "", images: [] }; }
    const lang = LANGUAGES[body.lang] || LANGUAGES.fr;
    const context = [
      CHAT_SYSTEM,
      `Date du jour : ${new Date().toISOString().slice(0, 10)}.`,
      `Analyse déjà réalisée du document (JSON) :\n${JSON.stringify(body.analysis || {}).slice(0, 12_000)}`,
      doc.text ? `<document_texte>\n${doc.text.slice(0, 25_000)}\n</document_texte>` : "",
      doc.images.length ? "Les images jointes sont les pages du document." : "",
    ].filter(Boolean).join("\n\n");
    const history = (body.history || [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.content?.trim())
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    const turns = [{ role: "user", content: context }, ...history, { role: "user", content: `(Réponds en ${lang}.)\n\n${body.question}` }];
    let previous = "";
    try {
      await sample(turns, {
        cache: false,
        signal,
        images: doc.images.length ? doc.images : undefined,
        onText: ({ delta }) => { previous += delta; onEvent("delta", { text: delta }); },
      });
      onEvent("done", {});
    } catch (e) {
      if (e?.code === "cancelled") return;
      if (e?.text && e.text.length > previous.length) onEvent("delta", { text: e.text.slice(previous.length) });
      onEvent("error", { message: errorMessage(e) });
    }
  },

  async save(name, content) {
    const downloads = await downloadsP;
    if (!downloads) return false;
    try {
      await downloads.save({ filename: name, data: content });
      return true;
    } catch (e) {
      if (e?.code === "declined") throw e;
      return false;
    }
  },
};

function abortError() {
  const e = new Error("cancelled");
  e.name = "AbortError";
  return e;
}

function errorMessage(e) {
  switch (e?.code) {
    case "not_granted": return "Limpide n'a pas l'autorisation d'utiliser Claude. Rechargez la page et acceptez la demande.";
    case "sampling_disabled": return "Claude n'est pas disponible pour ce compte.";
    case "rate_limited": return "Limite d'utilisation atteinte pour le moment. Réessayez un peu plus tard.";
    case "session_expired": return "Votre session claude.ai a expiré : reconnectez-vous puis réessayez.";
    case "prompt_too_large": return "Le document est trop long. Essayez avec moins de pages ou un extrait.";
    case "image_rejected": return "Une des images n'a pas pu être lue. Essayez une autre photo (JPG ou PNG).";
    case "images_unavailable": return "Les photos ne sont pas prises en charge ici. Collez plutôt le texte du document.";
    case "refused": return "Ce document n'a pas pu être analysé. Essayez avec un autre document.";
    case "invalid_json": return "La réponse d'analyse était incomplète. Réessayez.";
    case "empty_completion": return "Aucune réponse n'a été produite. Réessayez avec un document plus court.";
    default: return "Le service d'analyse est momentanément indisponible. Réessayez.";
  }
}

/* ------------------------------------------------------------ document */

const prepared = new Map();

// Photos → Blobs ; PDF → texte (s'il en contient) sinon pages rendues en images.
async function prepareDocument(body, onEvent) {
  const files = body.files || [];
  const key = files.map((f) => `${f.type}:${f.data.length}:${f.data.slice(0, 48)}`).join("|") + `|${(body.text || "").length}`;
  if (prepared.has(key)) return prepared.get(key);
  const out = { text: (body.text || "").slice(0, MAX_DOC_CHARS), images: [] };
  for (const f of files) {
    if (f.type === "application/pdf") {
      const pdf = await pdfContent(f.data, onEvent);
      if (pdf.text) out.text = `${out.text}\n${pdf.text}`.trim().slice(0, MAX_DOC_CHARS);
      out.images.push(...pdf.images);
    } else {
      out.images.push(base64ToBlob(f.data, f.type));
    }
  }
  if (prepared.size > 4) prepared.clear();
  prepared.set(key, out);
  return out;
}

function base64ToBlob(b64, type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

async function pdfContent(b64, onEvent) {
  const lib = window.pdfjsLib;
  if (!lib) throw Object.assign(new Error("pdf"), { code: "pdf_unavailable" });
  const data = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const pdf = await lib.getDocument({ data, isEvalSupported: false }).promise;
  const pages = Math.min(pdf.numPages, MAX_PDF_PAGES);
  let text = "";
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += `\n\n--- Page ${i} ---\n` + content.items.map((it) => it.str + (it.hasEOL ? "\n" : " ")).join("");
  }
  // Un PDF numérisé n'a pas de texte : on envoie les pages en images.
  if (text.replace(/--- Page \d+ ---|\s/g, "").length > 200 * pages ** 0.5) return { text: text.trim(), images: [] };
  onEvent?.("thinking", { text: "PDF numérisé : lecture des pages comme des photos. " });
  const images = [];
  for (let i = 1; i <= Math.min(pages, 8); i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    images.push(await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85)));
  }
  return { text: "", images };
}

/* -------------------------------------------------------------- prompt */

// Décrit le schéma JSON en texte lisible pour le modèle.
function describe(schema, indent = "") {
  if (schema.type === "object") {
    const lines = Object.entries(schema.properties).map(([k, v]) => {
      const note = v.description ? `  // ${v.description}` : "";
      return `${indent}  "${k}": ${describe(v, indent + "  ")}${note}`;
    });
    return `{\n${lines.join(",\n")}\n${indent}}`;
  }
  if (schema.type === "array") return `[ ${describe(schema.items, indent)} ]`;
  if (schema.enum) return schema.enum.map((e) => `"${e}"`).join(" | ");
  return schema.type;
}

function analysisPrompt(doc, body) {
  const lang = LANGUAGES[body.lang] || LANGUAGES.fr;
  const detail = body.detail === "detailed" ? "détaillé (développe davantage chaque point)" : "simple (phrases courtes, zéro jargon, comme pour un ami)";
  return [
    ANALYSIS_SYSTEM,
    doc.images.length ? `Le document est fourni en ${doc.images.length} image(s) jointe(s), dans l'ordre des pages.` : "",
    doc.text ? `<document_texte>\n${doc.text}\n</document_texte>` : "",
    `Date du jour : ${new Date().toISOString().slice(0, 10)}.`,
    `Langue de toutes les explications : ${lang}.`,
    `Niveau d'explication : ${detail}.`,
    `Réponds uniquement avec un objet JSON de cette forme exacte (toutes les clés présentes ; chaînes vides ou tableaux vides si rien) :\n${describe(ANALYSIS_SCHEMA)}`,
  ].filter(Boolean).join("\n\n");
}

/* ---------------------------------------------------------- validation */

const str = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

function normalize(r) {
  r = r && typeof r === "object" ? r : {};
  return {
    title: str(r.title) || "Votre document",
    document_type: str(r.document_type),
    issuer: str(r.issuer),
    document_date: str(r.document_date),
    plain_summary: str(r.plain_summary),
    urgency: oneOf(r.urgency, ["none", "low", "medium", "high"], "low"),
    urgency_reason: str(r.urgency_reason),
    key_points: arr(r.key_points).map(str).filter(Boolean),
    actions: arr(r.actions).map((a) => ({ task: str(a?.task), detail: str(a?.detail), deadline: str(a?.deadline), priority: oneOf(a?.priority, ["high", "medium", "low"], "medium") })).filter((a) => a.task),
    deadlines: arr(r.deadlines).map((d) => ({ date: str(d?.date), label: str(d?.label), consequence: str(d?.consequence) })).filter((d) => d.date && d.label),
    amounts: arr(r.amounts).map((a) => ({ label: str(a?.label), amount: Number(a?.amount), currency: str(a?.currency) || "EUR", direction: oneOf(a?.direction, ["to_pay", "to_receive", "info"], "info") })).filter((a) => Number.isFinite(a.amount)),
    warnings: arr(r.warnings).map(str).filter(Boolean),
    rights: arr(r.rights).map(str).filter(Boolean),
    glossary: arr(r.glossary).map((g) => ({ term: str(g?.term), definition: str(g?.definition) })).filter((g) => g.term && g.definition),
    contacts: arr(r.contacts).map((c) => ({ kind: oneOf(c?.kind, ["phone", "email", "address", "website", "reference", "other"], "other"), label: str(c?.label), value: str(c?.value) })).filter((c) => c.value),
    reply_draft: { needed: !!r.reply_draft?.needed, subject: str(r.reply_draft?.subject), body: str(r.reply_draft?.body) },
    suggested_questions: arr(r.suggested_questions).map(str).filter(Boolean).slice(0, 3),
    readability: oneOf(r.readability, ["good", "partial", "poor"], "good"),
    professional_advice: str(r.professional_advice),
  };
}
