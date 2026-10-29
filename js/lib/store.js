// Tout ce que la personne saisit reste dans son navigateur (localStorage).
// Le stockage peut être indisponible (navigation privée, cookies bloqués) :
// le site fonctionne alors normalement, sans mémoire d'une visite à l'autre.
import { VARIABLES } from "../data/variables.js";

const KEY_VALUES = "promptoir:valeurs";
const KEY_FAVS = "promptoir:favoris";

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
    /* stockage indisponible : la valeur reste en mémoire pour cette visite */
  }
}

const values = read(KEY_VALUES, {});
const favs = new Set(read(KEY_FAVS, []));

export function getValue(key) {
  if (key in values) return values[key];
  return VARIABLES[key]?.defaut ?? "";
}

export function setValue(key, value) {
  values[key] = value;
  write(KEY_VALUES, values);
}

export function filledCount(keys) {
  return keys.filter((k) => String(getValue(k)).trim()).length;
}

export function clearAll() {
  for (const k of Object.keys(values)) delete values[k];
  favs.clear();
  try {
    localStorage.removeItem(KEY_VALUES);
    localStorage.removeItem(KEY_FAVS);
  } catch {
    /* rien à effacer */
  }
}

export function isFav(id) {
  return favs.has(id);
}

export function toggleFav(id) {
  if (favs.has(id)) favs.delete(id);
  else favs.add(id);
  write(KEY_FAVS, [...favs]);
  return favs.has(id);
}

export function favCount() {
  return favs.size;
}
