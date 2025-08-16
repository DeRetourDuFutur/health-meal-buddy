# Mémoire du projet — NutriSanté+

Ce document récapitule toutes les étapes du projet (0 à 18) avec objectifs, actions, résultats et messages de commit associés quand connus. Il sert de référence pour la suite.

## Synthèse d’avancement — Étapes 17–18

### Étape 17 — Aliments v2: recherche, filtres, tri, pagination, URL sync
- Objectifs
  - Enrichir `/aliments` avec recherche (ILIKE), filtres min/max (kcal/prot/gluc/lip), tri, pagination, synchronisation URL.
- Actions
  - Data: `listAlimentsPaged(params)` (ILIKE, `.gte/.lte`, `order` premier tri, `range`, `count:'exact'`), types associés et hook `useAlimentsPaged` (React Query v5, placeholderData).
  - UI: recherche (debounce 300 ms), filtres, tri par colonne, `pageSize` 10/20/50, pagination, états vides, URL sync de tous les paramètres.
- Résultats
  - Build OK; tests manuels: recherche/tri/filtres/pagination et CRUD sous critères fonctionnels.
- Commits
  - `feat(aliments): data layer with search/filters/sort/pagination (paged list)`
  - `feat(aliments): UI search/filters/sort + URL sync + pagination`

### Étape 18 — Recettes (SQL + Data + UI)
- Objectifs
  - Définir recettes + ingrédients (RLS par utilisateur), exposer la data avec hooks, fournir l’UI `/recettes` (liste + éditeur ingrédients + totaux/per‑portion).
- Actions
  - SQL idempotent: tables `recipes`, `recipe_items`, indexes, triggers `updated_at`, RLS (select/insert/update/delete) restreint à `auth.uid()`.
  - Data layer: `listRecipes()` (join `items:recipe_items(*, aliment:aliments(*))`), mutations recette et ingrédients, `computeRecipeTotals()`; hooks `useRecipes` + mutations avec invalidation `['recipes']`.
  - UI: `src/pages/Recettes.tsx` — liste triée par nom, création/édition (zod + RHF), éditeur ingrédients (select aliment, qté, suppression), totaux en direct, toasts FR, garde‑fous.
- Résultats
  - Build OK; vérifications manuelles: création/édition/suppression recettes et ingrédients, recalcul totaux/per‑portion; validations qté > 0 et portions ≥ 1 OK.
