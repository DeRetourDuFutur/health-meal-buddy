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
