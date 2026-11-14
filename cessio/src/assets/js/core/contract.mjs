// Génération du contrat de cession de droits d'auteur (droit français).
// Le document est produit sous forme de blocs neutres, rendus ensuite en HTML, PDF et Word.
//
// Exigences légales couvertes :
//  - L111-1 CPI : la commande n'emporte pas cession → contrat écrit distinct.
//  - L131-1 : pas de cession globale d'œuvres futures → œuvres listées limitativement.
//  - L131-2 : contrat constaté par écrit.
//  - L131-3 : mention distincte de chaque droit cédé + domaine d'exploitation délimité
//             (étendue, destination, lieu, durée).
//  - L131-4 : rémunération proportionnelle de principe ; forfait motivé par un cas légal.
//  - L131-6 : modes d'exploitation non prévisibles → clause expresse + participation corrélative.
//  - L132-31 : œuvre de commande publicitaire → rémunération distincte par mode d'exploitation.
//  - L121-1 : droit moral inaliénable, non cédé.
import { computePrice, modeById, TERRITORIES, DURATIONS, WORK_TYPES } from './pricing.mjs';
import { euro, percent, dateShort, endDate } from './format.mjs';

export const FORFAIT_REASONS = {
  base: 'la base de calcul de la participation proportionnelle ne pouvant être pratiquement déterminée, les œuvres étant destinées à des supports qui ne sont pas vendus en tant que tels',
  accessoire: 'l’utilisation des œuvres ne présentant qu’un caractère accessoire par rapport à l’objet exploité par le Cessionnaire',
  controle: 'les moyens de contrôler l’application de la participation proportionnelle faisant défaut',
  logiciel: 's’agissant d’une cession de droits portant sur un logiciel',
};

export const RIGHTS = {
  reproduction: { label: 'Reproduction', required: false },
  representation: { label: 'Représentation', required: false },
  adaptation: { label: 'Adaptation' },
  translation: { label: 'Traduction' },
  trademark: { label: 'Dépôt à titre de marque' },
  transfer: { label: 'Cession à des tiers' },
};

