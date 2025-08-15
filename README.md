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

## Notes

- Normalisation des routes sans slash final (ex: `/route/` → `/route`).
- Les routes d’auth `/login`, `/register`, `/reset` sont présentes mais non protégées (à activer plus tard).
