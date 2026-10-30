import { sec, line, steps } from "../../lib/kit.js";

const OUTILS = {
  midjourney: "Ajoute les paramètres Midjourney utiles (ratio avec --ar, éléments à exclure avec --no), en restant sur des paramètres courants.",
  sd: "Ajoute un prompt négatif pour chaque prompt.",
  ideogram: "Ideogram rend bien le texte : intègre le texte demandé entre guillemets dans le prompt.",
  dalle: "Si tu peux générer des images, génère la meilleure des 4 versions après avoir écrit les prompts.",
};

export default {
  id: "image",
  nom: "Créer une image avec l'IA",
  icon: "image",
  couleur: "sky",
  description: "Illustration, photo, logo, affiche : des prompts d'image précis, adaptés à ton outil.",
  exemples: ["Un logo pour mon club de foot", "Une illustration à l'aquarelle de ma ville", "Une photo produit de mes bougies sur fond naturel"],
  motsCles: [
    ["image", 4], ["illustration", 4], ["dessin", 3], ["logo", 3], ["photo", 2], ["visuel", 3], ["midjourney", 5], ["dall e", 5],
    ["dalle", 5], ["stable diffusion", 5], ["firefly", 5], ["ideogram", 5], ["affiche", 3], ["portrait", 2], ["wallpaper", 4],
    ["fond d ecran", 4], ["generer une image", 5], ["aquarelle", 3], ["pixel art", 4], ["3d$", 2],
  ],
  questions: [
    {
      id: "outil",
      type: "choice",
      label: "Avec quel outil vas-tu générer l'image ?",
      pourquoi: "Chaque outil a sa syntaxe et ses forces : Ideogram écrit bien le texte, Midjourney a ses propres paramètres.",
      options: [
        { v: "midjourney", label: "Midjourney", keep: true, match: ["midjourney"] },
        { v: "dalle", label: "ChatGPT (DALL·E)", keep: true, match: ["dall e", "dalle", "chatgpt"] },
        { v: "firefly", label: "Adobe Firefly", keep: true, match: ["firefly"] },
        { v: "ideogram", label: "Ideogram", keep: true, match: ["ideogram"] },
        { v: "sd", label: "Stable Diffusion", keep: true, match: ["stable diffusion", "sdxl"] },
        { v: "autre", label: "Un autre outil, ou je ne sais pas" },
      ],
    },
    {
      id: "sujet",
      type: "long",
      label: "Que doit montrer l'image ?",
      pourquoi: "Sujet, action, décor : plus c'est précis, moins tu fais d'essais.",
      prefill: (idea) => idea,
      suggestions: ["Un chat roux endormi sur une pile de livres, près d'une fenêtre", "Un bocal de bougie posé sur de la mousse, dans une forêt"],
    },
    {
      id: "usage",
      type: "choice",
      label: "À quoi va-t-elle servir ?",
      pourquoi: "Un logo doit rester lisible en tout petit ; une affiche doit laisser de la place au texte.",
      options: [
        { v: "reseaux", label: "Une publication sur les réseaux" },
        { v: "affiche", label: "Une affiche ou un flyer", match: ["affiche", "flyer"] },
        { v: "logo", label: "Un logo ou une icône", match: ["logo", "icone"] },
        { v: "article", label: "L'illustration d'un article" },
        { v: "fond", label: "Un fond d'écran", match: ["fond d ecran", "wallpaper"] },
        { v: "produit", label: "Une photo de produit", match: ["produit"] },
        { v: "art", label: "Une création artistique" },
      ],
    },
    {
      id: "style",
      type: "choice",
      label: "Quel style ?",
      pourquoi: "Le style décide de tout le reste : lumière, matière, couleurs.",
      auto: true,
      options: [
        { v: "photo", label: "Photo réaliste", match: ["photo", "realiste"] },
        { v: "illustration", label: "Illustration", match: ["illustration", "dessin"] },
        { v: "3d", label: "3D", match: ["3d"] },
        { v: "aquarelle", label: "Aquarelle", match: ["aquarelle"] },
        { v: "anime", label: "Manga, anime", match: ["manga", "anime"] },
        { v: "pixel", label: "Pixel art", match: ["pixel"] },
        { v: "minimal", label: "Minimaliste, flat design", match: ["minimal", "flat"] },
      ],
    },
    {
      id: "ambiance",
      type: "text",
      label: "Quelle ambiance, quelle lumière, quelles couleurs ?",
      pourquoi: "La lumière et la palette font passer l'émotion de l'image.",
      auto: true,
      suggestions: ["Lumière dorée de fin de journée", "Néons bleus et roses, la nuit", "Pastels doux et lumineux", "Noir et blanc contrasté"],
    },
    {
      id: "format",
      type: "choice",
      label: "Quel format ?",
      pourquoi: "Le cadrage se pense pour le format : une image recadrée après coup perd sa composition.",
      options: [
        { v: "carre", label: "Carré (1:1)" },
        { v: "portrait", label: "Portrait (4:5)" },
        { v: "story", label: "Vertical (9:16)" },
        { v: "paysage", label: "Paysage (16:9)" },
      ],
    },
    {
      id: "texte",
      type: "text",
      label: "Un texte doit-il apparaître dans l'image ?",
      pourquoi: "La plupart des outils écrivent mal : on prévoit l'espace pour l'ajouter ensuite, ou on choisit un outil adapté.",
      optional: true,
      suggestions: ["SOLDES −30 %", "Club de foot de Brest"],
    },
    {
      id: "eviter",
      type: "text",
      label: "Qu'est-ce qu'il faut éviter dans l'image ?",
      pourquoi: "Dire ce qu'on ne veut pas évite les mauvaises surprises récurrentes.",
      optional: true,
      suggestions: ["Des mains visibles", "Du texte parasite", "Des couleurs criardes", "Un fond chargé"],
    },
  ],
  build(c) {
    const outil = c.raw("outil");
    return {
      role: "Tu es directeur artistique et expert en génération d'images par IA. Tu écris des prompts d'image précis, qui donnent un résultat exploitable dès les premiers essais.",
      sections: [
        sec(
          "L'image à créer",
          line("Outil", c.l("outil")),
          line("Sujet", c.v("sujet")),
          line("Usage", c.l("usage")),
          line("Style", c.l("style")),
          line("Ambiance, lumière, couleurs", c.v("ambiance")),
          line("Format", c.l("format")),
          line("Texte à afficher", c.v("texte")),
          line("À éviter", c.v("eviter")),
        ),
        sec(
          "Ce que j'attends de toi",
          steps([
            "Écris 4 prompts d'image différents (variations de composition et de cadrage), dans la langue et la syntaxe qui fonctionnent le mieux avec mon outil, souvent l'anglais.",
            "Chaque prompt précise, dans cet ordre : sujet et action, composition et cadrage, décor, lumière, style et rendu (type d'objectif photo, matière, technique), palette, ambiance, format.",
            OUTILS[outil],
            c.has("texte") && outil !== "ideogram" && "Laisse un espace libre dans la composition pour ajouter le texte en retouche.",
            c.is("usage", "logo") && "Pour un logo : formes simples, lisibles en très petit, deux ou trois couleurs maximum, sans détails fins.",
            "Pour chaque prompt, dis ce qu'il faut surveiller dans le résultat (mains, visages, perspective, texte).",
            "Explique comment garder une cohérence visuelle si je dois produire une série d'images.",
          ]),
        ),
        sec(
          "Garde-fous",
          "- Aucun nom d'artiste vivant, aucune marque déposée, aucun personnage protégé dans les prompts.",
          c.is("usage", "logo") && "- Rappelle-moi qu'un logo final doit être redessiné en vectoriel et que je dois vérifier qu'il ne ressemble pas à une marque existante.",
          "- Rappelle-moi de vérifier que les conditions d'utilisation de l'outil autorisent l'usage prévu, surtout s'il est commercial.",
        ),
      ],
      relances: [
        "Le résultat a ce défaut : [décris-le]. Corrige le prompt pour l'éliminer.",
        "Fais 3 variantes du prompt n°[X] dans des styles différents.",
        "Adapte le prompt n°[X] au format vertical sans perdre la composition.",
      ],
    };
  },
};
