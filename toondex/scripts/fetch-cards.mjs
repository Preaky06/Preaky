// Construit src/data/cards.json : une carte par personnage, avec son image réelle.
// - Anime et films d'animation japonais : AniList (image officielle du personnage).
// - Séries, dessins animés occidentaux, films : image de l'article Wikipédia (anglais) du personnage.
// Les images restent la propriété de leurs ayants droit ; usage non commercial, source citée.
// Un personnage sans image est écarté : aucune carte sans son personnage.
// Usage : node scripts/fetch-cards.mjs          construit cards.json (AniList + cache Wikipédia)
//         node scripts/fetch-cards.mjs --wiki   remplit d'abord le cache Wikipédia (lent : débit limité)
// Derrière un proxy : NODE_USE_ENV_PROXY=1. Une carte Wikipédia sans image connue garde son titre
// d'article (`wiki`) : le navigateur du visiteur cherche alors l'image à l'affichage.
import { readFileSync, writeFileSync } from "node:fs";

const UA = "ToonDex/0.1 (projet personnel non commercial)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** [œuvre, nom affiché, source, requête, personnage voulu (AniList), rôle principal ?] */
const CANDIDATES = [
  // Séries
  ["breaking-bad", "Walter White", "wiki", "Walter White (Breaking Bad)", null, true],
  ["breaking-bad", "Jesse Pinkman", "wiki", "Jesse Pinkman"],
  ["game-of-thrones", "Jon Snow", "wiki", "Jon Snow (character)", null, true],
  ["game-of-thrones", "Daenerys Targaryen", "wiki", "Daenerys Targaryen"],
  ["game-of-thrones", "Tyrion Lannister", "wiki", "Tyrion Lannister"],
  ["the-walking-dead", "Rick Grimes", "wiki", "Rick Grimes", null, true],
  ["the-walking-dead", "Daryl Dixon", "wiki", "Daryl Dixon"],
  ["prison-break", "Michael Scofield", "wiki", "Michael Scofield", null, true],
  ["prison-break", "Lincoln Burrows", "wiki", "Lincoln Burrows"],
  ["stranger-things", "Eleven", "wiki", "Eleven (Stranger Things)", null, true],
  ["stranger-things", "Jim Hopper", "wiki", "Jim Hopper"],
  ["the-office", "Michael Scott", "wiki", "Michael Scott (The Office)", null, true],
  ["the-office", "Dwight Schrute", "wiki", "Dwight Schrute"],
  ["friends", "Rachel Green", "wiki", "Rachel Green", null, true],
  ["friends", "Joey Tribbiani", "wiki", "Joey Tribbiani"],
  ["friends", "Chandler Bing", "wiki", "Chandler Bing"],
  ["lost", "Jack Shephard", "wiki", "Jack Shephard", null, true],
  ["lost", "John Locke", "wiki", "John Locke (Lost)"],
  ["peaky-blinders", "Thomas Shelby", "wiki", "Thomas Shelby", null, true],
  ["the-mandalorian", "Din Djarin", "wiki", "Din Djarin", null, true],
  ["the-mandalorian", "Grogu", "wiki", "Grogu"],
  ["squid-game", "Seong Gi-hun", "wiki", "Seong Gi-hun", null, true],
  ["better-call-saul", "Saul Goodman", "wiki", "Saul Goodman", null, true],
  ["better-call-saul", "Kim Wexler", "wiki", "Kim Wexler"],
  ["dexter", "Dexter Morgan", "wiki", "Dexter Morgan", null, true],
  ["les-soprano", "Tony Soprano", "wiki", "Tony Soprano", null, true],
  ["the-wire", "Omar Little", "wiki", "Omar Little", null, true],
  ["the-wire", "Jimmy McNulty", "wiki", "Jimmy McNulty"],
  ["mad-men", "Don Draper", "wiki", "Don Draper", null, true],
  ["doctor-who", "Le Dixième Docteur", "wiki", "Tenth Doctor", null, true],
  ["twin-peaks", "Dale Cooper", "wiki", "Dale Cooper", null, true],
  ["twin-peaks", "Laura Palmer", "wiki", "Laura Palmer"],
  ["how-i-met-your-mother", "Barney Stinson", "wiki", "Barney Stinson", null, true],
  ["how-i-met-your-mother", "Ted Mosby", "wiki", "Ted Mosby"],
  ["brooklyn-nine-nine", "Jake Peralta", "wiki", "Jake Peralta", null, true],

  // Séries animées
  ["rick-et-morty", "Rick Sanchez", "wiki", "Rick Sanchez", null, true],
  ["rick-et-morty", "Morty Smith", "wiki", "Morty Smith"],
  ["les-simpson", "Homer Simpson", "wiki", "Homer Simpson", null, true],
  ["les-simpson", "Bart Simpson", "wiki", "Bart Simpson"],
  ["les-simpson", "Marge Simpson", "wiki", "Marge Simpson"],
  ["les-simpson", "Lisa Simpson", "wiki", "Lisa Simpson"],
  ["south-park", "Eric Cartman", "wiki", "Eric Cartman", null, true],
  ["south-park", "Kenny McCormick", "wiki", "Kenny McCormick"],
  ["bob-l-eponge", "Bob l’éponge", "wiki", "SpongeBob SquarePants (character)", null, true],
  ["bob-l-eponge", "Patrick l’étoile de mer", "wiki", "Patrick Star"],
  ["adventure-time", "Finn l’humain", "wiki", "Finn the Human", null, true],
  ["adventure-time", "Jake le chien", "wiki", "Jake the Dog"],
  ["gravity-falls", "Bill Cipher", "wiki", "Bill Cipher", null, true],
  ["gravity-falls", "Dipper Pines", "wiki", "Dipper Pines"],
  ["avatar-le-dernier-maitre-de-l-air", "Aang", "wiki", "Aang", null, true],
  ["avatar-le-dernier-maitre-de-l-air", "Zuko", "wiki", "Zuko"],
  ["futurama", "Bender", "wiki", "Bender (Futurama)", null, true],
  ["futurama", "Fry", "wiki", "Philip J. Fry"],
  ["steven-universe", "Steven Universe", "wiki", "Steven Universe (character)", null, true],
  ["bojack-horseman", "BoJack Horseman", "wiki", "BoJack Horseman (character)", null, true],
  ["les-griffin", "Peter Griffin", "wiki", "Peter Griffin", null, true],
  ["les-griffin", "Stewie Griffin", "wiki", "Stewie Griffin"],
  ["phineas-et-ferb", "Perry l’ornithorynque", "wiki", "Perry the Platypus", null, true],
  ["les-razmoket", "Tommy Pickles", "wiki", "Tommy Pickles", null, true],
  ["les-supers-nanas", "Belle, Bulle et Rebelle", "wiki", "Blossom, Bubbles, and Buttercup", null, true],
  ["archer", "Sterling Archer", "wiki", "Sterling Archer", null, true],

  // Films
  ["le-parrain", "Vito Corleone", "wiki", "Vito Corleone", null, true],
  ["le-parrain", "Michael Corleone", "wiki", "Michael Corleone"],
  ["star-wars-un-nouvel-espoir", "Dark Vador", "wiki", "Darth Vader", null, true],
  ["star-wars-un-nouvel-espoir", "Luke Skywalker", "wiki", "Luke Skywalker"],
  ["star-wars-un-nouvel-espoir", "Princesse Leia", "wiki", "Princess Leia"],
  ["star-wars-un-nouvel-espoir", "Han Solo", "wiki", "Han Solo"],
  ["star-wars-un-nouvel-espoir", "Chewbacca", "wiki", "Chewbacca"],
  ["star-wars-un-nouvel-espoir", "R2-D2", "wiki", "R2-D2"],
  ["pulp-fiction", "Vincent Vega", "wiki", "Vincent Vega", null, true],
  ["pulp-fiction", "Mia Wallace", "wiki", "Mia Wallace"],
  ["pulp-fiction", "Jules Winnfield", "wiki", "Jules Winnfield"],
  ["the-dark-knight", "Le Joker", "wiki", "Joker (The Dark Knight)", null, true],
  ["matrix", "Neo", "wiki", "Neo (The Matrix)", null, true],
  ["matrix", "Trinity", "wiki", "Trinity (The Matrix)"],
  ["matrix", "Morpheus", "wiki", "Morpheus (The Matrix)"],
  ["matrix", "Agent Smith", "wiki", "Agent Smith"],
  ["titanic", "Jack Dawson", "wiki", "Jack Dawson", null, true],
  ["titanic", "Rose DeWitt Bukater", "wiki", "Rose DeWitt Bukater"],
  ["la-communaute-de-l-anneau", "Gandalf", "wiki", "Gandalf", null, true],
  ["la-communaute-de-l-anneau", "Frodon Sacquet", "wiki", "Frodo Baggins"],
  ["la-communaute-de-l-anneau", "Gollum", "wiki", "Gollum"],
  ["retour-vers-le-futur", "Marty McFly", "wiki", "Marty McFly", null, true],
  ["retour-vers-le-futur", "Doc Brown", "wiki", "Emmett Brown"],
  ["jurassic-park", "Ian Malcolm", "wiki", "Ian Malcolm (character)", null, true],
  ["jurassic-park", "Alan Grant", "wiki", "Alan Grant"],
  ["fight-club", "Tyler Durden", "wiki", "Tyler Durden", null, true],
  ["forrest-gump", "Forrest Gump", "wiki", "Forrest Gump (character)", null, true],
  ["harry-potter-a-l-ecole-des-sorciers", "Harry Potter", "wiki", "Harry Potter (character)", null, true],
  ["harry-potter-a-l-ecole-des-sorciers", "Hermione Granger", "wiki", "Hermione Granger"],
  ["harry-potter-a-l-ecole-des-sorciers", "Ron Weasley", "wiki", "Ron Weasley"],
  ["harry-potter-a-l-ecole-des-sorciers", "Albus Dumbledore", "wiki", "Albus Dumbledore"],
  ["avengers-endgame", "Iron Man", "wiki", "Tony Stark (Marvel Cinematic Universe)", null, true],
  ["avengers-endgame", "Thanos", "wiki", "Thanos (Marvel Cinematic Universe)"],
  ["avengers-endgame", "Captain America", "wiki", "Steve Rogers (Marvel Cinematic Universe)"],
  ["le-silence-des-agneaux", "Hannibal Lecter", "wiki", "Hannibal Lecter", null, true],
  ["le-silence-des-agneaux", "Clarice Starling", "wiki", "Clarice Starling"],
  ["alien", "Ellen Ripley", "wiki", "Ellen Ripley", null, true],
  ["alien", "Le Xénomorphe", "wiki", "Alien (creature in Alien franchise)"],
  ["mad-max-fury-road", "Max Rockatansky", "wiki", "Max Rockatansky", null, true],

  // Films d'animation occidentaux
  ["le-roi-lion", "Simba", "wiki", "Simba", null, true],
  ["le-roi-lion", "Mufasa", "wiki", "Mufasa"],
  ["le-roi-lion", "Scar", "wiki", "Scar (The Lion King)"],
  ["toy-story", "Woody", "wiki", "Woody (Toy Story)", null, true],
  ["toy-story", "Buzz l’Éclair", "wiki", "Buzz Lightyear"],
  ["shrek", "Shrek", "wiki", "Shrek (character)", null, true],
  ["shrek", "L’Âne", "wiki", "Donkey (Shrek)"],
  ["wall-e", "WALL-E", "wiki", "WALL-E (character)", null, true],
  ["les-indestructibles", "Edna Mode", "wiki", "Edna Mode", null, true],
  ["la-reine-des-neiges", "Elsa", "wiki", "Elsa (Frozen)", null, true],
  ["la-reine-des-neiges", "Anna", "wiki", "Anna (Frozen)"],
  ["la-reine-des-neiges", "Olaf", "wiki", "Olaf (Frozen)"],

  // Anime (AniList : recherche de l'œuvre, puis personnage voulu)
  ["one-piece", "Monkey D. Luffy", "anilist", "One Piece", "Luffy", true],
  ["one-piece", "Roronoa Zoro", "anilist", "One Piece", "Zoro"],
  ["naruto", "Naruto Uzumaki", "anilist", "Naruto", "Naruto Uzumaki", true],
  ["naruto", "Kakashi Hatake", "anilist", "Naruto", "Kakashi"],
  ["dragon-ball", "Son Goku", "anilist", "Dragon Ball", "Gokuu", true],
  ["dragon-ball-z", "Vegeta", "anilist", "Dragon Ball Z", "Vegeta", true],
  ["l-attaque-des-titans", "Eren Jäger", "anilist", "Attack on Titan", "Eren", true],
  ["l-attaque-des-titans", "Livaï Ackerman", "anilist", "Attack on Titan", "Levi"],
  ["death-note", "L", "anilist", "Death Note", "L Lawliet", true],
  ["death-note", "Light Yagami", "anilist", "Death Note", "Light Yagami"],
  ["fullmetal-alchemist-brotherhood", "Edward Elric", "anilist", "Fullmetal Alchemist: Brotherhood", "Edward Elric", true],
  ["demon-slayer", "Tanjiro Kamado", "anilist", "Demon Slayer: Kimetsu no Yaiba", "Tanjirou", true],
  ["demon-slayer", "Nezuko Kamado", "anilist", "Demon Slayer: Kimetsu no Yaiba", "Nezuko"],
  ["jujutsu-kaisen", "Satoru Gojo", "anilist", "Jujutsu Kaisen", "Satoru", true],
  ["jujutsu-kaisen", "Yuji Itadori", "anilist", "Jujutsu Kaisen", "Itadori"],
  ["my-hero-academia", "Izuku Midoriya", "anilist", "My Hero Academia", "Izuku Midoriya", true],
  ["hunter-x-hunter", "Gon Freecss", "anilist", "Hunter x Hunter (2011)", "Gon", true],
  ["hunter-x-hunter", "Killua Zoldyck", "anilist", "Hunter x Hunter (2011)", "Killua"],
  ["cowboy-bebop", "Spike Spiegel", "anilist", "Cowboy Bebop", "Spike", true],
  ["neon-genesis-evangelion", "Shinji Ikari", "anilist", "Neon Genesis Evangelion", "Shinji", true],
  ["neon-genesis-evangelion", "Asuka Langley", "anilist", "Neon Genesis Evangelion", "Asuka"],
  ["one-punch-man", "Saitama", "anilist", "One Punch Man", "Saitama", true],
  ["spy-x-family", "Anya Forger", "anilist", "SPY x FAMILY", "Anya", true],
  ["spy-x-family", "Loid Forger", "anilist", "SPY x FAMILY", "Loid"],
  ["chainsaw-man", "Denji", "anilist", "Chainsaw Man", "Denji", true],
  ["haikyu", "Shoyo Hinata", "anilist", "Haikyu!!", "Hinata", true],
  ["mob-psycho-100", "Mob", "anilist", "Mob Psycho 100", "Shigeo", true],
  ["steins-gate", "Rintaro Okabe", "anilist", "Steins;Gate", "Rintarou", true],
  ["code-geass", "Lelouch", "anilist", "Code Geass: Lelouch of the Rebellion", "Lelouch", true],
  ["tokyo-ghoul", "Ken Kaneki", "anilist", "Tokyo Ghoul", "Kaneki", true],
  ["sailor-moon", "Sailor Moon", "anilist", "Sailor Moon", "Usagi", true],
  ["pokemon", "Pikachu", "anilist", "Pocket Monsters", "Pikachu", true],
  ["pokemon", "Sacha", "anilist", "Pocket Monsters", "Satoshi"],
  ["les-chevaliers-du-zodiaque", "Seiya", "anilist", "Saint Seiya", "Seiya", true],
  ["olive-et-tom", "Olive", "anilist", "Captain Tsubasa", "Tsubasa", true],
  ["vinland-saga", "Thorfinn", "anilist", "Vinland Saga", "Thorfinn", true],
  ["frieren", "Frieren", "anilist", "Frieren: Beyond Journey's End", "Frieren", true],
  ["bleach", "Ichigo Kurosaki", "anilist", "Bleach", "Ichigo", true],
  ["black-clover", "Asta", "anilist", "Black Clover", "Asta", true],
  ["blue-lock", "Yoichi Isagi", "anilist", "Blue Lock", "Isagi", true],
  ["the-promised-neverland", "Emma", "anilist", "The Promised Neverland", "Emma", true],
  ["assassination-classroom", "Koro-sensei", "anilist", "Assassination Classroom", "Koro", true],
  ["assassination-classroom", "Nagisa Shiota", "anilist", "Assassination Classroom", "Nagisa"],
  ["dr-stone", "Senku Ishigami", "anilist", "Dr. Stone", "Senkuu", true],
  ["dr-stone", "Chrome", "anilist", "Dr. Stone", "Chrome"],

  // Films d'animation japonais
  ["le-voyage-de-chihiro", "Chihiro", "anilist", "Spirited Away", "Chihiro", true],
  ["le-voyage-de-chihiro", "Sans-Visage", "anilist", "Spirited Away", "Kaonashi"],
  ["mon-voisin-totoro", "Totoro", "anilist", "My Neighbor Totoro", "Totoro", true],
  ["princesse-mononoke", "San", "anilist", "Princess Mononoke", "San", true],
  ["your-name", "Mitsuha Miyamizu", "anilist", "Your Name.", "Mitsuha", true],
  ["akira", "Kaneda", "anilist", "Akira", "Kaneda", true],
  ["le-chateau-ambulant", "Hauru", "anilist", "Howl's Moving Castle", "Howl", true],
  ["le-tombeau-des-lucioles", "Setsuko", "anilist", "Grave of the Fireflies", "Setsuko", true],
];

