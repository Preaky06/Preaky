// Textes éditoriaux : domaines, techniques, défis « vraie vie », science.

export const DOMAINS = {
  concentration: { id: 'concentration', name: 'Concentration', blurb: 'Rester sur la cible malgré les distractions.' },
  memoire: { id: 'memoire', name: 'Mémoire', blurb: 'Garder des informations en tête quelques secondes.' },
  logique: { id: 'logique', name: 'Logique', blurb: 'Trouver la règle, déduire, comparer.' },
};

// Ordre d'une séance : on s'échauffe sur l'attention, on finit par la réflexion.
export const DOMAIN_ORDER = ['concentration', 'memoire', 'logique'];

// Techniques générales, débloquées au fil des séances.
export const EXTRA_TECHNIQUES = [
  {
    id: 'loci', unlock: 1, title: 'Le palais mental',
    text: 'Pour retenir une liste, imagine chaque élément posé dans une pièce de chez toi, dans l’ordre de ta visite. Pour t’en souvenir, refais la visite dans ta tête.',
    life: 'Liste de courses, étapes d’une recette, points d’un discours.',
  },
  {
    id: 'rappel', unlock: 3, title: 'Le rappel actif',
    text: 'Pour apprendre, cache la réponse et essaie de la retrouver de tête. Se tester fixe mieux l’information que relire.',
    life: 'Réviser un cours, apprendre un itinéraire, un texte, un code.',
  },
  {
    id: 'prenom', unlock: 5, title: 'Retenir un prénom',
    text: 'Répète-le tout de suite (« Enchanté, Claire »), associe-le à une image (Claire → une lampe claire) et réutilise-le avant de partir.',
    life: 'Nouveaux voisins, collègues, amis de tes enfants.',
  },
  {
    id: 'espace', unlock: 7, title: 'Espacer les révisions',
    text: 'Revoir une information le lendemain, puis trois jours après, puis une semaine après marche bien mieux que tout revoir d’un coup.',
    life: 'Langues, poèmes, mots de passe à connaître par cœur.',
  },
];

export const DEFIS = [
  { title: 'Palais mental', text: 'Ce soir, retiens 5 courses en les posant dans les pièces de chez toi. Vérifie demain matin.' },
  { title: 'Paquets de chiffres', text: 'Apprends le numéro d’un proche par paquets de deux chiffres. Teste-toi dans une heure.' },
  { title: 'Rappel du soir', text: 'Avant de dormir, retrouve 3 détails précis de ta journée : une couleur, une phrase, un visage.' },
  { title: 'Une chose à la fois', text: 'Fais 20 minutes d’une seule tâche, téléphone face cachée. Note ce qui t’a déconcentré.' },
  { title: 'Bouge', text: 'Marche 15 minutes d’un bon pas. L’activité physique fait partie des habitudes les mieux étudiées pour le cerveau.' },
  { title: 'Apprends un truc', text: 'Apprends 5 mots d’une langue que tu ne parles pas, puis redis-les à quelqu’un ce soir.' },
  { title: 'Explique', text: 'Explique à quelqu’un une astuce vue aujourd’hui. Enseigner aide à retenir.' },
];

export const SCIENCE = [
  { t: 'Tu progresses surtout sur ce que tu pratiques.', d: 'Les études montrent que l’entraînement améliore nettement les jeux entraînés, mais se transfère peu à « l’intelligence » en général.' },
  { t: 'Les techniques, elles, se transfèrent.', d: 'Regrouper, balayer, se faire une image mentale : tu peux les utiliser exprès dans la vraie vie. C’est pour ça que chaque jeu t’en apprend une.' },
  { t: 'Le reste compte beaucoup.', d: 'Bouger, bien dormir, voir du monde et apprendre des choses nouvelles soutiennent le cerveau plus que n’importe quelle appli.' },
  { t: 'Court et régulier.', d: 'Cinq minutes plusieurs fois par semaine valent mieux qu’une heure de temps en temps.' },
];
