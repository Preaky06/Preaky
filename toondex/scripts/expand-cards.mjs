// Étend le catalogue au-delà de la sélection de fetch-cards.mjs : les personnages principaux de
// centaines de séries (live, Cartoon Network, Nickelodeon, Adult Swim, Disney Channel, animation
// adulte…), des films Disney et Pixar, et des anime les plus populaires.
// Écrit src/data/cards-extra.json et src/data/works-extra.json.
//
// Sources gratuites, sans clé : TVMaze (distribution principale de chaque série, image du
// personnage dans son rôle), Disney API (wiki Disney de Fandom), AniList (anime).
// Règle : un personnage sans image du personnage lui-même est écarté (jamais la photo d'un
// comédien de doublage). Les réponses sont gardées dans scripts/.sources-cache.json :
//   node scripts/expand-cards.mjs            interroge les sources manquantes du cache
//   node scripts/expand-cards.mjs --offline  reconstruit uniquement depuis le cache
// Derrière un proxy : NODE_USE_ENV_PROXY=1.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const UA = "ToonDex/0.1 (projet personnel non commercial)";
const OFFLINE = process.argv.includes("--offline");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url), "utf8"));

const CACHE_FILE = new URL("./.sources-cache.json", import.meta.url);
const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, "utf8")) : {};
cache.tvmaze ??= {};
cache.disney ??= {};
cache.disneyNames ??= {};
cache.anilist ??= {};
cache.tvIndex ??= {};
cache.tvById ??= {};
const saveCache = () => writeFileSync(CACHE_FILE, JSON.stringify(cache));

