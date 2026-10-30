// Client Supabase, chargé à la demande et seulement si le site est configuré (js/config.js).
// Seule la clé publique « anon » est utilisée côté navigateur : les droits sont portés par les politiques RLS.
import { CONFIG } from "./config.js";

const SCRIPT = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
let instance;

export const configure = () => Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);

export function client() {
  if (!configure()) return Promise.reject(new Error("Supabase n'est pas configuré"));
  instance ??= new Promise((ok, ko) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.crossOrigin = "anonymous";
    s.onload = () => ok(window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey));
    s.onerror = () => ko(new Error("Chargement de Supabase impossible"));
    document.head.append(s);
  });
  return instance;
}
