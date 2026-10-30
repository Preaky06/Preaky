// Identifiant d'URL : minuscules sans accents, mots séparés par des tirets (« Côte d'Ivoire » → « cote-d-ivoire »)
export const slugify = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’]/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
