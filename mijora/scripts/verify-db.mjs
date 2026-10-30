// Vérifie le schéma, le jeu de données et les politiques RLS sur un PostgreSQL local jetable.
// Reproduit le strict nécessaire de Supabase : rôles anon / authenticated, schéma auth, fonction auth.uid().
//   node scripts/verify-db.mjs            (PG_BIN pour indiquer le dossier des binaires PostgreSQL)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PG_BIN = process.env.PG_BIN || ["16", "17", "15", "14"].map((v) => `/usr/lib/postgresql/${v}/bin`).find((d) => fs.existsSync(d));
if (!PG_BIN) throw new Error("PostgreSQL introuvable : indiquez PG_BIN.");
const enRoot = process.getuid?.() === 0;
const DOSSIER = fs.mkdtempSync(path.join(os.tmpdir(), "mijora-pg-"));
const PORT = "54329";
fs.chmodSync(DOSSIER, 0o777);
const commande = (bin, args, opts = {}) => {
  const [cmd, a] = enRoot ? ["runuser", ["-u", "postgres", "--", path.join(PG_BIN, bin), ...args]] : [path.join(PG_BIN, bin), args];
  return execFileSync(cmd, a, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts });
};
const DATA = path.join(DOSSIER, "data");
if (enRoot) execFileSync("chown", ["postgres", DOSSIER]);

let echecs = 0;
const ok = (cond, msg) => { console.log(`${cond ? "OK   " : "ÉCHEC"} ${msg}`); if (!cond) echecs++; };

// psql : chaque appel est une transaction ; on peut endosser un rôle et une identité (comme PostgREST)
function sql(requete, { role = null, uid = null, fichier = null } = {}) {
  const args = ["-h", DOSSIER, "-p", PORT, "-U", "postgres", "-d", "mijora", "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1"];
  if (fichier) return commande("psql", [...args, "-1", "-f", fichier]);
  const pre = ["begin;"];
  if (uid) pre.push(`set local request.jwt.claim.sub = '${uid}';`);
  if (role) pre.push(`set local role ${role};`);
  return commande("psql", [...args, "-c", pre.join(" ") + " " + requete + "; commit;"]).trim();
}
function refuse(requete, opts) {
  try { sql(requete, opts); return false; } catch (e) { return /permission denied|row-level security|violates/.test(e.stderr || e.message); }
}

