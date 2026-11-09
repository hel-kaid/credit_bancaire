# Credit Scoring API

API FastAPI qui sert le modèle de décision de crédit (Random Forest, `modele_credit.joblib`).

## Lancer
```bash
python -m venv .venv && source .venv/bin/activate     # Windows : .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Documentation interactive : http://127.0.0.1:8000/docs

Variables d'environnement (optionnelles) : `MODEL_PATH`, `MODEL_VERSION`,
`CORS_ORIGINS` (ex. `http://localhost:5173` pour un frontend React/Vite).

## Endpoint
`POST /api/v1/credit-scoring`
```bash
curl -X POST http://127.0.0.1:8000/api/v1/credit-scoring -H "Content-Type: application/json" -d '{
  "gender":"Male","married":"Yes","dependents":0,"education":"Graduate","self_employed":"No",
  "applicant_income":4500,"coapplicant_income":1500,"loan_amount":130,"loan_amount_term":360,
  "credit_history":1,"property_area":"Semiurban"}'
```
Réponse 200 :
```json
{"decision":"ACCORDE","probability_approval":0.73,"threshold":0.46,
 "factors":[{"field":"...","label":"...","value":"...","impact":4.2,"direction":"favorable","message":"..."}],
 "model_version":"1.0"}
```
Données manquantes ou hors limites -> **HTTP 400** :
```json
{"error":"validation_error","message":"Données manquantes ou hors des limites autorisées",
 "details":[{"field":"credit_history","message":"Champ obligatoire manquant"}]}
```

## Limites autorisées (`app/schemas.py`)
revenu du demandeur 0 < x <= 100 000 · co-revenu 0 à 100 000 · montant du prêt 1 à 1 000 (en milliers)
· durée 12 à 480 mois · personnes à charge 0 à 10 (3 et plus regroupés) · `credit_history` 0 ou 1.
Unités identiques à celles des données d'entraînement.

## Facteurs explicatifs
Pour chaque information du dossier, on la remplace par celle d'un client typique et on mesure le
changement de probabilité d'accord. `impact` est en points de pourcentage (positif = favorable).
C'est une approximation locale, pas une explication causale.

## Tests
```bash
pytest -q
```

## Points d'attention
- `scikit-learn` doit rester à la version utilisée pour entraîner le modèle (voir `requirements.txt`).
- Le modèle imite les décisions passées d'une banque : il n'est pas validé pour une décision automatique réelle.
  Les variables `gender`, `married` etc. peuvent poser des problèmes légaux selon le pays.