async function getJson(url, init = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    let res;
    try {
      res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers ?? {}) } });
    } catch {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (res.status === 429) {
      await sleep((Math.max(Number(res.headers.get("retry-after")) || 0, 10) + 2) * 1000);
      continue;
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${url} : HTTP ${res.status}`);
    return res.json();
  }
  throw new Error(`${url} : échec après plusieurs essais`);
}

/* ---------- Listes ---------- */

/**
 * Séries TVMaze : "titre exact" ou [titre, titre français] ou [titre, titre français, année de début].
 * Les séries déjà dans la sélection (fetch-cards.mjs) sont reprises automatiquement pour compléter leur distribution.
 */
const SHOWS = [
  // Cartoon Network
  ["Adventure Time", "Adventure Time", 2008],
  ["Regular Show", "Regular Show"],
  ["Steven Universe", "Steven Universe"],
  ["The Amazing World of Gumball", "Le Monde incroyable de Gumball"],
  ["Ben 10", "Ben 10", 2005],
  ["Ben 10: Alien Force", "Ben 10: Alien Force"],
  ["The Powerpuff Girls", "Les Supers Nanas", 1998],
  ["Dexter's Laboratory", "Le Laboratoire de Dexter"],
  ["Courage the Cowardly Dog", "Courage, le chien froussard"],
  ["Ed, Edd n Eddy", "Ed, Edd n Eddy"],
  ["Johnny Bravo", "Johnny Bravo"],
  ["Samurai Jack", "Samurai Jack"],
  ["Teen Titans", "Teen Titans", 2003],
  ["Teen Titans Go!", "Teen Titans Go!"],
  ["We Bare Bears", "We Bare Bears"],
  ["Over the Garden Wall", "Over the Garden Wall"],
  ["Craig of the Creek", "Craig of the Creek"],
  ["Foster's Home for Imaginary Friends", "Foster, la maison des amis imaginaires"],
  ["Codename: Kids Next Door", "Nom de code : Kids Next Door"],
  ["Chowder", "Chowder"],
  ["The Marvelous Misadventures of Flapjack", "Les Merveilleuses Mésaventures de Flapjack"],
  ["Camp Lazlo", "Camp Lazlo"],
  ["The Grim Adventures of Billy & Mandy", "Billy et Mandy, aventuriers de l'au-delà"],
  ["Infinity Train", "Infinity Train"],
  ["Uncle Grandpa", "Oncle Grandpa"],
  ["OK K.O.! Let's Be Heroes", "OK K.O.! Let's Be Heroes"],
  ["Summer Camp Island", "Summer Camp Island"],
  ["Victor and Valentino", "Victor et Valentino"],
  ["Apple & Onion", "Apple & Onion"],
  ["Generator Rex", "Generator Rex"],
  ["Megas XLR", "Megas XLR"],
  ["Cow and Chicken", "Cow and Chicken"],
  ["Robotboy", "Robotboy"],
  ["My Gym Partner's a Monkey", "Mon copain de classe est un singe"],
  ["The Secret Saturdays", "Les Saturdays"],
  ["Sym-Bionic Titan", "Sym-Bionic Titan"],
  ["Hi Hi Puffy AmiYumi", "Hi Hi Puffy AmiYumi"],
  ["Mao Mao: Heroes of Pure Heart", "Mao Mao, héros au cœur pur"],
  ["Tig n' Seek", "Tig n' Seek"],
  // Nickelodeon
  ["SpongeBob SquarePants", "Bob l'éponge"],
  ["Rugrats", "Les Razmoket", 1991],
  ["Hey Arnold!", "Hé Arnold !"],
  ["The Fairly OddParents", "Mes parrains sont magiques"],
  ["The Adventures of Jimmy Neutron: Boy Genius", "Les Aventures de Jimmy Neutron"],
  ["Danny Phantom", "Danny Fantôme"],
  ["Avatar: The Last Airbender", "Avatar, le dernier maître de l'air"],
  ["The Legend of Korra", "La Légende de Korra"],
  ["Invader ZIM", "Invader Zim"],
  ["Rocko's Modern Life", "La Vie moderne de Rocko"],
  ["The Ren & Stimpy Show", "Ren et Stimpy", 1991],
  ["CatDog", "CatDog"],
  ["The Wild Thornberrys", "La Famille Delajungle"],
  ["As Told by Ginger", "Ginger"],
  ["Doug", "Doug", 1991],
  ["Aaahh!!! Real Monsters", "Drôles de monstres"],
  ["Teenage Mutant Ninja Turtles", "Les Tortues Ninja", 2012],
  ["Rise of the Teenage Mutant Ninja Turtles", "Le Destin des Tortues Ninja"],
  ["The Loud House", "Bienvenue chez les Loud"],
  ["The Casagrandes", "Les Casagrandes"],
  ["Harvey Beaks", "Harvey Beaks"],
  ["Sanjay and Craig", "Sanjay et Craig"],
  ["Breadwinners", "Breadwinners"],
  ["The Penguins of Madagascar", "Les Pingouins de Madagascar"],
  ["Kung Fu Panda: Legends of Awesomeness", "Kung Fu Panda : L'Incroyable Légende"],
  ["Back at the Barnyard", "La Ferme en folie"],
  ["El Tigre: The Adventures of Manny Rivera", "El Tigre"],
  ["My Life as a Teenage Robot", "Ma vie de lycéenne robot"],
  ["ChalkZone", "ChalkZone"],
  ["Rocket Power", "Rocket Power"],
  ["The Angry Beavers", "Les Castors allumés"],
  ["All Grown Up!", "Les Razmoket : Rencontrent les Délice"],
  ["Fanboy & Chum Chum", "Fanboy et Chum Chum"],
  ["T.U.F.F. Puppy", "T.U.F.F. Puppy"],
  ["Catscratch", "Catscratch"],
  ["iCarly", "iCarly", 2007],
  ["Drake & Josh", "Drake et Josh"],
  ["Victorious", "Victorious"],
  ["Zoey 101", "Zoey 101"],
  ["Kenan & Kel", "Kenan et Kel"],
  ["Henry Danger", "Henry Danger"],
  ["Big Time Rush", "Big Time Rush"],
  ["Sam & Cat", "Sam et Cat"],
  ["The Thundermans", "Les Thunderman"],
  ["Ned's Declassified School Survival Guide", "Le Guide de survie de Ned"],
  // Adult Swim
  ["Aqua Teen Hunger Force", "Aqua Teen Hunger Force"],
  ["The Venture Bros.", "The Venture Bros."],
  ["Metalocalypse", "Metalocalypse"],
  ["Harvey Birdman, Attorney at Law", "Harvey Birdman, avocat"],
  ["Space Ghost Coast to Coast", "Space Ghost Coast to Coast"],
  ["Squidbillies", "Squidbillies"],
  ["Smiling Friends", "Smiling Friends"],
  ["Primal", "Primal"],
  ["Superjail!", "Superjail!"],
  ["Sealab 2021", "Sealab 2021"],
  ["The Boondocks", "The Boondocks"],
  ["Black Dynamite", "Black Dynamite"],
  ["Mr. Pickles", "Mr. Pickles"],
  ["Moral Orel", "Moral Orel"],
  ["Frisky Dingo", "Frisky Dingo"],
  ["Home Movies", "Home Movies"],
  ["Mike Tyson Mysteries", "Mike Tyson Mysteries"],
  ["Ballmastrz: 9009", "Ballmastrz: 9009"],
  ["Birdgirl", "Birdgirl"],
  ["Lazor Wulf", "Lazor Wulf"],
  ["Common Side Effects", "Common Side Effects"],
  ["Royal Crackers", "Royal Crackers"],
  ["Teenage Euthanasia", "Teenage Euthanasia"],
  ["Tuca & Bertie", "Tuca & Bertie"],
  ["12 oz. Mouse", "12 oz. Mouse"],
  // Disney Channel, Disney XD, Disney+
  ["Gravity Falls", "Souvenirs de Gravity Falls"],
  ["Phineas and Ferb", "Phinéas et Ferb"],
  ["Kim Possible", "Kim Possible"],
  ["Amphibia", "Amphibia"],
  ["The Owl House", "Luz à Osville"],
  ["DuckTales", "La Bande à Picsou", 2017],
  ["DuckTales", "La Bande à Picsou (1987)", 1987],
  ["Recess", "La Cour de récré"],
  ["Star vs. the Forces of Evil", "Star Butterfly"],
  ["Wander Over Yonder", "Wander"],
  ["Big City Greens", "Big City Greens"],
  ["The Proud Family", "La Famille Proud"],
  ["American Dragon: Jake Long", "American Dragon: Jake Long"],
  ["Fish Hooks", "Fish Hooks"],
  ["Pepper Ann", "Pepper Ann"],
  ["The Emperor's New School", "Kuzco, un empereur à l'école"],
  ["Lilo & Stitch: The Series", "Lilo et Stitch, la série"],
  ["Chip 'n Dale Rescue Rangers", "Tic et Tac, les rangers du risque"],
  ["Darkwing Duck", "Myster Mask"],
  ["TaleSpin", "Super Baloo"],
  ["Gargoyles", "Gargoyles, les anges de la nuit"],
  ["Goof Troop", "La Bande à Dingo"],
  ["Mickey Mouse", "Mickey Mouse", 2013],
  ["Tangled: The Series", "Raiponce, la série"],
  ["Moon Girl and Devil Dinosaur", "Moon Girl et Devil Dinosaur"],
  ["Kiff", "Kiff"],
  ["Milo Murphy's Law", "La Loi de Milo Murphy"],
  ["Randy Cunningham: 9th Grade Ninja", "Randy Cunningham, ninja"],
  ["Kick Buttowski: Suburban Daredevil", "Kick Buttowski"],
  ["Dave the Barbarian", "Dave le barbare"],
  ["Sofia the First", "Princesse Sofia"],
  ["The Lion Guard", "La Garde du Roi lion"],
  ["Elena of Avalor", "Elena d'Avalor"],
  ["Big Hero 6: The Series", "Les Nouveaux Héros, la série"],
  ["Hannah Montana", "Hannah Montana"],
  ["Lizzie McGuire", "Lizzie McGuire"],
  ["Wizards of Waverly Place", "Les Sorciers de Waverly Place"],
  ["That's So Raven", "Phénomène Raven"],
  ["The Suite Life of Zack & Cody", "La Vie de palace de Zack et Cody"],
  ["Even Stevens", "Even Stevens"],
  ["Good Luck Charlie", "Bonne chance Charlie"],
  ["Jessie", "Jessie", 2011],
  ["Sonny with a Chance", "Sonny"],
  ["Austin & Ally", "Austin et Ally"],
  ["Boy Meets World", "Incorrigible Cory"],
  ["Girl Meets World", "Le Monde de Riley"],
  // Animation pour adultes
  ["Family Guy", "Les Griffin"],
  ["Futurama", "Futurama"],
  ["American Dad!", "American Dad!"],
  ["Bob's Burgers", "Bob's Burgers"],
  ["BoJack Horseman", "BoJack Horseman"],
  ["Archer", "Archer", 2009],
  ["King of the Hill", "Les Rois du Texas"],
  ["Big Mouth", "Big Mouth"],
  ["Disenchantment", "Désenchantée"],
  ["F Is for Family", "F Is for Family"],
  ["Paradise PD", "Paradise Police"],
  ["Inside Job", "Inside Job"],
  ["Hazbin Hotel", "Hazbin Hotel"],
  ["Invincible", "Invincible", 2021],
  ["Arcane", "Arcane"],
  ["Castlevania", "Castlevania", 2017],
  ["The Legend of Vox Machina", "La Légende de Vox Machina"],
  ["Harley Quinn", "Harley Quinn", 2019],
  ["Beavis and Butt-Head", "Beavis et Butt-Head", 1993],
  ["Daria", "Daria"],
  ["The Cleveland Show", "The Cleveland Show"],
  ["Solar Opposites", "Solar Opposites"],
  ["Final Space", "Final Space"],
  ["Star Trek: Lower Decks", "Star Trek: Lower Decks"],
  ["Hit-Monkey", "Hit-Monkey"],
  ["Krapopolis", "Krapopolis"],
  ["The Great North", "The Great North"],
  ["Central Park", "Central Park"],
  ["Clone High", "Clone High", 2002],
  ["Drawn Together", "Drawn Together"],
  ["Ugly Americans", "Ugly Americans"],
  ["Brickleberry", "Brickleberry"],
  ["Blue Eye Samurai", "Blue Eye Samurai"],
  ["Scavengers Reign", "Scavengers Reign"],
  ["Twilight of the Gods", "Twilight of the Gods"],
  ["Pantheon", "Pantheon"],
  ["Kipo and the Age of Wonderbeasts", "Kipo et l'âge des Animonstres"],
  ["The Dragon Prince", "Le Prince des dragons"],
  ["Trollhunters: Tales of Arcadia", "Chasseurs de Trolls"],
  ["She-Ra and the Princesses of Power", "She-Ra et les princesses au pouvoir"],
  ["Voltron: Legendary Defender", "Voltron, le défenseur légendaire"],
  ["Hilda", "Hilda"],
  ["Carmen Sandiego", "Carmen Sandiego", 2019],
  // Warner, Hanna-Barbera, super-héros
  ["Animaniacs", "Animaniacs", 1993],
  ["Pinky and the Brain", "Minus et Cortex"],
  ["Tiny Toon Adventures", "Les Tiny Toons"],
  ["The Looney Tunes Show", "The Looney Tunes Show"],
  ["Scooby-Doo, Where Are You!", "Scooby-Doo, où es-tu ?"],
  ["The Flintstones", "Les Pierrafeu"],
  ["The Jetsons", "Les Jetson"],
  ["Top Cat", "Top Cat"],
  ["Wacky Races", "Les Fous du volant", 1968],
  ["The Smurfs", "Les Schtroumpfs", 1976],
  ["Garfield and Friends", "Garfield et ses amis"],
  ["Batman: The Animated Series", "Batman, la série animée"],
  ["Superman: The Animated Series", "Superman, l'Ange de Metropolis"],
  ["Justice League", "La Ligue des justiciers", 2001],
  ["Young Justice", "La Ligue des justiciers : Nouvelle Génération"],
  ["Batman Beyond", "Batman, la relève"],
  ["X-Men", "X-Men, la série animée", 1992],
  ["X-Men '97", "X-Men '97"],
  ["Spider-Man", "Spider-Man, l'homme-araignée", 1994],
  ["The Spectacular Spider-Man", "Spectacular Spider-Man"],
  ["What If...?", "What If...?"],
  ["Star Wars: The Clone Wars", "Star Wars: The Clone Wars", 2008],
  ["Star Wars Rebels", "Star Wars Rebels"],
  ["Star Wars: The Bad Batch", "Star Wars: The Bad Batch"],
  ["Transformers", "Transformers", 1984],
  ["Transformers: Prime", "Transformers: Prime"],
  ["He-Man and the Masters of the Universe", "Les Maîtres de l'univers", 1983],
  ["Sonic the Hedgehog", "Sonic le hérisson", 1993],
  ["Dragons: Riders of Berk", "Dragons : Cavaliers de Beurk"],
  ["The Adventures of Puss in Boots", "Les Aventures du Chat Potté"],
  ["Trolls: The Beat Goes On!", "Les Trolls : En avant la musique !"],
  ["The Boss Baby: Back in Business", "Baby Boss : Les affaires reprennent"],
  // Europe et jeunesse
  ["Miraculous: Tales of Ladybug & Cat Noir", "Miraculous, les aventures de Ladybug et Chat Noir"],
  ["Totally Spies!", "Totally Spies!"],
  ["Code Lyoko", "Code Lyoko"],
  ["Oggy and the Cockroaches", "Oggy et les Cafards"],
  ["Zig & Sharko", "Zig et Sharko"],
  ["Rabbids Invasion", "Les Lapins crétins : Invasion"],
  ["Wakfu", "Wakfu"],
  ["Titeuf", "Titeuf"],
  ["Galactik Football", "Galactik Football"],
  ["Peppa Pig", "Peppa Pig"],
  ["Bluey", "Bluey"],
  ["PAW Patrol", "La Pat' Patrouille"],
  ["PJ Masks", "Pyjamasques"],
  ["Dora the Explorer", "Dora l'exploratrice"],
  ["Arthur", "Arthur", 1996],
  ["Pingu", "Pingu"],
  ["Hey Duggee", "Hey Duggee"],
  ["Mr. Bean: The Animated Series", "Mr. Bean, la série animée"],
  // Séries
  ["Grey's Anatomy", "Grey's Anatomy"],
  ["House", "Dr House", 2004],
  ["The Big Bang Theory", "The Big Bang Theory"],
  ["Seinfeld", "Seinfeld"],
  ["Parks and Recreation", "Parks and Recreation"],
  ["Modern Family", "Modern Family"],
  ["The X-Files", "X-Files", 1993],
  ["Buffy the Vampire Slayer", "Buffy contre les vampires"],
  ["Supernatural", "Supernatural", 2005],
  ["Desperate Housewives", "Desperate Housewives"],
  ["Gossip Girl", "Gossip Girl", 2007],
  ["Glee", "Glee"],
  ["Scrubs", "Scrubs"],
  ["That '70s Show", "That '70s Show"],
  ["Malcolm in the Middle", "Malcolm"],
  ["The Fresh Prince of Bel-Air", "Le Prince de Bel-Air"],
  ["Everybody Hates Chris", "Tout le monde déteste Chris"],
  ["Two and a Half Men", "Mon oncle Charlie"],
  ["24", "24 heures chrono"],
  ["Heroes", "Heroes", 2006],
  ["Fringe", "Fringe"],
  ["Westworld", "Westworld"],
  ["House of the Dragon", "House of the Dragon"],
  ["The Witcher", "The Witcher"],
  ["Vikings", "Vikings", 2013],
  ["Outlander", "Outlander"],
  ["Succession", "Succession"],
  ["Euphoria", "Euphoria", 2019],
  ["The Bear", "The Bear"],
  ["Ted Lasso", "Ted Lasso"],
  ["Yellowstone", "Yellowstone"],
  ["Ozark", "Ozark"],
  ["Mindhunter", "Mindhunter"],
  ["Elite", "Élite"],
  ["Bridgerton", "La Chronique des Bridgerton"],
  ["Emily in Paris", "Emily in Paris"],
  ["The Queen's Gambit", "Le Jeu de la dame"],
  ["You", "You", 2018],
  ["Sex Education", "Sex Education"],
  ["The Haunting of Hill House", "The Haunting of Hill House"],
  ["Arrow", "Arrow"],
  ["The Flash", "The Flash", 2014],
  ["Smallville", "Smallville"],
  ["Daredevil", "Daredevil", 2015],
  ["Jessica Jones", "Jessica Jones"],
  ["Loki", "Loki"],
  ["WandaVision", "WandaVision"],
  ["Moon Knight", "Moon Knight"],
  ["Hawkeye", "Hawkeye", 2021],
  ["Andor", "Andor"],
  ["Obi-Wan Kenobi", "Obi-Wan Kenobi"],
  ["Ahsoka", "Ahsoka"],
  ["The Book of Boba Fett", "Le Livre de Boba Fett"],
  ["The Lord of the Rings: The Rings of Power", "Les Anneaux de pouvoir"],
  ["Shōgun", "Shōgun", 2024],
  ["Fallout", "Fallout", 2024],
  ["The Umbrella Academy", "Umbrella Academy"],
  ["Lucifer", "Lucifer"],
  ["Riverdale", "Riverdale"],
  ["The Vampire Diaries", "Vampire Diaries"],
  ["Teen Wolf", "Teen Wolf", 2011],
  ["Pretty Little Liars", "Pretty Little Liars", 2010],
  ["Gilmore Girls", "Gilmore Girls"],
  ["One Tree Hill", "Les Frères Scott"],
  ["The O.C.", "Newport Beach"],
  ["Downton Abbey", "Downton Abbey"],
  ["Luther", "Luther"],
  ["Killing Eve", "Killing Eve"],
  ["Fleabag", "Fleabag"],
  ["The IT Crowd", "The IT Crowd"],
  ["Mr. Bean", "Mr. Bean"],
  ["Derry Girls", "Derry Girls"],
  ["Skins", "Skins", 2007],
  ["Misfits", "Misfits"],
  ["Merlin", "Merlin", 2008],
  ["Spartacus", "Spartacus"],
  ["Rome", "Rome", 2005],
  ["Boardwalk Empire", "Boardwalk Empire"],
  ["Hannibal", "Hannibal", 2013],
  ["Mr. Robot", "Mr. Robot"],
  ["Homeland", "Homeland"],
  ["Suits", "Suits"],
  ["The Good Place", "The Good Place"],
  ["Community", "Community"],
  ["Arrested Development", "Arrested Development"],
  ["30 Rock", "30 Rock"],
  ["It's Always Sunny in Philadelphia", "It's Always Sunny in Philadelphia"],
  ["What We Do in the Shadows", "What We Do in the Shadows"],
  ["Cobra Kai", "Cobra Kai"],
  ["The Expanse", "The Expanse"],
  ["Battlestar Galactica", "Battlestar Galactica", 2004],
  ["Star Trek: The Next Generation", "Star Trek : La Nouvelle Génération"],
  ["Star Trek", "Star Trek", 1966],
  ["Firefly", "Firefly"],
  ["Stargate SG-1", "Stargate SG-1"],
  ["The 100", "Les 100"],
  ["Orange Is the New Black", "Orange Is the New Black"],
  ["House of Cards", "House of Cards", 2013],
  ["The West Wing", "À la Maison-Blanche"],
  ["Criminal Minds", "Esprits criminels"],
  ["Bones", "Bones"],
  ["Castle", "Castle", 2009],
  ["The Mentalist", "Mentalist"],
  ["Lie to Me", "Lie to Me"],
  ["Monk", "Monk"],
  ["Psych", "Psych"],
  ["Columbo", "Columbo"],
  ["The Sopranos", "Les Soprano"],
  ["Peaky Blinders", "Peaky Blinders"],
  ["The Last Kingdom", "The Last Kingdom"],
  ["Severance", "Severance"],
  ["The Morning Show", "The Morning Show"],
  ["Silo", "Silo"],
  ["Reacher", "Reacher"],
  ["Slow Horses", "Slow Horses"],
  ["The White Lotus", "The White Lotus"],
  ["Yellowjackets", "Yellowjackets"],
  ["Ted", "Ted", 2024],
  ["Abbott Elementary", "Abbott Elementary"],
  ["Only Murders in the Building", "Only Murders in the Building"],
  ["Gen V", "Gen V"],
  ["Peacemaker", "Peacemaker"],
  ["The Sandman", "The Sandman"],
  ["Shadow and Bone", "Shadow and Bone"],
  ["Alice in Borderland", "Alice in Borderland"],
  ["All of Us Are Dead", "All of Us Are Dead"],
  ["Kingdom", "Kingdom", 2019],
  ["Crash Landing on You", "Crash Landing on You"],
  ["Call My Agent!", "Dix pour cent"],
  ["Engrenages", "Engrenages"],
  ["Les Revenants", "Les Revenants"],
  ["Caméra Café", "Caméra Café"],
  ["Fais pas ci, fais pas ça", "Fais pas ci, fais pas ça"],
  ["Hero Corp", "Hero Corp"],
  ["HPI", "HPI"],
  ["Validé", "Validé"],
  ["Family Business", "Family Business", 2019],
  ["Vis a vis", "Vis a vis"],
  ["How to Sell Drugs Online (Fast)", "How to Sell Drugs Online (Fast)"],
];

/** Personnages Disney classiques, hors films. */
const DISNEY_CLASSICS = [
  ["Mickey Mouse", "Mickey Mouse"],
  ["Minnie Mouse", "Minnie Mouse"],
  ["Donald Duck", "Donald Duck"],
  ["Daisy Duck", "Daisy Duck"],
  ["Goofy", "Dingo"],
  ["Pluto", "Pluto"],
  ["Scrooge McDuck", "Picsou"],
  ["Chip and Dale", "Tic et Tac"],
  ["Pete", "Pat Hibulaire"],
  ["Huey, Dewey, and Louie", "Riri, Fifi et Loulou"],
  ["Oswald the Lucky Rabbit", "Oswald le lapin chanceux"],
];

/** Films Disney et Pixar : [titre exact sur le wiki Disney, titre français, année, genres, œuvre existante]. */
const DISNEY_FILMS = [
  ["Snow White and the Seven Dwarfs", "Blanche-Neige et les Sept Nains", 1937, "conte, musical"],
  ["Pinocchio", "Pinocchio", 1940, "conte, aventure"],
  ["Dumbo", "Dumbo", 1941, "famille, drame"],
  ["Bambi", "Bambi", 1942, "drame, famille"],
  ["Cinderella", "Cendrillon", 1950, "conte, romance"],
  ["Alice in Wonderland", "Alice au pays des merveilles", 1951, "fantasy, aventure"],
  ["Peter Pan", "Peter Pan", 1953, "aventure, fantasy"],
  ["Lady and the Tramp", "La Belle et le Clochard", 1955, "romance, famille"],
  ["Sleeping Beauty", "La Belle au bois dormant", 1959, "conte, fantasy"],
  ["One Hundred and One Dalmatians", "Les 101 Dalmatiens", 1961, "aventure, comédie"],
  ["The Sword in the Stone", "Merlin l'Enchanteur", 1963, "fantasy, aventure"],
  ["The Jungle Book", "Le Livre de la jungle", 1967, "aventure, musical"],
  ["The Aristocats", "Les Aristochats", 1970, "comédie, musical"],
  ["Robin Hood", "Robin des Bois", 1973, "aventure, comédie"],
  ["The Rescuers", "Les Aventures de Bernard et Bianca", 1977, "aventure, policier"],
  ["The Fox and the Hound", "Rox et Rouky", 1981, "drame, famille"],
  ["The Great Mouse Detective", "Basil, détective privé", 1986, "policier, mystère"],
  ["The Little Mermaid", "La Petite Sirène", 1989, "conte, musical"],
  ["Beauty and the Beast", "La Belle et la Bête", 1991, "conte, romance"],
  ["Aladdin", "Aladdin", 1992, "aventure, comédie"],
  ["The Lion King", "Le Roi lion", 1994, "drame, musical", "le-roi-lion"],
  ["Pocahontas", "Pocahontas", 1995, "drame historique, romance"],
  ["The Hunchback of Notre Dame", "Le Bossu de Notre-Dame", 1996, "drame, musical"],
  ["Hercules", "Hercule", 1997, "mythologie, comédie"],
  ["Mulan", "Mulan", 1998, "action, aventure"],
  ["Tarzan", "Tarzan", 1999, "aventure, drame"],
  ["The Emperor's New Groove", "Kuzco, l'empereur mégalo", 2000, "comédie, aventure"],
  ["Atlantis: The Lost Empire", "Atlantide, l'empire perdu", 2001, "aventure, science-fiction"],
  ["Lilo & Stitch", "Lilo et Stitch", 2002, "science-fiction, comédie"],
  ["Treasure Planet", "La Planète au trésor", 2002, "space opera, aventure"],
  ["Brother Bear", "Frère des ours", 2003, "aventure, drame"],
  ["Meet the Robinsons", "Bienvenue chez les Robinson", 2007, "science-fiction, comédie"],
  ["Bolt", "Volt, star malgré lui", 2008, "aventure, comédie"],
  ["The Princess and the Frog", "La Princesse et la Grenouille", 2009, "conte, musical"],
  ["Tangled", "Raiponce", 2010, "conte, aventure"],
  ["Wreck-It Ralph", "Les Mondes de Ralph", 2012, "comédie, aventure"],
  ["Frozen", "La Reine des neiges", 2013, "conte, musical", "la-reine-des-neiges"],
  ["Big Hero 6", "Les Nouveaux Héros", 2014, "super-héros, comédie"],
  ["Zootopia", "Zootopie", 2016, "policier, comédie"],
  ["Moana", "Vaiana, la légende du bout du monde", 2016, "aventure, musical"],
  ["Raya and the Last Dragon", "Raya et le Dernier Dragon", 2021, "fantasy, action"],
  ["Encanto", "Encanto, la fantastique famille Madrigal", 2021, "fantastique, musical"],
  ["Wish", "Wish, Asha et la bonne étoile", 2023, "conte, musical"],
  ["Toy Story", "Toy Story", 1995, "aventure, comédie", "toy-story"],
  ["A Bug's Life", "1001 Pattes", 1998, "aventure, comédie"],
  ["Monsters, Inc.", "Monstres et Cie", 2001, "comédie, famille"],
  ["Finding Nemo", "Le Monde de Nemo", 2003, "aventure, famille"],
  ["The Incredibles", "Les Indestructibles", 2004, "super-héros, action", "les-indestructibles"],
  ["Cars", "Cars", 2006, "sport, comédie"],
  ["Ratatouille", "Ratatouille", 2007, "comédie, famille", "ratatouille"],
  ["WALL-E", "WALL-E", 2008, "science-fiction, romance", "wall-e"],
  ["Up", "Là-haut", 2009, "aventure, drame"],
  ["Brave", "Rebelle", 2012, "aventure, fantasy"],
  ["Inside Out", "Vice-versa", 2015, "comédie dramatique, famille", "vice-versa"],
  ["The Good Dinosaur", "Le Voyage d'Arlo", 2015, "aventure, famille"],
  ["Coco", "Coco", 2017, "fantastique, musical"],
  ["Onward", "En avant", 2020, "fantasy, aventure"],
  ["Soul", "Soul", 2020, "comédie dramatique, musical"],
  ["Luca", "Luca", 2021, "aventure, comédie"],
  ["Turning Red", "Alerte rouge", 2022, "comédie, fantastique"],
  ["Elemental", "Élémentaire", 2023, "romance, comédie"],
];

/** Titres français d'anime courants (titre anglais ou romaji AniList → titre affiché). */
const ANIME_FR = {
  "Attack on Titan": "L'Attaque des Titans",
  "Spirited Away": "Le Voyage de Chihiro",
  "Your Name.": "Your Name.",
  "My Neighbor Totoro": "Mon voisin Totoro",
  "Princess Mononoke": "Princesse Mononoké",
  "Howl's Moving Castle": "Le Château ambulant",
  "Kiki's Delivery Service": "Kiki la petite sorcière",
  "The Boy and the Heron": "Le Garçon et le Héron",
  "Ponyo": "Ponyo sur la falaise",
  "Castle in the Sky": "Le Château dans le ciel",
  "Nausicaä of the Valley of the Wind": "Nausicaä de la vallée du vent",
  "Grave of the Fireflies": "Le Tombeau des lucioles",
  "Weathering With You": "Les Enfants du temps",
  "A Silent Voice": "A Silent Voice",
  "Suzume": "Suzume",
  "Fullmetal Alchemist": "Fullmetal Alchemist",
  "Hunter x Hunter (2011)": "Hunter × Hunter",
  "Sailor Moon": "Sailor Moon",
  "Saint Seiya": "Les Chevaliers du Zodiaque",
  "Captain Tsubasa": "Olive et Tom",
  "Detective Conan": "Détective Conan",
};

/* ---------- Traductions ---------- */

const GENRES_FR = {
  Comedy: "comédie",
  Drama: "drame",
  Action: "action",
  Adventure: "aventure",
  Fantasy: "fantasy",
  "Science-Fiction": "science-fiction",
  "Sci-Fi": "science-fiction",
  Horror: "horreur",
  Crime: "crime",
  Thriller: "thriller",
  Mystery: "mystère",
  Romance: "romance",
  Family: "famille",
  Children: "jeunesse",
  Supernatural: "surnaturel",
  War: "guerre",
  Western: "western",
  Espionage: "espionnage",
  Music: "musical",
  Sports: "sport",
  Legal: "judiciaire",
  Medical: "médical",
  History: "historique",
  "Mahou Shoujo": "magical girl",
  Mecha: "mecha",
  Psychological: "psychologique",
  "Slice of Life": "tranche de vie",
};
const genresFr = (list, fallback) => {
  const out = [...new Set(list.map((g) => GENRES_FR[g]).filter(Boolean))].slice(0, 3);
  return out.length ? out.join(", ") : fallback;
};

/** Noms français des personnages les plus connus. */
const NAMES_FR = {
  "SpongeBob SquarePants": "Bob l'éponge",
  "Patrick Star": "Patrick Étoile",
  "Squidward Tentacles": "Carlo Tentacule",
  "Mr. Eugene H. Krabs": "M. Krabs",
  "Sandy Cheeks": "Sandy Écureuil",
  "Mrs. Puff": "Mme Puff",
  Goofy: "Dingo",
  "Scrooge McDuck": "Picsou",
  "Peter Griffin": "Peter Griffin",
  "Phineas Flynn": "Phinéas Flynn",
  "Ferb Fletcher": "Ferb Fletcher",
  "Perry the Platypus": "Perry l'ornithorynque",
  "Dr. Heinz Doofenshmirtz": "Dr Heinz Doofenshmirtz",
  "Buzz Lightyear": "Buzz l'Éclair",
  "Mr. Incredible": "M. Indestructible",
  Joy: "Joie",
  Sadness: "Tristesse",
  Anger: "Colère",
  Fear: "Peur",
  Disgust: "Dégoût",
  Remy: "Rémy",
  "Lightning McQueen": "Flash McQueen",
  Tow: "Martin",
  Mater: "Martin",
  "Sulley": "Sulli",
  "James P. Sullivan": "Sulli",
  "Mike Wazowski": "Bob Razowski",
  "Fred Flintstone": "Fred Pierrafeu",
  "Wilma Flintstone": "Wilma Pierrafeu",
  "Barney Rubble": "Barney Laroche",
  "Shaggy Rogers": "Sammy",
  "Velma Dinkley": "Véra",
  "Daphne Blake": "Daphné",
  "Fred Jones": "Fred",
  "Leonardo": "Leonardo",
  "Aang": "Aang",
  "Brain": "Cortex",
  "Pinky": "Minus",
  "Dick Dastardly": "Satanas",
  "Muttley": "Diabolo",
  "Papa Smurf": "Grand Schtroumpf",
  "Smurfette": "Schtroumpfette",
  "Gargamel": "Gargamel",
  "Mickey Mouse": "Mickey",
  "Minnie Mouse": "Minnie",
  "Donald Duck": "Donald",
  "Daisy Duck": "Daisy",
  "Bugs Bunny": "Bugs Bunny",
  "Daffy Duck": "Daffy Duck",
  "Courage": "Courage",
  "Stewie Griffin": "Stewie Griffin",
  "Bender Bending Rodríguez": "Bender",
  "Philip J. Fry": "Fry",
  "Turanga Leela": "Leela",
};

/* ---------- Données existantes ---------- */

const baseWorks = read("works.json");
const baseCards = read("cards.json");
const workIds = new Set(baseWorks.map((w) => w[0]));

// Séries de la sélection : leur requête TVMaze, pour compléter leur distribution.
const curatedQueries = {};
{
  const src = readFileSync(new URL("./fetch-cards.mjs", import.meta.url), "utf8");
  const block = src.slice(src.indexOf("const SERIES = {"), src.indexOf("const DISNEY = {"));
  for (const m of block.matchAll(/^\s*"?([a-z0-9-]+)"?: \["([^"]+)"/gm)) curatedQueries[m[2]] = m[1];
}
const baseYear = Object.fromEntries(baseWorks.map((w) => [w[0], w[3]]));

/* ---------- Construction ---------- */

const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
function slug(text) {
  return norm(text).replace(/ /g, "-") || "x";
}

const COUNTRY_OK = new Set(["US", "GB", "FR", "JP", "KR", "ES", "DE", "AU", "NZ", "CA", "CN", "IT", "BE", "IE", "SE", "DK", "NO", "MX", "BR", "IN", "IL", "TR", "PL", "NL", "AR", "CO", "PH", "TW", "FI", "IS", "AT", "CH", "RU", "ZA", "TH"]);
const IMAGE_OK = /^https:\/\/(upload\.wikimedia\.org|s4\.anilist\.co|static\.tvmaze\.com|static\.wikia\.nocookie\.net)\//;
const NOT_A_CHARACTER = /^(narrat|himself|herself|themselves|various|additional|voices?\b|announcer|host\b|guest|ensemble|chorus|crowd|unnamed)/i;

const seenImages = new Set(baseCards.map((c) => c.image));
const seenNames = new Set(baseCards.map((c) => norm(c.name)));
const extraWorks = new Map();
const pending = []; // { name, work, image, source, credit, score, pool }
const log = [];

function addWork(id, title, type, year, country, genres, network) {
  if (workIds.has(id) || extraWorks.has(id)) return id;
  const c = COUNTRY_OK.has(country) ? country : "US";
  extraWorks.set(id, [id, title, type, year, c, genres, "rare", network ?? ""]);
  return id;
}
function freshWorkId(title) {
  const base = slug(title);
  let id = base;
  for (let n = 2; workIds.has(id) || extraWorks.has(id); n++) id = `${base}-${n}`;
  return id;
}
/**
 * Nom affiché : TVMaze écrit souvent « Theodore "T-Bag" Bagwell », « Annie January / Starlight »
 * ou « Louis "Lou" Pickles aka "Grandpa" ». On garde le surnom et le nom, ou le premier nom.
 */
function cleanName(raw) {
  let n = raw.replace(/\s+aka\s+.*$/i, "").replace(/\s*\([^)]*\)/g, "");
  n = n.split(" / ")[0];
  const nick = n.match(/["“]([^"”]+)["”]\s*(.*)$/);
  if (nick) n = `${nick[1]} ${nick[2]}`;
  n = n.replace(/^(Det\.|Deputy|Sgt\.|Lt\.|Officer|Agent)\s+/i, "");
  return n.replace(/\s+/g, " ").trim();
}

function addCandidate(c) {
  c.name = cleanName(c.name);
  if (!c.image || !IMAGE_OK.test(c.image)) return false;
  if (NOT_A_CHARACTER.test(c.name) || /\(voice\)|\bvoice of\b/i.test(c.name)) return false;
  const key = norm(c.name);
  if (!key || seenImages.has(c.image) || seenNames.has(key)) return false;
  seenImages.add(c.image);
  seenNames.add(key);
  pending.push(c);
  return true;
}

/* TVMaze */

async function tvmazeShow(query, year) {
  const key = `${query}|${year ?? ""}`;
  if (key in cache.tvmaze) return cache.tvmaze[key];
  if (OFFLINE) return null;
  let show = null;
  if (year) {
    const results = (await getJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`)) ?? [];
    const yearOf = (s) => Number((s.premiered ?? "").slice(0, 4));
    const hit = results.map((r) => r.show).find((s) => yearOf(s) === year) ?? results.map((r) => r.show).find((s) => Math.abs(yearOf(s) - year) <= 1);
    await sleep(550);
    if (hit) show = await getJson(`https://api.tvmaze.com/shows/${hit.id}?embed=cast`);
  } else {
    show = await getJson(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(query)}&embed=cast`);
  }
  await sleep(550);
  const slim = show && {
    id: show.id,
    name: show.name,
    type: show.type,
    language: show.language,
    genres: show.genres,
    premiered: show.premiered,
    weight: show.weight,
    network: show.network?.name ?? show.webChannel?.name ?? "",
    country: show.network?.country?.code ?? show.webChannel?.country?.code ?? "",
    cast: (show._embedded?.cast ?? []).map(({ character, voice }) => ({
      id: character.id,
      name: character.name,
      image: character.image ? (character.image.original ?? character.image.medium) : null,
      url: character.url,
      voice,
    })),
  };
  cache.tvmaze[key] = slim;
  saveCache();
  return slim;
}

const showEntries = [
  ...Object.entries(curatedQueries).map(([q, work]) => ({ q, fr: null, year: baseYear[work], work })),
  ...SHOWS.map(([q, fr, year]) => ({ q, fr, year, work: null })),
];
const seenShows = new Set();
for (const e of showEntries) {
  const show = await tvmazeShow(e.q, e.year);
  if (!show) {
    log.push(`TVMaze : introuvable « ${e.q} »`);
    continue;
  }
  if (seenShows.has(show.id)) continue;
  seenShows.add(show.id);
  const animated = show.type === "Animation" || show.genres.includes("Anime");
  const year = Number((show.premiered ?? "1990").slice(0, 4)) || 1990;
  const type = show.genres.includes("Anime") || show.country === "JP" ? "anime" : animated ? "serie-animee" : "serie";
  const work =
    e.work ??
    addWork(freshWorkId(e.fr ?? show.name), e.fr ?? show.name, type, year, show.country, genresFr(show.genres, animated ? "comédie" : "drame"), show.network);
  const max = animated ? 8 : 6;
  let rank = 0;
  let added = 0;
  const seenChar = new Set();
  for (const ch of show.cast) {
    if (seenChar.has(ch.id)) continue;
    seenChar.add(ch.id);
    const r = rank++;
    if (added >= max) break;
    const ok = addCandidate({
      name: NAMES_FR[ch.name] ?? ch.name,
      work,
      image: ch.image,
      source: ch.url,
      credit: "TVMaze",
      score: (show.weight ?? 50) / 100 - r * 0.06,
      pool: "tvmaze",
    });
    if (ok) added++;
  }
  log.push(`TVMaze : ${show.name} (${year}, ${show.network}) → ${added}`);
}

/* TVMaze, découverte : tout l'index, puis les séries live et animées les plus suivies. */

const DISCOVER_WEIGHT = 90; // popularité TVMaze minimale (0 à 100)
const DISCOVER_LIMIT = 3200; // nombre maximal de séries découvertes
const SKIP_TYPES = new Set(["Reality", "Talk Show", "Game Show", "News", "Sports", "Documentary", "Award Show", "Panel Show", "Variety"]);

async function tvIndexPage(page) {
  if (page in cache.tvIndex) return cache.tvIndex[page];
  if (OFFLINE) return null;
  const list = await getJson(`https://api.tvmaze.com/shows?page=${page}`);
  await sleep(550);
  cache.tvIndex[page] = list
    ? list.map((s) => [s.id, s.name, s.type, s.language, s.weight ?? 0, (s.premiered ?? "").slice(0, 4), s.network?.name ?? s.webChannel?.name ?? "", s.network?.country?.code ?? s.webChannel?.country?.code ?? "", s.genres])
    : null;
  if (page % 20 === 0) saveCache();
  return cache.tvIndex[page];
}
async function tvShowById(id) {
  if (id in cache.tvById) return cache.tvById[id];
  if (OFFLINE) return null;
  const show = await getJson(`https://api.tvmaze.com/shows/${id}?embed=cast`);
  await sleep(550);
  cache.tvById[id] = show && {
    cast: (show._embedded?.cast ?? []).map(({ character }) => [character.id, character.name, character.image ? (character.image.original ?? character.image.medium) : null, character.url]),
  };
  if (Object.keys(cache.tvById).length % 50 === 0) saveCache();
  return cache.tvById[id];
}
{
  const index = [];
  for (let page = 0; page < 1000; page++) {
    const list = await tvIndexPage(page);
    if (!list) break;
    index.push(...list);
  }
  saveCache();
  const candidates = index
    .filter(([id, , type, language, weight, year]) => !seenShows.has(id) && !SKIP_TYPES.has(type) && weight >= DISCOVER_WEIGHT && year && !(type === "Animation" && language === "Japanese"))
    .sort((a, b) => b[4] - a[4] || a[0] - b[0])
    .slice(0, DISCOVER_LIMIT);
  log.push(`TVMaze : index de ${index.length} séries, ${candidates.length} découvertes`);
  let done = 0;
  for (const [id, name, type, language, weight, year, network, country, genres] of candidates) {
    const show = await tvShowById(id);
    if (++done % 200 === 0) console.log(`découverte TVMaze : ${done}/${candidates.length}`);
    if (!show) continue;
    seenShows.add(id);
    const animated = type === "Animation";
    const work = addWork(freshWorkId(name), name, animated ? "serie-animee" : "serie", Number(year), country, genresFr(genres ?? [], animated ? "comédie" : "drame"), network);
    let rank = 0;
    let added = 0;
    for (const [, cname, image, url] of show.cast) {
      const r = rank++;
      if (added >= (animated ? 10 : 8)) break;
      if (addCandidate({ name: NAMES_FR[cname] ?? cname, work, image, source: url, credit: "TVMaze", score: weight / 100 - r * 0.06, pool: "tvmaze" })) added++;
    }
  }
  saveCache();
}

