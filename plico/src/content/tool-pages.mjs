// Contenu éditorial (SEO) de chaque page outil.
const PRIVACY_FAQ = {
  q: 'Mes fichiers sont-ils envoyés sur un serveur ?',
  a: 'Non. Le traitement est réalisé entièrement dans votre navigateur, sur votre appareil. Aucun fichier n’est téléversé : vous pouvez même couper votre connexion Internet une fois la page chargée.',
};

export const TOOL_PAGES = {
  merge: {
    title: 'Fusionner des PDF en ligne, sans envoi de fichiers',
    description: 'Fusionnez plusieurs PDF et images en un seul document, directement dans votre navigateur. Gratuit, rapide et confidentiel : aucun fichier n’est téléversé.',
    h1: 'Fusionner des PDF',
    lead: 'Combinez plusieurs PDF et images en un seul fichier. Glissez, réordonnez, fusionnez : c’est tout.',
    steps: ['Ajoutez vos PDF (et images si besoin).', 'Glissez les fichiers pour choisir l’ordre.', 'Cliquez sur « Fusionner » et téléchargez le résultat.'],
    faqs: [
      PRIVACY_FAQ,
      { q: 'Puis-je mélanger PDF et images ?', a: 'Oui. Les images JPG, PNG, WebP ou HEIC sont converties en pages et insérées à l’endroit voulu.' },
      { q: 'Combien de fichiers puis-je fusionner ?', a: 'Jusqu’à 3 fichiers à la fois en version gratuite, et sans limite pratique avec Pro ou Business.' },
      { q: 'La qualité est-elle conservée ?', a: 'Oui. Les pages sont copiées telles quelles, sans recompression : texte, liens et images restent identiques.' },
    ],
  },
  organize: {
    title: 'Organiser les pages d’un PDF : réordonner, pivoter, supprimer',
    description: 'Réorganisez les pages de votre PDF : déplacez, pivotez, supprimez ou extrayez des pages, sans logiciel et sans envoi de fichier.',
    h1: 'Organiser les pages d’un PDF',
    lead: 'Visualisez toutes les pages, déplacez-les, pivotez-les, supprimez celles qui ne servent à rien.',
    steps: ['Ouvrez votre PDF.', 'Glissez les pages, pivotez-les ou supprimez-les.', 'Enregistrez le nouveau PDF ou extrayez la sélection.'],
    faqs: [
      PRIVACY_FAQ,
      { q: 'Puis-je extraire seulement quelques pages ?', a: 'Oui : cochez les pages voulues puis cliquez sur « Extraire la sélection ».' },
      { q: 'La rotation abîme-t-elle la qualité ?', a: 'Non. La rotation est une simple instruction d’affichage : le contenu n’est pas recompressé.' },
    ],
  },
  split: {
    title: 'Diviser un PDF en plusieurs fichiers, gratuitement',
    description: 'Séparez un PDF par plages de pages, toutes les N pages ou page par page. Traitement local et instantané, sans téléversement.',
    h1: 'Diviser un PDF',
    lead: 'Découpez un PDF en plusieurs fichiers, exactement comme vous le voulez.',
    steps: ['Ouvrez votre PDF.', 'Choisissez le mode : plages, toutes les N pages ou page par page.', 'Téléchargez les fichiers (regroupés dans un ZIP).'],
    faqs: [
      PRIVACY_FAQ,
      { q: 'Comment écrire des plages de pages ?', a: 'Séparez-les par des virgules : « 1-3, 4-6, 9 » crée trois fichiers. « 5- » va de la page 5 jusqu’à la fin.' },
      { q: 'Je veux un seul fichier avec certaines pages.', a: 'Utilisez le mode « Extraire des pages » : toutes les pages indiquées sont réunies dans un seul PDF.' },
    ],
  },
  'images-to-pdf': {
    title: 'Convertir des images en PDF (JPG, PNG, HEIC) sans envoi',
    description: 'Convertissez vos photos, captures et scans JPG, PNG, WebP ou HEIC en un PDF propre, au format A4 ou Lettre, sans rien téléverser.',
    h1: 'Images en PDF',
    lead: 'Transformez vos photos et scans en un PDF net, prêt à envoyer.',
    steps: ['Ajoutez vos images.', 'Réglez le format, l’orientation et les marges.', 'Créez le PDF et téléchargez-le.'],
    faqs: [
      PRIVACY_FAQ,
      { q: 'Les photos de téléphone sont-elles bien orientées ?', a: 'Oui. L’orientation enregistrée par l’appareil photo (EXIF) est appliquée automatiquement.' },
      { q: 'Quels formats sont acceptés ?', a: 'JPG et PNG partout ; WebP, GIF, BMP et AVIF selon votre navigateur ; HEIC sur Safari.' },
    ],
  },
  compress: {
    title: 'Compresser un PDF : réduire la taille sans envoyer le fichier',
    description: 'Réduisez le poids de vos PDF pour l’e-mail ou les formulaires en ligne. Compression locale, confidentielle, avec aperçu du gain.',
    h1: 'Compresser un PDF',
    lead: 'Allégez vos PDF pour les envoyer par e-mail ou respecter une taille maximale.',
    steps: ['Ouvrez votre PDF.', 'Choisissez le niveau de compression.', 'Comparez le gain et téléchargez.'],
    faqs: [
      PRIVACY_FAQ,
      { q: 'Quelle différence entre les niveaux ?', a: '« Sans perte » réorganise le fichier sans toucher au contenu. Les niveaux « Équilibré » et « Fort » convertissent chaque page en image optimisée : idéal pour les scans, mais le texte n’est plus sélectionnable.' },
      { q: 'Et si le fichier ne rétrécit pas ?', a: 'Le gain est affiché avant téléchargement. Si la compression n’apporte rien, vous êtes prévenu et gardez l’original.' },
    ],
  },
  'pdf-to-images': {
    title: 'Convertir un PDF en images PNG ou JPG haute qualité',
    description: 'Exportez les pages de vos PDF en PNG ou JPG jusqu’à 300 DPI, directement dans votre navigateur, sans téléversement.',
    h1: 'PDF en images',
    lead: 'Exportez chaque page en image nette, pour une présentation, un réseau social ou un site.',
    steps: ['Ouvrez votre PDF.', 'Choisissez le format (PNG/JPG), la résolution et les pages.', 'Téléchargez les images (en ZIP s’il y en a plusieurs).'],
    faqs: [
      PRIVACY_FAQ,
      { q: 'Quelle résolution choisir ?', a: '150 DPI pour l’écran, 300 DPI pour l’impression.' },
      { q: 'Puis-je n’exporter que certaines pages ?', a: 'Oui, indiquez par exemple « 1, 3-5 ».' },
    ],
  },
  sign: {
    title: 'Signer un PDF en ligne gratuitement, sans téléversement',
    description: 'Dessinez ou tapez votre signature, ajoutez la date et du texte sur votre PDF. Tout se passe sur votre appareil.',
    h1: 'Signer et remplir un PDF',
    lead: 'Signez un contrat, remplissez un formulaire, datez un document : en quelques clics.',
    steps: ['Ouvrez votre PDF.', 'Créez votre signature (dessin, texte ou image) puis placez-la.', 'Ajoutez date et texte, puis téléchargez.'],
    faqs: [
      PRIVACY_FAQ,
      { q: 'Cette signature a-t-elle une valeur légale ?', a: 'Il s’agit d’une signature électronique « simple », suffisante pour de nombreux documents du quotidien (devis, bons de commande, attestations). Pour les actes exigeant une signature qualifiée, un prestataire certifié reste nécessaire.' },
      { q: 'Ma signature est-elle conservée ?', a: 'Elle reste uniquement dans ce navigateur si vous choisissez de la mémoriser. Elle n’est jamais envoyée.' },
    ],
  },
  watermark: {
    title: 'Ajouter un filigrane à un PDF (Confidentiel, Copie…)',
    description: 'Ajoutez un filigrane texte à toutes les pages d’un PDF : position, taille, couleur, opacité et angle réglables. Traitement local.',
    h1: 'Ajouter un filigrane',
    lead: 'Marquez vos documents « Confidentiel », « Brouillon » ou avec votre nom.',
    steps: ['Ouvrez votre PDF.', 'Saisissez le texte et réglez son apparence (aperçu en direct).', 'Appliquez et téléchargez.'],
    faqs: [
      PRIVACY_FAQ,
      { q: 'Le filigrane peut-il être répété sur la page ?', a: 'Oui, choisissez le mode « Mosaïque » pour couvrir toute la page.' },
      { q: 'Puis-je traiter plusieurs PDF d’un coup ?', a: 'Oui avec le plan Business : déposez plusieurs fichiers, vous récupérez un ZIP.' },
    ],
  },
  'page-numbers': {
    title: 'Numéroter les pages d’un PDF en ligne',
    description: 'Ajoutez des numéros de page à votre PDF : position, format « Page 1 sur 10 », taille et première page personnalisables. Sans téléversement.',
    h1: 'Numéroter les pages d’un PDF',
    lead: 'Ajoutez une pagination propre à vos rapports, mémoires et dossiers.',
    steps: ['Ouvrez votre PDF.', 'Choisissez la position, le format et le numéro de départ.', 'Appliquez et téléchargez.'],
    faqs: [
      PRIVACY_FAQ,
      { q: 'Puis-je ne pas numéroter la page de garde ?', a: 'Oui, cochez « Ignorer la première page ».' },
      { q: 'Les pages en paysage sont-elles gérées ?', a: 'Oui, la position est calculée selon l’orientation visible de chaque page.' },
    ],
  },
};
