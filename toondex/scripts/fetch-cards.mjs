// Construit src/data/cards.json : une carte par personnage, avec son image réelle.
//
// Sources (toutes gratuites, sans clé) :
// - Séries et séries animées : TVMaze (distribution de la série, image du personnage dans son rôle).
// - Films Disney et Pixar : Disney API (images du wiki Disney de Fandom).
// - Autres films : image de l'article Wikipédia du personnage (cache scripts/.wiki-cache.json).
// - Anime et films d'animation japonais : AniList.
// Les images restent la propriété de leurs ayants droit ; usage non commercial, source citée.
// Un personnage sans image est écarté : aucune carte sans son personnage.
//
// Usage : node scripts/fetch-cards.mjs          (derrière un proxy : NODE_USE_ENV_PROXY=1)
//         node scripts/fetch-cards.mjs --wiki   remplit d'abord le cache Wikipédia (lent : débit limité)
import { readFileSync, writeFileSync } from "node:fs";

const UA = "ToonDex/0.1 (projet personnel non commercial)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Séries : [recherche TVMaze, personnages voulus]. Le premier est le principal.
 * Un personnage : "extrait du nom TVMaze", ou [extrait, nom affiché, article Wikipédia de secours].
 * Un nombre à la place de la liste : les N premiers personnages de la distribution qui ont une image.
 */