/* Disney API */

async function disneyFilm(title) {
  if (title in cache.disney) return cache.disney[title];
  if (OFFLINE) return [];
  const data = await getJson(`https://api.disneyapi.dev/character?films=${encodeURIComponent(title)}&pageSize=200`);
  await sleep(400);
  // Un seul résultat : la Disney API renvoie un objet au lieu d'une liste.
  const rows = Array.isArray(data?.data) ? data.data : data?.data ? [data.data] : [];
  const list = rows.map((c) => ({
    id: c._id,
    name: c.name,
    image: c.imageUrl ?? null,
    url: c.sourceUrl ?? `https://disney.fandom.com/wiki/${encodeURIComponent(String(c.name).replace(/ /g, "_"))}`,
    films: c.films ?? [],
    count: ["films", "shortFilms", "tvShows", "videoGames", "parkAttractions"].reduce((s, k) => s + (c[k]?.length ?? 0), 0),
  }));
  cache.disney[title] = list;
  saveCache();
  return list;
}
async function disneyName(name) {
  if (name in cache.disneyNames) return cache.disneyNames[name];
  if (OFFLINE) return null;
  const data = await getJson(`https://api.disneyapi.dev/character?name=${encodeURIComponent(name)}&pageSize=50`);
  await sleep(400);
  const list = Array.isArray(data?.data) ? data.data : data?.data ? [data.data] : [];
  const best = list
    .filter((c) => c.name?.toLowerCase() === name.toLowerCase() && c.imageUrl)
    .map((c) => ({
      name: c.name,
      image: c.imageUrl,
      url: c.sourceUrl,
      count: ["films", "shortFilms", "tvShows", "videoGames", "parkAttractions"].reduce((s, k) => s + (c[k]?.length ?? 0), 0),
    }))
    .sort((a, b) => b.count - a.count)[0] ?? null;
  cache.disneyNames[name] = best;
  saveCache();
  return best;
}
const GROUP = /\b(brothers|sisters|guards|trolls|wolves|spirits|giants|snowgies|dwarfs|fairies|pirates|soldiers|villagers|citizens|animals|hyenas|townspeople|family|friends|crew|gang|army|mice|ghosts|minions|aliens|toys|monsters|bugs)\b/i;
const cleanDisneyImage = (url) => url?.replace(/\/revision\/latest.*$/, "/revision/latest");

