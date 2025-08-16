# NutriSanté+

Application Vite + React + TypeScript + Tailwind + shadcn/ui.

## Synthèse d’avancement — Étapes 17–18

### Étape 17 — Aliments v2: recherche, filtres, tri, pagination, URL sync
- Objectifs
	- Enrichir `/aliments` avec recherche (ILIKE), filtres min/max (kcal/prot/gluc/lip), tri, pagination, et synchronisation URL.
- Actions
	- Data layer: `listAlimentsPaged(params)` avec `count:'exact'`, ILIKE, `.gte/.lte`, `order` (premier tri), `range` + recadrage page; hooks React Query (`useAlimentsPaged`).
	- UI: barre d’outils (recherche debounce 300 ms, filtres min/max, tri par colonne), `pageSize` 10/20/50, pagination, états vides, URL sync.
- Résultats
	- Build/TS OK; smoke tests: recherche, tri kcal desc, filtres min, pagination, CRUD sous critères.
- Commits
	- `feat(aliments): data layer with search/filters/sort/pagination (paged list)`
	- `feat(aliments): UI search/filters/sort + URL sync + pagination`

### Étape 18 — Recettes (SQL + Data + UI)
- Objectifs
	- Modéliser recettes et ingrédients avec RLS; fournir data layer + hooks; réaliser l’UI `/recettes` (liste + éditeur ingrédients + totaux/per‑portion).
- Actions
	- SQL idempotent: tables `recipes`, `recipe_items`, indexes, triggers `updated_at`, RLS par utilisateur.
	- Data: `listRecipes()` (join items + aliments), mutations recette et ingrédients, `computeRecipeTotals()`; hooks React Query avec invalidation `['recipes']`.
	- UI: liste triée par nom, création/édition, gestion d’ingrédients, totaux et par portion en direct, toasts FR.
- Résultats
	- Build/TS OK; tests manuels: création/édition/suppression recettes et ingrédients OK; garde‑fous quantités > 0, portions ≥ 1.
- Commits
	- `feat(recettes): schema + RLS + data layer (recipes + items)`
	- `feat(recettes): UI liste + éditeur ingrédients + totaux`

## Configuration locale

1) Variables d’environnement (`.env.local`) — voir `.env.example`:

```
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE=your-service-role-key   # scripts Node uniquement
```

2) Installation et démarrage

```
npm install
npm run dev
```

## Vérification Supabase

- Client (public):
```
npm run check:supabase:client
```

- Admin (service role):
```
npm run check:supabase:admin
```

- Seed admin (idempotent):
```
npm run seed:admin
```

## Développement

- Démarrage local:
```
npm run dev
```

- Lint:
```
npm run lint
```

## Routes

| Page                 | URL            |
|----------------------|----------------|
| Accueil              | `/`            |
| Mon Profil           | `/profil`      |
| Planification Repas  | `/planification` |
| Aliments             | `/aliments`    |
| Recettes             | `/recettes`    |
| Liste de Courses     | `/courses`     |
| Suivi Médical        | `/suivi`       |
| Médicaments          | `/medicaments` |
| Statistiques         | `/statistiques`|
| Paramètres           | `/parametres`  |
| Connexion            | `/login`       |
| Inscription          | `/register`    |
| Réinitialisation MDp | `/reset`       |
| 404 (catch-all)      | `*`            |

## Notes

- Normalisation des routes sans slash final (ex: `/route/` → `/route`).
- Les routes d’auth `/login`, `/register`, `/reset` sont présentes mais non protégées (à activer plus tard).

## Auth (Étapes 11–12)

- Connexion: `/login` (RHF + zod). En cas d’échec, message générique: « Email ou mot de passe incorrect. »
- Déjà connecté: accéder à `/login` redirige vers `/planification`.
- Menu utilisateur (en‑tête): affiche l’email, lien vers `/profil`, action « Déconnexion » (redirige vers `/`).
- Page `Profil`: email, id utilisateur et date de création (placeholders pour avatar/nom à venir).