const SERIES = {
  "breaking-bad": ["Breaking Bad", ["Walter White", "Jesse Pinkman"]],
  "game-of-thrones": ["Game of Thrones", [["Jon Snow", "Jon Snow"], "Daenerys", "Tyrion"]],
  "the-walking-dead": ["The Walking Dead", [["Rick Grimes", "Rick Grimes", "Rick Grimes"], "Daryl"]],
  "prison-break": ["Prison Break", [["Michael Scofield", "Michael Scofield"], ["Lincoln", "Lincoln Burrows"]]],
  "stranger-things": ["Stranger Things", [["Eleven", "Eleven", "Eleven (Stranger Things)"], "Dustin", "Hopper"]],
  "the-office": ["The Office", [["Michael Scott", "Michael Scott", "Michael Scott (The Office)"], ["Dwight", "Dwight Schrute"]]],
  friends: ["Friends", ["Rachel Green", ["Joey", "Joey Tribbiani", "Joey Tribbiani"], ["Chandler", "Chandler Bing", "Chandler Bing"]]],
  lost: ["Lost", [["Jack Shephard", "Jack Shephard"], ["Kate", "Kate Austen"]]],
  sherlock: ["Sherlock", ["Sherlock Holmes", ["John Watson", "John Watson"]]],
  "peaky-blinders": ["Peaky Blinders", ["Tommy Shelby", "Arthur Shelby"]],
  "la-casa-de-papel": ["La Casa de Papel", [["Profesor", "Le Professeur"], ["Tokio", "Tokyo"]]],
  dark: ["Dark", ["Jonas"]],
  "the-crown": ["The Crown", ["Elizabeth"]],
  "the-mandalorian": ["The Mandalorian", [["Mandalorian", "Le Mandalorien", "Din Djarin"], ["Grogu", "Grogu", "Grogu"]]],
  "squid-game": ["Squid Game", [["Gi Hun", "Seong Gi-hun", "Seong Gi-hun"]]],
  lupin: ["Lupin", ["Assane Diop"]],
  kaamelott: ["Kaamelott", ["Arthur", "Perceval"]],
  "le-bureau-des-legendes": ["Le Bureau des Légendes", [["Debailly", "Malotru"]]],
  mercredi: ["Wednesday", [["Wednesday", "Mercredi Addams"]]],
  "the-last-of-us": ["The Last of Us", [["Joel", "Joel"], ["Ellie", "Ellie"]]],
  "better-call-saul": ["Better Call Saul", [["Jimmy McGill", "Saul Goodman", "Saul Goodman"], ["Kim Wexler", "Kim Wexler", "Kim Wexler"]]],
  dexter: ["Dexter", ["Dexter Morgan"]],
  "les-soprano": ["The Sopranos", ["Tony Soprano"]],
  "the-wire": ["The Wire", [["McNulty", "Jimmy McNulty", "Jimmy McNulty"], ["Omar", "Omar Little", "Omar Little"]]],
  "mad-men": ["Mad Men", [["Don Draper", "Don Draper", "Don Draper"]]],
  "the-boys": ["The Boys", [["Homelander", "Le Protecteur"], ["Butcher", "Billy Butcher"]]],
  "doctor-who": ["Doctor Who", 1],
  "twin-peaks": ["Twin Peaks", [["Dale Cooper", "Dale Cooper", "Dale Cooper"], ["Laura Palmer", "Laura Palmer", "Laura Palmer"]]],
  "how-i-met-your-mother": ["How I Met Your Mother", [["Barney", "Barney Stinson"], ["Ted Mosby", "Ted Mosby", "Ted Mosby"]]],
  "brooklyn-nine-nine": ["Brooklyn Nine-Nine", ["Jake Peralta"]],
  severance: ["Severance", ["Mark"]],
  chernobyl: ["Chernobyl", ["Legasov"]],
  narcos: ["Narcos", [["Escobar", "Pablo Escobar"]]],
  "rick-et-morty": ["Rick and Morty", ["Rick Sanchez", "Morty Smith"]],
  clarence: ["Clarence", ["Clarence", "Jeff"]],
  "les-simpson": ["The Simpsons", ["Homer", "Bart", "Marge", "Lisa"]],
  "south-park": ["South Park", [["Cartman", "Eric Cartman", "Eric Cartman"], ["Kenny", "Kenny McCormick", "Kenny McCormick"]]],
  "bob-l-eponge": ["SpongeBob SquarePants", [["SpongeBob", "Bob l’éponge", "SpongeBob SquarePants (character)"], ["Patrick", "Patrick l’étoile de mer", "Patrick Star"]]],
  "adventure-time": ["Adventure Time", [["Finn", "Finn l’humain", "Finn the Human"], ["Jake", "Jake le chien", "Jake the Dog"]]],
  "gravity-falls": ["Gravity Falls", ["Dipper", "Mabel"]],
  "avatar-le-dernier-maitre-de-l-air": ["Avatar: The Last Airbender", [["Aang", "Aang", "Aang"], ["Zuko", "Zuko", "Zuko"]]],
  futurama: ["Futurama", [["Fry", "Fry", "Philip J. Fry"], ["Bender", "Bender", "Bender (Futurama)"]]],
  "regular-show": ["Regular Show", ["Mordecai", "Rigby"]],
  "le-monde-incroyable-de-gumball": ["The Amazing World of Gumball", ["Gumball", "Darwin"]],
  "steven-universe": ["Steven Universe", [["Steven", "Steven Universe", "Steven Universe (character)"]]],
  "bojack-horseman": ["BoJack Horseman", ["BoJack"]],
  arcane: ["Arcane", ["Jinx", "Vi"]],
  "les-griffin": ["Family Guy", [["Peter", "Peter Griffin", "Peter Griffin"], ["Stewie", "Stewie Griffin", "Stewie Griffin"]]],
  "phineas-et-ferb": ["Phineas and Ferb", [["Phineas", "Phineas Flynn"], ["Perry", "Perry l’ornithorynque", "Perry the Platypus"]]],
  "les-razmoket": ["Rugrats", [["Tommy", "Tommy Pickles", "Tommy Pickles"]]],
  "batman-la-serie-animee": ["Batman: The Animated Series", ["Batman"]],
  "over-the-garden-wall": ["Over the Garden Wall", ["Wirt", "Greg"]],
  invincible: ["Invincible", [["Mark Grayson", "Invincible"]]],
  archer: ["Archer", [["Sterling Archer", "Sterling Archer", "Sterling Archer"]]],
};

/** Films Disney et Pixar : noms exacts dans Disney API. Le premier est le principal. */
const DISNEY = {
  "le-roi-lion": ["Simba", "Mufasa", "Scar"],
  "la-reine-des-neiges": ["Elsa", "Anna", "Olaf"],
  "wall-e": ["WALL-E"],
};

