// Registre local des contrats, profils et réglages (localStorage). Rien n'est envoyé sur Internet.
const KEYS = { contracts: 'cessio.contracts.v1', profiles: 'cessio.profiles.v1', settings: 'cessio.settings.v1', draft: 'cessio.draft.v1' };

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const listContracts = () => read(KEYS.contracts, []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
export const getContract = (id) => listContracts().find((c) => c.id === id) || null;

/** Enregistre (création ou mise à jour). Attribue un numéro si absent. */
export function saveContract(contract) {
  const all = read(KEYS.contracts, []);
  const now = Date.now();
  const copy = { ...contract, updatedAt: now };
  if (!copy.number) {
    const year = new Date().getFullYear();
    const seq = all.filter((c) => String(c.number || '').startsWith(`CES-${year}-`)).length + 1;
    copy.number = `CES-${year}-${String(seq).padStart(3, '0')}`;
  }
  const i = all.findIndex((c) => c.id === copy.id);
  if (i >= 0) all[i] = copy;
  else all.push(copy);
  if (!write(KEYS.contracts, all)) throw new Error('Stockage plein : exportez une sauvegarde puis supprimez d’anciens contrats.');
  return copy;
}

export function removeContract(id) {
  write(KEYS.contracts, read(KEYS.contracts, []).filter((c) => c.id !== id));
}

export const countContracts = () => read(KEYS.contracts, []).length;

export const getSettings = () => read(KEYS.settings, { percentages: {}, logo: null, accent: null, activeProfile: 0 });
export const saveSettings = (s) => write(KEYS.settings, s);

export const getProfiles = () => read(KEYS.profiles, []);
export const saveProfiles = (list) => write(KEYS.profiles, list);
export function activeProfile() {
  const list = getProfiles();
  return list[getSettings().activeProfile || 0] || list[0] || null;
}

export const getDraft = () => read(KEYS.draft, null);
export const saveDraft = (d) => write(KEYS.draft, d);
export const clearDraft = () => write(KEYS.draft, null);

/** Sauvegarde complète (contrats, profils, réglages) dans un fichier JSON. */
export function exportBackup() {
  return JSON.stringify({ app: 'cessio', version: 1, exportedAt: new Date().toISOString(), contracts: read(KEYS.contracts, []), profiles: getProfiles(), settings: getSettings() }, null, 2);
}

/** Restaure une sauvegarde : fusionne les contrats (le plus récent l'emporte). */
export function importBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Fichier de sauvegarde illisible.');
  }
  if (data?.app !== 'cessio' || !Array.isArray(data.contracts)) throw new Error('Ce fichier n’est pas une sauvegarde Cessio.');
  const byId = new Map(read(KEYS.contracts, []).map((c) => [c.id, c]));
  for (const c of data.contracts) {
    if (!c?.id) continue;
    const existing = byId.get(c.id);
    if (!existing || (c.updatedAt || 0) > (existing.updatedAt || 0)) byId.set(c.id, c);
  }
  write(KEYS.contracts, [...byId.values()]);
  if (Array.isArray(data.profiles) && data.profiles.length && !getProfiles().length) saveProfiles(data.profiles);
  if (data.settings && typeof data.settings === 'object') saveSettings({ ...getSettings(), ...data.settings });
  return data.contracts.length;
}