## Routes protégées (Étape 13)

- Protégées: `/profil`, `/planification`, `/aliments`, `/recettes`, `/courses`, `/suivi`, `/medicaments`, `/statistiques`, `/parametres`.
- Publiques: `/`, `/login`, `/register`, `/reset`, `*`.
- Accès déconnecté vers une route protégée → redirection vers `/login?returnTo=<chemin>`, puis retour automatique après connexion.

## Auth (Étape 14)

- Inscription `/register` (RHF + zod, confirmation de mot de passe):
	- Aucune confirmation par email dans ce projet: `signUp` connecte immédiatement l’utilisateur.
	- Succès: toast « Inscription réussie. » → redirection `/planification`.

- Réinitialisation `/reset`:
	- Mode “Demande”: saisie email → envoi du lien (toast) → redirection `/login`.
	- Mode “Changement”: après lien reçu → formulaire nouveau mot de passe → mise à jour (toast) → `/login`.

- Soft-redirect: si déjà connecté, `/register` et `/reset` redirigent vers `/planification`.

## Préférences & Profil (Étape 15)

- Profil: modification du nom d’affichage (metadata Supabase: `display_name`).
- Apparence: thème clair/sombre/système via `next-themes` (persistance locale) + synchro metadata `theme` si connecté.
- Le menu utilisateur et les pages utilisent `display_name` si présent (sinon email). 

## Aliments (Étape 16)

SQL à exécuter dans Supabase (SQL Editor). Script idempotent et complet (table, contraintes, triggers, RLS):

```
-- Table
create table if not exists public.aliments (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	name text not null,
	kcal_per_100g numeric(10,2) not null default 0,
	protein_g_per_100g numeric(10,2) not null default 0,
	carbs_g_per_100g numeric(10,2) not null default 0,
	fat_g_per_100g numeric(10,2) not null default 0,
	notes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- Indexes & contrainte d'unicité (un nom par utilisateur)
create index if not exists aliments_user_id_idx on public.aliments(user_id);
create unique index if not exists aliments_user_name_uniq on public.aliments(user_id, name);

-- Trigger updated_at
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
	new.updated_at = now();
	return new;
end $$;

drop trigger if exists set_aliments_updated_at on public.aliments;
create trigger set_aliments_updated_at before update on public.aliments
for each row execute function public.set_updated_at();

-- Activer RLS
alter table public.aliments enable row level security;

-- Politiques RLS (idempotentes via vérification préalable)
do $$
begin
	if not exists (select 1 from pg_policies where schemaname='public' and tablename='aliments' and policyname='aliments_select_own') then
		create policy aliments_select_own on public.aliments
			for select using (auth.uid() = user_id);
	end if;
	if not exists (select 1 from pg_policies where schemaname='public' and tablename='aliments' and policyname='aliments_insert_own') then
		create policy aliments_insert_own on public.aliments
			for insert with check (auth.uid() = user_id);
	end if;
	if not exists (select 1 from pg_policies where schemaname='public' and tablename='aliments' and policyname='aliments_update_own') then
		create policy aliments_update_own on public.aliments
			for update using (auth.uid() = user_id);
	end if;
	if not exists (select 1 from pg_policies where schemaname='public' and tablename='aliments' and policyname='aliments_delete_own') then
		create policy aliments_delete_own on public.aliments
			for delete using (auth.uid() = user_id);
	end if;
end $$;
```

Flux utilisateur (MVP):
- Accès à `/aliments` (protégé): liste triée par nom.
- Créer un aliment (dialog): nom obligatoire, macros ≥ 0, notes optionnelles illimitées. Conflit de nom → erreur claire.
- Éditer/Supprimer (confirm) avec toasts FR.