- Commits
  - `feat(recettes): schema + RLS + data layer (recipes + items)`
  - `feat(recettes): UI liste + éditeur ingrédients + totaux`

  ## Étape 19 — Profils/Admin (SQL) + Data + UI

  ### Objectifs
  - 19.A — Schéma profils étendus + RLS + vérification outillée.
  - 19.B — Couche data robuste (écarts `user_id` vs `id`, colonnes optionnelles), gestion avatar privé, pathologies, historique.
  - 19.C — UI `/profil` complète avec avatar, infos, pathologies, confidentialité, confirmations et toasts.

  ### Actions
  - SQL & Storage
    - `scripts/sql_verify_step19A.sql`: vérifie triggers (`profiles`, `user_pathologies`), RLS sur 4 tables, policies user/admin, fonctions support, index unique `profiles_login_lower_uniq` (incluant `lower(login)`), colonne BMI générée, et produit un résumé booléen.
    - `scripts/sql_storage_avatars_setup.sql`: crée le bucket privé `avatars` si absent et ajoute une policy idempotente « avatars users can manage own folder » (gestion par sous‑dossier `<uid>/`).
  - Data (`src/lib/db/profiles.ts`)
    - `getMyProfile()`: `select(*)` + stratégie user_id→id, mappage dynamique (BMI/colonnes optionnelles).
    - `upsertMyProfile()`: update‑first puis insert; login de secours sur insert pour satisfaire NOT NULL/UNIQUE; nettoyage de colonnes inexistantes.
    - `updateAvatar()`: upload privé (contentType) + mise à jour/insert `avatar_url`; tolérance à l’absence de colonne `avatar_url`.
    - Pathologies: `listPathologies`, `listMyPathologies`, `addMyPathology`, `removeMyPathology`.
    - Historique: `listMyProfileHistory(limit)` avec ordre `changed_at` puis `created_at` en repli.
    - Disponibilité login: `isLoginAvailable()` priorise `user_id`, retourne vrai si la colonne `login` est absente.
  - Hooks (`src/hooks/useProfile.ts`)
    - `useMyProfile`, `useUpsertMyProfile`, `usePathologies`, `useMyPathologies` (+ add/remove), `useMyProfileHistory`, `useUpdateAvatar`, helpers `getAvatarUrlOrNull`, `checkLoginAvailable`.
  - UI (`src/pages/Profil.tsx`)
    - Compte: email, id, date de création.
    - Avatar: téléversement, URL signée immédiate, rafraîchissement différé pour stabilité.
    - Formulaire: `login`, `full_name`, `birthdate`, `height_cm`, `weight_kg`, `is_private`; IMC affiché si présent; vérification login au blur.
    - Pathologies: badges des sélectionnés + liste multi‑sélection (checkbox).
    - Dialogue de confirmation avant sauvegarde; toasts harmonisés; bandeau d’erreur si chargement profil en échec.
  - Router
    - Activation des flags future pour éliminer les warnings v7: `{ v7_startTransition, v7_relativeSplatPath }`.

  ### Résultats
  - Application `/profil` opérationnelle, sans warnings; gestion des avatars privée OK.
  - Corrections: 400 GET sur `profiles` (sélection de colonnes), 400 upload (bucket/policy manquants), 406 après update (sélection supprimée), disparition temporaire avatar (URL signée immédiate), NOT NULL `login` (fallback), warnings React Router v7.

  ### Commits associés
  - `chore(sql): ajouter scripts Step 19.A (vérification) et storage avatars (bucket + policy)`
  - `feat(profile,data): module profils + hooks (Step 19.B) avec schéma robuste (user_id/id), avatar et pathologies`
  - `feat(profile,ui): page Profil complète (Step 19.C) avec avatar, pathologies, confidentialité et confirmation`
  - `fix(router): supprimer les warnings v7 via BrowserRouter.future (v7_startTransition, v7_relativeSplatPath)`

## Étape 0 — Plan de travail et garde‑fous
- Objectifs
  - Définir un déroulé pas‑à‑pas avec validations à chaque étape.
  - S’aligner sur l’objectif: application opérationnelle en local, tous liens actifs.
- Actions
  - Cadre de travail établi (validation gate avant exécution).
  - Clarification du périmètre initial et des livrables successifs.
- Résultats
  - Processus de travail validé (itératif, test/build à chaque jalon).
  - Pas de changement de code à ce stade.
- Commit associé: N/A

## Étapes 1–10 — Scaffolding, navigation, UX de base, Supabase, docs
- Objectifs
  - Mettre en place la base: Vite + React + TS + Tailwind + shadcn/ui.
  - Routing SPA, pages placeholders, 404, liens propres, smooth scroll.
  - Normalisation des URLs (sans slash final).
  - Connexion Supabase (client public), scripts d’admin (service role), ENV VITE_*.
  - Nettoyage dépendances, README de base.
- Actions (principales)
  - Fichiers/projets: `index.html`, `src/main.tsx`, `src/App.tsx`, `src/pages/Index.tsx`, `src/pages/NotFound.tsx`, `src/PathNormalizer.tsx`, `src/App.css`, `src/index.css`.
  - UI: intégration shadcn/ui (`src/components/ui/*`).
  - Supabase: `src/lib/supabaseClient.ts`, `lib/supabaseAdmin.ts`, `scripts/seedAdmin.ts`, scripts de check.
  - ENV: `.env.example`, `.env.local`; `package.json` scripts.
  - Docs: `README.md` (configuration, routes, scripts).
- Résultats
  - Build/dev OK; navigation SPA opérationnelle; 404 et liens fonctionnels.
  - Scripts Supabase OK (seed/check).
- Commit associé: commits multiples (initialisation, scaffolding, docs)

