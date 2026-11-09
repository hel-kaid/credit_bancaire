# Credit Front (React + Vite)

Interface pour les conseillers : saisie du dossier client, appel de l'API de scoring, affichage de la
décision (Accordé / Refusé / Étude manuelle) et des critères qui ont pesé.

## Lancer
```bash
npm install
npm run dev          # http://localhost:5173
```
L'API doit tourner sur http://127.0.0.1:8000 (voir `credit_api`). En développement, Vite redirige
`/api` vers l'API : pas de configuration CORS nécessaire. Autre adresse : `VITE_PROXY_TARGET` (voir `.env.example`).

## Production
```bash
VITE_API_URL=https://api.exemple.com npm run build     # génère dist/
```
L'API doit alors autoriser le site : `CORS_ORIGINS=https://mon-site.com`.

## Tests
```bash
npm test
```

## Structure
- `src/fields.js` : champs, validation (mêmes limites que l'API), conversion vers le JSON de l'API
- `src/api.js` : appel `POST /api/v1/credit-scoring`, gestion des erreurs réseau et 400
- `src/components/` : `ScoringForm`, `Field`, `DecisionCard`, `Factors`

## Limites à garder synchronisées avec l'API
Revenus 0 à 100 000, montant 1 à 1 000 (en milliers). Si elles changent dans `credit_api/app/schemas.py`,
modifier `LIMITS` dans `src/fields.js`.
