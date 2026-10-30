import { sec, line, steps } from "../../lib/kit.js";

export default {
  id: "histoire",
  nom: "Écrire une histoire",
  icon: "book",
  couleur: "coral",
  description: "Nouvelle, conte, scénario, roman : une histoire construite, avec un vrai personnage et une vraie fin.",
  exemples: ["Un conte pour endormir ma fille de 5 ans", "Une nouvelle policière dans un lycée", "Le scénario d'un court-métrage sur la solitude"],
  motsCles: [
    ["histoire", 2], ["ecrire une histoire", 4], ["invente une histoire", 4], ["raconte", 3], ["conte", 4], ["nouvelle$", 3],
    ["roman", 4], ["recit", 3], ["scenario", 3], ["personnage", 2], ["fiction", 3], ["fantasy", 3], ["science fiction", 3],
    ["policier", 2], ["intrigue", 3], ["chapitre", 2], ["fable", 3], ["endormir", 2], ["bd$", 2], ["manga", 1],
  ],
  questions: [
    {
      id: "format",
      type: "choice",
      label: "Quel format d'histoire ?",
      pourquoi: "Une nouvelle, un conte et un scénario ne se construisent pas du tout de la même façon.",
      options: [
        { v: "nouvelle", label: "Nouvelle courte", match: ["nouvelle"] },
        { v: "conte", label: "Conte pour enfants", match: ["conte", "enfant", "fille", "fils", "endormir", "dormir"] },
        { v: "episodes", label: "Histoire à épisodes", match: ["episode", "serie", "feuilleton"] },
        { v: "scenario", label: "Scénario (court-métrage, vidéo)", match: ["scenario", "court metrage", "film", "video"] },
        { v: "roman", label: "Début de roman", match: ["roman", "chapitre"] },
        { v: "interactive", label: "Histoire dont je choisis la suite", match: ["interactive", "dont tu es le heros", "choix"] },
      ],
    },
    {
      id: "public",
      type: "choice",
      label: "Pour quel public ?",
      pourquoi: "Le vocabulaire, la longueur des phrases et ce qu'on peut raconter en dépendent.",
      options: [
        { v: "petits", label: "Jeunes enfants (3 à 6 ans)", match: ["3 ans", "4 ans", "5 ans", "6 ans", "maternelle", "endormir"] },
        { v: "enfants", label: "Enfants (7 à 12 ans)", match: ["7 ans", "8 ans", "9 ans", "10 ans", "11 ans", "12 ans"] },
        { v: "ados", label: "Adolescents", match: ["ado", "lycee", "college"] },
        { v: "adultes", label: "Adultes" },
        { v: "tous", label: "Tout public" },
      ],
    },
    {
      id: "genre",
      type: "choice",
      label: "Quel genre ?",
      pourquoi: "Chaque genre a ses codes : ce que le lecteur attend, ce qui le surprend.",
      auto: true,
      options: [
        { v: "aventure", label: "Aventure", match: ["aventure", "pirate", "tresor", "voyage"] },
        { v: "fantasy", label: "Fantasy, merveilleux", match: ["fantasy", "dragon", "magie", "sorcier", "fee", "licorne"] },
        { v: "sf", label: "Science-fiction", match: ["science fiction", "espace", "robot", "futur", "planete"] },
        { v: "policier", label: "Policier, thriller", match: ["policier", "enquete", "meurtre", "detective", "thriller", "crime"] },
        { v: "romance", label: "Romance", match: ["amour", "romance", "romantique"] },
        { v: "comedie", label: "Comédie", match: ["drole", "comedie", "humour", "rigolo"] },
        { v: "horreur", label: "Horreur, fantastique", match: ["horreur", "peur", "fantome", "zombie"] },
        { v: "realiste", label: "Drame, réaliste", match: ["drame", "realiste", "solitude"] },
      ],
    },
    {
      id: "heros",
      type: "long",
      label: "Le personnage principal : qui est-il, que veut-il, qu'est-ce qui l'en empêche ?",
      pourquoi: "Un personnage qui veut quelque chose et un obstacle sur sa route : c'est le moteur de toute histoire.",
      auto: true,
      suggestions: ["Une petite fille qui veut retrouver son chat, mais elle a peur du noir", "Un détective à la retraite qui reprend une dernière enquête", "Une stagiaire qui découvre un secret dans son entreprise"],
    },
    {
      id: "univers",
      type: "text",
      label: "Où et quand se passe l'histoire ?",
      pourquoi: "Un décor précis rend l'histoire crédible et donne des idées de scènes.",
      auto: true,
      suggestions: ["Dans une forêt enchantée", "À Marseille, de nos jours", "Sur une station spatiale en 2300", "Dans un village de montagne en hiver"],
    },
    {
      id: "ton",
      type: "multi",
      label: "Quel ton ?",
      pourquoi: "Le même récit peut faire rire, frissonner ou émouvoir.",
      options: [
        { v: "drole", label: "Drôle" },
        { v: "emouvant", label: "Émouvant" },
        { v: "haletant", label: "Haletant" },
        { v: "poetique", label: "Poétique" },
        { v: "sombre", label: "Sombre" },
        { v: "rassurant", label: "Doux et rassurant" },
      ],
    },
    {
      id: "longueur",
      type: "choice",
      label: "Quelle longueur ?",
      pourquoi: "Sans consigne, l'IA écrit trop court et bâcle la fin.",
      options: [
        { v: "courte", label: "Courte (environ 400 mots, 3 minutes de lecture)" },
        { v: "moyenne", label: "Moyenne (environ 1 200 mots)" },
        { v: "longue", label: "Longue (environ 3 000 mots)" },
        { v: "plan", label: "Le plan complet et le premier chapitre" },
      ],
    },
    {
      id: "narration",
      type: "choice",
      label: "Qui raconte ?",
      pourquoi: "Le point de vue change la proximité avec le personnage.",
      auto: true,
      options: [
        { v: "je", label: "Le personnage lui-même (« je »)" },
        { v: "il", label: "Un narrateur extérieur (« il », « elle »)" },
      ],
    },
    {
      id: "elements",
      type: "long",
      label: "Des éléments à inclure absolument ?",
      pourquoi: "Un prénom, un objet, une morale : c'est ce qui rend l'histoire vraiment à toi.",
      optional: true,
      suggestions: ["Le prénom de ma fille : Lina", "Une morale sur le partage", "Une fin heureuse", "Un chat qui parle"],
    },
    {
      id: "inspiration",
      type: "text",
      label: "Un auteur ou une œuvre dont le style t'inspire ?",
      pourquoi: "Ça donne une direction de style. L'IA s'en inspire sans rien copier.",
      optional: true,
      suggestions: ["Roald Dahl", "Agatha Christie", "Le Petit Prince", "Les films de Pixar"],
    },
  ],
  build(c) {
    const jeunes = c.is("public", "petits") || c.is("public", "enfants");
    const structure = c.is("public", "petits")
      ? "Structure simple : une situation de départ, un problème, trois tentatives (la règle de trois), une résolution rassurante."
      : "Structure en 5 temps : situation initiale, élément déclencheur, péripéties qui font monter la tension, point culminant, résolution.";
    const format = {
      scenario: "Utilise le format scénario : en-têtes de scène (INT. ou EXT., lieu, moment), descriptions courtes au présent, dialogues centrés sous le nom du personnage.",
      episodes: "Écris le premier épisode en entier, termine-le sur une fin à suspense, puis donne le plan des 4 épisodes suivants.",
      interactive: "Écris l'histoire par étapes : à la fin de chaque étape, propose-moi 2 ou 3 choix et attends ma réponse avant de continuer.",
      roman: "Commence par le plan général (personnages, ce qu'ils veulent, grandes parties), puis écris le premier chapitre en entier.",
    }[c.raw("format")];

    return {
      role: `Tu es un auteur expérimenté${jeunes ? ", spécialiste de la littérature jeunesse" : ""}${c.is("format", "scenario") ? " et scénariste" : ""}. Tu écris des histoires originales, bien construites et vivantes.`,
      sections: [
        sec(
          "Le cadre",
          line("Format", c.l("format")),
          line("Public", c.l("public")),
          line("Genre", c.l("genre")),
          line("Personnage principal", c.v("heros")),
          line("Lieu et époque", c.v("univers")),
          line("Ton", c.l("ton")),
          line("Narration", c.l("narration")),
          line("Longueur", c.l("longueur")),
          line("À inclure absolument", c.v("elements")),
          c.has("inspiration") ? `- Inspiration de style : ${c.v("inspiration")} (inspire-toi du style, sans reprendre personnages, phrases ni intrigue)` : null,
        ),
        sec(
          "Construction",
          steps([
            "Avant d'écrire, fixe pour toi ce que veut le personnage, ce qui l'en empêche, et ce qu'il aura appris ou changé à la fin.",
            structure,
            "Montre plutôt que d'expliquer : des actions, des dialogues et des détails sensoriels plutôt que des émotions nommées.",
            "Chaque scène doit faire avancer l'intrigue ou révéler le personnage. Supprime le reste.",
            "Garde la même narration (temps, point de vue) du début à la fin.",
            format,
            jeunes && "Vocabulaire adapté à l'âge, phrases courtes, répétitions et sonorités agréables à lire à voix haute. Rien d'effrayant ni de violent.",
          ]),
        ),
        sec("Format de la réponse", "Un titre, puis l'histoire complète. Après l'histoire, propose 3 autres titres possibles et une idée de suite."),
        sec(
          "À éviter",
          "- Les clichés : la fin « tout ça n'était qu'un rêve », les méchants sans motivation, les morales assénées.",
          "- Les fins expédiées en deux phrases et les dialogues qui expliquent l'intrigue au lecteur.",
          "- Tout personnage ou univers protégé par le droit d'auteur.",
        ),
      ],
      relances: [
        "Réécris la fin pour qu'elle soit plus surprenante, sans changer le reste.",
        "Rends les dialogues plus naturels et plus vivants.",
        "Fais une version plus courte, pour une lecture à voix haute de 3 minutes.",
      ],
    };
  },
};
