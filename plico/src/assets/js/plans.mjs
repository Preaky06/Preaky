import config from './config.mjs';
import { currentPlanId } from './license.mjs';

const ORDER = Object.keys(config.plans); // free, pro, business

export function limits() {
  const id = currentPlanId();
  const plan = config.plans[id];
  return { ...plan.limits, planId: id, planName: plan.name };
}

const allows = (plan, toolId) => plan.limits.tools === 'all' || plan.limits.tools.includes(toolId);

export function canUseTool(toolId) {
  return allows(config.plans[currentPlanId()], toolId);
}

/** Plan le moins cher qui satisfait une condition. */
export function cheapestPlan(predicate) {
  return ORDER.find((id) => predicate(config.plans[id].limits, id)) || ORDER[ORDER.length - 1];
}

export const planForTool = (toolId) => cheapestPlan((_, id) => allows(config.plans[id], toolId));

export const planName = (id) => config.plans[id]?.name ?? id;

/**
 * Vérifie une liste de fichiers par rapport aux limites du plan courant.
 * kind : 'files' (PDF) ou 'images'. existing : nombre de fichiers déjà présents.
 * Retourne null si tout va bien, sinon { reason, requiredPlan }.
 */
export function checkFiles(files, { kind = 'files', existing = 0, batch = false } = {}) {
  const l = limits();
  const tooBig = files.find((f) => f.size > l.maxFileMB * 1024 * 1024);
  if (tooBig) {
    const required = cheapestPlan((pl) => pl.maxFileMB * 1024 * 1024 >= tooBig.size);
    return { reason: `« ${tooBig.name} » dépasse ${l.maxFileMB} Mo, la limite du plan ${l.planName}.`, requiredPlan: required };
  }
  const total = existing + files.length;
  if (batch && total > 1 && !l.batch) {
    return { reason: 'Le traitement de plusieurs fichiers à la fois est inclus dans le plan Business.', requiredPlan: cheapestPlan((pl) => pl.batch) };
  }
  const max = kind === 'images' ? l.maxImages : l.maxFiles;
  if (total > max) {
    const key = kind === 'images' ? 'maxImages' : 'maxFiles';
    const required = cheapestPlan((pl) => pl[key] >= total);
    return { reason: `Le plan ${l.planName} permet ${max} ${kind === 'images' ? 'images' : 'fichiers'} à la fois.`, requiredPlan: required };
  }
  return null;
}