Remarques RLS:
- Chaque requête est filtrée par `auth.uid()` via les politiques; une clé publique (anon) suffit côté client.
- Si vous voyez des 401/403, vérifiez que vous êtes connecté et que RLS est bien activé avec ces politiques.

## Aliments — recherche/tri/pagination (Étape 17)

Paramètres et défauts (synchronisés dans l’URL):
- q?: string — recherche insensible à la casse via ILIKE sur `name` (debounce 300 ms)
- filters?: `{ kcalMin?, kcalMax?, protMin?, protMax?, carbMin?, carbMax?, fatMin?, fatMax? }`
	- Mapping colonnes: kcal → `kcal_per_100g`, prot → `protein_g_per_100g`, carb → `carbs_g_per_100g`, fat → `fat_g_per_100g`
	- Si `min > max`: contrainte ignorée (aucune erreur bloquante)
- sort?: `{ by: "name"|"kcal"|"prot"|"carb"|"fat"; dir: "asc"|"desc" }[]`
	- Pour le MVP, seul le premier tri est appliqué
	- Encodage URL: `name:asc`, `kcal:desc`, etc.
- page?: number — défaut 1; page recadrée si hors bornes
- pageSize?: number — défaut 10; options 10/20/50

Défauts globaux:
- `q=""`, pas de filtres, `sort=[{ by:"name", dir:"asc" }]`, `page=1`, `pageSize=10`

Sortie de l’API client:
- `{ items, total, page, pageSize, pageCount }` (avec `count: 'exact'`)

Exemples d’URL partageables:
- `/aliments?q=pom`
- `/aliments?sort=kcal:desc&page=2&pageSize=20`
- `/aliments?kcalMin=50&protMin=5&sort=name:asc`

Notes
- Debounce 300 ms sur la recherche.
- Un seul critère de tri géré (le premier); futurs tris multiples possibles sans casse.
- Pagination basée sur `count: 'exact'`, recadrage automatique de `page`.
- RLS et contrainte UNIQUE(user_id, name) inchangés; aucun index SQL ajouté dans cette étape.

## Recettes (Étape 18)

### SQL (Étape 18.A)

À exécuter dans Supabase (SQL Editor). Script idempotent créant `recipes` et `recipe_items`, indexes, triggers `updated_at`, et RLS.

```
-- Étape 18 — Recettes (MVP)
-- Idempotent: crée tables, indexes, triggers updated_at et RLS si absents

-- recipes
create table if not exists public.recipes (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	name text not null,
	servings numeric(10,2) not null default 1,
	notes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists recipes_user_id_idx on public.recipes(user_id);
create unique index if not exists recipes_user_name_uniq on public.recipes(user_id, name);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
	new.updated_at = now();
	return new;
end $$;

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at before update on public.recipes
for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;

do $$
begin
	if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipes' and policyname='recipes_select_own') then
		create policy recipes_select_own on public.recipes for select using (auth.uid() = user_id);
	end if;
	if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipes' and policyname='recipes_insert_own') then
		create policy recipes_insert_own on public.recipes for insert with check (auth.uid() = user_id);
	end if;
	if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipes' and policyname='recipes_update_own') then
		create policy recipes_update_own on public.recipes for update using (auth.uid() = user_id);
	end if;
	if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipes' and policyname='recipes_delete_own') then
		create policy recipes_delete_own on public.recipes for delete using (auth.uid() = user_id);
	end if;
end $$;

-- recipe_items
create table if not exists public.recipe_items (
	id uuid primary key default gen_random_uuid(),
	recipe_id uuid not null references public.recipes(id) on delete cascade,
	aliment_id uuid not null references public.aliments(id) on delete cascade,
	quantity_g numeric(10,2) not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists recipe_items_recipe_id_idx on public.recipe_items(recipe_id);
create index if not exists recipe_items_aliment_id_idx on public.recipe_items(aliment_id);
create unique index if not exists recipe_items_uniq on public.recipe_items(recipe_id, aliment_id);

drop trigger if exists set_recipe_items_updated_at on public.recipe_items;
create trigger set_recipe_items_updated_at before update on public.recipe_items
for each row execute function public.set_updated_at();

alter table public.recipe_items enable row level security;

do $$
begin
	if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipe_items' and policyname='recipe_items_select_own') then
		create policy recipe_items_select_own on public.recipe_items
			for select using (exists (select 1 from public.recipes r where r.id = recipe_items.recipe_id and r.user_id = auth.uid()));
	end if;
	if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipe_items' and policyname='recipe_items_insert_own') then
		create policy recipe_items_insert_own on public.recipe_items
			for insert with check (exists (select 1 from public.recipes r where r.id = recipe_items.recipe_id and r.user_id = auth.uid()));
	end if;
	if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipe_items' and policyname='recipe_items_update_own') then
		create policy recipe_items_update_own on public.recipe_items
			for update using (exists (select 1 from public.recipes r where r.id = recipe_items.recipe_id and r.user_id = auth.uid()));
	end if;
	if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipe_items' and policyname='recipe_items_delete_own') then
		create policy recipe_items_delete_own on public.recipe_items
			for delete using (exists (select 1 from public.recipes r where r.id = recipe_items.recipe_id and r.user_id = auth.uid()));
	end if;
end $$;
```

