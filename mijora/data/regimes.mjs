// Modes d'alimentation. Trois natures différentes, à ne pas confondre :
//   « regime »     : choix alimentaire (éthique, culturel, personnel)
//   « medical »    : restriction liée à une maladie, une intolérance ou une allergie
//   « religieux »  : règles d'une pratique religieuse, qui dépendent aussi de la provenance et de la certification
//   « objectif »   : objectif nutritionnel, qui ne peut être évalué qu'avec des valeurs nutritionnelles
//
// regle : comment la compatibilité d'une recette est déduite de ses ingrédients
//   { exclut: [origines] }        : incompatible si un ingrédient a l'une de ces origines
//   { seulement: [origines] }     : incompatible si un ingrédient n'a pas l'une de ces origines (sel et eau tolérés)
//   { allergene: slug }           : incompatible si l'ingrédient contient cet allergène
//   null                          : non évaluable automatiquement (statut « non évalué »)
// Les statuts calculés restent « calculés » tant qu'un éditeur n'a pas vérifié la recette.

const ANIMAUX = ["viande", "volaille", "poisson", "crustace", "mollusque"];

export const REGIMES = [
  {
    slug: "vegetarien",
    nom: "Végétarien",
    nature: "regime",
    accroche: "Sans viande ni poisson, avec œufs et produits laitiers.",
    definition: "L'alimentation végétarienne exclut la chair des animaux : viandes, volailles, poissons, crustacés et mollusques. Elle admet généralement les œufs, le lait et ses dérivés, ainsi que le miel.",
    principes: [
      "Les protéines viennent des légumineuses, des céréales, des œufs, des produits laitiers, du soja et des oléagineux.",
      "Associer légumineuses et céréales au fil de la journée apporte un bon équilibre en acides aminés.",
    ],
    compatibles: ["Légumes, fruits, céréales et féculents", "Légumineuses (lentilles, pois chiches, haricots), tofu", "Œufs, lait, fromages, yaourts", "Oléagineux, graines, huiles"],
    exclusions: ["Viandes et volailles, y compris charcuteries", "Poissons, crustacés et mollusques", "Produits qui en sont tirés : gélatine, bouillons de viande, sauce de poisson, bonite séchée (katsuobushi), anchois"],
    precautions: [
      "Certains fromages sont fabriqués avec de la présure animale : vérifier l'étiquette si vous l'évitez.",
      "Les bouillons, sauces et bonbons peuvent contenir des ingrédients d'origine animale peu visibles (gélatine, sauce de poisson).",
    ],
    regle: { exclut: ANIMAUX },
  },
  {
    slug: "vegetalien",
    nom: "Végétalien",
    nature: "regime",
    accroche: "Aucun produit d'origine animale dans l'assiette.",
    definition: "L'alimentation végétalienne exclut tous les produits d'origine animale : chair, œufs, lait et produits laitiers, miel. Le véganisme étend souvent ce choix au-delà de l'alimentation.",
    principes: [
      "Les protéines viennent des légumineuses, du soja, des céréales et des oléagineux.",
      "Les matières grasses animales (beurre, ghee, saindoux) sont remplacées par des huiles végétales.",
    ],
    compatibles: ["Légumes, fruits, céréales et féculents", "Légumineuses, tofu, tempeh", "Oléagineux et graines", "Huiles végétales, laits végétaux"],
    exclusions: ["Viandes, volailles, poissons, crustacés, mollusques", "Œufs", "Lait, beurre, crème, fromages, ghee", "Miel", "Gélatine et autres dérivés animaux"],
    precautions: [
      "La vitamine B12 n'est pas apportée par les aliments végétaux non enrichis : une supplémentation est recommandée par les autorités de santé. Parlez-en à un professionnel de santé, surtout pour un enfant ou pendant une grossesse.",
    ],
    regle: { exclut: [...ANIMAUX, "lait", "oeuf", "miel"] },
  },
  {
    slug: "pescetarien",
    nom: "Pescétarien",
    nature: "regime",
    accroche: "Sans viande, avec poissons et fruits de mer.",
    definition: "L'alimentation pescétarienne exclut les viandes et les volailles, mais admet les poissons, les crustacés et les mollusques. Elle comprend en général les œufs et les produits laitiers.",
    principes: ["Les poissons et fruits de mer s'ajoutent aux sources de protéines de l'alimentation végétarienne."],
    compatibles: ["Tous les aliments végétaux", "Poissons, crustacés, mollusques", "Œufs et produits laitiers"],
    exclusions: ["Viandes et volailles, charcuteries", "Graisses animales (saindoux) et bouillons de viande"],
    precautions: ["Les poissons crus ou peu cuits exigent une fraîcheur irréprochable et sont déconseillés aux femmes enceintes, aux jeunes enfants et aux personnes fragiles."],
    regle: { exclut: ["viande", "volaille"] },
  },
  {
    slug: "omnivore",
    nom: "Omnivore",
    nature: "regime",
    accroche: "Tous les groupes d'aliments, sans exclusion.",
    definition: "Une alimentation omnivore ne s'interdit aucun groupe d'aliments : végétaux, viandes, poissons, œufs et produits laitiers.",
    principes: ["La variété des aliments facilite la couverture des besoins nutritionnels."],
    compatibles: ["Tous les groupes d'aliments"],
    exclusions: ["Aucune exclusion par principe"],
    precautions: [],
    regle: { exclut: [] },
  },
  {
    slug: "carnivore",
    nom: "Carnivore",
    nature: "regime",
    accroche: "Uniquement des produits d'origine animale.",
    definition: "Le régime dit « carnivore » ne retient que des produits d'origine animale : viandes, poissons, œufs, parfois produits laitiers. Il exclut tous les végétaux.",
    principes: ["Les plats se composent de viandes, de poissons, d'œufs et de graisses animales, assaisonnés de sel."],
    compatibles: ["Viandes, volailles, abats", "Poissons, crustacés, mollusques", "Œufs", "Selon les pratiques : beurre, fromages"],
    exclusions: ["Légumes, fruits, céréales, légumineuses", "Huiles végétales, épices et condiments végétaux (selon les pratiques)"],
    precautions: [
      "Ce régime est pauvre en fibres et n'a pas fait l'objet d'études de long terme : demandez l'avis d'un médecin avant de l'adopter.",
      "La cuisine traditionnelle des pays présentés ici repose presque toujours sur des végétaux : peu de recettes du catalogue y correspondent.",
    ],
    regle: { seulement: ["viande", "volaille", "poisson", "crustace", "mollusque", "oeuf", "lait"] },
  },
  {
    slug: "keto",
    nom: "Keto",
    nature: "objectif",
    accroche: "Très peu de glucides, beaucoup de lipides.",
    definition: "Le régime cétogène (keto) réduit fortement les glucides et augmente la part des lipides, afin que l'organisme utilise davantage les graisses comme source d'énergie. Il est aussi utilisé en médecine, sous encadrement, dans certaines épilepsies.",
    principes: ["Les céréales, le sucre, les féculents, la plupart des fruits et les légumineuses sont fortement limités.", "Les seuils de glucides varient selon les approches : ils se calculent sur la journée, pas recette par recette."],
    compatibles: ["Viandes, poissons, œufs", "Légumes pauvres en glucides (légumes verts)", "Matières grasses, fromages", "Oléagineux en quantité modérée"],
    exclusions: ["Sucres et produits sucrés", "Céréales, pain, pâtes, riz", "Pommes de terre et la plupart des féculents", "Légumineuses, la plupart des fruits"],
    precautions: [
      "Un régime cétogène peut être contre-indiqué (diabète traité, grossesse, maladies rénales ou hépatiques, troubles du comportement alimentaire). Demandez l'avis d'un médecin.",
      "MIJORA n'affiche pas encore de valeurs nutritionnelles vérifiées : la compatibilité des recettes ne peut donc pas être évaluée.",
    ],
    regle: null,
  },
  {
    slug: "sans-gluten",
    nom: "Sans gluten",
    nature: "medical",
    accroche: "Pour la maladie cœliaque et la sensibilité au gluten.",
    definition: "L'alimentation sans gluten exclut le blé, le seigle, l'orge et leurs variétés (épeautre, kamut). Elle est indispensable en cas de maladie cœliaque et peut être prescrite en cas d'allergie au blé.",
    principes: ["Le riz, le maïs, le sarrasin, le millet, le quinoa, la pomme de terre et les légumineuses ne contiennent pas de gluten.", "L'avoine ne convient que si elle est garantie sans gluten : elle est souvent contaminée."],
    compatibles: ["Riz, maïs, sarrasin, millet, quinoa, manioc", "Pommes de terre, patates douces", "Légumineuses, légumes, fruits", "Viandes, poissons, œufs et produits laitiers non transformés"],
    exclusions: ["Blé, seigle, orge, épeautre, kamut et leurs farines", "Pâtes, pain, semoule, boulgour", "Sauce soja classique (fabriquée avec du blé), malt, certaines bières"],
    precautions: [
      "Pour une personne cœliaque, même des traces peuvent être nocives : vérifier les étiquettes (sauces, épices moulues, levure chimique) et éviter la contamination en cuisine.",
      "Les recettes signalées « selon les produits » contiennent un ingrédient dont la composition varie selon la marque.",
    ],
    regle: { allergene: "gluten" },
  },
  {
    slug: "sans-lactose",
    nom: "Sans lactose",
    nature: "medical",
    accroche: "Pour l'intolérance au lactose.",
    definition: "L'alimentation sans lactose limite ou exclut le sucre du lait, mal digéré en cas d'intolérance. L'allergie aux protéines du lait de vache est une autre affection : elle impose d'exclure toutes les protéines laitières, et pas seulement le lactose.",
    principes: ["Les laits végétaux, les huiles et les produits garantis sans lactose remplacent les produits laitiers."],
    compatibles: ["Tous les aliments végétaux", "Viandes, poissons, œufs", "Huiles végétales, lait de coco", "Produits laitiers étiquetés sans lactose"],
    exclusions: ["Lait, crème, beurre", "Fromages frais", "Préparations à base de lait"],
    precautions: [
      "Par prudence, MIJORA classe incompatible toute recette contenant un produit laitier, y compris le ghee et les fromages affinés, qui contiennent pourtant très peu de lactose.",
      "La tolérance varie d'une personne à l'autre ; en cas de doute, demandez conseil à un professionnel de santé.",
    ],
    regle: { allergene: "lait" },
  },
  {
    slug: "halal",
    nom: "Halal",
    nature: "religieux",
    accroche: "Les règles alimentaires de l'islam.",
    definition: "Halal signifie « licite » en arabe. Dans l'alimentation, ces règles excluent le porc et ses dérivés ainsi que l'alcool, et demandent que les animaux autorisés soient abattus selon un rite défini.",
    principes: ["La conformité d'un plat dépend de la provenance de ses ingrédients (viande, gélatine, additifs) et de leur certification, pas seulement de la recette."],
    compatibles: ["Aliments végétaux", "Poissons", "Viandes et volailles issues d'un abattage halal", "Produits laitiers et œufs"],
    exclusions: ["Porc et ses dérivés (saindoux, gélatine de porc)", "Alcool, y compris en cuisine", "Viandes non issues d'un abattage rituel"],
    precautions: ["Les pratiques varient selon les écoles et les communautés. MIJORA n'attribue pas de mention halal aux recettes : seule la certification des produits utilisés le permet."],
    regle: null,
  },
  {
    slug: "casher",
    nom: "Casher",
    nature: "religieux",
    accroche: "Les règles alimentaires du judaïsme.",
    definition: "La cacheroute définit les aliments permis. Elle autorise certains animaux seulement (mammifères ruminants aux sabots fendus, poissons à nageoires et à écailles), impose un abattage rituel et interdit de consommer ensemble viande et lait.",
    principes: ["La conformité dépend de la provenance des produits, de leur certification et de l'organisation de la cuisine (ustensiles séparés pour la viande et le lait)."],
    compatibles: ["Fruits, légumes et céréales (contrôlés)", "Poissons à nageoires et à écailles", "Viandes et volailles certifiées"],
    exclusions: ["Porc, lapin, crustacés, mollusques et autres animaux non permis", "Mélange de viande et de produits laitiers dans un même repas"],
    precautions: ["Les règles varient selon les communautés. MIJORA n'attribue pas de mention casher aux recettes : seule la certification des produits et de la cuisine le permet."],
    regle: null,
  },
  {
    slug: "riche-en-proteines",
    nom: "Riche en protéines",
    nature: "objectif",
    accroche: "Mettre les protéines au centre de l'assiette.",
    definition: "Une alimentation riche en protéines augmente la part des aliments protéiques (viandes, poissons, œufs, produits laitiers, légumineuses, soja), par exemple pour accompagner une activité sportive.",
    principes: ["La teneur en protéines d'un plat se mesure à partir de ses valeurs nutritionnelles par portion."],
    compatibles: ["Viandes, poissons, œufs", "Produits laitiers", "Légumineuses, tofu, tempeh"],
    exclusions: ["Aucune exclusion par principe"],
    precautions: [
      "Un apport très élevé en protéines n'est pas adapté à tous, notamment en cas de maladie rénale : demandez l'avis d'un professionnel de santé.",
      "MIJORA n'affiche pas encore de valeurs nutritionnelles vérifiées : les recettes ne peuvent donc pas être classées selon leur teneur en protéines.",
    ],
    regle: null,
  },
];

export const NATURES = {
  regime: { nom: "Régime alimentaire", detail: "Un choix alimentaire, éthique ou culturel." },
  medical: { nom: "Restriction médicale", detail: "Liée à une maladie, une intolérance ou une allergie." },
  religieux: { nom: "Pratique religieuse", detail: "Dépend aussi de la provenance et de la certification des produits." },
  objectif: { nom: "Objectif nutritionnel", detail: "Ne s'évalue qu'avec des valeurs nutritionnelles vérifiées." },
};

// Ordre d'affichage sur l'accueil (section « Explorer selon son alimentation »)
export const REGIMES_ACCUEIL = ["vegetarien", "vegetalien", "pescetarien", "carnivore", "keto", "sans-gluten", "sans-lactose", "riche-en-proteines"];
