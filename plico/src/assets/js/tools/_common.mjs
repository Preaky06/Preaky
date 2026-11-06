// Briques communes aux outils.
import { h, icon, createDropzone, paywall, toast, progressView, errorMessage, formatBytes } from '../ui.mjs';
import { limits, canUseTool, planForTool, planName, checkFiles } from '../plans.mjs';
import { onLicenseChange } from '../license.mjs';

export function limitsText(kind = 'files', { batch = false } = {}) {
  const l = limits();
  const max = kind === 'images' ? l.maxImages : l.maxFiles;
  const parts = [`Plan ${l.planName}`, `fichiers jusqu’à ${l.maxFileMB >= 1000 ? `${l.maxFileMB / 1000} Go` : `${l.maxFileMB} Mo`}`];
  if (batch) parts.push(l.batch ? `jusqu’à ${max} fichiers par lot` : '1 fichier à la fois');
  else if (kind !== 'single') parts.push(`jusqu’à ${max} ${kind === 'images' ? 'images' : 'fichiers'}`);
  return parts.join(' · ');
}

/** Affiche la zone de dépôt initiale. */
export function dropStage(root, { accept, multiple, title, hint, kind = 'files', batch = false, onFiles }) {
  const zone = createDropzone({
    accept,
    multiple,
    title,
    hint,
    limitsText: limitsText(kind, { batch }),
    onFiles: (files) => {
      const problem = checkFiles(files, { kind, batch });
      if (problem) return paywall({ reason: problem.reason, requiredPlan: problem.requiredPlan });
      onFiles(files);
    },
  });
  root.replaceChildren(zone);
  return zone;
}

/** Vérifie l'accès à l'outil ; ouvre la fenêtre d'abonnement sinon. */
export function ensureTool(toolId) {
  if (canUseTool(toolId)) return true;
  const required = planForTool(toolId);
  paywall({ reason: `Cet outil fait partie du plan ${planName(required)}. Vous pouvez tout préparer gratuitement : seul l’export est réservé.`, requiredPlan: required });
  return false;
}

export function workspace() {
  const main = h('div', { class: 'ws-main' });
  const aside = h('aside', { class: 'ws-aside' });
  const el = h('div', { class: 'workspace' }, main, aside);
  return { el, main, aside };
}

/** Bouton d'action principal + mention de verrouillage si l'outil n'est pas inclus. */
export function primaryAction(label, toolId, onClick) {
  const btn = h('button', { type: 'button', class: 'btn btn-accent btn-block', 'data-testid': 'run' }, label);
  const note = h('p', { class: 'lock-note' });
  const wrap = h('div', { class: 'primary-action' }, btn, note);
  const update = () => {
    const ok = canUseTool(toolId);
    note.replaceChildren();
    if (!ok) {
      note.append(icon('lock', 14), `Export réservé au plan ${planName(planForTool(toolId))}`);
    } else {
      note.append(icon('lock', 14), 'Traitement local, rien n’est envoyé');
    }
  };
  update();
  onLicenseChange(update);
  btn.addEventListener('click', () => {
    if (!ensureTool(toolId)) return;
    onClick(btn);
  });
  return { el: wrap, button: btn };
}

/**
 * Exécute un traitement avec barre de progression dans `host`.
 * fn(progress) où progress.set(fraction, message).
 */
export async function runTask(host, button, fn) {
  const progress = progressView();
  host.append(progress.el);
  if (button) {
    button.disabled = true;
    button.dataset.label = button.textContent;
    button.replaceChildren(h('span', { class: 'spinner' }), ' Traitement…');
  }
  try {
    return await fn(progress);
  } catch (e) {
    console.error(e);
    toast(errorMessage(e), { type: 'err', timeout: 8000 });
    return null;
  } finally {
    progress.el.remove();
    if (button && button.isConnected) {
      button.disabled = false;
      button.textContent = button.dataset.label;
    }
  }
}

export const tick = () => new Promise((r) => setTimeout(r, 0));

export function fileSummary(files) {
  const total = files.reduce((s, f) => s + (f.size || 0), 0);
  return `${files.length} fichier${files.length > 1 ? 's' : ''} · ${formatBytes(total)}`;
}

export { checkFiles };
