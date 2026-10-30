import { sec, line, steps } from "../../lib/kit.js";

const FORMATS = {
  post: "Structure : accroche, développement en phrases courtes (une idée par ligne), appel à l'action.",
  serie: "Propose un calendrier de 8 publications sur 4 semaines : pour chacune, l'angle, le format, l'accroche et le texte complet. Varie les angles (conseil, coulisses, preuve, question, offre).",
  video: "Écris le script plan par plan : accroche dans les 2 premières secondes, un changement visuel toutes les 3 à 5 secondes, le texte à l'écran, l'appel à l'action final, et la durée de chaque plan.",
  newsletter: "Structure : 3 propositions d'objet, une phrase d'aperçu, une introduction personnelle, le contenu en sections courtes, un seul appel à l'action.",
  article: "Structure : un titre avec le sujet principal, une introduction qui promet, des intertitres qui répondent aux questions de la cible, une conclusion avec appel à l'action. Ajoute une meta description d'environ 155 caractères.",
  pub: "Propose 3 publicités sur 3 angles différents (le problème, le bénéfice, la preuve) ; pour chacune : texte principal, titre court, idée de visuel ou de vidéo.",
  slogan: "Propose 15 slogans dans 3 registres (descriptif, émotionnel, décalé), puis tes 3 favoris avec leur logique.",
  vente: "Structure : promesse principale, problème, solution, bénéfices, preuves, offre, objections et réponses, garantie, appel à l'action.",
};

const PLATEFORMES = {
  instagram: "Codes d'Instagram : un visuel fort, une légende aérée, 5 à 10 hashtags ciblés.",
  tiktok: "Codes de TikTok : authentique, rythmé, face caméra ou en situation, sans jargon publicitaire.",
  linkedin: "Codes de LinkedIn : une première ligne forte, des paragraphes d'une ou deux phrases, un ton professionnel mais humain, très peu de hashtags.",
  facebook: "Codes de Facebook : ton conversationnel, question ouverte pour faire réagir.",
  youtube: "Codes de YouTube : titre et miniature pensés ensemble, promesse tenue dans les 30 premières secondes.",
  x: "Codes de X : phrases très courtes ; si c'est un fil, numérote les messages.",
};

