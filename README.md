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