/** Autres films : [œuvre, nom affiché, article Wikipédia, principal ?]. */
const WIKI_FILMS = [
  ["le-parrain", "Vito Corleone", "Vito Corleone", true],
  ["le-parrain", "Michael Corleone", "Michael Corleone"],
  ["star-wars-un-nouvel-espoir", "Dark Vador", "Darth Vader", true],
  ["star-wars-un-nouvel-espoir", "Luke Skywalker", "Luke Skywalker"],
  ["star-wars-un-nouvel-espoir", "Princesse Leia", "Princess Leia"],
  ["star-wars-un-nouvel-espoir", "Han Solo", "Han Solo"],
  ["star-wars-un-nouvel-espoir", "Chewbacca", "Chewbacca"],
  ["star-wars-un-nouvel-espoir", "R2-D2", "R2-D2"],
  ["pulp-fiction", "Mia Wallace", "Mia Wallace", true],
  ["the-dark-knight", "Le Joker", "Joker (The Dark Knight)", true],
  ["matrix", "Neo", "Neo (The Matrix)", true],
  ["matrix", "Trinity", "Trinity (The Matrix)"],
  ["matrix", "Morpheus", "Morpheus (The Matrix)"],
  ["matrix", "Agent Smith", "Agent Smith"],
  ["la-communaute-de-l-anneau", "Gollum", "Gollum", true],
  ["retour-vers-le-futur", "Marty McFly", "Marty McFly", true],
  ["retour-vers-le-futur", "Doc Brown", "Emmett Brown"],
  ["jurassic-park", "Ian Malcolm", "Ian Malcolm (character)", true],
  ["fight-club", "Tyler Durden", "Tyler Durden", true],
  ["harry-potter-a-l-ecole-des-sorciers", "Harry Potter", "Harry Potter (character)", true],
  ["harry-potter-a-l-ecole-des-sorciers", "Hermione Granger", "Hermione Granger"],
  ["harry-potter-a-l-ecole-des-sorciers", "Ron Weasley", "Ron Weasley"],
  ["harry-potter-a-l-ecole-des-sorciers", "Albus Dumbledore", "Albus Dumbledore"],
  ["avengers-endgame", "Iron Man", "Tony Stark (Marvel Cinematic Universe)", true],
  ["avengers-endgame", "Thanos", "Thanos (Marvel Cinematic Universe)"],
  ["avengers-endgame", "Captain America", "Steve Rogers (Marvel Cinematic Universe)"],
  ["le-silence-des-agneaux", "Hannibal Lecter", "Hannibal Lecter", true],
  ["le-silence-des-agneaux", "Clarice Starling", "Clarice Starling"],
  ["alien", "Ellen Ripley", "Ellen Ripley", true],
  ["alien", "Le Xénomorphe", "Alien (creature in Alien franchise)"],
  ["mad-max-fury-road", "Max Rockatansky", "Max Rockatansky", true],
  ["shrek", "Shrek", "Shrek (character)", true],
  ["shrek", "L’Âne", "Donkey (Shrek)"],
  ["les-indestructibles", "Edna Mode", "Edna Mode", true],
  ["toy-story", "Woody", "Woody (Toy Story)", true],
  ["toy-story", "Buzz l’Éclair", "Buzz Lightyear"],
];

