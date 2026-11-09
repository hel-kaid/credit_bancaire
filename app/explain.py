# """Facteurs explicatifs (CRED-31).

# Méthode : pour chaque information du dossier, on la remplace par la valeur d'un client « typique »
# et on mesure de combien la probabilité d'accord change. Un impact positif signifie que cette
# information augmente les chances d'accord par rapport à un client typique ; négatif, qu'elle les diminue.
# """
from .model_service import ModelService
from .schemas import ClientProfile

# Client typique : médianes / valeurs les plus fréquentes des données d'entraînement.
REFERENCE = {
    "gender": "Male", "married": "Yes", "dependents": 0, "education": "Graduate",
    "self_employed": "No", "applicant_income": 3813.0, "coapplicant_income": 1188.0,
    "loan_amount": 128.0, "loan_amount_term": 360, "credit_history": 1,
    "property_area": "Semiurban",
}

LABELS = {
    "credit_history": "Historique de crédit",
    "applicant_income": "Revenu du demandeur",
    "coapplicant_income": "Revenu du co-demandeur",
    "loan_amount": "Montant du prêt",
    "loan_amount_term": "Durée du prêt",
    "married": "Situation matrimoniale",
    "dependents": "Personnes à charge",
    "education": "Niveau d'études",
    "self_employed": "Travail indépendant",
    "property_area": "Zone du bien",
}

# Le genre est volontairement absent des facteurs affichés (variable sensible), même si le modèle l'utilise.
MIN_IMPACT = 0.01  # on ignore les effets inférieurs à 1 point de pourcentage


def explain(service: ModelService, profile: ClientProfile, proba: float, top_n: int = 5) -> list[dict]:
    factors = []
    for field, label in LABELS.items():
        value = getattr(profile, field)
        if value == REFERENCE[field]:
            continue  # identique au client typique : aucun effet à expliquer
        swapped = profile.model_copy(update={field: REFERENCE[field]})
        p_ref = service.predict_proba(service.build_features(swapped))
        impact = proba - p_ref
        if abs(impact) < MIN_IMPACT:
            continue
        favorable = impact > 0
        factors.append({
            "field": field,
            "label": label,
            "value": str(value),
            "impact": round(impact * 100, 1),
            "direction": "favorable" if favorable else "defavorable",
            "message": f"{label} ({value}) : {'augmente' if favorable else 'diminue'} "
                       f"les chances d'accord de {abs(impact) * 100:.1f} points",
        })
    factors.sort(key=lambda f: abs(f["impact"]), reverse=True)
    return factors[:top_n]
