import os
import logging
import time
from datetime import datetime
import aiosqlite
import httpx
from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingestion_service")

app = FastAPI(title="Enhanced Medical Ingestion Platform", version="2.0.0")

# Enable Cross-Origin Resource Sharing (CORS) for Frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ANALYSIS_URL = os.getenv("ANALYSIS_URL", "http://analysis-service:8002")
DB_PATH = os.getenv("DB_PATH", "/data/healthtech.db")

# --- PROMETHEUS METRICS ---
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total", "Total incoming HTTP calls", ["method", "path", "status"]
)
VITAL_LATENCY_HISTOGRAM = Histogram(
    "vital_ingestion_latency_seconds", "Latency processing vital streams"
)
LIVE_METRIC_GAUGE = Gauge(
    "patient_vital_value", "Current sensor reading metrics", ["patient_id", "sensor_type"]
)

# --- PYDANTIC SCHEMAS ---
class VitalsPayload(BaseModel):
    patient_id: str = Field(..., min_length=1)
    sensor_name: str = Field(..., min_length=1)
    sensor_type: str = Field(..., pattern="^(heart_rate|spo2|body_temp|blood_pressure)$")
    value: float = Field(..., ge=0.0)
    timestamp: datetime

class AlertPayload(BaseModel):
    patient_id: str
    sensor_type: str
    severity: str
    message: str
    timestamp: str

# --- DATABASE SETUP ---
async def initialize_database():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sensor_telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                sensor_name TEXT NOT NULL,
                sensor_type TEXT NOT NULL,
                value REAL NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS clinical_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                sensor_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        await db.commit()

@app.on_event("startup")
async def startup_event():
    await initialize_database()

# --- CLINICAL API ENDPOINTS ---
@app.post("/api/v1/vitals", status_code=status.HTTP_201_CREATED)
async def ingest_vitals(payload: VitalsPayload):
    start_time = time.perf_counter()
    HTTP_REQUESTS_TOTAL.labels(method="POST", path="/api/v1/vitals", status="201").inc()
    
    # Track the value inside the Prometheus Gauge engine
    LIVE_METRIC_GAUGE.labels(patient_id=payload.patient_id, sensor_type=payload.sensor_type).set(payload.value)
    
    timestamp_str = payload.timestamp.isoformat()
    
    # Commit asynchronous transaction write to SQLite database
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO sensor_telemetry (patient_id, sensor_name, sensor_type, value, timestamp) 
               VALUES (?, ?, ?, ?, ?)""",
            (payload.patient_id, payload.sensor_name, payload.sensor_type, payload.value, timestamp_str)
        )
        await db.commit()
        
    # Forward the payload downstream to the analysis microservice pipeline
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.post(f"{ANALYSIS_URL}/analyze", json=payload.model_dump(mode="json"))
            if response.status_code != 200:
                logger.warning(f"Analysis engine returned anomaly flag status: {response.status_code}")
        except httpx.HTTPError as exc:
            logger.error(f"Failed to transmit data to downstream analytics node: {exc}")
            
    VITAL_LATENCY_HISTOGRAM.observe(time.perf_counter() - start_time)
    return {"status": "persisted_and_forwarded"}

@app.post("/api/v1/alerts", status_code=status.HTTP_201_CREATED)
async def create_alert(payload: AlertPayload):
    HTTP_REQUESTS_TOTAL.labels(method="POST", path="/api/v1/alerts", status="201").inc()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO clinical_alerts (patient_id, sensor_type, severity, message, timestamp)
               VALUES (?, ?, ?, ?, ?)""",
            (payload.patient_id, payload.sensor_type, payload.severity, payload.message, payload.timestamp)
        )
        await db.commit()
    return {"status": "alert_saved"}

