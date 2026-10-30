-- MIJORA · droits et politiques RLS
--   1. Les utilisateurs ne consultent et ne modifient que leurs propres favoris, collections, listes, menus et préférences.
--   2. Les données éditoriales publiques sont accessibles en lecture à tous (visiteurs compris).
--      Une recette n'est visible que publiée, ou marquée « démonstration » (affichée comme telle par le site).
--   3. Seuls les administrateurs (profiles.role = 'admin') créent, modifient et publient le contenu éditorial.
--   4. Le navigateur n'utilise que la clé publique « anon » : la clé service_role reste côté serveur.

-- ---------------------------------------------------------------- activation du RLS partout
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Visibilité d'un contenu éditorial à statut
create or replace function public.contenu_visible(statut public.statut_editorial, demo boolean) returns boolean
language sql stable set search_path = ''
as $$ select statut = 'publie' or (demo and statut = 'a_verifier') or public.est_admin() $$;

-- ---------------------------------------------------------------- privilèges de base
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant usage on schema extensions to anon, authenticated;

-- ---------------------------------------------------------------- contenu éditorial : lecture publique, écriture admin
do $$
declare
  t text;
  editoriales text[] := array[
    'locales', 'continents', 'countries', 'country_borders', 'regions', 'country_highlights', 'categories',
    'ingredient_families', 'units', 'allergens', 'ingredients', 'ingredient_allergens', 'diet_types', 'diet_type_points',
    'sources', 'recipes', 'recipe_steps', 'recipe_ingredients', 'recipe_substitutions', 'recipe_notes', 'recipe_nutrition',
    'recipe_diets', 'recipe_allergens', 'recipe_sources', 'traditions', 'tradition_countries', 'tradition_dishes',
    'recipe_traditions', 'articles', 'article_blocks', 'article_countries', 'article_recipes',
    'recipe_translations', 'recipe_step_translations', 'country_translations', 'ingredient_translations'];
begin
  foreach t in array editoriales loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "%s : écriture réservée aux administrateurs" on public.%I for all to authenticated using (public.est_admin()) with check (public.est_admin())', t, t);
  end loop;
end $$;

-- Référentiels : lecture libre
create policy "lecture publique" on public.locales for select to anon, authenticated using (true);
create policy "lecture publique" on public.continents for select to anon, authenticated using (true);
create policy "lecture publique" on public.countries for select to anon, authenticated using (true);
create policy "lecture publique" on public.country_borders for select to anon, authenticated using (true);
create policy "lecture publique" on public.regions for select to anon, authenticated using (true);
create policy "lecture publique" on public.country_highlights for select to anon, authenticated using (true);
create policy "lecture publique" on public.categories for select to anon, authenticated using (true);
create policy "lecture publique" on public.ingredient_families for select to anon, authenticated using (true);
create policy "lecture publique" on public.units for select to anon, authenticated using (true);
create policy "lecture publique" on public.allergens for select to anon, authenticated using (true);
create policy "lecture publique" on public.ingredients for select to anon, authenticated using (true);
create policy "lecture publique" on public.ingredient_allergens for select to anon, authenticated using (true);
create policy "lecture publique" on public.sources for select to anon, authenticated using (true);
create policy "lecture publique" on public.country_translations for select to anon, authenticated using (true);
create policy "lecture publique" on public.ingredient_translations for select to anon, authenticated using (true);

-- Contenus à statut : visibles s'ils sont publiés ou affichés comme démonstration
create policy "lecture des contenus visibles" on public.recipes for select to anon, authenticated using (public.contenu_visible(status, is_demo));
create policy "lecture des contenus visibles" on public.diet_types for select to anon, authenticated using (public.contenu_visible(status, is_demo));
create policy "lecture des contenus visibles" on public.traditions for select to anon, authenticated using (public.contenu_visible(status, is_demo));
create policy "lecture des contenus visibles" on public.articles for select to anon, authenticated using (public.contenu_visible(status, is_demo));

