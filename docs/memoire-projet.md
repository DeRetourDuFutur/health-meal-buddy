# Mémoire du projet — NutriSanté+

Ce document récapitule toutes les étapes du projet (0 à 15) avec objectifs, actions, résultats et messages de commit associés quand connus. Il sert de référence pour la suite.

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