try {
  commande("initdb", ["-D", DATA, "-U", "postgres", "--auth=trust", "-E", "UTF8", "--locale=C.UTF-8"]);
  commande("pg_ctl", ["-D", DATA, "-o", `-p ${PORT} -k ${DOSSIER} -c listen_addresses=''`, "-w", "-l", path.join(DOSSIER, "log"), "start"]);
  commande("psql", ["-h", DOSSIER, "-p", PORT, "-U", "postgres", "-X", "-q", "-c", "create database mijora"]);

  // Socle équivalent à Supabase
  const socle = path.join(DOSSIER, "socle.sql");
  fs.writeFileSync(socle, `
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  sql(null, { fichier: socle });
  for (const f of fs.readdirSync(path.join(RACINE, "supabase/migrations")).sort()) {
    const copie = path.join(DOSSIER, f);
    fs.copyFileSync(path.join(RACINE, "supabase/migrations", f), copie);
    sql(null, { fichier: copie });
    console.log(`     migration appliquée : ${f}`);
  }
  const seed = path.join(DOSSIER, "seed.sql");
  fs.copyFileSync(path.join(RACINE, "supabase/seed.sql"), seed);
  sql(null, { fichier: seed });
  console.log("     jeu de données chargé");

  // ---------------------------------------------------------------- contenu
  ok(sql("select count(*) from public.countries") === "195", "195 pays");
  ok(sql("select count(*) from public.recipes") === "34", "34 recettes");
  ok(sql("select count(*) from public.recipes where status = 'a_verifier' and is_demo") === "34", "toutes les recettes sont des démonstrations à vérifier");
  ok(sql("select count(distinct slug) = count(*) from public.countries") === "t", "slugs de pays uniques");
  ok(sql("select count(*) from public.recipe_diets") === String(34 * 11), "compatibilité calculée pour chaque recette et chaque régime");
  ok(sql("select count(*) from public.recipe_nutrition") === "0", "aucune valeur nutritionnelle inventée");

  // ---------------------------------------------------------------- utilisateurs de test
  const ADMIN = "00000000-0000-4000-8000-000000000001";
  const ALICE = "00000000-0000-4000-8000-000000000002";
  const BOB = "00000000-0000-4000-8000-000000000003";
  sql(`insert into auth.users (id, email) values ('${ADMIN}', 'admin@test'), ('${ALICE}', 'alice@test'), ('${BOB}', 'bob@test')`);
  ok(sql("select count(*) from public.profiles") === "3", "profil créé automatiquement à l'inscription");
  sql(`update public.profiles set role = 'admin' where id = '${ADMIN}'`);

  // ---------------------------------------------------------------- visiteur anonyme
  const anon = { role: "anon" };
  ok(sql("select count(*) from public.recipes", anon) === "34", "visiteur : lit les recettes de démonstration");
  ok(sql("select count(*) from public.recipe_ingredients", anon) !== "0", "visiteur : lit les ingrédients des recettes visibles");
  ok(refuse("insert into public.recipes (title_fr, slug, introduction, country_id, category, preparation_time, difficulty, estimated_budget, servings) values ('x', 'x', 'x', 1, 'entree', 5, 'facile', 'economique', 2)", anon), "visiteur : ne peut pas créer de recette");
  ok(refuse("select count(*) from public.favorites", anon), "visiteur : aucun accès aux favoris");
  ok(refuse("select count(*) from public.profiles", anon), "visiteur : aucun accès aux profils");
  ok(sql("insert into public.newsletter_subscribers (email) values ('lecteur@exemple.fr')", anon) === "", "visiteur : peut s'inscrire à la lettre");
  ok(refuse("select count(*) from public.newsletter_subscribers", anon), "visiteur : ne peut pas lire les inscrits");
  ok(refuse("insert into public.newsletter_subscribers (email, confirmed_at) values ('x@exemple.fr', now())", anon), "visiteur : ne peut pas se déclarer confirmé");
  ok(Number(sql("select count(*) from public.rechercher_recettes(q => 'lentilles')", anon)) >= 2, "recherche plein texte « lentilles » : " + sql("select string_agg(title_fr, ', ') from public.rechercher_recettes(q => 'lentilles')", anon));
  ok(sql("select string_agg(title_fr, ', ') from public.rechercher_recettes(pays => 'japon', regimes => array['vegetarien'], temps_max => 30)", anon) === "Soupe miso", "recherche combinée Japon + végétarien + 30 min → Soupe miso");
  ok(!sql("select coalesce(string_agg(r.slug, ','), '') from public.rechercher_recettes(sans_allergenes => array['gluten'], limite => 100) r", anon).includes("pancakes"), "recherche sans gluten : exclut les pancakes");

  // ---------------------------------------------------------------- utilisateur connecté
  const alice = { role: "authenticated", uid: ALICE };
  const bob = { role: "authenticated", uid: BOB };
  ok(sql("insert into public.favorites (recipe_id) values (1) returning user_id", alice).endsWith(ALICE), "Alice : ajoute un favori (rattaché à son compte)");
  ok(refuse(`insert into public.favorites (user_id, recipe_id) values ('${BOB}', 2)`, alice), "Alice : ne peut pas créer un favori au nom de Bob");
  sql("insert into public.favorites (recipe_id) values (3)", bob);
  ok(sql("select count(*) from public.favorites", alice) === "1", "Alice : ne voit que ses favoris");
  ok(sql("delete from public.favorites where user_id <> auth.uid() returning id", alice) === "", "Alice : ne peut pas supprimer les favoris de Bob");
  const liste = sql("insert into public.shopping_lists (name) values ('Courses') returning id", alice).split("\n").pop();
  ok(sql(`insert into public.shopping_list_items (shopping_list_id, ingredient_id, quantity, unit) values (${liste}, 1, 2, 'gousse') returning id`, alice) !== "", "Alice : ajoute un article à sa liste");
  ok(refuse(`insert into public.shopping_list_items (shopping_list_id, label) values (${liste}, 'intrus')`, bob), "Bob : ne peut pas écrire dans la liste d'Alice");
  ok(sql("select count(*) from public.shopping_list_items", bob) === "0", "Bob : ne voit pas les articles d'Alice");
  const coll = sql("insert into public.collections (name) values ('Hiver') returning id", alice).split("\n").pop();
  ok(refuse(`insert into public.collection_recipes (collection_id, recipe_id) values (${coll}, 5)`, bob), "Bob : ne peut pas modifier la collection d'Alice");
  ok(refuse(`update public.profiles set role = 'admin' where id = '${ALICE}'`, alice), "Alice : ne peut pas se donner le rôle administrateur");
  ok(sql(`update public.profiles set preferences = '{"theme":"clair"}' where id = '${ALICE}' returning id`, alice) === ALICE, "Alice : modifie ses préférences");
  ok(sql("select count(*) from public.profiles", alice) === "1", "Alice : ne voit que son profil");
  ok(refuse("update public.recipes set title_fr = 'Piratée' where id = 1", alice) || sql("select title_fr from public.recipes where id = 1") !== "Piratée", "Alice : ne peut pas modifier une recette");
  ok(sql("update public.recipes set title_fr = 'Piratée' where id = 1 returning id", alice) === "", "Alice : la modification d'une recette n'affecte aucune ligne");

  // ---------------------------------------------------------------- administrateur
  const admin = { role: "authenticated", uid: ADMIN };
  ok(sql("update public.recipes set status = 'brouillon', is_demo = false where id = 2 returning status", admin) === "brouillon", "admin : passe une recette en brouillon");
  ok(sql("select count(*) from public.recipes", anon) === "33", "visiteur : ne voit plus la recette en brouillon");
  ok(sql("select count(*) from public.recipe_steps where recipe_id = 2", anon) === "0", "visiteur : ne voit pas non plus ses étapes");
  ok(refuse("update public.recipes set status = 'publie' where id = 3", admin), "admin : publication refusée sans source, date de vérification ni image autorisée");
  ok(sql("update public.recipes set status = 'publie', verification_date = current_date, image_license = 'CC BY 4.0', source_author = 'Rédaction MIJORA' where id = 3 returning published_at is not null", admin) === "t", "admin : publie une recette complète (date de publication renseignée)");
  ok(sql("select count(*) from public.editorial_events where recipe_id = 3", admin) === "2", "historique éditorial : création et publication journalisées");
  ok(refuse("select count(*) from public.editorial_events", alice) || sql("select count(*) from public.editorial_events", alice) === "0", "Alice : historique éditorial invisible");

  // ---------------------------------------------------------------- intégrité
  ok(refuse("insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity) values (1, 1, 2)"), "intégrité : une quantité exige une unité");
  ok(refuse("insert into public.recipes (title_fr, slug, introduction, country_id, category, preparation_time, difficulty, estimated_budget, servings) values ('x', 'Mauvais Slug', 'x', 1, 'entree', 5, 'facile', 'economique', 2)"), "intégrité : slug au format URL obligatoire");
  ok(refuse("insert into public.recipes (title_fr, slug, introduction, country_id, category, preparation_time, difficulty, estimated_budget, servings) values ('x', 'ratatouille', 'x', (select country_id from public.recipes where slug = 'ratatouille'), 'entree', 5, 'facile', 'economique', 2)"), "intégrité : slug unique par pays");
  ok(sql("select count(*) from pg_tables where schemaname = 'public' and not rowsecurity") === "0", "RLS activé sur toutes les tables publiques");
} catch (e) {
  echecs++;
  console.error("ERREUR", e.stderr || e.message);
} finally {
  try { commande("pg_ctl", ["-D", DATA, "-m", "fast", "stop"]); } catch { /* déjà arrêté */ }
  fs.rmSync(DOSSIER, { recursive: true, force: true });
}
console.log(echecs ? `\n${echecs} vérification(s) en échec` : "\nToutes les vérifications passent.");
process.exit(echecs ? 1 : 0);
