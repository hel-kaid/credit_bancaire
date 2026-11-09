import copy

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.model_service import ModelService
from app.schemas import ClientProfile

GOOD = {
    "gender": "Male", "married": "Yes", "dependents": 0, "education": "Graduate",
    "self_employed": "No", "applicant_income": 4500, "coapplicant_income": 1500,
    "loan_amount": 130, "loan_amount_term": 360, "credit_history": 1, "property_area": "Semiurban",
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:  # le « with » déclenche le chargement du modèle au démarrage
        yield c


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_valid_request(client):
    r = client.post("/api/v1/credit-scoring", json=GOOD)
    assert r.status_code == 200
    body = r.json()
    assert body["decision"] in ("ACCORDE", "REFUSE")
    assert 0 <= body["probability_approval"] <= 1
    assert body["decision"] == "ACCORDE"  # bon profil


def test_bad_credit_history_is_refused_with_explanation(client):
    r = client.post("/api/v1/credit-scoring", json={**GOOD, "credit_history": 0})
    body = r.json()
    assert body["decision"] == "REFUSE"
    top = body["factors"][0]
    assert top["field"] == "credit_history" and top["direction"] == "defavorable"


def test_missing_field_returns_400(client):
    bad = copy.deepcopy(GOOD); del bad["credit_history"]
    r = client.post("/api/v1/credit-scoring", json=bad)
    assert r.status_code == 400
    assert r.json()["details"][0] == {"field": "credit_history", "message": "Champ obligatoire manquant"}


@pytest.mark.parametrize("field,value", [
    ("applicant_income", -5), ("applicant_income", 0), ("applicant_income", 10_000_000),
    ("loan_amount", 5000), ("loan_amount_term", 3), ("dependents", -1),
])
def test_out_of_bounds_returns_400(client, field, value):
    r = client.post("/api/v1/credit-scoring", json={**GOOD, field: value})
    assert r.status_code == 400
    assert r.json()["details"][0]["field"] == field


def test_invalid_category_and_unknown_field_return_400(client):
    assert client.post("/api/v1/credit-scoring", json={**GOOD, "gender": "X"}).status_code == 400
    assert client.post("/api/v1/credit-scoring", json={**GOOD, "foo": 1}).status_code == 400


def test_invalid_json_returns_400(client):
    r = client.post("/api/v1/credit-scoring", content="{pas du json", headers={"content-type": "application/json"})
    assert r.status_code == 400


def test_feature_engineering_matches_training_data():
    """Ligne 2 du CSV d'entraînement : revenu 4583, co-revenu 1508, prêt 128, marié, 1 personne à charge."""
    p = ClientProfile(gender="Male", married="Yes", dependents=1, education="Graduate", self_employed="No",
                      applicant_income=4583, coapplicant_income=1508, loan_amount=128,
                      loan_amount_term=360, credit_history=1, property_area="Rural")
    f = ModelService.build_features(p).iloc[0]
    assert np.isclose(f["ApplicantIncome"], 8.430327, atol=1e-5)
    assert np.isclose(f["CoapplicantIncome"], 7.319202, atol=1e-5)
    assert np.isclose(f["Total_Income"], 8.714732, atol=1e-5)
    assert np.isclose(f["Loan_Income_Ratio"], 21.014612, atol=1e-5)
    assert f["Dependents_1"] == 1 and f["Property_Area_Urban"] == 0 and f["Property_Area_Semiurban"] == 0
