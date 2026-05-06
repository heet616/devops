import os
from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

app = FastAPI(title="Ingestion Service", version="1.0.0")

ANALYSIS_URL = os.getenv("ANALYSIS_URL", "http://analysis-service:8002")
SERVICE_NAME = "ingestion_service"

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["service", "method", "path", "status_code"],
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["service", "method", "path"],
)


class VitalsPayload(BaseModel):
    patient_id: str = Field(..., min_length=1)
    timestamp: datetime
    heart_rate: int = Field(..., ge=0)
    spo2: int = Field(..., ge=0, le=100)


@app.middleware("http")
async def metrics_middleware(request, call_next):
    with REQUEST_LATENCY.labels(SERVICE_NAME, request.method, request.url.path).time():
        response = await call_next(request)
    REQUEST_COUNT.labels(
        SERVICE_NAME,
        request.method,
        request.url.path,
        response.status_code,
    ).inc()
    return response


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/api/v1/vitals")
async def ingest_vitals(payload: VitalsPayload):
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.post(f"{ANALYSIS_URL}/analyze", json=payload.model_dump(mode='json'))
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"analysis service error: {exc}")

    return {"status": "accepted"}
