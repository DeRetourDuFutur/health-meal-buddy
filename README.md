# NutriSanté+

Application Vite + React + TypeScript + Tailwind + shadcn/ui.

## Cahier des charges (CDC)

Le cahier des charges complet est disponible dans docs/CDC.md.

## TODO (prochaines étapes)

- 20.x — Roadmap (à préciser)
	- 20.1 — Suivi médical v1: base SQL+RLS, hooks, UI de saisie (poids/IMC/notes) et mini‑stats.
	- 20.2 — Planification repas v2: amélioration UX, liens recettes→planning, ajustements portions.
	- 20.3 — Liste de courses v1: agrégation par semaine, export simple.
	- 20.4 — Statistiques v1: premiers graphiques (apports/j, macros, tendance IMC).

## Synthèse d’avancement — Étapes 17–20

### Étape 20 — Aliments v3, Préférences, Accessibilité Dialogs (en cours)

- Objectifs
	- Corriger les erreurs 400 d’écriture des préférences et fiabiliser le flux J’aime/J’aime pas/Allergie.
	- Simplifier la barre d’outils: ne garder qu’un champ de recherche global avec debounce; onglets par catégories.
	- « Option B »: mémoriser la dernière catégorie et la restaurer quand la recherche est vidée.
	- Corriger le bug de retour automatique de l’onglet « All » vers « Fruits ».
	- Améliorer l’UI (icônes d’actions, alignements, bouton Clear dans la recherche, thumbs down, etc.).
	- Éviter le 406 sur update en faisant update puis select; mise à jour optimiste côté client.
	- Centraliser l’accessibilité des Dialogs (Radix UI) via un composant `AccessibleDialog` garantissant `aria-describedby` stable et jamais `undefined`.

- Actions clés (code)
	- Data/DB
		- `src/lib/db/aliments.ts`: `updateAliment` passe à un pattern « update puis select » pour éviter le 406; catégories distinctes via `listCategories()`; pagination/recherche/tri conservés.
	- Hooks
		- `src/hooks/useAliments.ts`: `useUpdateAliment()` avec mise à jour optimiste (listes et pages) + invalidation couvrant toutes les clés préfixées `['aliments']`.
	- UI Dialogs
		- Nouveau `src/components/ui/AccessibleDialog.tsx`: enveloppe Radix Dialog avec Description sr‑only systématique et `aria-describedby` stable (`${idBase}-desc`), `trigger` intégré pour éviter les Dialog imbriqués.
		- Migrations: `src/pages/Aliments.tsx`, `src/pages/Recettes.tsx`, `src/pages/Profil.tsx` utilisent `AccessibleDialog` (création/édition/confirmation).
		- Command palette: `src/components/ui/command.tsx` ajoute une Description sr‑only.
	- UI Aliments
		- Barre de recherche unique, bouton « X » pour effacer, onglets catégories avec slug; « Option B » (restaure la catégorie après effacement).
		- Icônes d’actions admin (édition/suppression) et colonnes alignées; préférences exclusives (👍 👎 🚫) avec toasts.

- Problèmes rencontrés et solutions
	- Écritures préférences 400: correction du schéma et des colonnes, upsert direct dans `user_food_preferences` (côté hooks dédiés).
	- 406 sur update aliment: remplacé par « update puis select » (évite `.select().single()` pendant `update`).
	- Warnings ARIA sur Dialog: création d’`AccessibleDialog` (Description sr‑only toujours rendue) + suppression des Dialog imbriqués via `trigger` intégré; ajout d’une Description à CommandDialog.
	- Mise à jour non visible après édition: élargissement de l’optimistic update + invalidation à toutes les queries `['aliments', ...]`.

- Fichiers principaux ajoutés/modifiés à l’étape 20
	- Ajout: `src/components/ui/AccessibleDialog.tsx` (A11y centralisée des dialogs).
	- Modifs: `src/pages/Aliments.tsx`, `src/pages/Recettes.tsx`, `src/pages/Profil.tsx` (migrations vers AccessibleDialog, UI, recherche/onglets), `src/components/ui/command.tsx` (Description), `src/hooks/useAliments.ts` (optimistic update + invalidation), `src/lib/db/aliments.ts` (update/select).