## Étape 11 — Authentification réelle (Connexion)
- Objectifs
  - Page de connexion avec Supabase `signInWithPassword`.
  - Erreurs mappées en message générique FR.
  - Redirection succès vers `/planification`.
  - Menu utilisateur (en‑tête), déconnexion vers `/`.
  - Aucune garde de route encore.
- Actions
  - `src/pages/Login.tsx` (RHF + zod, flux réel de connexion).
  - `src/context/AuthContext.tsx` (session/user, signIn/signOut).
  - `src/components/auth/UserMenu.tsx` (email/nom, lien `/profil`, signout → `/`).
  - `src/components/layout/AppLayout.tsx` (UserMenu si connecté).
  - Toasts FR: `src/lib/authToasts.ts`.
  - Routing: `src/App.tsx` (route `/login`).
- Résultats
  - Connexion fonctionnelle, redirection `/planification`.
  - Build OK; tests manuels: erreurs génériques, signout OK.
- Commit associé: commits multiples

## Étape 12 — Améliorations UX Auth + Profil minimal
- Objectifs
  - Soft‑redirect si déjà connecté (`/login`).
  - Page Profil minimale (infos Supabase).
  - UX login (focus, loading, remember email).
  - Toasts FR; doc mise à jour; pas de modif ESLint.
- Actions
  - `src/pages/Login.tsx` (focus, loading, remember email).
  - `src/pages/Profil.tsx` (email, user id, created_at).
  - `src/lib/authToasts.ts` (toasts login).
  - README (section Auth).
- Résultats
  - UX plus fluide, tests manuels OK; build OK.
- Commit associé: commits multiples

## Étape 13 — Gardes de routes et returnTo
- Objectifs
  - Protéger les routes privées via un guard.
  - Gérer `returnTo` pour rediriger après login.
  - Laisser `/`, `/login`, `/register`, `/reset`, `*` publics.
- Actions
  - `src/components/auth/RequireAuth.tsx` (spinner, redirection `/login?returnTo=…`).
  - `src/App.tsx` (wrap pages protégées avec `<RequireAuth>`).
  - `src/pages/Login.tsx` (consomme `returnTo`, fallback `/planification`).
  - README (routes protégées).
- Résultats
  - Accès contrôlé; retour automatique après login.
  - Build OK; smoke test navigation OK.
- Commit associé: commits multiples

## Étape 14 — Inscription et Réinitialisation (sans confirmation email)
- Objectifs
  - `/register`: inscription (confirm password), auto‑login, redirection `/planification`.
  - `/reset`: demander mail (lien) et changer mot de passe (formulaire) après lien.
  - Soft‑redirect si déjà connecté; toasts FR; doc clarifiant pas de confirmation email.
- Actions
  - `src/pages/Register.tsx` (RHF+zod; auto‑login; toasts).
  - `src/pages/Reset.tsx` (deux modes: demande et changement via `updateUser`).
  - `src/context/AuthContext.tsx` (resetPassword).
  - `src/lib/authToasts.ts` (signup/reset toasts).
  - README mis à jour.
- Résultats
  - Flots inscription et reset opérationnels; build OK; tests manuels OK.
- Commit associé: commits multiples

## Étape 15 — Profil éditable & Préférences (thème)
- Objectifs
  - Éditer “nom d’affichage” (metadata `display_name`) et l’utiliser dans l’UI.
  - Thème clair/sombre/système avec `next-themes`, persistance locale, synchro metadata `theme`.
  - Page Paramètres (sections Profil + Apparence).
- Actions
  - `src/pages/Profil.tsx` (form update metadata `display_name`).
  - `src/components/auth/UserMenu.tsx` (affiche `display_name` ou email; avatar initiales).
  - `src/components/settings/ThemeSelector.tsx` (sélecteur thème + synchro metadata).
  - `src/pages/Parametres.tsx` (sections Profil/Apparence).
  - `src/App.tsx` (wrap `ThemeProvider`), `src/lib/authToasts.ts` (toasts profil).
  - README (Préférences & Profil).
- Résultats
  - Personnalisation et thème persistant; build OK; TS clean; vérifs manuelles OK.
