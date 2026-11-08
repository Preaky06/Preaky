// Recommandations associées à chaque constat de l'audit de site (partagé client/serveur).
// Chaque texte décrit un constat vérifiable et une action concrète, sans promesse chiffrée.
export interface Remedy {
  title: string;
  why: string;
  how: string;
  impact: 'fort' | 'moyen' | 'faible';
}

export const REMEDIES: Record<string, Remedy> = {
  no_https: { title: 'Sécuriser le site (HTTPS)', why: 'Les navigateurs affichent « Non sécurisé » sur les pages en HTTP, ce qui dissuade les visiteurs de remplir un formulaire.', how: 'Activer un certificat TLS (gratuit chez la plupart des hébergeurs) et rediriger toutes les adresses http:// vers https://.', impact: 'fort' },
  no_viewport: { title: 'Adapter le site au mobile', why: 'Sans balise d’adaptation, la page s’affiche en miniature sur téléphone, où se fait aujourd’hui une grande partie des visites.', how: 'Ajouter <meta name="viewport" content="width=device-width, initial-scale=1"> et vérifier la mise en page sur un téléphone.', impact: 'fort' },
  slow: { title: 'Accélérer la page d’accueil', why: 'Une page lente fait partir des visiteurs avant même l’affichage.', how: 'Compresser les images, activer la mise en cache, limiter les scripts tiers ; mesurer avec PageSpeed Insights.', impact: 'moyen' },
  no_title: { title: 'Rédiger un titre de page', why: 'Le titre est la ligne cliquable affichée par Google : absent ou trop court, il ne donne pas envie de cliquer.', how: 'Écrire un titre de 50 à 60 caractères : activité + ville + nom.', impact: 'moyen' },
  no_description: { title: 'Ajouter une meta description', why: 'Sans description, Google choisit un extrait au hasard sous le titre.', how: 'Rédiger 140 à 160 caractères qui résument l’offre et incitent au clic.', impact: 'moyen' },
  no_h1: { title: 'Ajouter un titre principal (H1)', why: 'Le H1 indique aux moteurs et aux visiteurs le sujet de la page.', how: 'Placer un seul H1 clair en haut de la page d’accueil.', impact: 'faible' },
  no_og: { title: 'Configurer l’aperçu de partage', why: 'Partagé sur LinkedIn, Facebook ou WhatsApp, le lien s’affiche sans image ni titre soigné.', how: 'Ajouter les balises Open Graph (og:title, og:description, og:image).', impact: 'faible' },
  old_copyright: { title: 'Mettre le site à jour', why: 'Une mention de copyright ancienne donne l’impression d’un site abandonné.', how: 'Actualiser le pied de page et les informations pratiques (horaires, offres, contact).', impact: 'moyen' },
  stale_content: { title: 'Publier du contenu récent', why: 'Un site sans nouveauté depuis plus d’un an envoie un signal d’inactivité aux visiteurs comme aux moteurs.', how: 'Publier régulièrement : actualités, réalisations, offres du moment.', impact: 'moyen' },
  no_socials: { title: 'Relier les réseaux sociaux', why: 'Les visiteurs cherchent des preuves d’activité ; aucun lien vers les réseaux n’est présent sur l’accueil.', how: 'Ajouter des liens vers les comptes actifs (Instagram, LinkedIn, Facebook…) dans l’en-tête ou le pied de page.', impact: 'faible' },
  no_instagram: { title: 'Relier un compte Instagram', why: 'Dans ce secteur, Instagram sert souvent de vitrine visuelle.', how: 'Créer ou relier le compte depuis le site et y publier régulièrement.', impact: 'faible' },
  no_analytics: { title: 'Mesurer l’audience', why: 'Sans mesure, impossible de savoir d’où viennent les visiteurs et ce qu’ils font.', how: 'Installer un outil de mesure respectueux de la vie privée (exempté de consentement si correctement configuré).', impact: 'faible' },
  no_structured: { title: 'Ajouter des données structurées', why: 'Elles aident Google à afficher les informations de l’entreprise (adresse, horaires, avis).', how: 'Ajouter un bloc JSON-LD « LocalBusiness » ou « Organization ».', impact: 'faible' },
  basic_builder: { title: 'Envisager un site plus évolutif', why: 'Les outils grand public limitent souvent le référencement et la personnalisation.', how: 'Évaluer une refonte si le site devient un canal d’acquisition important.', impact: 'faible' },
  no_booking: { title: 'Proposer la réservation en ligne', why: 'Dans ce secteur, les clients s’attendent à réserver ou prendre rendez-vous sans appeler.', how: 'Intégrer un module de réservation ou de prise de rendez-vous sur l’accueil.', impact: 'moyen' },
};

export const remedyFor = (id: string): Remedy => REMEDIES[id] || { title: 'Point à améliorer', why: '', how: '', impact: 'faible' };
