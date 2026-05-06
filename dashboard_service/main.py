import asyncio
import json
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

app = FastAPI(title="Dashboard Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALERT_QUEUE: "asyncio.Queue[dict]" = asyncio.Queue()
SERVICE_NAME = "dashboard_service"

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

@app.post("/alerts")
async def receive_alert(payload: AlertPayload):
    await ALERT_QUEUE.put(payload.model_dump(mode="json"))
    return {"status": "received"}

async def stream_alerts(request: Request) -> AsyncGenerator[str, None]:
    while True:
        if await request.is_disconnected():
            break
        alert = await ALERT_QUEUE.get()
        yield f"data: {json.dumps(alert)}\n\n"

@app.get("/stream")
async def stream(request: Request):
    return StreamingResponse(stream_alerts(request), media_type="text/event-stream")