- État des lieux à l’instant T (fourni par l’utilisateur)
	- Lors de l’ouverture du dialog « Éditer » (Aliments), des warnings ARIA « Missing Description or aria-describedby={undefined} » sont toujours visibles en console.
	- Après l’édition, un toast « Modifié » apparaît mais certaines modifications semblent ne pas se refléter immédiatement dans la liste selon le contexte.
	- Action gelée: aucune autre modification de code ne sera effectuée tant que l’analyse externe n’est pas terminée.

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

	## Étape 19 — Profils/Admin (SQL) + Data + UI

	### Objectifs
	- 19.A (DB/Admin): mettre en place un schéma « profils étendus » et outillage de vérification.
	- 19.B (Data): exposer une couche d’accès robuste et tolérante aux différences de schéma (`user_id` vs `id`), avec gestion d’avatar privé et pathologies.
	- 19.C (UI): réaliser la page `/profil` complète (avatar, informations, pathologies, confidentialité) avec UX fiable.

	### Actions
	- SQL/Policies/Storage
		- Ajout d’un script de vérification idempotent: `scripts/sql_verify_step19A.sql` qui contrôle:
			- Triggers attendus (`profiles`, `user_pathologies`), RLS activée (4 tables), policies user/admin, fonctions support, index unique `lower(login)`, colonne BMI générée, et un résumé booléen final (TRUE/FALSE).
		- Ajout d’un script de stockage idempotent: `scripts/sql_storage_avatars_setup.sql` qui crée le bucket privé `avatars` s’il manque et une policy « avatars users can manage own folder » permettant à chaque utilisateur de gérer son dossier (`<uid>/…`).
		- Remarque: exécuter ces scripts dans l’éditeur SQL Supabase.
	- Data (`src/lib/db/profiles.ts`, `src/hooks/useProfile.ts`)
		- `getMyProfile()`: `select(*)` + tentative par `user_id` puis repli sur `id` pour éviter les 400 liés aux colonnes manquantes; mappage dynamique des colonnes (BMI optionnelle).
		- `upsertMyProfile(input)`: stratégie update‑first puis insert; en insert, injecte un login de secours dérivé de l’email/uid pour éviter la contrainte NOT NULL/UNIQUE; supprime à la volée les colonnes inexistantes si besoin.
		- `updateAvatar(file)`: upload privé dans `avatars` (contentType, upsert), puis mise à jour/insert du profil avec `avatar_url` (clé `user_id` prioritaire, repli `id`), tout en tolérant l’absence éventuelle de colonne `avatar_url`.
		- Pathologies: `listPathologies`, `listMyPathologies`, `addMyPathology`, `removeMyPathology`; historique: `listMyProfileHistory` (ordre par `changed_at` puis repli `created_at`).
		- `isLoginAvailable(login)`: vérifie disponibilité (insensible à la casse), priorise `user_id` pour éviter les 400, considère « disponible » si la colonne `login` n’existe pas.
		- Hooks React Query v5: requêtes/mutations + invalidations ciblées.
	- UI (`src/pages/Profil.tsx`)
		- Bloc Compte (email, id, date de création) + bandeau d’erreur si chargement profil échoue.
		- Avatar: téléversement, URL signée immédiate pour affichage persistant, petit rafraîchissement différé.
		- Formulaire contrôlé: `login`, `full_name`, `birthdate`, `height_cm`, `weight_kg`, switch `is_private`; IMC affiché en lecture seule si dispo; vérif de disponibilité du login au blur.
		- Pathologies: badges des pathologies sélectionnées + liste avec cases à cocher pour ajouter/retirer.
		- Confirmation avant enregistrement et toasts FR cohérents.
	- Router
		- Suppression des warnings v7 en activant `BrowserRouter` future flags `{ v7_startTransition, v7_relativeSplatPath }`.

	### Résultats
	- Build/TS OK; UI `/profil` fonctionnelle de bout en bout.
	- Erreurs résolues: 400 sur `GET /profiles` (colonnes manquantes), 400 upload avatar (bucket/policy), 406 après `update` (sélection supprimée), disparition temporaire de l’avatar (URL signée immédiate), contrainte `login NOT NULL` (login de secours), warnings React Router v7.
	- Stockage: bucket `avatars` garanti + policy par dossier utilisateur.

	### Commits
	- `chore(sql): ajouter scripts Step 19.A (vérification) et storage avatars (bucket + policy)`
	- `feat(profile,data): module profils + hooks (Step 19.B) avec schéma robuste (user_id/id), avatar et pathologies`
	- `feat(profile,ui): page Profil complète (Step 19.C) avec avatar, pathologies, confidentialité et confirmation`
	- `fix(router): supprimer les warnings v7 via BrowserRouter.future (v7_startTransition, v7_relativeSplatPath)`

### Étape 19.1 — Profil/Admin v2: Pathologies, IMC, icônes, RLS/RPC, UX

- Objectifs
	- Uniformiser les actions admin (icônes + tailles + alignement), fiabiliser les suppressions sous RLS, clarifier l’IMC.
