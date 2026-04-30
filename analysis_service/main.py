import os
from datetime import datetime
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

app = FastAPI(title="Analysis Service", version="1.0.0")

DASHBOARD_URL = os.getenv("DASHBOARD_URL", "http://dashboard-service:8003")
SERVICE_NAME = "analysis_service"

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


class AlertPayload(BaseModel):
    alert_id: str
    patient_id: str
    trigger_reason: str
    vitals_snapshot: dict


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


def evaluate_rules(payload: VitalsPayload) -> str | None:
    if payload.heart_rate > 120:
        return "heart_rate_high"
    if payload.heart_rate < 50:
        return "heart_rate_low"
    if payload.spo2 < 90:
        return "spo2_low"
    return None


@app.post("/analyze")
async def analyze(payload: VitalsPayload):
    trigger_reason = evaluate_rules(payload)
    if not trigger_reason:
        return {"status": "ok", "alert": False}

    alert = AlertPayload(
        alert_id=str(uuid4()),
        patient_id=payload.patient_id,
        trigger_reason=trigger_reason,
        vitals_snapshot=payload.model_dump(),
    )

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.post(f"{DASHBOARD_URL}/alerts", json=alert.model_dump())
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"dashboard service error: {exc}")

    return {"status": "ok", "alert": True, "alert_id": alert.alert_id}