- Commit associé
  - `feat(profile): editable display name, theme selection with persistence, and UI updates`

  ## Étape 17 — Aliments v2: recherche, filtres, tri, pagination, URL sync
  - Objectifs
    - Enrichir la page `/aliments` avec recherche (ILIKE), filtres min/max (kcal/prot/gluc/lip), tri, pagination, et synchronisation URL.
    - Préserver le CRUD existant et la compatibilité.
  - Actions
    - Data layer: `listAlimentsPaged(params)` (select `*` + `count:'exact'`, ILIKE, `.gte/.lte`, `order` (premier tri), `range` + recadrage page).
    - Types: `AlimentsFilters`, `AlimentsSort(By)`, `AlimentsQueryParams`, `AlimentsPagedResult`.
    - Hook: `useAlimentsPaged(params)` avec `queryKey=['aliments', params]` et `placeholderData: keepPreviousData` (React Query v5).
    - UI: barre d’outils (recherche debounce 300 ms, filtres min/max, tri par colonne), sélecteur `pageSize` (10/20/50), pagination Précédent/Suivant, états “Aucun résultat”/“Aucun aliment”.
    - URL sync: `q`, `kcalMin/kcalMax`, `protMin/protMax`, `carbMin/carbMax`, `fatMin/fatMax`, `sort`, `page`, `pageSize`.
  - Résultats
    - Build TS/Dev: PASS. Smoke tests: recherche "pom", tri kcal desc, filtres min, pagination 1→2, CRUD sous critères.
  - Commits
    - `feat(aliments): data layer with search/filters/sort/pagination (paged list)`
    - `feat(aliments): UI search/filters/sort + URL sync + pagination`

## Étape 18 — Recettes (SQL + Data + UI)

- Objectifs
  - Définir le modèle Recettes et Ingrédients de recette avec RLS par utilisateur.
  - Créer la couche data et les hooks React Query (liste avec items + aliments, CRUD, gestion d’ingrédients).
  - Réaliser l’UI `/recettes`: liste, création/édition, gestion d’ingrédients, totaux et par portion.
- Actions
  - SQL idempotent: tables `recipes`, `recipe_items`, indexes, triggers `updated_at`, politiques RLS (sélect/insert/update/delete) limitées à `auth.uid()`.
  - Data: `src/lib/db/recipes.ts` — types `Recipe`, `RecipeItem`, `RecipeWithItems`, `listRecipes()`, `create/update/deleteRecipe`, `add/update/deleteRecipeItem`, `computeRecipeTotals()`.
  - Hooks: `src/hooks/useRecipes.ts` — `useRecipes` et mutations avec invalidation `['recipes']`.
  - UI: `src/pages/Recettes.tsx` — liste triée par nom, création, édition (détails + éditeur d’ingrédients), totaux en direct, toasts FR.
- Résultats
  - Build OK; tests manuels: création/édition/suppression recette et ingrédients, recalcul totaux/per‑portion OK; garde‑fous quantités > 0 et portions ≥ 1.
- Commits associés
  - `feat(recettes): schema + RLS + data layer (recipes + items)`
  - `feat(recettes): UI liste + éditeur ingrédients + totaux`

---

Notes transverses
- Stack: Vite 5, React 18, TypeScript 5, Tailwind 3, shadcn/ui, React Router v6.30.1, @tanstack/react-query v5, Supabase JS v2, react-hook-form, zod, next-themes.
- ENV: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; scripts Node: `SUPABASE_SERVICE_ROLE`.
- Structure: normalisation d’URL (PathNormalizer), RequireAuth + returnTo.
- Toasts centralisés: `src/lib/authToasts.ts`.
- Scripts: `scripts/seedAdmin.ts`, `scripts/checkSupabaseClient.ts`, `scripts/checkSupabaseAdmin.ts`.
- Docs: `README.md` mis à jour au fil des étapes.

Qualité
- Build: PASS (vite build).
- TypeScript: PASS.
- Lint: hors périmètre quand spécifié.
- Tests manuels: navigation, login/logout, guards, register/reset, profil, thème.
