// Catalogue des outils — partagé entre le générateur de site et l'application.
const PDF = 'application/pdf,.pdf';
const IMAGES = 'image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.heic,.heif';

export const TOOLS = [
  {
    id: 'merge',
    slug: 'fusionner-pdf',
    name: 'Fusionner des PDF',
    short: 'Assemblez plusieurs PDF et images en un seul document, dans l’ordre voulu.',
    accept: `${PDF},${IMAGES}`,
    multiple: true,
    icon: '<path d="M8 3h6l4 4v6"/><path d="M14 3v4h4"/><path d="M4 9h6l4 4v8H4z"/><path d="M10 9v4h4"/>',
  },
  {
    id: 'organize',
    slug: 'organiser-pdf',
    name: 'Organiser les pages',
    short: 'Réordonnez, pivotez, supprimez ou extrayez des pages en un clin d’œil.',
    accept: PDF,
    multiple: false,
    icon: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/>',
  },
  {
    id: 'split',
    slug: 'diviser-pdf',
    name: 'Diviser un PDF',
    short: 'Séparez un PDF par plages de pages, toutes les N pages ou page par page.',
    accept: PDF,
    multiple: false,
    icon: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9"/><path d="M14.5 14.5 20 20"/><path d="M8.1 8.1 12 12"/>',
  },
  {
    id: 'images-to-pdf',
    slug: 'images-en-pdf',
    name: 'Images en PDF',
    short: 'Transformez vos photos et scans (JPG, PNG, WebP, HEIC…) en un PDF propre.',
    accept: IMAGES,
    multiple: true,
    icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  },
  {
    id: 'compress',
    slug: 'compresser-pdf',
    name: 'Compresser un PDF',
    short: 'Réduisez le poids de vos PDF pour les envoyer par e-mail ou les déposer en ligne.',
    accept: PDF,
    multiple: true,
    icon: '<path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="m14 10 7-7"/><path d="m3 21 7-7"/>',
  },
  {
    id: 'pdf-to-images',
    slug: 'pdf-en-images',
    name: 'PDF en images',
    short: 'Exportez chaque page en PNG ou JPG haute définition.',
    accept: PDF,
    multiple: true,
    icon: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><circle cx="10" cy="13" r="1.5"/><path d="m20 17-3-3-6 6"/>',
  },
  {
    id: 'sign',
    slug: 'signer-pdf',
    name: 'Signer et remplir',
    short: 'Ajoutez votre signature, la date et du texte sur n’importe quel PDF.',
    accept: PDF,
    multiple: false,
    icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  },
  {
    id: 'watermark',
    slug: 'filigrane-pdf',
    name: 'Ajouter un filigrane',
    short: 'Protégez vos documents avec un texte « Confidentiel », « Copie »…',
    accept: PDF,
    multiple: true,
    icon: '<path d="M12 2.7c-3.3 4.3-6 7.6-6 11.3a6 6 0 0 0 12 0c0-3.7-2.7-7-6-11.3z"/>',
  },
  {
    id: 'page-numbers',
    slug: 'numeroter-pdf',
    name: 'Numéroter les pages',
    short: 'Ajoutez des numéros de page, avec position et format personnalisables.',
    accept: PDF,
    multiple: true,
    icon: '<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/>',
  },
];

export const toolById = (id) => TOOLS.find((t) => t.id === id);

export const iconSvg = (tool, size = 24) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${tool.icon}</svg>`;
