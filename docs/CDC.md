# Cahier des charges — NutriSanté+

Version: 1.0 • Date: 2025-08-17

Ce document décrit le périmètre fonctionnel, l’architecture, la sécurité, l’état d’avancement et les procédures d’exécution/déploiement de l’application NutriSanté+. Il sert de référence pour l’équipe produit et les développeurs.

## 1. Vision et objectifs

- Aider un utilisateur à gérer son profil santé et ses objectifs (kcal/macros), construire un référentiel d’aliments, créer des recettes et, à terme, suivre des mesures (poids/IMC), planifier ses repas, produire une liste de courses et visualiser des statistiques.
- Respecter la confidentialité: données isolées par utilisateur (RLS), stockage privé pour les avatars, granularité de confidentialité au niveau de certains champs profil (masquée en UI à l’instant T mais supportée côté données).

## 2. Périmètre fonctionnel (exigences)

### 2.1 Authentification et accès
- Connexion email/mot de passe (via la plateforme backend).
- Inscription sans confirmation email (auto-login après sign-up).
- Réinitialisation de mot de passe (demande par email et changement après lien).
- Garde de routes: `/profil`, `/aliments`, `/recettes`, etc. sont protégées; redirection avec `returnTo` après login.
- Menu utilisateur (en‑tête): affiche l’email/nom, lien vers `/profil`, déconnexion.

État: Fait (Étapes 11–14).

### 2.2 Profil
- Bloc Compte (lecture seule): Email/Login, ID utilisateur, date de création.
- Avatar (stockage privé): téléversement, suppression, URL signée pour affichage; aperçu agrandi au survol; boutons en icônes (Upload/Trash).
- Formulaire Profil (édition):
  - Prénom, NOM (rendu uppercase visuel), Âge, Taille (cm), Poids (kg).
  - IMC calculé côté client: affiché en lecture seule + pastille colorée avec libellé (“Sous‑poids”, “Normal”, “Surpoids”, “Obèse”).
  - Besoins (kcal/j) et mode d’affichage des objectifs (valeurs absolues ou pourcentages).
  - Objectifs macros: Protéines/Glucides/Lipides (g/j).
  - Confidentialité par champ (structure persistée); UI des cadenas volontairement masquée à l’instant T.
  - “Identifiant / login”: champ masqué en UI (logique conservée côté data).
- Confirmation avant enregistrement; toasts en FR.

État: Fait (Étapes 19.C, 19.1, 19.D, 19.2).

### 2.3 Pathologies (défaut et personnelles)
- Référentiel « défaut » par application + sélection par l’utilisateur (liste avec checkboxes).
- Pathologies personnelles de l’utilisateur: ajout/suppression, visibilité (is_hidden) avec affichage Actif/Inactif et grisé si inactif.
- Anti‑doublon: si l’utilisateur ajoute un label déjà existant (comparaison insensible à la casse), réactivation de l’existant au lieu de créer un doublon.
- Déduplication visuelle: si une pathologie « défaut » est sélectionnée par l’utilisateur, l’étiquette personnelle identique est masquée côté UI.
- Administration (pour rôle admin):
  - Promouvoir une personnelle en « défaut » (publique) et inversement (déclasser défaut → personnel) avec validations.
  - Suppression d’une pathologie « défaut » avec fallback RPC sécurisé en cas de blocage RLS.

État: Fait (Étapes 19.1 et 19.D).

### 2.4 Aliments
- Table personnelle d’aliments (RLS par utilisateur) avec: nom, macros pour 100g, notes.
- Liste triée par nom; CRUD.
- V2: recherche (texte), filtres min/max (kcal, prot, gluc, lip), tri, pagination, synchronisation d’URL.

État: Fait (Étapes 16–17).

### 2.5 Recettes
- Modèle Recettes + Ingrédients de recette (RLS par utilisateur).
- UI: liste des recettes, création/édition, gestion d’ingrédients (lien vers aliments), totaux nutritionnels et par portion calculés en direct.

État: Fait (Étape 18).

### 2.6 Suivi médical (planifié)
- V1 (à venir 20.1): table de mesures (poids/IMC, notes, datation), hooks côté client, UI de saisie rapide, mini‑stats/graphiques.

État: À faire (Étape 20.1).

### 2.7 Planification, Courses, Statistiques (planifié)
- Planification des repas v2 (20.2), Liste de courses v1 (20.3), Statistiques v1 (20.4).

État: À faire (Roadmap 20.x).

## 3. Contraintes non fonctionnelles
- Sécurité: RLS sur toutes les tables applicatives; bucket Storage « avatars » privé; RPC sensible limité à l’admin/service role.
- Performance: requêtes paginées sur listes volumineuses; cache et invalidations côté client.
- UX: composants UI cohérents; responsive mobile→desktop; toasts FR; confirmations avant opérations sensibles.
- Accessibilité: textes alternatifs pour avatars; boutons icônes avec `title`/éléments `sr-only`.
- Localisation: libellés et toasts en français.

## 4. Modèle de données (résumé conceptuel)
- Profils: user_id, login, first_name, last_name, age, height_cm, weight_kg, needs_kcal, needs_protein_g, needs_carbs_g, needs_fat_g, needs_display_mode, privacy, avatar_url.
- Pathologies (défaut): id, code (optionnel), label.
- user_pathologies: relation utilisateur ↔ pathologies « défaut » sélectionnées.
- custom_pathologies (perso): id, user_id, label, code (optionnel), is_hidden (visibilité).
- Aliments: id, user_id, name, kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, notes.
- Recettes: recipes(id, user_id, name, servings, notes…), recipe_items(recipe_id, aliment_id, quantity_g…).