/** Anime : [œuvre, nom affiché, recherche AniList, personnage voulu, principal ?]. */
const ANIME = [
  ["one-piece", "Monkey D. Luffy", "One Piece", "Luffy", true],
  ["one-piece", "Roronoa Zoro", "One Piece", "Zoro"],
  ["naruto", "Naruto Uzumaki", "Naruto", "Naruto Uzumaki", true],
  ["naruto", "Kakashi Hatake", "Naruto", "Kakashi"],
  ["dragon-ball", "Son Goku", "Dragon Ball", "Gokuu", true],
  ["dragon-ball-z", "Vegeta", "Dragon Ball Z", "Vegeta", true],
  ["l-attaque-des-titans", "Eren Jäger", "Attack on Titan", "Eren", true],
  ["l-attaque-des-titans", "Livaï Ackerman", "Attack on Titan", "Levi"],
  ["death-note", "L", "Death Note", "L Lawliet", true],
  ["death-note", "Light Yagami", "Death Note", "Light Yagami"],
  ["fullmetal-alchemist-brotherhood", "Edward Elric", "Fullmetal Alchemist: Brotherhood", "Edward Elric", true],
  ["demon-slayer", "Tanjiro Kamado", "Demon Slayer: Kimetsu no Yaiba", "Tanjirou", true],
  ["demon-slayer", "Nezuko Kamado", "Demon Slayer: Kimetsu no Yaiba", "Nezuko"],
  ["jujutsu-kaisen", "Satoru Gojo", "Jujutsu Kaisen", "Satoru", true],
  ["jujutsu-kaisen", "Yuji Itadori", "Jujutsu Kaisen", "Itadori"],
  ["my-hero-academia", "Izuku Midoriya", "My Hero Academia", "Izuku Midoriya", true],
  ["hunter-x-hunter", "Gon Freecss", "Hunter x Hunter (2011)", "Gon", true],
  ["hunter-x-hunter", "Killua Zoldyck", "Hunter x Hunter (2011)", "Killua"],
  ["cowboy-bebop", "Spike Spiegel", "Cowboy Bebop", "Spike", true],
  ["neon-genesis-evangelion", "Shinji Ikari", "Neon Genesis Evangelion", "Shinji", true],
  ["neon-genesis-evangelion", "Asuka Langley", "Neon Genesis Evangelion", "Asuka"],
  ["one-punch-man", "Saitama", "One Punch Man", "Saitama", true],
  ["spy-x-family", "Anya Forger", "SPY x FAMILY", "Anya", true],
  ["spy-x-family", "Loid Forger", "SPY x FAMILY", "Loid"],
  ["chainsaw-man", "Denji", "Chainsaw Man", "Denji", true],
  ["haikyu", "Shoyo Hinata", "Haikyu!!", "Hinata", true],
  ["mob-psycho-100", "Mob", "Mob Psycho 100", "Shigeo", true],
  ["steins-gate", "Rintaro Okabe", "Steins;Gate", "Rintarou", true],
  ["code-geass", "Lelouch", "Code Geass: Lelouch of the Rebellion", "Lelouch", true],
  ["tokyo-ghoul", "Ken Kaneki", "Tokyo Ghoul", "Kaneki", true],
  ["sailor-moon", "Sailor Moon", "Sailor Moon", "Usagi", true],
  ["pokemon", "Pikachu", "Pocket Monsters", "Pikachu", true],
  ["pokemon", "Sacha", "Pocket Monsters", "Satoshi"],
  ["les-chevaliers-du-zodiaque", "Seiya", "Saint Seiya", "Seiya", true],
  ["olive-et-tom", "Olive", "Captain Tsubasa", "Tsubasa", true],
  ["vinland-saga", "Thorfinn", "Vinland Saga", "Thorfinn", true],
  ["frieren", "Frieren", "Frieren: Beyond Journey's End", "Frieren", true],
  ["bleach", "Ichigo Kurosaki", "Bleach", "Ichigo", true],
  ["black-clover", "Asta", "Black Clover", "Asta", true],
  ["blue-lock", "Yoichi Isagi", "Blue Lock", "Isagi", true],
  ["the-promised-neverland", "Emma", "The Promised Neverland", "Emma", true],
  ["assassination-classroom", "Koro-sensei", "Assassination Classroom", "Koro", true],
  ["assassination-classroom", "Nagisa Shiota", "Assassination Classroom", "Nagisa"],
  ["dr-stone", "Senku Ishigami", "Dr. Stone", "Senkuu", true],
  ["dr-stone", "Chrome", "Dr. Stone", "Chrome"],
  ["le-voyage-de-chihiro", "Chihiro", "Spirited Away", "Chihiro", true],
  ["le-voyage-de-chihiro", "Sans-Visage", "Spirited Away", "Kaonashi"],
  ["mon-voisin-totoro", "Totoro", "My Neighbor Totoro", "Totoro", true],
  ["princesse-mononoke", "San", "Princess Mononoke", "San", true],
  ["your-name", "Mitsuha Miyamizu", "Your Name.", "Mitsuha", true],
  ["akira", "Kaneda", "Akira", "Kaneda", true],
  ["le-chateau-ambulant", "Hauru", "Howl's Moving Castle", "Howl", true],
  ["le-tombeau-des-lucioles", "Setsuko", "Grave of the Fireflies", "Setsuko", true],
];

