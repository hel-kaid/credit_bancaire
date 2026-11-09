# API de scoring de crédit (CRED-28, CRED-29).

# Lancer :  uvicorn app.main:app --reload
# Docs :    http://127.0.0.1:8000/docs

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .explain import explain
from .model_service import ModelService
from .schemas import ClientProfile, ErrorResponse, ScoringResponse

logger = logging.getLogger("credit_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Le modèle est chargé UNE fois au démarrage (CRED-30). S'il manque, l'API refuse de démarrer.
    app.state.service = ModelService()
    logger.info("Modèle chargé (seuil = %.2f)", app.state.service.threshold)
    yield


app = FastAPI(title="Credit Scoring API", version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
if origins:  # ex. CORS_ORIGINS=http://localhost:5173 pour un frontend React/Vite
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])


# ---- Gestion des erreurs (CRED-34) : HTTP 400 explicite --------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    details = []
    for err in exc.errors():
        loc = [str(x) for x in err["loc"] if x != "body"]
        field = ".".join(loc) or "body"
        if err["type"] == "missing":
            message = "Champ obligatoire manquant"
        elif err["type"] == "extra_forbidden":
            message = "Champ inconnu"
        elif err["type"] in ("greater_than", "greater_than_equal", "less_than", "less_than_equal"):
            message = f"Valeur hors des limites autorisées ({err.get('msg', '')})"
        elif err["type"] == "literal_error":
            message = f"Valeur non autorisée ({err.get('msg', '')})"
        elif err["type"] == "json_invalid":
            message = "Corps de requête : JSON invalide"
        else:
            message = err.get("msg", "Valeur invalide")
        details.append({"field": field, "message": message})
    return JSONResponse(status_code=400, content={
        "error": "validation_error",
        "message": "Données manquantes ou hors des limites autorisées",
        "details": details,
    })


# ---- Endpoints -------------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "model_version": app.state.service.version}


@app.post(
    "/api/v1/credit-scoring",
    response_model=ScoringResponse,
    responses={400: {"model": ErrorResponse}},
    summary="Décision de crédit pour un profil client",
)
def credit_scoring(profile: ClientProfile, request: Request):
    service: ModelService = request.app.state.service
    features = service.build_features(profile)
    proba = service.predict_proba(features)
    return ScoringResponse(
        decision="ACCORDE" if proba >= service.threshold else "REFUSE",
        probability_approval=round(proba, 4),
        threshold=round(service.threshold, 2),
        factors=explain(service, profile, proba),
        model_version=service.version,
    )
