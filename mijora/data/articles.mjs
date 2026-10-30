// Articles éditoriaux de démonstration. Statut « a_verifier » : à relire et à sourcer avant publication.
// corps : suite de blocs [type, texte] avec type « p » (paragraphe) ou « h » (intertitre)

export const ARTICLES = [
  {
    slug: "le-dashi",
    titre: "Le dashi, bouillon de la cuisine japonaise",
    rubrique: "Techniques de cuisine",
    chapo: "Quelques grammes d'algue et de bonite séchée, de l'eau et dix minutes : le dashi est la base de très nombreux plats japonais.",
    pays: ["JP"],
    recettes: ["soupe-miso"],
    corps: [
      ["p", "Le dashi est un bouillon léger, préparé le plus souvent avec du kombu, une grande algue séchée, et du katsuobushi, de la bonite cuite, fumée puis séchée, que l'on râpe en copeaux très fins. Il sert de base aux soupes, aux sauces, aux mijotés et aux bouillons de nouilles."],
      ["h", "Une question d'umami"],
      ["p", "Le kombu est riche en glutamate, le katsuobushi en inosinate. Ensemble, ces deux composés renforcent mutuellement la saveur que le chimiste japonais Kikunae Ikeda a nommée umami au début du XXe siècle, après avoir isolé le glutamate du bouillon de kombu."],
      ["h", "Plusieurs dashis"],
      ["p", "Le dashi associant kombu et katsuobushi est le plus courant. Il existe aussi un dashi de kombu seul, un dashi de petites sardines séchées (niboshi) et un dashi de shiitake séchés, souvent associé au kombu dans la cuisine végétarienne des temples bouddhistes."],
      ["h", "Le geste"],
      ["p", "Le kombu infuse dans l'eau froide, puis chauffe doucement ; on le retire avant l'ébullition, qui rendrait le bouillon visqueux et amer. Les copeaux de bonite infusent quelques minutes hors du feu, puis on filtre sans presser."],
    ],
  },
  {
    slug: "la-nixtamalisation",
    titre: "La nixtamalisation, le secret du maïs mésoaméricain",
    rubrique: "Origine d'un ingrédient",
    chapo: "Cuire le maïs dans une eau rendue alcaline : ce procédé très ancien rend la tortilla possible et a protégé des générations de mangeurs de maïs d'une grave carence.",
    pays: ["MX"],
    recettes: ["guacamole", "arepas"],
    corps: [
      ["p", "La nixtamalisation consiste à cuire les grains de maïs secs dans de l'eau additionnée de chaux (hydroxyde de calcium) ou de cendres, puis à les laisser tremper avant de les rincer. Le mot vient du nahuatl nextli, « cendre », et tamalli, « pâte de maïs »."],
      ["h", "Ce que change le procédé"],
      ["p", "La cuisson alcaline détache l'enveloppe du grain, modifie l'amidon et permet d'obtenir une pâte souple, la masa, qui sert aux tortillas et aux tamales. Elle rend aussi assimilable la niacine (vitamine B3) contenue dans le maïs."],
      ["h", "Une leçon pour l'Europe"],
      ["p", "Lorsque le maïs s'est diffusé en Europe et aux États-Unis sans ce procédé, les populations qui en dépendaient presque exclusivement ont souffert de la pellagre, une maladie due au manque de niacine. Les peuples de Mésoamérique, qui nixtamalisaient leur maïs, n'en souffraient pas."],
      ["h", "Et les arepas ?"],
      ["p", "La farine de maïs précuite utilisée aujourd'hui pour la plupart des arepas, au Venezuela et en Colombie, n'est pas nixtamalisée : c'est un autre procédé, et une autre texture."],
    ],
  },
  {
    slug: "le-tadka",
    titre: "Le tadka, l'art de tempérer les épices",
    rubrique: "Techniques de cuisine",
    chapo: "Des épices jetées dans la matière grasse brûlante, quelques secondes avant de les verser sur le plat : un geste central des cuisines du sous-continent indien.",
    pays: ["IN"],
    recettes: ["dal-tadka"],
    corps: [
      ["p", "Le tadka, appelé aussi tarka, chaunk ou baghar selon les régions, consiste à chauffer du ghee ou de l'huile, à y faire grésiller des épices entières, puis parfois de l'ail, de l'oignon ou des feuilles de curry, avant de verser ce mélange sur un plat."],
      ["h", "Pourquoi ça marche"],
      ["p", "Beaucoup de composés aromatiques des épices se dissolvent mieux dans la graisse que dans l'eau. La chaleur les libère en quelques secondes, et la matière grasse les transporte dans tout le plat."],
      ["h", "Au début ou à la fin"],
      ["p", "Le tadka peut ouvrir une recette, comme base de cuisson, ou la conclure : versé grésillant sur un dal au moment de servir, il apporte un parfum frais que la cuisson aurait atténué."],
      ["h", "Le bon moment"],
      ["p", "Les graines de cumin ou de moutarde doivent grésiller et crépiter sans noircir : quelques secondes de trop suffisent à les rendre âcres. On prépare donc tous les ingrédients avant d'allumer le feu."],
    ],
  },
];