Notes:
- Contraintes: unicité pertinente (ex: aliments par (user_id, name)), indexes usuels, triggers `updated_at`.
- Confidentialité: structure `privacy` stockée côté profil; UI masquée pour l’instant.

## 5. Architecture logicielle
- SPA Vite/React/TypeScript.
- UI: Tailwind + composants headless (Radix via bibliothèque UI), icônes.
- Data: client JS vers le backend, cache côté client, formulaires typés/validés.
- Stockage avatars: bucket privé avec dossiers par utilisateur; accès via URL signées.
- Fallback RPC pour opérations d’administration incompatibles avec RLS strictes (limité et sécurisé).

## 6. Sécurité et politiques (RLS/Storage)
- RLS activée: chaque table applicative restreinte à l’utilisateur connecté.
- Storage: bucket privé `avatars`; policy « un utilisateur gère son propre dossier <uid>/ ».
- RPC sensible: exécution via rôle de service ou canal d’administration uniquement.

## 7. Parcours et UI clés
- Profil
  - En‑tête aligné: « Compte » (2/3) + « Avatar » (1/3). Avatar: upload, suppression, aperçu au survol.
  - Grilles responsives: Prénom/NOM; Âge/Taille/Poids/IMC; Besoins/Mode; Prot/Gluc/Lip.
  - IMC: input compact (lecture seule) + pastille colorée (Sous‑poids/Normal/Surpoids/Obèse).
  - Confidentialité: section masquée en UI (fonctionnalité conservée côté données/sauvegarde).
- Pathologies: badges des sélectionnées; liste « défaut » (checkbox); personnelles (Actif/Inactif, grisé si inactif); admin (promouvoir/déclasser/supprimer) avec icônes.
- Aliments: recherche/filtres/tri/pagination + CRUD.
- Recettes: liste + éditeur d’ingrédients, totaux et par portion.

## 8. Mise en place — Exécution locale

Prérequis
- Node.js LTS (18+ conseillé).
- Compte et projet backend configurés (base + storage).

Variables d’environnement (fichier `.env.local` à la racine)
```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-public-anon-key
# Clé service role facultative pour scripts Node (non utilisée côté client)
SUPABASE_SERVICE_ROLE=your-service-role-key
```

Étapes
1) Installer les dépendances
```powershell
npm install
```
2) Configurer le backend
- Appliquer les scripts SQL (tables, RLS pour aliments/recettes/profils/pathologies, RPC admin si requis).
- Créer le bucket privé « avatars » et sa policy.
- (Optionnel) Seed d’un utilisateur admin via le script fourni.
3) Démarrer en développement
```powershell
npm run dev
```
4) Build de production (facultatif)
```powershell
npm run build
```

## 9. Déploiement (en ligne)

Hébergement applicatif (ex: Vercel/Netlify)
- Définir les variables d’environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans le provider.
- Construire via `npm run build`; servir le dossier `dist/`.

Backend managé
- Créer un projet dédié (prod) et réappliquer les scripts SQL (tables/RLS/policies) identiques à l’environnement local.
- Créer le bucket `avatars` (privé) et sa policy.
- Restreindre l’exécution des RPC sensibles aux rôles adéquats (ou utilisation service role côté scripts d’admin).

Domaines et sécurité
- Forcer HTTPS côté hébergeur; vérifier CORS et settings (URL du site approuvée si nécessaire).

## 10. État d’avancement (instant T)

- Auth (login/register/reset): Fait
- Routes protégées + returnTo: Fait
- Profil (formulaire + IMC + besoins/macros): Fait
- Avatar (upload/suppression, aperçu hover, icônes): Fait
- Confidentialité par champ (données): Fait; UI: Masquée
- Pathologies défaut + personnelles (réactivation doublon, is_hidden, admin promote/demote/delete + fallback RPC): Fait
- Aliments (CRUD + recherche/tri/pagination/URL): Fait
- Recettes (schema + data + UI + totaux/per-portion): Fait
- Suivi médical v1: À faire (20.1)
- Planification v2 / Courses v1 / Stats v1: À faire (20.2–20.4)

Qualité
- Build: PASS (vite). Avertissements de taille de bundle possibles (>500 kB).
- TypeScript: PASS.
- Tests: principalement smoke tests manuels. Pas de CI/CD configurée.

## 11. Critères d’acceptation (exemples)
- Profil: sauvegarde réussie, IMC recalculé en direct, pastille correcte selon la valeur.
- Pathologies: ajout d’un doublon → réactivation; bascule Actif/Inactif visible; sélection défaut/perso sans doublon visuel.
- Aliments: création avec validation, filtres et tri appliqués, pagination stable.
- Recettes: ajout/suppression d’un ingrédient, recalcul des totaux et par portion instantané.
- Avatar: upload et suppression effectifs, URL signée valide, aperçu hover fonctionnel.

## 12. Risques et dettes
- Aucune CI automatisée (tests/linters) — à prévoir.
- Avertissements de taille de bundle — à optimiser ultérieurement (code splitting, manualChunks).
- La fonctionnalité « Confidentialité » est supportée côté data mais masquée en UI — synchroniser les attentes produit.

## 13. Roadmap de référence (20.x)
- 20.1 — Suivi médical v1 (mesures + mini‑stats)
- 20.2 — Planification repas v2
- 20.3 — Liste de courses v1
- 20.4 — Statistiques v1

---

Contact: confier ce CDC au dev référent avant itération; les sections 8–9 doivent être exécutées dans l’ordre. Se référer au README pour d’éventuels détails SQL.
