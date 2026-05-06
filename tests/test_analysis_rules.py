from datetime import datetime

from analysis_service.main import VitalsPayload, evaluate_rules

def _payload(sensor_type: str, value: float) -> VitalsPayload:
    return VitalsPayload(
        patient_id="p1",
        sensor_name="test_sensor",
        sensor_type=sensor_type,
        value=value,
        timestamp=datetime.utcnow()
    )

def test_evaluate_rules_high_hr():
    payload = _payload("heart_rate", 130)
    assert evaluate_rules(payload) == ("CRITICAL", "High Heart Rate: 130.0 bpm")

def test_evaluate_rules_low_spo2():
    payload = _payload("spo2", 85)
    assert evaluate_rules(payload) == ("CRITICAL", "Low SpO2: 85.0%")

def test_evaluate_rules_ok():
    payload = _payload("heart_rate", 70)
    assert evaluate_rules(payload) is None
