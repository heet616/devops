import time
import random
import requests
from datetime import datetime, timezone

API_URL = "http://16.171.149.222:8000/api/v1/vitals"

PATIENTS = ["patient_001", "patient_002", "patient_003"]
SENSORS = [
    {"name": "BioShield Alpha-1", "type": "heart_rate"},
    {"name": "BioShield Beta-2",  "type": "spo2"},
    {"name": "TempMonitor X",     "type": "body_temp"},
    {"name": "BPSense Pro",       "type": "blood_pressure"},
]

# Generate all patient-sensor combos (12 total)
ALL_COMBOS = [
    {"patient_id": p, **s}
    for p in PATIENTS
    for s in SENSORS
]

print(f"Starting IoT simulator — {len(ALL_COMBOS)} sensors @ 100 ms each")
print(f"Posting to: {API_URL}\n")

def generate_value(sensor_type: str, anomaly: bool) -> float:
    if not anomaly:
        if sensor_type == "heart_rate":     return float(random.randint(60, 100))
        if sensor_type == "spo2":           return float(random.randint(95, 100))
        if sensor_type == "body_temp":      return round(random.uniform(97.5, 99.5), 1)
        if sensor_type == "blood_pressure": return float(random.randint(90, 120))
    else:
        if sensor_type == "heart_rate":
            return float(random.choice([random.randint(30, 49), random.randint(121, 160)]))
        if sensor_type == "spo2":           return float(random.randint(80, 89))
        if sensor_type == "body_temp":
            return round(random.choice([
                random.uniform(93.0, 94.9),
                random.uniform(100.5, 104.0),
            ]), 1)
        if sensor_type == "blood_pressure":
            return float(random.choice([random.randint(60, 89), random.randint(141, 180)]))
    return 0.0

combo_idx = 0

while True:
    combo = ALL_COMBOS[combo_idx % len(ALL_COMBOS)]
    combo_idx += 1

    anomaly = random.random() < 0.15   # 15 % chance of anomaly per reading
    value = generate_value(combo["type"], anomaly)

    payload = {
        "patient_id":  combo["patient_id"],
        "sensor_name": combo["name"],
        "sensor_type": combo["type"],
        "value":       value,
        "timestamp":   datetime.now(timezone.utc).isoformat(),
    }

    tag = "⚠ ANOMALY" if anomaly else "  normal "
    print(f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] {tag} | "
          f"{combo['patient_id']} | {combo['type']:<15} | {value}")

    try:
        requests.post(API_URL, json=payload, timeout=1)
    except requests.exceptions.RequestException as e:
        print(f"  -> error: {e}")

    time.sleep(0.1)   # 100 ms between each sensor reading
