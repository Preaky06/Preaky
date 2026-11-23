// Récupère, pour chaque anime et film d'animation japonais du catalogue, le personnage principal
// le plus populaire sur AniList (nom + image officielle), et l'enregistre dans src/data/characters.json.
// Les images restent la propriété de leurs ayants droit ; AniList autorise un usage non commercial.
// Usage : node scripts/fetch-characters.mjs   (derrière un proxy : NODE_USE_ENV_PROXY=1)
import { readFileSync, writeFileSync } from "node:fs";

const SEARCH = {
  "one-piece": "One Piece",
  naruto: "Naruto",
  "dragon-ball": "Dragon Ball",
  "dragon-ball-z": "Dragon Ball Z",
  "l-attaque-des-titans": "Attack on Titan",
  "death-note": "Death Note",
  "fullmetal-alchemist-brotherhood": "Fullmetal Alchemist: Brotherhood",
  "demon-slayer": "Demon Slayer: Kimetsu no Yaiba",
  "jujutsu-kaisen": "Jujutsu Kaisen",
  "my-hero-academia": "My Hero Academia",
  "hunter-x-hunter": "Hunter x Hunter (2011)",
  "cowboy-bebop": "Cowboy Bebop",
  "neon-genesis-evangelion": "Neon Genesis Evangelion",
  "one-punch-man": "One Punch Man",
  "spy-x-family": "SPY x FAMILY",
  "chainsaw-man": "Chainsaw Man",
  haikyu: "Haikyu!!",
  "mob-psycho-100": "Mob Psycho 100",
  "steins-gate": "Steins;Gate",
  "code-geass": "Code Geass: Lelouch of the Rebellion",
  "tokyo-ghoul": "Tokyo Ghoul",
  "sailor-moon": "Sailor Moon",
  pokemon: "Pocket Monsters",
  "les-chevaliers-du-zodiaque": "Saint Seiya",
  "olive-et-tom": "Captain Tsubasa",
  "vinland-saga": "Vinland Saga",
  frieren: "Frieren: Beyond Journey's End",
  bleach: "Bleach",
  "black-clover": "Black Clover",
  "blue-lock": "Blue Lock",
  "the-promised-neverland": "The Promised Neverland",
  "assassination-classroom": "Assassination Classroom",
  "dr-stone": "Dr. Stone",
  "le-voyage-de-chihiro": "Spirited Away",
  "mon-voisin-totoro": "My Neighbor Totoro",
  "princesse-mononoke": "Princess Mononoke",
  "your-name": "Your Name.",
  akira: "Akira",
  "le-chateau-ambulant": "Howl's Moving Castle",
  "le-tombeau-des-lucioles": "Grave of the Fireflies",
};

/** Personnage voulu quand le plus populaire n'est pas celui qu'on associe à l'œuvre (souvent celui du titre). */
const PREFER = {
  naruto: "Naruto Uzumaki",
  pokemon: "Pikachu",
  "les-chevaliers-du-zodiaque": "Seiya",
  "the-promised-neverland": "Emma",
  "le-voyage-de-chihiro": "Chihiro",
  "my-hero-academia": "Izuku Midoriya",
  "mob-psycho-100": "Shigeo Kageyama",
  "dragon-ball-z": "Vegeta",
  "chainsaw-man": "Denji",
  "spy-x-family": "Anya",
  "hunter-x-hunter": "Gon",
  "blue-lock": "Yoichi Isagi",
  "assassination-classroom": "Koro",
  "steins-gate": "Rintarou Okabe",
};

const QUERY = `query ($search: String) {
  Page(perPage: 8) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id siteUrl format startDate { year } title { romaji english }
      characters(sort: [ROLE, FAVOURITES_DESC], perPage: 25) { edges { role node { name { full } image { large } siteUrl } } }
    }
  }
}`;

const rows = JSON.parse(readFileSync(new URL("../src/data/works.json", import.meta.url), "utf8"));
const years = Object.fromEntries(rows.map((r) => [r[0], r[3]]));
const out = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [id, search] of Object.entries(SEARCH)) {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { search } }),
  });
  if (!res.ok) {
    console.error(`${id} : HTTP ${res.status}`);
    await sleep(5000);
    continue;
  }
  const media = (await res.json()).data.Page.media;
  // L'œuvre dont l'année de début correspond au catalogue, sinon le premier résultat.
  const match =
    media.find((m) => m.startDate?.year === years[id] && ["TV", "MOVIE"].includes(m.format)) ??
    media.find((m) => m.startDate?.year === years[id]) ??
    media[0];
  const edges = match?.characters.edges ?? [];
  const wanted = PREFER[id]?.toLowerCase();
  const preferred = wanted && edges.find((e) => e.node.name.full.toLowerCase().includes(wanted));
  if (wanted && !preferred) console.error(`${id} : « ${PREFER[id]} » introuvable, personnage le plus populaire gardé`);
  const character = (preferred ?? edges.find((e) => e.role === "MAIN") ?? edges[0])?.node;
  if (!character) {
    console.error(`${id} : aucun personnage`);
  } else {
    out[id] = {
      name: character.name.full,
      image: character.image.large,
      source: character.siteUrl,
      anilist: match.siteUrl,
    };
    const flag = match.startDate?.year === years[id] ? "" : `  ⚠ année ${match.startDate?.year} ≠ ${years[id]}`;
    console.log(`${id.padEnd(34)} ${(match.title.english ?? match.title.romaji).padEnd(40)} → ${character.name.full}${flag}`);
  }
  await sleep(2200);
}

writeFileSync(new URL("../src/data/characters.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`${Object.keys(out).length} personnages enregistrés`);