{
  const work = addWork("mickey-et-ses-amis", "Mickey et ses amis", "serie-animee", 1928, "US", "comédie, famille", "Disney");
  for (const [name, fr] of DISNEY_CLASSICS) {
    const c = await disneyName(name);
    if (c) addCandidate({ name: fr, work, image: cleanDisneyImage(c.image), source: c.url ?? `https://disney.fandom.com/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`, credit: "Disney API", score: Math.log10(c.count + 1), pool: "disney" });
    else log.push(`Disney : introuvable ${name}`);
  }
}
for (const [title, fr, year, genres, existing] of DISNEY_FILMS) {
  // Personnages apparus pour la première fois dans ce film (pas les caméos), sans les groupes.
  const isGroup = (c) => GROUP.test(c.name) || (/s$/.test(c.name) && c.count < 8);
  const debut = new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( \\((\\d{4} )?film\\))?$`);
  const list = (await disneyFilm(title)).filter((c) => debut.test(c.films[0] ?? "") && c.image && !isGroup(c));
  const work = existing && workIds.has(existing) ? existing : addWork(freshWorkId(fr), fr, "film-animation", year, "US", genres, "Disney");
  let added = 0;
  for (const c of list.sort((a, b) => b.count - a.count)) {
    if (added >= 12) break;
    const source = c.url ?? `https://disney.fandom.com/wiki/${encodeURIComponent(c.name.replace(/ /g, "_"))}`;
    if (addCandidate({ name: NAMES_FR[c.name] ?? c.name, work, image: cleanDisneyImage(c.image), source, credit: "Disney API", score: Math.log10(c.count + 1), pool: "disney" })) added++;
  }
  log.push(`Disney : ${title} → ${added}`);
}

