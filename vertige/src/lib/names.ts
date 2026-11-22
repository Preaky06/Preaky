/** « Une Porsche 911 » → « Porsche 911 » ; « L'EPR de Flamanville » → « EPR de Flamanville ». */
export const stripArticle = (name: string) => name.replace(/^(un|une|des|le|la|les)\s+/i, "").replace(/^l['’]/i, "");

/** Première lettre en minuscule, sans toucher aux sigles (« PIB », « EPR »). */
export const lowerFirst = (s: string) => (/^[A-ZÀ-Ý]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
