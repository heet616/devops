import os
import logging
from datetime import datetime
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("analysis_service")

app = FastAPI(title="Analysis Service", version="2.0.0")

DASHBOARD_URL = os.getenv("DASHBOARD_URL", "http://dashboard-service:8003")
INGESTION_URL = os.getenv("INGESTION_URL", "http://ingestion-service:8000")
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
    sensor_name: str = Field(..., min_length=1)
    sensor_type: str = Field(..., pattern="^(heart_rate|spo2|body_temp|blood_pressure)$")
    value: float = Field(..., ge=0.0)
    timestamp: datetime

class AlertPayload(BaseModel):
    alert_id: str
    patient_id: str
    sensor_type: str
    severity: str
    message: str
    timestamp: str

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

def evaluate_rules(payload: VitalsPayload):
    # Returns (severity, message) or None
    if payload.sensor_type == "heart_rate":
        if payload.value > 120: return "CRITICAL", f"High Heart Rate: {payload.value} bpm"
        if payload.value < 50: return "CRITICAL", f"Low Heart Rate: {payload.value} bpm"
    elif payload.sensor_type == "spo2":
        if payload.value < 90: return "CRITICAL", f"Low SpO2: {payload.value}%"
        if payload.value < 95: return "WARNING", f"Borderline SpO2: {payload.value}%"
    elif payload.sensor_type == "body_temp":
        if payload.value > 100.4: return "WARNING", f"Fever detected: {payload.value}F"
        if payload.value < 95.0: return "CRITICAL", f"Hypothermia risk: {payload.value}F"
    elif payload.sensor_type == "blood_pressure":
        if payload.value > 140: return "WARNING", f"High Blood Pressure (Sys): {payload.value} mmHg"
        if payload.value < 90: return "CRITICAL", f"Low Blood Pressure (Sys): {payload.value} mmHg"
    return None

@app.post("/analyze")
async def analyze(payload: VitalsPayload):
    anomaly = evaluate_rules(payload)
    if not anomaly:
        return {"status": "ok", "alert": False}

    severity, message = anomaly

    alert = AlertPayload(
        alert_id=str(uuid4()),
        patient_id=payload.patient_id,
        sensor_type=payload.sensor_type,
        severity=severity,
        message=message,
        timestamp=payload.timestamp.isoformat()
    )

    async with httpx.AsyncClient(timeout=5.0) as client:
        # 1. Send to ingestion service to persist in DB
        try:
            db_resp = await client.post(f"{INGESTION_URL}/api/v1/alerts", json=alert.model_dump(mode="json"))
            if db_resp.status_code != 201:
                logger.error(f"Failed to persist alert: {db_resp.text}")
        except httpx.HTTPError as exc:
            logger.error(f"ingestion service error (persistence): {exc}")
            
        # 2. Send to dashboard service for live streaming
        try:
            stream_resp = await client.post(f"{DASHBOARD_URL}/alerts", json=alert.model_dump(mode="json"))
            stream_resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.error(f"dashboard service error (stream): {exc}")

    return {"status": "ok", "alert": True, "alert_id": alert.alert_id}