Alternative: exécutez directement le fichier `scripts/sql_recipes_step18.sql` dans l’éditeur SQL de Supabase.

### Hooks et types (Étape 18.A)

Espace: `src/lib/db/recipes.ts` et `src/hooks/useRecipes.ts`.

- Types principaux: `Recipe`, `RecipeItem`, `RecipeWithItems`.
- Sélection: `listRecipes()` retourne les recettes de l’utilisateur, triées par nom, avec `items: recipe_items(*, aliment:aliments(*))`.
- Calcul: `computeRecipeTotals(items, servings)` → totaux et valeurs par portion (kcal, prot, gluc, lip).
- Hooks React Query:
	- `useRecipes()` — liste complète (avec items + aliments joints).
	- `useCreateRecipe()`, `useUpdateRecipe()`, `useDeleteRecipe()` — CRUD recette.
	- `useAddRecipeItem()`, `useUpdateRecipeItem()`, `useDeleteRecipeItem()` — gestion des ingrédients.
	- Invalidation automatique de `['recipes']` après chaque mutation.

### UI (Étape 18.B)

Page protégée `/recettes`:
- Liste triée par nom avec colonnes: nb d’ingrédients, totaux (kcal, prot, gluc, lip), et par portion (kcal/portion, prot/portion, gluc/portion, lip/portion).
- Création de recette (dialog): nom requis, `servings >= 1`, notes optionnelles.
- Édition: panneau avec deux colonnes — Détails (nom/portions/notes) et Ingrédients.
- Ingrédients: ajout via sélection d’un aliment existant + quantité (g), modification de quantité, suppression; totaux en direct.
- Toasts FR cohérents; garde-fous: quantité > 0 pour ajouter, `servings >= 1`.

### Cas d’usage

1) Créer une recette > Ajouter des ingrédients > Ajuster les quantités > Lire les totaux et par portion.
2) Mettre à jour le nom ou le nombre de portions (impacte les valeurs par portion).
3) Supprimer un ingrédient ou la recette (confirmations avec toasts).

Contraintes et RLS
- Unicité: `(user_id, name)` sur `recipes`; `(recipe_id, aliment_id)` sur `recipe_items` (évite doublons d’ingrédients).
- RLS: toutes les opérations sont restreintes à `auth.uid()` conformément aux politiques ci‑dessus.
- Pré‑requis: des aliments doivent exister pour pouvoir les ajouter aux recettes.

## Mémoire du projet

 L’historique complet des étapes (0 → 18) est disponible dans [docs/memoire-projet.md](./docs/memoire-projet.md).