/* AniList */

const ANILIST_PAGE = `query ($page: Int) {
  Page(page: $page, perPage: 25) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false, genre_not_in: ["Hentai", "Ecchi"]) {
      id format seasonYear startDate { year } countryOfOrigin genres popularity
      title { romaji english }
      relations { edges { relationType node { id } } }
      characters(sort: [ROLE, FAVOURITES_DESC], perPage: 10) { nodes { id name { full } image { large } siteUrl favourites } }
    }
  }
}`;
async function anilistPage(page) {
  if (page in cache.anilist) return cache.anilist[page];
  if (OFFLINE) return [];
  const data = await getJson("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_PAGE, variables: { page } }),
  });
  await sleep(2500);
  cache.anilist[page] = data?.data?.Page?.media ?? [];
  saveCache();
  return cache.anilist[page];
}
{
  const media = [];
  for (let page = 1; page <= 60; page++) media.push(...(await anilistPage(page)));
  const byId = new Map(media.map((m) => [m.id, m]));
  // Une suite rejoint l'œuvre d'origine si celle-ci est dans la liste.
  const rootOf = (m, depth = 0) => {
    const prequel = m.relations?.edges?.find((e) => ["PREQUEL", "PARENT"].includes(e.relationType) && byId.has(e.node.id));
    return prequel && depth < 12 ? rootOf(byId.get(prequel.node.id), depth + 1) : m;
  };
  // Œuvres anime déjà présentes : reconnues par l'image d'un de leurs personnages.
  const workByImage = new Map(baseCards.filter((c) => c.credit === "AniList").map((c) => [c.image, c.work]));
  const workOfRoot = new Map();
  const perWork = new Map();
  for (const m of media) {
    if (!["TV", "MOVIE", "ONA", "OVA", "TV_SHORT"].includes(m.format)) continue;
    const root = rootOf(m);
    let work = workOfRoot.get(root.id);
    if (!work) {
      const known = [...root.characters.nodes, ...m.characters.nodes].map((n) => workByImage.get(n.image?.large)).find(Boolean);
      const titleEn = (root.title.english ?? root.title.romaji).replace(/\s*\((TV|\d{4})\)$/, "");
      const title = ANIME_FR[titleEn] ?? ANIME_FR[root.title.romaji] ?? titleEn;
      const year = root.startDate?.year ?? root.seasonYear ?? 2000;
      work =
        known ??
        addWork(freshWorkId(title), title, root.format === "MOVIE" ? "film-animation" : "anime", year, root.countryOfOrigin ?? "JP", genresFr(root.genres, "aventure"), "");
      workOfRoot.set(root.id, work);
    }
    for (const n of m.characters.nodes) {
      if ((perWork.get(work) ?? 0) >= 9) break;
      const ok = addCandidate({
        name: n.name.full,
        work,
        image: n.image?.large?.includes("/default.") ? null : n.image?.large,
        source: n.siteUrl,
        credit: "AniList",
        score: Math.log10((n.favourites ?? 0) + 1),
        pool: "anilist",
      });
      if (ok) perWork.set(work, (perWork.get(work) ?? 0) + 1);
    }
  }
  log.push(`AniList : ${media.length} anime parcourus`);
}

