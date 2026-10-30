// Stockage sur l'appareil : IndexedDB (état et photos), avec repli en mémoire si le navigateur le refuse
// (navigation privée, stockage bloqué). Dans ce cas, rien n'est conservé après la visite.
const NAME = "lezarde";
const memory = { kv: new Map(), photos: new Map() };
let opening = null;

function openDb() {
  opening ??= new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("IndexedDB indisponible"));
    const req = indexedDB.open(NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("kv");
      req.result.createObjectStore("photos");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((err) => {
    opening = Promise.reject(err);
    opening.catch(() => {});
    throw err;
  });
  return opening;
}

async function run(store, mode, op, fallback) {
  let db;
  try {
    db = await openDb();
  } catch {
    return fallback(memory[store]);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = op(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const get = (key) => run("kv", "readonly", (s) => s.get(key), (m) => m.get(key));
export const set = (key, value) => run("kv", "readwrite", (s) => s.put(value, key), (m) => void m.set(key, structuredClone(value)));
export const getPhoto = (id) => run("photos", "readonly", (s) => s.get(id), (m) => m.get(id));
export const putPhoto = (id, blob) => run("photos", "readwrite", (s) => s.put(blob, id), (m) => void m.set(id, blob));
export const deletePhoto = (id) => run("photos", "readwrite", (s) => s.delete(id), (m) => void m.delete(id));
export async function clearAll() {
  await run("photos", "readwrite", (s) => s.clear(), (m) => m.clear());
  await run("kv", "readwrite", (s) => s.clear(), (m) => m.clear());
}