-- Tables filles : visibles si leur parent l'est (la sous-requête applique les politiques du parent)
create policy "lecture si la recette est visible" on public.recipe_steps for select to anon, authenticated using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "lecture si la recette est visible" on public.recipe_ingredients for select to anon, authenticated using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "lecture si la recette est visible" on public.recipe_substitutions for select to anon, authenticated using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "lecture si la recette est visible" on public.recipe_notes for select to anon, authenticated using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "lecture si la recette est visible" on public.recipe_nutrition for select to anon, authenticated using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "lecture si la recette est visible" on public.recipe_diets for select to anon, authenticated using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "lecture si la recette est visible" on public.recipe_allergens for select to anon, authenticated using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "lecture si la recette est visible" on public.recipe_sources for select to anon, authenticated using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "lecture si la recette est visible" on public.recipe_translations for select to anon, authenticated using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "lecture si l'étape est visible" on public.recipe_step_translations for select to anon, authenticated using (exists (select 1 from public.recipe_steps s where s.id = step_id));
create policy "lecture si la recette et la tradition sont visibles" on public.recipe_traditions for select to anon, authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id) and exists (select 1 from public.traditions t where t.id = tradition_id));
create policy "lecture si le régime est visible" on public.diet_type_points for select to anon, authenticated using (exists (select 1 from public.diet_types d where d.id = diet_type_id));
create policy "lecture si la tradition est visible" on public.tradition_countries for select to anon, authenticated using (exists (select 1 from public.traditions t where t.id = tradition_id));
create policy "lecture si la tradition est visible" on public.tradition_dishes for select to anon, authenticated using (exists (select 1 from public.traditions t where t.id = tradition_id));
create policy "lecture si l'article est visible" on public.article_blocks for select to anon, authenticated using (exists (select 1 from public.articles a where a.id = article_id));
create policy "lecture si l'article est visible" on public.article_countries for select to anon, authenticated using (exists (select 1 from public.articles a where a.id = article_id));
create policy "lecture si l'article et la recette sont visibles" on public.article_recipes for select to anon, authenticated
  using (exists (select 1 from public.articles a where a.id = article_id) and exists (select 1 from public.recipes r where r.id = recipe_id));

-- Historique éditorial : administrateurs seulement, alimenté uniquement par le déclencheur
grant select on public.editorial_events to authenticated;
create policy "lecture admin" on public.editorial_events for select to authenticated using (public.est_admin());

-- ---------------------------------------------------------------- profils
grant select on public.profiles to authenticated;
grant update (display_name, preferences) on public.profiles to authenticated;
create policy "profil : lecture du sien" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.est_admin());
create policy "profil : modification du sien" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------------------------------------------------------------- données personnelles : propriétaire uniquement
do $$
declare t text;
begin
  foreach t in array array['favorites', 'collections', 'meal_plans', 'shopping_lists', 'user_diet_preferences', 'user_excluded_allergens', 'viewing_history'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "%s : propriétaire uniquement" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t, t);
  end loop;
end $$;

grant select, insert, update, delete on public.collection_recipes to authenticated;
create policy "collection_recipes : propriétaire de la collection" on public.collection_recipes for all to authenticated
  using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())));

grant select, insert, update, delete on public.shopping_list_items to authenticated;
create policy "shopping_list_items : propriétaire de la liste" on public.shopping_list_items for all to authenticated
  using (exists (select 1 from public.shopping_lists l where l.id = shopping_list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.shopping_lists l where l.id = shopping_list_id and l.user_id = (select auth.uid())));

-- ---------------------------------------------------------------- lettre d'information : inscription seule, aucune lecture
grant insert (email) on public.newsletter_subscribers to anon, authenticated;
create policy "inscription ouverte" on public.newsletter_subscribers for insert to anon, authenticated with check (confirmed_at is null);

-- ---------------------------------------------------------------- fonctions exposées
revoke all on function public.rechercher_recettes(text, text, text[], integer, text[], integer, integer) from public;
grant execute on function public.rechercher_recettes(text, text, text[], integer, text[], integer, integer) to anon, authenticated;
grant execute on function public.sans_accent(text) to anon, authenticated;
grant execute on function public.contenu_visible(public.statut_editorial, boolean) to anon, authenticated;
