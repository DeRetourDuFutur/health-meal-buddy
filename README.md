# NutriSanté+

Application Vite + React + TypeScript + Tailwind + shadcn/ui.

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

## Mémoire du projet

L’historique complet des étapes (0 → 15) est disponible dans [docs/memoire-projet.md](./docs/memoire-projet.md).