- Actions clés
	- UI Profil (`src/pages/Profil.tsx`)
		- Boutons admin icône‑seules et cohérents: Rendre public = cadenas bleu ouvert, Rendre privé = cadenas vert fermé, Supprimer = poubelle rouge. Alignés à droite, pastilles 32×32, icônes 16×16.
		- Déduplication visuelle: si une pathologie « défaut » est sélectionnée, la version « personnelle » identique (code/label) est masquée.
		- IMC: badge coloré affichant uniquement la valeur, positionné à côté du champ « Poids (kg) ».
		- Suppression immédiate dans la liste via mise à jour optimiste + rollback en cas d’échec.
		- Petits correctifs: Select contrôlé pour éviter le warning, structure JSX nettoyée.
	- Data (`src/hooks/useProfile.ts`, `src/lib/db/profiles.ts`)
		- Perso: bascule afficher/masquer via `is_hidden` (checkbox). Fallback localStorage si la colonne est absente.
		- Promotion/déclassement: perso → défaut (« Rendre public ») et défaut → perso (« Rendre privé ») avec validations (codes 2 caractères) et anti‑doublons.
		- Suppression défaut: `delete … returning` pour détecter l’effet; si RLS bloque (0 ligne), fallback RPC `delete_pathology` côté serveur, puis vérification.
		- Invalidations ciblées des queries et refetch après mutations.
- Résultats
	- Suppressions stables (sans réapparition), actions admin homogènes, IMC lisible, console propre.
- Commits (exemples)
	- `feat(profile/ui): admin actions as icon pills (unlock/lock/trash) + right aligned + consistent sizes`
	- `feat(profile/data): optimistic deletes + RLS‑aware RPC fallback (delete_pathology)`
	- `fix(profile/ui): Select controlled value and JSX fixes`
	- `feat(profile/ui): BMI badge inline next to weight`

### Admin — RPC suppression pathologie « défaut » (RLS)

Si la suppression directe d’une pathologie « défaut » est bloquée par RLS côté client, créez une fonction RPC côté serveur et limitez‑la aux administrateurs.

SQL à exécuter dans Supabase (éditeur SQL):

```
create or replace function public.delete_pathology(p_id uuid)
returns void
language plpgsql
security definer
as $$
begin
	delete from public.pathologies where id = p_id;
end;
$$;

revoke all on function public.delete_pathology(uuid) from public;
-- Accorder à un rôle admin applicatif, ou invoquer uniquement via service role
-- grant execute on function public.delete_pathology(uuid) to app_admin;
```

Notes
- Le client tente d’abord un `delete … returning`; si 0 ligne affectée (RLS), il bascule sur l’appel RPC.
- Les hooks appliquent une mise à jour optimiste, annulent en cas d’échec et invalident/refetch pour confirmer l’état.

### Légende des icônes (Profil > Pathologies)

- Cadenas bleu ouvert: Rendre public (perso → défaut)
- Cadenas vert fermé: Rendre privé (défaut → perso)
- Poubelle rouge: Supprimer

Taille: pastille 32×32, icône 16×16, alignées à droite.

### Étape 19.D — Pathologies personnelles (amendements)

- Objectifs
	- Conserver `is_hidden` en base et supprimer le fallback localStorage.
	- Réactiver une pathologie personnelle existante lors d’un ajout si le label (ilike) correspond.
	- Clarifier l’UI: afficher l’état Actif/Inactif et griser les entrées inactives.
	- Exposer Prénom/NOM (NOM en uppercase visuelle) et utiliser des cadenas rouge/vert pour la confidentialité.
- Actions
	- Data: suppression du fallback localStorage; ajout d’une recherche case‑insensitive avant insert, réactivation si trouvée; mise à jour directe d’`is_hidden`.
	- UI: état Actif/Inactif avec grisé, cadenas privacy (rouge=privé, vert=public), champs Prénom/NOM visibles, IMC clarifié.
- Commits
	- `feat(profile/ui): prénom/NOM, privacy par cadenas, perso inactives grisées avec état Actif/Inactif`
	- `feat(profile/data): réactivation à l’ajout (ilike) des pathologies perso`
	- `refactor(profile/data): suppression du fallback localStorage pour is_hidden (colonne en DB)`

### Étape 19.2 — Profil (ajustements UI finaux avant Étape 20)

- Objectifs
	- Optimiser la lisibilité/hauteur et l’ergonomie du Profil sans toucher à la data.
- Actions UI
	- Masquer le champ « Identifiant / login » (UI uniquement).
	- Grilles responsives:
		- Prénom et NOM sur une ligne (md:2 colonnes), NOM rendu en uppercase (visuel seulement).
		- Âge, Taille (cm), Poids (kg), IMC sur une ligne (md:2, lg:4 colonnes).
		- Besoins (kcal/j) et Affichage objectifs sur une ligne (md:2 colonnes).
		- Protéines/Glucides/Lipides sur une ligne (md:3 colonnes).
	- IMC: champ compact en lecture seule + pastille colorée avec libellé (« Sous‑poids », « Normal », « Surpoids », « Obèse »).
	- En‑tête: cartes « Compte » (2/3) et « Avatar » (1/3) alignées sur une même ligne en desktop.
	- Avatar: boutons remplacés par des icônes (Upload, Trash) et aperçu agrandi au survol (HoverCard).
	- Confidentialité: section masquée en UI (fonctionnalité conservée en back).
- Commit
	- `feat(profile/ui): ajustements Profil (grilles, IMC, avatar, confidentialité UI)`

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