export default {
  id: "contenu",
  nom: "Contenu & marketing",
  icon: "megaphone",
  couleur: "coral",
  description: "Posts, vidéos, newsletter, pubs, slogans : du contenu qui arrête le défilement et fait agir, sans racolage.",
  exemples: ["Des posts Instagram pour ma boulangerie", "Le script d'une vidéo TikTok pour présenter mon appli", "Une newsletter pour relancer mes anciens clients"],
  motsCles: [
    ["post$", 3], ["posts", 3], ["publication", 2], ["instagram", 4], ["insta$", 4], ["tiktok", 4], ["linkedin", 4], ["facebook", 3],
    ["youtube", 3], ["reseaux sociaux", 4], ["newsletter", 4], ["publicite", 4], ["pub$", 3], ["slogan", 4], ["marketing", 3],
    ["contenu", 2], ["campagne", 3], ["hashtag", 3], ["accroche", 2], ["reel", 3], ["article de blog", 4], ["blog", 2], ["seo", 3],
    ["page de vente", 4], ["landing page", 4], ["communication", 2],
  ],
  questions: [
    {
      id: "format",
      type: "choice",
      label: "Quel type de contenu ?",
      pourquoi: "Un post, un script vidéo et une page de vente n'ont ni la même structure ni la même longueur.",
      options: [
        { v: "post", label: "Une publication", match: ["post", "publication"] },
        { v: "serie", label: "Plusieurs publications (calendrier)", match: ["posts", "calendrier", "planning", "semaine", "mois"] },
        { v: "video", label: "Un script de vidéo courte", match: ["video", "reel", "tiktok", "short", "script"] },
        { v: "newsletter", label: "Une newsletter", match: ["newsletter"] },
        { v: "article", label: "Un article de blog", match: ["article", "blog", "seo"] },
        { v: "pub", label: "Une publicité", match: ["pub", "publicite", "ads", "sponsoris"] },
        { v: "slogan", label: "Un slogan ou une accroche", match: ["slogan", "accroche", "tagline"] },
        { v: "vente", label: "Une page de vente", match: ["page de vente", "landing"] },
      ],
    },
    {
      id: "plateforme",
      type: "choice",
      label: "Sur quelle plateforme ?",
      pourquoi: "Chaque réseau a ses codes : ce qui marche sur TikTok tombe à plat sur LinkedIn.",
      auto: true,
      when: (a) => ["post", "serie", "video", "pub"].includes(a.format),
      options: [
        { v: "instagram", label: "Instagram", keep: true, match: ["instagram", "insta"] },
        { v: "tiktok", label: "TikTok", keep: true, match: ["tiktok"] },
        { v: "linkedin", label: "LinkedIn", keep: true, match: ["linkedin"] },
        { v: "facebook", label: "Facebook", keep: true, match: ["facebook"] },
        { v: "youtube", label: "YouTube", keep: true, match: ["youtube"] },
        { v: "x", label: "X (Twitter)", keep: true, match: ["twitter"] },
      ],
    },
    {
      id: "emetteur",
      type: "text",
      label: "Qui publie ?",
      pourquoi: "Une marque, un indépendant et une association ne parlent pas avec la même voix.",
      suggestions: ["Moi, en tant que coach sportive", "Ma boulangerie de quartier", "Une agence de voyage en ligne", "Une association étudiante"],
    },
    {
      id: "cible",
      type: "text",
      label: "Pour qui ?",
      pourquoi: "Le contenu parle la langue de sa cible, avec ses mots et ses problèmes.",
      suggestions: ["Les habitants du quartier", "Les jeunes parents débordés", "Les dirigeants de PME", "Les étudiants"],
    },
    {
      id: "objectif",
      type: "choice",
      label: "Quel est l'objectif ?",
      pourquoi: "Faire connaître, faire réagir ou faire acheter : l'appel à l'action et l'angle en dépendent.",
      options: [
        { v: "notoriete", label: "Me faire connaître" },
        { v: "engagement", label: "Faire réagir ma communauté" },
        { v: "vente", label: "Vendre un produit ou un service" },
        { v: "trafic", label: "Amener des visiteurs sur un site" },
        { v: "recrutement", label: "Recruter" },
        { v: "fidelite", label: "Fidéliser mes clients" },
      ],
    },
    {
      id: "message",
      type: "long",
      label: "Le message principal, ou le sujet",
      pourquoi: "Un seul message par contenu : c'est ce qui le rend mémorable.",
      prefill: (idea) => idea,
      suggestions: ["Notre nouvelle recette de pain au levain", "3 erreurs que font les débutants en course à pied"],
    },
    {
      id: "ton",
      type: "multi",
      label: "Quel ton ?",
      pourquoi: "Le ton fait reconnaître une marque avant même de lire le nom.",
      options: [
        { v: "expert", label: "Expert" },
        { v: "decale", label: "Décalé, avec humour" },
        { v: "inspirant", label: "Inspirant" },
        { v: "direct", label: "Direct" },
        { v: "chaleureux", label: "Chaleureux" },
        { v: "premium", label: "Haut de gamme" },
      ],
    },
    {
      id: "cta",
      type: "text",
      label: "Quelle action attends-tu de ceux qui verront le contenu ?",
      pourquoi: "Sans action précise demandée, la plupart des gens ne font rien.",
      optional: true,
      suggestions: ["Réserver un appel", "Commenter", "S'abonner", "Passer en boutique ce week-end"],
    },
    {
      id: "inspiration",
      type: "long",
      label: "Un contenu que tu aimes ? (colle-le ou décris-le)",
      pourquoi: "Un exemple vaut mieux que dix adjectifs pour décrire le style voulu.",
      optional: true,
    },
  ],
  build(c) {
    const plateforme = PLATEFORMES[c.raw("plateforme")];
    return {
      role: "Tu es concepteur-rédacteur et stratège de contenu. Tu écris des contenus qui arrêtent le défilement et poussent à l'action, sans racolage.",
      sections: [
        sec(
          "Le brief",
          line("Type de contenu", c.l("format")),
          line("Plateforme", c.l("plateforme")),
          line("Qui publie", c.v("emetteur")),
          line("Cible", c.v("cible")),
          line("Objectif", c.l("objectif")),
          line("Message principal", c.v("message")),
          line("Ton", c.l("ton")),
          line("Action attendue", c.v("cta")),
        ),
        c.has("inspiration") ? sec("Un exemple que j'aime", c.v("inspiration"), "Inspire-toi de ce qui fonctionne dans cet exemple, sans le copier.") : null,
        sec(
          "Méthode",
          steps([
            "Identifie d'abord le problème, le désir ou la curiosité de la cible que ce contenu va toucher.",
            "Écris 5 accroches de natures différentes (question, chiffre, contre-pied, erreur fréquente, promesse) et garde la meilleure.",
            FORMATS[c.raw("format")],
            plateforme,
            "Termine par un seul appel à l'action, clair et facile à suivre.",
          ]),
        ),
        sec("Format de la réponse", "Le contenu complet, prêt à publier, avec une suggestion de visuel quand c'est utile."),
        sec(
          "Garde-fous",
          "- Aucun chiffre, avis client ou résultat inventé : s'il manque une preuve, écris [PREUVE À AJOUTER].",
          "- Pas de fausse urgence ni de promesse que l'offre ne tient pas.",
          "- Les limites de caractères et les formats changent selon les plateformes : signale ce qui est à vérifier.",
        ),
      ].filter(Boolean),
      relances: [
        "Écris 5 variantes de l'accroche pour un test A/B.",
        "Adapte ce contenu pour une autre plateforme : [plateforme].",
        "Transforme ce contenu en carrousel de 7 slides.",
      ],
    };
  },
};