const rows = JSON.parse(readFileSync(new URL("../src/data/works.json", import.meta.url), "utf8"));
const works = Object.fromEntries(rows.map((r) => [r[0], { year: r[3], rarity: r[6] }]));
const LOWER = { mythique: "legendaire", legendaire: "epique", epique: "rare", rare: "commune", commune: "commune" };

function slug(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Image principale de chaque article, via l'API REST de Wikipédia (un titre à la fois).
 * Wikipédia limite le débit des adresses partagées : on espace les requêtes, on attend après chaque
 * refus (429) et on garde les réponses dans un cache pour ne jamais redemander un titre déjà obtenu.
 */
const CACHE_FILE = new URL("./.wiki-cache.json", import.meta.url);
function readWikiCache() {
  try {
    return Object.fromEntries(Object.entries(JSON.parse(readFileSync(CACHE_FILE, "utf8"))).filter(([, v]) => v));
  } catch {
    return {};
  }
}
async function wikiImages(titles) {
  let cache = {};
  try {
    cache = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  } catch {}
  for (const [i, title] of titles.entries()) {
    if (title in cache) continue;
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
    let res;
    for (let attempt = 0; attempt < 10; attempt++) {
      res = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
      if (res.status !== 429) break;
      await sleep((Math.max(Number(res.headers.get("retry-after")) || 0, 30) + 5) * 1000);
    }
    if (res.status === 404) {
      cache[title] = null;
    } else if (res.ok) {
      const d = await res.json();
      const img = d.originalimage?.source ?? d.thumbnail?.source;
      cache[title] = img
        ? { image: img.split("?")[0], file: decodeURIComponent(img.split("?")[0].split("/").pop()), source: d.content_urls?.desktop?.page }
        : null;
    } else {
      console.error(`${title} : HTTP ${res.status}, ignoré pour cette fois`);
      continue;
    }
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
    console.error(`[${i + 1}/${titles.length}] ${title} → ${cache[title]?.file ?? "aucune image"}`);
    await sleep(8000);
  }
  return Object.fromEntries(Object.entries(cache).filter(([, v]) => v));
}

const ANILIST_QUERY = `query ($search: String) {
  Page(perPage: 8) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      format startDate { year }
      characters(sort: [ROLE, FAVOURITES_DESC], perPage: 40) { nodes { name { full } image { large } siteUrl } }
    }
  }
}`;

async function anilistMedia(search, year) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: ANILIST_QUERY, variables: { search } }),
    });
    if (res.status === 429) {
      await sleep(30000);
      continue;
    }
    if (!res.ok) throw new Error(`AniList : HTTP ${res.status}`);
    const media = (await res.json()).data.Page.media;
    return (
      media.find((m) => m.startDate?.year === year && ["TV", "MOVIE"].includes(m.format)) ??
      media.find((m) => m.startDate?.year === year) ??
      media[0]
    );
  }
  throw new Error("AniList : trop de requêtes");
}