/** Noms français usuels. */
const FRENCH = {
  "SpongeBob SquarePants": "Bob l’éponge",
  "Patrick Star": "Patrick l’étoile de mer",
  "Squidward Tentacles": "Carlo Tentacule",
  "Mr. Krabs": "M. Krabs",
  Finn: "Finn l’humain",
  "Finn the Human": "Finn l’humain",
  Jake: "Jake le chien",
  "Jake the Dog": "Jake le chien",
  "Perry the Platypus": "Perry l’ornithorynque",
  "Wednesday Addams": "Mercredi Addams",
  Blossom: "Belle",
  Bubbles: "Bulle",
  Buttercup: "Rebelle",
  Homelander: "Le Protecteur",
  "Buzz Lightyear": "Buzz l’Éclair",
  Joy: "Joie",
  Remy: "Rémy",
  "Mr. Incredible": "M. Indestructible",
};

const works = Object.fromEntries(
  JSON.parse(readFileSync(new URL("../src/data/works.json", import.meta.url), "utf8")).map((r) => [r[0], { year: r[3], rarity: r[6] }]),
);
const LOWER = { mythique: "legendaire", legendaire: "epique", epique: "rare", rare: "commune", commune: "commune" };

function slug(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getJson(url, init = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers ?? {}) } });
    if (res.status === 429) {
      await sleep((Math.max(Number(res.headers.get("retry-after")) || 0, 10) + 2) * 1000);
      continue;
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${url} : HTTP ${res.status}`);
    return res.json();
  }
  throw new Error(`${url} : trop de requêtes`);
}

/* ---------- TVMaze ---------- */

async function tvmazeCast(query, year) {
  const results = (await getJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`)) ?? [];
  const shows = results.map((r) => r.show);
  const yearOf = (s) => Number((s.premiered ?? "").slice(0, 4));
  const show =
    shows.find((s) => yearOf(s) === year) ??
    shows.find((s) => Math.abs(yearOf(s) - year) <= 2) ??
    shows.find((s) => s.name.toLowerCase() === query.toLowerCase());
  if (!show) return null;
  await sleep(600);
  const cast = (await getJson(`https://api.tvmaze.com/shows/${show.id}/cast`)) ?? [];
  const seen = new Set();
  const characters = [];
  for (const { character } of cast) {
    if (seen.has(character.id)) continue;
    seen.add(character.id);
    characters.push({
      name: character.name,
      image: character.image ? (character.image.original ?? character.image.medium) : null,
      source: character.url,
    });
  }
  return characters;
}

/* ---------- Disney API ---------- */

async function disneyCharacter(name) {
  const data = await getJson(`https://api.disneyapi.dev/character?name=${encodeURIComponent(name)}`);
  const list = Array.isArray(data?.data) ? data.data : data?.data ? [data.data] : [];
  const exact = list.filter((c) => c.name.toLowerCase() === name.toLowerCase() && c.imageUrl);
  const best = exact.find((c) => /Profile_-_/.test(c.imageUrl)) ?? exact[0];
  return best ? { image: best.imageUrl.split("/revision/")[0], source: best.sourceUrl ?? best.url } : null;
}

/* ---------- Wikipédia (cache) ---------- */

const CACHE_FILE = new URL("./.wiki-cache.json", import.meta.url);
function readWikiCache() {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}
/** Une affiche de film n'est pas l'image d'un personnage (les affiches de personnage, elles, sont gardées). */
const NOT_A_CHARACTER = /\(\d{4}(_film)?\)_poster/i;

