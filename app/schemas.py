# """Schémas de validation des données entrantes et sortantes (CRED-33)."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Limites autorisées : elles couvrent la plage des données d'entraînement avec une marge.
# Unités identiques à celles du jeu de données d'entraînement.
MAX_INCOME = 100_000       # entraînement : revenu max ≈ 81 000
MAX_LOAN_AMOUNT = 1_000    # entraînement : montant max = 700 (en milliers)
MIN_TERM, MAX_TERM = 12, 480  # durée en mois


class ClientProfile(BaseModel):
    """Profil d'un demandeur de crédit (valeurs brutes, sans transformation)."""

    gender: Literal["Male", "Female"] = Field(description="Genre")
    married: Literal["Yes", "No"] = Field(description="Marié(e)")
    dependents: int = Field(ge=0, le=10, description="Nombre de personnes à charge (3 et plus sont regroupés)")
    education: Literal["Graduate", "Not Graduate"] = Field(description="Niveau d'études")
    self_employed: Literal["Yes", "No"] = Field(description="Travailleur indépendant")
    applicant_income: float = Field(gt=0, le=MAX_INCOME, description="Revenu du demandeur")
    coapplicant_income: float = Field(ge=0, le=MAX_INCOME, description="Revenu du co-demandeur (0 si aucun)")
    loan_amount: float = Field(ge=1, le=MAX_LOAN_AMOUNT, description="Montant du prêt (en milliers)")
    loan_amount_term: int = Field(ge=MIN_TERM, le=MAX_TERM, description="Durée du prêt en mois")
    credit_history: Literal[0, 1] = Field(description="1 = historique de crédit conforme, 0 = non conforme")
    property_area: Literal["Urban", "Semiurban", "Rural"] = Field(description="Zone du bien")

    model_config = ConfigDict(
        extra="forbid",  # un champ inconnu (faute de frappe) est refusé
        json_schema_extra={"example": {
            "gender": "Male", "married": "Yes", "dependents": 0, "education": "Graduate",
            "self_employed": "No", "applicant_income": 4500, "coapplicant_income": 1500,
            "loan_amount": 130, "loan_amount_term": 360, "credit_history": 1,
            "property_area": "Semiurban"}},
    )


class Factor(BaseModel):
    field: str
    label: str
    value: str
    impact: float = Field(description="Effet sur la probabilité d'accord, en points de pourcentage")
    direction: Literal["favorable", "defavorable"]
    message: str


class ScoringResponse(BaseModel):
    decision: Literal["ACCORDE", "REFUSE"]
    probability_approval: float
    threshold: float
    factors: list[Factor]
    model_version: str


class ErrorDetail(BaseModel):
    field: str
    message: str


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: list[ErrorDetail]
