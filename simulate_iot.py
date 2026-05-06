import time
import json
import random
import requests
from datetime import datetime

# Configure your API URL here
# If running locally via docker-compose, it's on port 80
API_URL = "http://localhost:80/api/v1/vitals"

PATIENTS = ["patient_001", "patient_002", "patient_003"]

print(f"Starting IoT simulator... Sending data to {API_URL}")

def generate_vitals():
    # 80% chance of normal vitals, 20% chance of an anomaly
    if random.random() < 0.8:
        heart_rate = random.randint(60, 100) # Normal HR
        spo2 = random.randint(95, 100)       # Normal SpO2
    else:
        # Anomaly scenario
        anomaly_type = random.choice(["high_hr", "low_hr", "low_spo2"])
        if anomaly_type == "high_hr":
            heart_rate = random.randint(121, 160)
            spo2 = random.randint(95, 100)
        elif anomaly_type == "low_hr":
            heart_rate = random.randint(30, 49)
            spo2 = random.randint(95, 100)
        else: # low_spo2
            heart_rate = random.randint(60, 100)
            spo2 = random.randint(80, 89)
            
    return heart_rate, spo2

while True:
    try:
        patient_id = random.choice(PATIENTS)
        hr, spo2 = generate_vitals()
        
        payload = {
            "patient_id": patient_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "heart_rate": hr,
            "spo2": spo2
        }
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Sending data for {patient_id}: HR={hr}, SpO2={spo2}%")
        
        # Send POST request
        response = requests.post(API_URL, json=payload, timeout=2)
        
        if response.status_code != 200:
            print(f"  -> Failed: {response.status_code} - {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"  -> Connection error: {e}")
        
    # Wait 2 seconds before the next reading
    time.sleep(2)