const wikiTitles = [...new Set(CANDIDATES.filter((c) => c[2] === "wiki").map((c) => c[3]))];
const wiki = process.argv.includes("--wiki") ? await wikiImages(wikiTitles) : readWikiCache();
const anilistCache = {};
const cards = [];
const missing = [];

for (const [workId, name, source, query, prefer, main] of CANDIDATES) {
  const work = works[workId];
  if (!work) throw new Error(`œuvre inconnue : ${workId}`);
  let found = null;
  if (source === "wiki") {
    const hit = wiki[query];
    found = {
      image: hit?.image,
      source: hit?.source ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/ /g, "_"))}`,
      credit: "Wikipédia",
      file: hit?.file ?? "(image cherchée par le navigateur)",
      wiki: query,
    };
  } else {
    const key = `${query}|${work.year}`;
    if (!anilistCache[key]) {
      anilistCache[key] = await anilistMedia(query, work.year);
      await sleep(2200);
    }
    const nodes = anilistCache[key]?.characters.nodes ?? [];
    const node = nodes.find((n) => n.name.full.toLowerCase().includes(prefer.toLowerCase()));
    if (node) found = { image: node.image.large, source: node.siteUrl, credit: "AniList", file: node.name.full };
  }
  if (!found) {
    missing.push(`${workId} · ${name}`);
    continue;
  }
  cards.push({
    id: slug(name) === slug(workId) ? slug(name) : slug(`${name}`),
    name,
    work: workId,
    rarity: main ? work.rarity : LOWER[work.rarity],
    ...(found.image ? { image: found.image } : {}),
    ...(found.wiki ? { wiki: found.wiki } : {}),
    source: found.source,
    credit: found.credit,
  });
  console.log(`${workId.padEnd(34)} ${name.padEnd(26)} ${found.credit.padEnd(10)} ${found.file}`);
}

const ids = new Set();
for (const c of cards) {
  if (ids.has(c.id)) c.id = `${c.id}-${c.work}`;
  ids.add(c.id);
}

writeFileSync(new URL("../src/data/cards.json", import.meta.url), JSON.stringify(cards, null, 2) + "\n");
console.log(`\n${cards.length} cartes, ${missing.length} personnages sans image :`);
console.log(missing.join("\n"));