/* ---------- Raretés, identifiants, écriture ---------- */

// Rareté selon le rang de popularité dans chaque source : 2 % mythique, 6 % légendaire, 14 % épique, 28 % rare.
const TIERS = [
  [0.02, "mythique"],
  [0.08, "legendaire"],
  [0.22, "epique"],
  [0.5, "rare"],
  [1.01, "commune"],
];
for (const pool of ["tvmaze", "disney", "anilist"]) {
  const list = pending.filter((c) => c.pool === pool).sort((a, b) => b.score - a.score);
  list.forEach((c, i) => {
    const q = (i + 0.5) / list.length;
    c.rarity = TIERS.find(([t]) => q < t)[1];
  });
}

// Personnages ajoutés à une œuvre de la sélection : au plus un cran sous son personnage principal.
const ORDER = ["commune", "rare", "epique", "legendaire", "mythique"];
const baseTier = Object.fromEntries(baseWorks.map((w) => [w[0], w[6]]));
for (const c of pending) {
  const tier = baseTier[c.work];
  if (!tier) continue;
  const cap = Math.max(0, ORDER.indexOf(tier) - 1);
  if (ORDER.indexOf(c.rarity) > cap) c.rarity = ORDER[cap];
}

/** Images mortes à la source (404 vérifiés) : la carte est retirée plutôt qu'affichée sans son personnage. */
const DEAD_IMAGES = new Set(["Grand Councilwoman", "Flash McQueen", "Figment", "Meg"]);
for (let i = pending.length - 1; i >= 0; i--) if (pending[i].credit === "Disney API" && DEAD_IMAGES.has(pending[i].name)) pending.splice(i, 1);

