// Brouillon en cours et historique des prompts, dans le navigateur uniquement.
// Le stockage peut être indisponible (navigation privée, cookies bloqués) :
// le site fonctionne alors normalement, sans mémoire d'une visite à l'autre.

const KEY_DRAFT = "promptoir:brouillon";
const KEY_HISTORY = "promptoir:historique";
const KEY_FAVORITES = "promptoir:favoris";
const KEY_PROFILE = "promptoir:profil";
const MAX_HISTORY = 30;

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
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : rien n'est conservé après la visite */
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* rien à effacer */
  }
}

export const loadDraft = () => read(KEY_DRAFT, null);
export const saveDraft = (draft) => write(KEY_DRAFT, draft);
export const clearDraft = () => remove(KEY_DRAFT);

export const loadHistory = () => read(KEY_HISTORY, []);

// Ajoute ou met à jour une entrée (même id), la plus récente en premier
export function saveToHistory(entry) {
  const list = loadHistory().filter((e) => e.id !== entry.id);
  list.unshift(entry);
  write(KEY_HISTORY, list.slice(0, MAX_HISTORY));
}

export function removeFromHistory(id) {
  write(KEY_HISTORY, loadHistory().filter((e) => e.id !== id));
}

export function clearAll() {
  remove(KEY_DRAFT);
  remove(KEY_HISTORY);
}

// Bibliothèque : prompts favoris et profil (activité, public, ton, pays) réutilisé d'un prompt à l'autre
export const loadFavorites = () => read(KEY_FAVORITES, []);
export const saveFavorites = (ids) => write(KEY_FAVORITES, ids);
export const loadProfile = () => read(KEY_PROFILE, {});
export const saveProfile = (profile) => write(KEY_PROFILE, profile);