async function fillWikiCache(titles) {
  const cache = readWikiCache();
  for (const title of titles.filter((t) => !(t in cache))) {
    const d = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`);
    const img = d?.originalimage?.source ?? d?.thumbnail?.source;
    cache[title] = img
      ? { image: img.split("?")[0], file: decodeURIComponent(img.split("?")[0].split("/").pop()), source: d.content_urls?.desktop?.page }
      : null;
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
    await sleep(8000);
  }
}

/* ---------- AniList ---------- */

const ANILIST_QUERY = `query ($search: String) {
  Page(perPage: 8) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      format startDate { year }
      characters(sort: [ROLE, FAVOURITES_DESC], perPage: 40) { nodes { name { full } image { large } siteUrl } }
    }
  }
}`;
async function anilistMedia(search, year) {
  const data = await getJson("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_QUERY, variables: { search } }),
  });
  const media = data.data.Page.media;
  return (
    media.find((m) => m.startDate?.year === year && ["TV", "MOVIE"].includes(m.format)) ??
    media.find((m) => m.startDate?.year === year) ??
    media[0]
  );
}

/* ---------- Construction ---------- */

const cards = [];
const missing = [];
function add(work, name, main, image, source, credit) {
  // Les miniatures Wikimedia sont aussi servies par upload.wikimedia.org, l'adresse principale.
  image = image.replace("https://thumb.wikimedia.org/", "https://upload.wikimedia.org/");
  const w = works[work];
  if (!w) throw new Error(`œuvre inconnue : ${work}`);
  cards.push({ id: slug(name), name, work, rarity: main ? w.rarity : LOWER[w.rarity], image, source, credit });
  console.log(`${work.padEnd(34)} ${name.padEnd(28)} ${credit}`);
}

const wikiForSeries = readWikiCache();
for (const [work, [query, picks]] of Object.entries(SERIES)) {
  const cast = await tvmazeCast(query, works[work].year);
  if (!cast) {
    missing.push(`${work} : série introuvable sur TVMaze`);
    continue;
  }
  if (typeof picks === "number") {
    cast.filter((c) => c.image).slice(0, picks).forEach((c, i) => add(work, FRENCH[c.name] ?? c.name, i === 0, c.image, c.source, "TVMaze"));
  } else {
    let first = true;
    for (const pick of picks) {
      const [match, display, wikiTitle] = Array.isArray(pick) ? pick : [pick];
      const c = cast.find((x) => x.name.toLowerCase().includes(match.toLowerCase()));
      const name = display ?? (c ? (FRENCH[c.name] ?? c.name) : match);
      const fallback = wikiTitle ? wikiForSeries[wikiTitle] : null;
      if (c?.image) add(work, name, first, c.image, c.source, "TVMaze");
      else if (fallback) add(work, name, first, fallback.image, fallback.source, "Wikipédia");
      else {
        missing.push(`${work} · ${name}${c ? " (pas d'image)" : " (absent de TVMaze)"}`);
        continue;
      }
      first = false;
    }
  }
  await sleep(600);
}

for (const [work, names] of Object.entries(DISNEY)) {
  for (const [i, name] of names.entries()) {
    const c = await disneyCharacter(name);
    if (c) add(work, FRENCH[name] ?? name, i === 0, c.image, c.source, "Disney API");
    else missing.push(`${work} · ${name}`);
    await sleep(400);
  }
}

if (process.argv.includes("--wiki")) await fillWikiCache(WIKI_FILMS.map((f) => f[2]));
const wiki = readWikiCache();
for (const [work, name, title, main] of WIKI_FILMS) {
  const hit = wiki[title];
  if (hit && !NOT_A_CHARACTER.test(hit.file ?? "")) add(work, name, !!main, hit.image, hit.source, "Wikipédia");
  else missing.push(`${work} · ${name}${hit ? " (affiche, écartée)" : ""}`);
}

const anilistCache = {};
for (const [work, name, search, prefer, main] of ANIME) {
  const key = `${search}|${works[work].year}`;
  if (!anilistCache[key]) {
    anilistCache[key] = await anilistMedia(search, works[work].year);
    await sleep(2200);
  }
  const node = (anilistCache[key]?.characters.nodes ?? []).find((n) => n.name.full.toLowerCase().includes(prefer.toLowerCase()));
  if (node) add(work, name, !!main, node.image.large, node.siteUrl, "AniList");
  else missing.push(`${work} · ${name}`);
}

const ids = new Set();
for (const c of cards) {
  if (ids.has(c.id)) c.id = `${c.id}-${c.work}`;
  ids.add(c.id);
}

writeFileSync(new URL("../src/data/cards.json", import.meta.url), JSON.stringify(cards, null, 2) + "\n");
console.log(`\n${cards.length} cartes, ${new Set(cards.map((c) => c.work)).size} œuvres. Écartés :`);
console.log(missing.join("\n"));
