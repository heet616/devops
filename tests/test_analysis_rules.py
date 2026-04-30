from datetime import datetime

from analysis_service.main import VitalsPayload, evaluate_rules


def _payload(heart_rate: int, spo2: int) -> VitalsPayload:
    return VitalsPayload(
        patient_id="p1",
        timestamp=datetime.utcnow(),
        heart_rate=heart_rate,
        spo2=spo2,
    )


def test_evaluate_rules_high_hr():
    payload = _payload(heart_rate=130, spo2=95)
    assert evaluate_rules(payload) == "heart_rate_high"


def test_evaluate_rules_low_hr():
    payload = _payload(heart_rate=45, spo2=95)
    assert evaluate_rules(payload) == "heart_rate_low"


def test_evaluate_rules_low_spo2():
    payload = _payload(heart_rate=70, spo2=85)
    assert evaluate_rules(payload) == "spo2_low"


def test_evaluate_rules_ok():
    payload = _payload(heart_rate=70, spo2=98)
    assert evaluate_rules(payload) is None