@app.get("/api/v1/sensors/summary")
async def get_sensor_summary():
    """ Calculates localized temporal metrics optimized for Carousel rendering """
    HTTP_REQUESTS_TOTAL.labels(method="GET", path="/api/v1/sensors/summary", status="200").inc()
    
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        
        # Pull distinct patient/sensor mappings
        async with db.execute("SELECT DISTINCT patient_id, sensor_name, sensor_type FROM sensor_telemetry") as cursor:
            nodes = await cursor.fetchall()
            
        summary_collection = []
        for node in nodes:
            # Native SQLite time function evaluation
            async with db.execute(
                """SELECT AVG(value) as day_mean FROM sensor_telemetry 
                   WHERE patient_id = ? AND sensor_type = ? 
                   AND timestamp >= datetime('now', '-24 hours')""",
                (node["patient_id"], node["sensor_type"])
            ) as c24:
                r24 = await c24.fetchone()
                
            async with db.execute(
                """SELECT AVG(value) as window_mean FROM sensor_telemetry 
                   WHERE patient_id = ? AND sensor_type = ? 
                   AND timestamp >= datetime('now', '-5 minutes')""",
                (node["patient_id"], node["sensor_type"])
            ) as c5:
                r5 = await c5.fetchone()
                
            summary_collection.append({
                "patient_id": node["patient_id"],
                "sensor_name": node["sensor_name"],
                "sensor_type": node["sensor_type"],
                "mean_past_day": round(r24["day_mean"], 2) if r24["day_mean"] else 0.0,
                "mean_last_5min": round(r5["window_mean"], 2) if r5["window_mean"] else 0.0
            })
            
        return summary_collection

@app.get("/api/v1/alerts")
async def get_clinical_alerts():
    HTTP_REQUESTS_TOTAL.labels(method="GET", path="/api/v1/alerts", status="200").inc()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM clinical_alerts ORDER BY timestamp DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

@app.get("/api/v1/patients")
async def list_patients():
    """Return all distinct patient IDs"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT DISTINCT patient_id FROM sensor_telemetry ORDER BY patient_id") as cursor:
            rows = await cursor.fetchall()
            return [r["patient_id"] for r in rows]

@app.get("/api/v1/patients/{patient_id}/report")
async def get_patient_report(patient_id: str):
    """Full patient report: per-sensor stats + last 200 readings + alerts"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Per-sensor summary
        async with db.execute(
            "SELECT DISTINCT sensor_name, sensor_type FROM sensor_telemetry WHERE patient_id = ?",
            (patient_id,)
        ) as cur:
            sensors = await cur.fetchall()

        sensor_summaries = []
        for s in sensors:
            async with db.execute(
                """SELECT
                    AVG(value) as mean_all,
                    MIN(value) as min_val,
                    MAX(value) as max_val,
                    COUNT(*) as reading_count,
                    AVG(value) FILTER (WHERE timestamp >= datetime('now', '-24 hours')) as mean_24h,
                    AVG(value) FILTER (WHERE timestamp >= datetime('now', '-5 minutes')) as mean_5min
                   FROM sensor_telemetry WHERE patient_id = ? AND sensor_type = ?""",
                (patient_id, s["sensor_type"])
            ) as cur:
                stats = await cur.fetchone()

            # Last 50 readings for sparkline
            async with db.execute(
                """SELECT value, timestamp FROM sensor_telemetry
                   WHERE patient_id = ? AND sensor_type = ?
                   ORDER BY timestamp DESC LIMIT 50""",
                (patient_id, s["sensor_type"])
            ) as cur:
                readings = await cur.fetchall()

            sensor_summaries.append({
                "sensor_name": s["sensor_name"],
                "sensor_type": s["sensor_type"],
                "mean_all": round(stats["mean_all"], 2) if stats["mean_all"] else 0.0,
                "mean_24h": round(stats["mean_24h"], 2) if stats["mean_24h"] else 0.0,
                "mean_5min": round(stats["mean_5min"], 2) if stats["mean_5min"] else 0.0,
                "min_val": round(stats["min_val"], 2) if stats["min_val"] else 0.0,
                "max_val": round(stats["max_val"], 2) if stats["max_val"] else 0.0,
                "reading_count": stats["reading_count"] or 0,
                "recent_readings": [
                    {"value": r["value"], "timestamp": r["timestamp"]}
                    for r in reversed(readings)
                ],
            })

        # Alerts for this patient
        async with db.execute(
            "SELECT * FROM clinical_alerts WHERE patient_id = ? ORDER BY timestamp DESC LIMIT 50",
            (patient_id,)
        ) as cur:
            alerts = await cur.fetchall()

        return {
            "patient_id": patient_id,
            "sensor_summaries": sensor_summaries,
            "alerts": [dict(a) for a in alerts],
        }

@app.get("/metrics")
def get_metrics_endpoint():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