const usedIds = new Set(baseCards.map((c) => c.id));
const cards = pending.map((c) => {
  let id = slug(c.name);
  if (usedIds.has(id)) id = `${id}-${c.work}`;
  let n = 2;
  while (usedIds.has(id)) id = `${slug(c.name)}-${c.work}-${n++}`;
  usedIds.add(id);
  return { id, name: c.name, work: c.work, rarity: c.rarity, image: c.image, source: c.source, credit: c.credit };
});
const usedWorks = new Set(cards.map((c) => c.work));
const works = [...extraWorks.values()].filter((w) => usedWorks.has(w[0]));

// Une carte (une œuvre) par ligne : fichiers compacts, différences lisibles.
const lines = (list) => `[\n${list.map((x) => JSON.stringify(x)).join(",\n")}\n]\n`;
writeFileSync(new URL("../src/data/cards-extra.json", import.meta.url), lines(cards));
writeFileSync(new URL("../src/data/works-extra.json", import.meta.url), lines(works));
writeFileSync(new URL("./.expand-log.txt", import.meta.url), log.join("\n") + "\n");
const count = cards.reduce((acc, c) => ((acc[c.rarity] = (acc[c.rarity] ?? 0) + 1), acc), {});
console.log(`${cards.length} cartes ajoutées, ${works.length} nouvelles œuvres`, count);
