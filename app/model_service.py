# """Chargement du modèle au démarrage (CRED-30) et construction des variables."""
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .schemas import ClientProfile

DEFAULT_MODEL_PATH = Path(__file__).resolve().parent.parent / "modele_credit.joblib"


class ModelService:
    def __init__(self, path: str | Path | None = None):
        path = Path(path or os.getenv("MODEL_PATH", DEFAULT_MODEL_PATH))
        if not path.exists():
            raise FileNotFoundError(f"Modèle introuvable : {path}")
        bundle = joblib.load(path)
        self.model = bundle["model"]
        self.threshold: float = float(bundle["threshold"])
        self.columns: list[str] = list(bundle["columns"])
        self.version = os.getenv("MODEL_VERSION", "1.0")

    @staticmethod
    def build_features(p: ClientProfile) -> pd.DataFrame:
        """Transforme le profil brut en variables du modèle (mêmes formules que l'entraînement :
        revenus et montant au log1p, revenu total, ratio montant/revenu, encodage 0/1)."""
        total = p.applicant_income + p.coapplicant_income
        row = {
            "ApplicantIncome": np.log1p(p.applicant_income),
            "CoapplicantIncome": np.log1p(p.coapplicant_income),
            "LoanAmount": np.log1p(p.loan_amount),
            "Loan_Amount_Term": p.loan_amount_term,
            "Credit_History": p.credit_history,
            "Total_Income": np.log1p(total),
            "Loan_Income_Ratio": p.loan_amount / total * 1000,
            "Gender_Male": int(p.gender == "Male"),
            "Married_Yes": int(p.married == "Yes"),
            "Dependents_1": int(p.dependents == 1),
            "Dependents_2": int(p.dependents == 2),
            "Dependents_3+": int(p.dependents >= 3),
            "Education_Not Graduate": int(p.education == "Not Graduate"),
            "Self_Employed_Yes": int(p.self_employed == "Yes"),
            "Property_Area_Semiurban": int(p.property_area == "Semiurban"),
            "Property_Area_Urban": int(p.property_area == "Urban"),
        }
        return pd.DataFrame([row])[FEATURE_ORDER]

    def predict_proba(self, features: pd.DataFrame) -> float:
        return float(self.model.predict_proba(features[self.columns])[0, 1])


# Ordre des colonnes attendu par le modèle (identique au CSV d'entraînement, sans la cible)
FEATURE_ORDER = [
    "ApplicantIncome", "CoapplicantIncome", "LoanAmount", "Loan_Amount_Term", "Credit_History",
    "Total_Income", "Loan_Income_Ratio", "Gender_Male", "Married_Yes", "Dependents_1",
    "Dependents_2", "Dependents_3+", "Education_Not Graduate", "Self_Employed_Yes",
    "Property_Area_Semiurban", "Property_Area_Urban",
]