export function newContract(profile = {}) {
  const today = new Date();
  const iso = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12)).toISOString().slice(0, 10);
  return {
    id: globalThis.crypto?.randomUUID ? crypto.randomUUID() : `c${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
    number: '',
    status: 'brouillon',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    author: { name: '', status: '', siret: '', address: '', email: '', vatFranchise: false, ...profile },
    client: { kind: 'pro', name: '', form: '', siret: '', address: '', representative: '', email: '' },
    works: [{ title: '', type: 'logo', description: '' }],
    rights: { reproduction: true, representation: true, adaptation: true, translation: false, trademark: false, transfer: false },
    modes: { web: { enabled: true, type: 'forfait', override: null, rate: null, detail: '' }, social: { enabled: true, type: 'forfait', override: null, rate: null, detail: '' } },
    destination: 'la promotion et l’identification de l’activité du Cessionnaire, telle qu’exercée à la date du présent contrat',
    territory: 'france',
    duration: '5',
    startDate: iso,
    exclusive: true,
    creationFee: 0,
    quoteRef: '',
    forfaitReason: 'base',
    proportional: { period: 'trimestre', minimum: 0 },
    credit: 'none',
    creditText: '',
    portfolio: true,
    sources: 'non',
    sourcesPrice: 0,
    paymentTerms: '30',
    retention: true,
    thirdParty: '',
    place: '',
    signDate: iso,
    percentages: {},
  };
}

export const contractEnd = (c) => (c.duration === 'legal' ? null : endDate(c.startDate, DURATIONS[c.duration]?.years));
// Les pourcentages sont figés dans le contrat à sa création : un changement ultérieur des réglages
// ne modifie jamais le prix d'un contrat déjà établi.
export const priceOf = (c, percentages) =>
  computePrice({ creationFee: c.creationFee, modes: c.modes, territory: c.territory, duration: c.duration, exclusive: c.exclusive, percentages: percentages || c.percentages });

const filled = (s) => typeof s === 'string' && s.trim().length > 0;

/** Contrôles bloquants, regroupés par étape de l'assistant. */
export function validate(c) {
  const errors = [];
  const err = (step, field, message) => errors.push({ step, field, message });
  if (!filled(c.author.name)) err(1, 'author.name', 'Indiquez le nom de l’auteur.');
  if (!filled(c.author.address)) err(1, 'author.address', 'Indiquez l’adresse de l’auteur.');
  if (!filled(c.client.name)) err(1, 'client.name', 'Indiquez le nom du client (cessionnaire).');
  if (!filled(c.client.address)) err(1, 'client.address', 'Indiquez l’adresse du client.');
  if (!c.works.length || c.works.some((w) => !filled(w.title))) err(2, 'works', 'Donnez un titre à chaque œuvre cédée.');
  if (!c.rights.reproduction && !c.rights.representation) err(3, 'rights', 'Cédez au moins le droit de reproduction ou de représentation.');
  const modes = Object.entries(c.modes).filter(([, m]) => m.enabled);
  if (!modes.length) err(3, 'modes', 'Choisissez au moins un mode d’exploitation : une cession sans domaine d’exploitation délimité est nulle (art. L131-3 CPI).');
  if (!TERRITORIES[c.territory]) err(3, 'territory', 'Choisissez un territoire.');
  if (!DURATIONS[c.duration]) err(3, 'duration', 'Choisissez une durée.');
  if (!c.startDate) err(3, 'startDate', 'Indiquez la date de début de la cession.');
  for (const [id, m] of modes) {
    if (m.type === 'proportionnel' && !(Number(m.rate) > 0)) err(4, `modes.${id}`, `Indiquez le pourcentage des recettes pour « ${modeById(id)?.label} ».`);
  }
  return errors;
}

// ── Construction du document ────────────────────────────────────────────────
// Blocs : { t: 'title'|'subtitle'|'h'|'p'|'li'|'small'|'table'|'sign'|'space', text, rows, head }

function partyAuthor(a) {
  const bits = [a.name];
  if (filled(a.status)) bits.push(a.status);
  if (filled(a.siret)) bits.push(`SIRET ${a.siret}`);
  bits.push(`domicilié(e) professionnellement ${a.address}`);
  if (filled(a.email)) bits.push(a.email);
  return `${bits.join(', ')}, ci-après « l’Auteur »,`;
}

function partyClient(cl) {
  if (cl.kind === 'particulier') {
    return `${cl.name}, demeurant ${cl.address}${filled(cl.email) ? `, ${cl.email}` : ''}, ci-après « le Cessionnaire ».`;
  }
  const bits = [cl.name];
  if (filled(cl.form)) bits.push(cl.form);
  if (filled(cl.siret)) bits.push(`SIRET ${cl.siret}`);
  bits.push(`dont le siège est situé ${cl.address}`);
  if (filled(cl.representative)) bits.push(`représenté(e) par ${cl.representative}`);
  if (filled(cl.email)) bits.push(cl.email);
  return `${bits.join(', ')}, ci-après « le Cessionnaire ».`;
}

const rightsList = (c) =>
  Object.entries(RIGHTS)
    .filter(([k]) => c.rights[k])
    .map(([, r]) => r.label.toLowerCase());

export function durationText(c) {
  if (c.duration === 'legal') return 'pour toute la durée de protection des droits d’auteur prévue par la loi (article L123-1 du Code de la propriété intellectuelle), y compris ses éventuelles prolongations';
  const d = DURATIONS[c.duration];
  return `pour une durée de ${d.label} à compter du ${dateShort(c.startDate)}, soit jusqu’au ${dateShort(contractEnd(c))} inclus`;
}

export function buildContract(c, { percentages } = {}) {
  const price = priceOf(c, percentages);
  const blocks = [];
  const add = (t, text, extra = {}) => blocks.push({ t, text, ...extra });
  let artNo = 0;
  const art = (title) => add('h', `Article ${++artNo} – ${title}`);
  const isPro = c.client.kind !== 'particulier';
  const gratuit = price.total === 0 && !price.hasProportional;
  const enabledModes = price.lines;

  add('title', 'Contrat de cession de droits d’auteur');
  if (filled(c.number)) add('subtitle', `Contrat n° ${c.number}`);
  add('p', 'Entre les soussignés :');
  add('p', partyAuthor(c.author));
  add('p', 'd’une part,');
  add('p', 'et');
  add('p', partyClient(c.client));
  add('p', 'd’autre part.');

  add('h', 'Préambule');
  add('p', 'L’Auteur a réalisé ou réalisera, à la demande du Cessionnaire, la ou les œuvres décrites à l’article 1. Conformément à l’article L111-1 du Code de la propriété intellectuelle (CPI), la commande de ces œuvres n’emporte pas, à elle seule, transfert des droits d’auteur au Cessionnaire.');
  add('p', 'Les parties conviennent donc, par le présent contrat, des conditions dans lesquelles l’Auteur cède au Cessionnaire certains de ses droits patrimoniaux, conformément aux articles L131-1 et suivants du CPI.');

  art('Œuvres concernées');
  add('p', 'Le présent contrat porte exclusivement sur les œuvres suivantes :');
  c.works.forEach((w) => add('li', `${w.title} (${WORK_TYPES[w.type] || 'Création'})${filled(w.description) ? ` : ${w.description.trim()}` : ''}.`));
  add('p', 'Il ne s’applique à aucune autre œuvre, notamment aux recherches, esquisses et propositions non retenues, qui restent la propriété de l’Auteur, ni à des œuvres futures (article L131-1 du CPI).');

  art('Droits cédés');
  add('p', `L’Auteur cède au Cessionnaire, à titre ${c.exclusive ? 'exclusif' : 'non exclusif'}${gratuit ? ' et gratuit' : ''}, les droits patrimoniaux suivants, chacun faisant l’objet d’une mention distincte (article L131-3 du CPI) :`);
  let k = 0;
  const right = (title, text) => add('p', `${artNo}.${++k}. ${title}. ${text}`);
  if (c.rights.reproduction) right('Droit de reproduction', 'Le droit de reproduire ou de faire reproduire les œuvres, par tout procédé technique connu à la date du présent contrat (impression, numérisation, enregistrement sur tout support numérique), sur les supports et dans les limites définis à l’article 3.');
  if (c.rights.representation) right('Droit de représentation', 'Le droit de communiquer les œuvres au public, par tout procédé connu à la date du présent contrat (diffusion en ligne, affichage, projection, télédiffusion), dans le cadre des modes d’exploitation définis à l’article 3.');
  if (c.rights.adaptation) right('Droit d’adaptation', 'Le droit de décliner et d’adapter les œuvres (changement de format, de dimensions, de couleurs, recadrage, intégration à d’autres éléments) pour les besoins des modes d’exploitation définis à l’article 3, dans le respect du droit moral de l’Auteur.');
  if (c.rights.translation) right('Droit de traduction', 'Le droit de traduire ou de faire traduire les éléments textuels des œuvres en toutes langues.');
  if (c.rights.trademark) right('Droit de dépôt à titre de marque', 'Le droit de déposer les œuvres, ou certains de leurs éléments, à titre de marque, de dessin ou de modèle, auprès de tout office compétent, au nom du Cessionnaire et pour les classes de son choix, sur le territoire défini à l’article 4. L’Auteur s’interdit de contester ce dépôt sur le fondement des droits patrimoniaux cédés.');
  if (c.rights.transfer) right('Droit de céder à des tiers', 'Le droit de transférer tout ou partie des droits cédés à un tiers, dans les mêmes limites que celles du présent contrat ; le Cessionnaire en informe l’Auteur par écrit.');
  add('p', 'Le Cessionnaire peut faire exécuter les actes de reproduction et de représentation par les prestataires de son choix (imprimeurs, hébergeurs, agences, plateformes de diffusion) agissant pour son compte. Tout droit qui n’est pas expressément mentionné au présent article reste la propriété de l’Auteur.');

  art('Domaine d’exploitation : étendue et destination');
  add('p', 'Les droits cédés sont limités aux modes d’exploitation suivants :');
  for (const line of enabledModes) {
    const mode = modeById(line.id);
    const detail = c.modes[line.id]?.detail;
    add('li', `${mode.label} : ${mode.legal}${filled(detail) ? `. Précisions : ${detail.trim().replace(/\.$/, '')}` : ''}.`);
  }
  add('p', `Destination : les œuvres sont exploitées pour ${filled(c.destination) ? c.destination.trim().replace(/\.$/, '') : 'les besoins de l’activité du Cessionnaire'}. Toute exploitation sur un support, pour un mode ou pour une destination non listés ci-dessus est exclue du présent contrat.`);

  art('Territoire');
  add('p', `Les droits sont cédés pour ${TERRITORIES[c.territory].text}. La mise en ligne effectuée depuis ce territoire et accessible depuis d’autres pays du seul fait du fonctionnement d’Internet n’est pas considérée comme une exploitation hors territoire.`);

  art('Durée');
  add('p', `Les droits sont cédés ${durationText(c)}.`);
  if (c.duration !== 'legal') {
    add('p', 'À l’expiration de cette durée, le Cessionnaire cesse toute nouvelle exploitation et retire les œuvres de ses supports en ligne dans un délai de trente jours. Les exemplaires imprimés avant l’expiration peuvent être utilisés jusqu’à épuisement, dans un délai maximal de trois mois. Le renouvellement de la cession fait l’objet d’un avenant écrit.');
  }

  art('Droit moral');
  add('p', 'Conformément à l’article L121-1 du CPI, le droit moral de l’Auteur est perpétuel, inaliénable et imprescriptible : il n’est pas cédé.');
  if (c.credit === 'mention') {
    add('p', `Le Cessionnaire mentionne le nom de l’Auteur${filled(c.creditText) ? ` sous la forme « ${c.creditText.trim()} »` : ''} lorsque la nature du support et les usages de la profession le permettent.`);
  } else {
    add('p', 'Compte tenu de la nature des œuvres et des supports, l’Auteur accepte que son nom ne figure pas sur les supports d’exploitation ; il conserve le droit de revendiquer à tout moment la paternité des œuvres.');
  }
  add('p', 'Les adaptations autorisées ne doivent ni dénaturer les œuvres ni porter atteinte à l’honneur ou à la réputation de l’Auteur. Toute modification substantielle (refonte, changement de composition, de typographie ou de forme) est soumise à l’accord préalable et écrit de l’Auteur.');

  art('Rémunération');
  if (gratuit) {
    add('p', 'La présente cession est consentie à titre gratuit.');
  } else {
    add('p', 'En contrepartie de la cession, le Cessionnaire verse à l’Auteur la rémunération suivante, distincte de celle de la création des œuvres et détaillée pour chaque mode d’exploitation (article L132-31 du CPI pour les œuvres de commande utilisées pour la publicité) :');
    add('table', null, {
      head: ['Mode d’exploitation', 'Rémunération'],
      rows: [
        ...enabledModes.map((l) => [l.label, l.type === 'proportionnel' ? `${percent(l.rate)} des recettes HT` : `${euro(l.amount)} HT (forfait)`]),
        ...(price.total > 0 ? [['Total forfaitaire', `${euro(price.total)} HT`]] : []),
      ],
    });
    if (price.lines.some((l) => l.type === 'forfait' && l.amount > 0)) {
      add('p', `Les rémunérations forfaitaires sont fixées en application de l’article L131-4 du CPI, ${FORFAIT_REASONS[c.forfaitReason] || FORFAIT_REASONS.base}.`);
    }
    if (price.hasProportional) {
      const period = { trimestre: 'chaque trimestre civil', semestre: 'chaque semestre civil', annee: 'chaque année civile' }[c.proportional.period] || 'chaque trimestre civil';
      add('p', `Pour les exploitations rémunérées proportionnellement, le Cessionnaire adresse à l’Auteur, ${period}, un relevé des quantités vendues et des recettes hors taxes correspondantes ; le paiement intervient dans les trente jours suivant l’envoi du relevé.${Number(c.proportional.minimum) > 0 ? ` Un minimum garanti de ${euro(Number(c.proportional.minimum))} HT, définitivement acquis à l’Auteur et à valoir sur ces redevances, est versé à la signature.` : ''}`);
    }
    if (Number(c.creationFee) > 0) {
      add('p', `Pour mémoire, la création des œuvres fait l’objet d’une rémunération distincte de ${euro(Number(c.creationFee))} HT${filled(c.quoteRef) ? ` (devis n° ${c.quoteRef.trim()})` : ''}.`);
    }
    add('p', `Les sommes forfaitaires sont payables ${c.paymentTerms === 'reception' ? 'à réception de la facture' : 'à trente jours à compter de la date de la facture'}. ${c.author.vatFranchise ? 'TVA non applicable, article 293 B du Code général des impôts.' : 'Les montants sont exprimés hors taxes ; la TVA applicable s’y ajoute.'}`);
    if (isPro) {
      add('p', 'Tout retard de paiement entraîne de plein droit des pénalités calculées au taux de trois fois le taux d’intérêt légal, ainsi qu’une indemnité forfaitaire de 40 € pour frais de recouvrement (articles L441-10 et D441-5 du Code de commerce).');
    }
  }

  if (c.retention && !gratuit) {
    art('Prise d’effet de la cession');
    add('p', 'La cession ne prend effet qu’au complet paiement des sommes forfaitaires dues au titre du présent contrat et de la création des œuvres. Jusqu’à ce paiement, toute exploitation des œuvres est seulement tolérée, à titre précaire et révocable.');
  }

  art('Fichiers sources');
  if (c.sources === 'inclus') add('p', 'Les fichiers sources des œuvres (fichiers de travail natifs) sont remis au Cessionnaire, pour les seuls besoins des exploitations prévues au présent contrat.');
  else if (c.sources === 'payant') add('p', `Les fichiers sources des œuvres (fichiers de travail natifs) sont remis au Cessionnaire moyennant un prix de ${euro(Number(c.sourcesPrice) || 0)} HT, pour les seuls besoins des exploitations prévues au présent contrat.`);
  else add('p', 'Les fichiers sources des œuvres (fichiers de travail natifs) ne sont pas remis au Cessionnaire. Seuls les fichiers d’exploitation prévus au devis sont livrés.');

  art('Garanties');
  add('p', 'L’Auteur garantit être l’auteur des œuvres, que celles-ci sont originales et qu’à sa connaissance elles ne portent pas atteinte aux droits de tiers.');
  add('p', `Cette garantie ne s’étend pas aux éléments fournis par le Cessionnaire, ni aux éléments sous licence intégrés aux œuvres${filled(c.thirdParty) ? ` (${c.thirdParty.trim().replace(/\.$/, '')})` : ' (polices de caractères, photographies ou illustrations de banques d’images)'} : le Cessionnaire fait son affaire de l’acquisition des licences correspondant à ses propres usages. Le Cessionnaire garantit que les éléments qu’il fournit peuvent être librement utilisés pour les besoins des œuvres.`);

  art('Références');
  add('p', c.portfolio
    ? 'L’Auteur peut présenter les œuvres et citer le Cessionnaire à titre de référence dans ses supports de présentation (portfolio, site internet, réseaux sociaux), après leur première diffusion publique par le Cessionnaire.'
    : 'Les œuvres sont confidentielles : l’Auteur ne les présente pas publiquement sans l’accord écrit du Cessionnaire.');

  art('Exploitations non prévues');
  add('p', 'Toute extension du domaine d’exploitation (nouveau support, mode, territoire ou durée) fait l’objet d’un avenant écrit et d’une rémunération complémentaire. Toute exploitation sous une forme non prévisible ou non prévue à la date du présent contrat doit faire l’objet d’une clause expresse stipulant une participation corrélative de l’Auteur aux profits d’exploitation (article L131-6 du CPI).');

  art('Droit applicable et litiges');
  add('p', isPro
    ? 'Le présent contrat est soumis au droit français. Les parties s’efforcent de résoudre à l’amiable tout différend relatif à son interprétation ou à son exécution. À défaut d’accord, le litige est porté devant le tribunal judiciaire compétent en matière de propriété littéraire et artistique.'
    : 'Le présent contrat est soumis au droit français. Les parties s’efforcent de résoudre à l’amiable tout différend. Le Cessionnaire, s’il agit en qualité de consommateur, peut recourir gratuitement à un médiateur de la consommation. À défaut d’accord, les juridictions compétentes sont celles désignées par la loi.');

  add('space');
  add('p', `Fait à ${filled(c.place) ? c.place.trim() : '…………………'}, le ${dateShort(c.signDate)}, en deux exemplaires originaux, dont un pour chaque partie, ou par voie de signature électronique.`);
  add('sign', null, {
    left: { title: 'L’Auteur', name: c.author.name, mention: '« Lu et approuvé, bon pour cession de droits »' },
    right: { title: 'Le Cessionnaire', name: c.client.kind === 'particulier' ? c.client.name : `${c.client.name}${filled(c.client.representative) ? `, représenté(e) par ${c.client.representative}` : ''}`, mention: '« Lu et approuvé, bon pour acceptation »' },
  });
  return { title: `Contrat de cession – ${c.works[0]?.title || 'œuvre'}`, blocks, price };
}

/** Récapitulatif d'une page, lisible par le client. */
export function buildSummary(c, { percentages } = {}) {
  const price = priceOf(c, percentages);
  const rows = [
    ['Œuvre(s)', c.works.map((w) => w.title).join(', ')],
    ['Auteur', c.author.name],
    ['Cessionnaire', c.client.name],
    ['Droits cédés', rightsList(c).join(', ').replace(/^./, (s) => s.toUpperCase())],
    ['Exploitations autorisées', price.lines.map((l) => l.label).join(' · ')],
    ['Territoire', TERRITORIES[c.territory].label],
    ['Durée', c.duration === 'legal' ? 'Durée légale de protection' : `${DURATIONS[c.duration].label}, du ${dateShort(c.startDate)} au ${dateShort(contractEnd(c))}`],
    ['Exclusivité', c.exclusive ? 'Exclusive' : 'Non exclusive'],
    ['Rémunération des droits', price.total === 0 && !price.hasProportional ? 'Cession gratuite' : price.lines.map((l) => (l.type === 'proportionnel' ? `${l.label} : ${percent(l.rate)} des recettes` : `${l.label} : ${euro(l.amount)} HT`)).join(' · ') + (price.total ? ` — total ${euro(price.total)} HT` : '')],
    ['Ce qui n’est pas cédé', `Droit moral, ${c.sources === 'non' ? 'fichiers sources, ' : ''}propositions non retenues, et tout usage absent de cette liste`],
  ];
  return {
    title: 'Récapitulatif de cession',
    blocks: [
      { t: 'title', text: 'Récapitulatif de la cession de droits d’auteur' },
      ...(filled(c.number) ? [{ t: 'subtitle', text: `Contrat n° ${c.number}` }] : []),
      { t: 'table', head: ['Élément', 'Détail'], rows },
      { t: 'small', text: 'Ce récapitulatif résume le contrat de cession. Seul le contrat signé fait foi. Toute utilisation hors de ce périmètre nécessite un avenant.' },
    ],
    price,
  };
}

/** Clause courte à coller dans un devis. */
export function buildQuoteClause(c, { percentages } = {}) {
  const price = priceOf(c, percentages);
  const rights = rightsList(c).join(', ');
  const works = c.works.map((w) => w.title).join(', ');
  const lines = price.lines.map((l) => (l.type === 'proportionnel' ? `${l.label} : ${percent(l.rate)} des recettes HT` : `${l.label} : ${euro(l.amount)} HT`)).join(' ; ');
  return `Cession de droits d’auteur — ${c.retention ? 'Sous réserve du complet paiement, ' : ''}${c.author.name || 'l’Auteur'} cède à ${c.client.name || 'le Client'}, à titre ${c.exclusive ? 'exclusif' : 'non exclusif'}, les droits de ${rights} sur : ${works}, pour les exploitations suivantes : ${price.lines.map((l) => l.label.toLowerCase()).join(', ')} ; territoire : ${TERRITORIES[c.territory].label} ; durée : ${c.duration === 'legal' ? 'durée légale de protection' : `${DURATIONS[c.duration].label} à compter du ${dateShort(c.startDate)}`}. Rémunération des droits, distincte de la création : ${lines}${price.total ? ` (total ${euro(price.total)} HT)` : ''}. Le droit moral, les fichiers sources${c.sources === 'non' ? '' : ' (sauf mention contraire)'} et tout usage non listé ne sont pas cédés ; toute extension fera l’objet d’un avenant (art. L131-3 du CPI).`;
}

/** Nouvelle cession qui prend le relais à l'échéance de la précédente. */
export function renewal(c) {
  const end = contractEnd(c);
  const next = structuredClone(c);
  next.id = globalThis.crypto?.randomUUID ? crypto.randomUUID() : `c${Date.now()}`;
  next.number = '';
  next.status = 'brouillon';
  next.createdAt = Date.now();
  next.updatedAt = Date.now();
  next.renewalOf = c.id;
  if (end) {
    const d = new Date(`${end}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    next.startDate = d.toISOString().slice(0, 10);
  }
  next.signDate = next.startDate;
  return next;
}
