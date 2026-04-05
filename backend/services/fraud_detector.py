"""Fraud scoring — XGBoost / Isolation Forest bundle + rules; score before payout."""

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np

from db.mongo import get_redis
from services import platform_api

fraud_bundle: Optional[dict[str, Any]] = None

BASE_DIR = Path(__file__).resolve().parent.parent
FRAUD_PATH = BASE_DIR / "ml" / "models" / "fraud_model.pkl"


def load_fraud_model() -> None:
    global fraud_bundle
    try:
        if not FRAUD_PATH.exists():
            fraud_bundle = None
            print("Warning: fraud_model.pkl not found — using rule-based fallback.")
            return
        raw = joblib.load(FRAUD_PATH)
        if isinstance(raw, dict) and "xgb" in raw and "iso" in raw:
            # Hybrid bundle from train_fraud_model.py
            fraud_bundle = {
                "xgb": raw["xgb"],
                "iso": raw["iso"],
                "model_type": "hybrid",
                "scaler": raw.get("scaler"),
                "feature_names": raw.get("feature_names"),
                "threshold": raw.get("threshold", 0.5),
            }
            print(
                f"Fraud hybrid model loaded (XGB+IsoForest, "
                f"{len(raw.get('feature_names', []))} features)."
            )
        elif isinstance(raw, dict) and "model" in raw:
            fraud_bundle = raw
            print(
                f"Fraud model loaded ({raw.get('model_type', 'unknown')})."
            )
        else:
            fraud_bundle = {
                "iso": raw,
                "xgb": None,
                "model_type": "isolation_forest",
                "scaler": None,
                "feature_names": None,
                "threshold": 0.4,
            }
            print("Fraud legacy IsolationForest loaded (no scaler).")
    except Exception as e:
        fraud_bundle = None
        print(f"Warning: fraud model load failed ({e}) — rule-based fallback.")


async def check_duplicate_claim(rider_id: str, event_id: str) -> bool:
    from db.mongo import claims_col

    c = claims_col()
    existing = await c.find_one(
        {"rider_id": rider_id, "event_id": event_id, "status": {"$ne": "rejected"}}
    )
    return existing is not None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p = math.pi / 180
    a = (
        0.5
        - math.cos((lat2 - lat1) * p) / 2
        + math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lon2 - lon1) * p)) / 2
    )
    return 2 * r * math.asin(math.sqrt(a))


async def check_teleportation(rider_id: str, location: dict[str, Any]) -> float:
    r = get_redis()
    if not r:
        return 0.0
    try:
        raw = await r.get(f"gps:{rider_id}")
        if not raw:
            return 0.0
        hist = json.loads(raw)
        if len(hist) < 2:
            return 0.0
        prev = hist[-2]
        lat1, lon1 = float(prev.get("lat", 0)), float(prev.get("lng", 0))
        lat2 = float(location.get("lat", lat1))
        lon2 = float(location.get("lng", lon1))
        dist = haversine_km(lat1, lon1, lat2, lon2)
        if dist > 2.7:
            return 0.40
    except Exception:
        pass
    return 0.0


async def check_order_footprint(rider_id: str) -> float:
    orders = await platform_api.get_rider_order_history(rider_id, last_n_minutes=60)
    n = len(orders)
    if n == 0:
        return 0.35
    if n <= 2:
        return 0.10
    return 0.0


def check_duty_timing(
    rider_id: str, trigger_time: datetime, duty: dict[str, Any]
) -> float:
    since = duty.get("since")
    if not since:
        return 0.0
    try:
        if isinstance(since, str):
            dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
        else:
            dt = since
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        delta = abs((trigger_time - dt).total_seconds())
        if delta <= 120:
            return 0.30
    except Exception:
        pass
    return 0.0


def check_gps_accuracy(location: dict[str, Any]) -> float:
    acc = float(location.get("accuracy_m", 20))
    if acc < 8:
        return 0.15
    return 0.0


def _duty_minutes(trigger_time: datetime, duty: dict[str, Any]) -> float:
    since = duty.get("since")
    if not since:
        return 999.0
    try:
        if isinstance(since, str):
            dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
        else:
            dt = since
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        tt = trigger_time if trigger_time.tzinfo else trigger_time.replace(tzinfo=timezone.utc)
        return abs((tt - dt).total_seconds()) / 60.0
    except Exception:
        return 999.0


def _build_fraud_row(
    duty_minutes: float,
    orders_last_60min: int,
    gps_accuracy_m: float,
    velocity_kmh: float,
    jump_km: float,
    days_active: int,
    co_claimants: float = 0.0,
    z_score: float = 0.0,
) -> dict[str, float]:
    return {
        "duty_on_minutes_before_trigger": float(duty_minutes),
        "orders_last_60min": float(orders_last_60min),
        "gps_accuracy_m": float(gps_accuracy_m),
        "velocity_kmh_last_ping": float(velocity_kmh),
        "gps_coordinate_jump_km": float(jump_km),
        "co_claimants_same_event": float(co_claimants),
        "rider_claim_frequency_z_score": float(z_score),
        "days_active_last_30": float(days_active),
        "reactive_duty": float(1 if duty_minutes < 2 else 0),
        "zero_orders": float(1 if orders_last_60min == 0 else 0),
        "suspicious_precision": float(1 if gps_accuracy_m < 8 else 0),
        "teleported": float(1 if jump_km > 4 else 0),
        "coordinated_ring": float(1 if co_claimants > 25 else 0),
        "low_activity": float(1 if days_active < 5 else 0),
    }


def _run_ml_fraud(bundle: dict[str, Any], row: dict[str, float]) -> float:
    names = bundle.get("feature_names")
    if not names:
        return 0.5
    vec = np.array([[row.get(n, 0.0) for n in names]], dtype=np.float64)
    scaler = bundle.get("scaler")
    if scaler is not None:
        vec = scaler.transform(vec)

    model_type = bundle.get("model_type", "isolation_forest")

    if model_type == "hybrid":
        xgb = bundle.get("xgb")
        iso = bundle.get("iso")

        # XGBoost probability
        if xgb is not None:
            xgb_prob = float(xgb.predict_proba(vec)[0, 1])
        else:
            xgb_prob = 0.0

        # Isolation Forest anomaly score (higher = more anomalous)
        if iso is not None:
            raw_score = -float(iso.score_samples(vec)[0])
            # Normalize to [0, 1] using sigmoid-like mapping
            iso_score = 1.0 / (1.0 + math.exp(-2.0 * (raw_score - 0.5)))
        else:
            iso_score = 0.0

        # Weighted blend: 70% XGBoost + 30% IsolationForest
        final_score = 0.7 * xgb_prob + 0.3 * iso_score
        return float(max(0.0, min(1.0, final_score)))

    elif model_type == "xgboost":
        m = bundle.get("model") or bundle.get("xgb")
        proba = m.predict_proba(vec)[0]
        return float(proba[1] if len(proba) > 1 else proba[0])

    else:
        # Pure isolation forest
        m = bundle.get("model") or bundle.get("iso")
        s = float(m.decision_function(vec)[0])
        return float(1.0 / (1.0 + math.exp(s)))


def _run_legacy_if(features: list[float]) -> float:
    m = None
    if fraud_bundle:
        m = fraud_bundle.get("iso") or fraud_bundle.get("model")
    if m is None:
        return 0.5
    arr = np.array([features])
    try:
        pred = m.predict(arr)[0]
        scores = m.score_samples(arr)[0]
        if pred == -1:
            return min(1.0, 0.5 + -float(scores) * 0.1)
        return min(1.0, max(0.0, 0.05 + -float(scores) * 0.02))
    except Exception:
        return 0.5


async def compute_fraud_score(
    rider_id: str,
    event: dict[str, Any],
    location: dict[str, Any],
    duty: dict[str, Any],
) -> float:
    event_id = event.get("event_id", "")
    dup = await check_duplicate_claim(rider_id, event_id)
    if dup:
        print(f"[FRAUD] duplicate claim rider={rider_id} event={event_id}")
        return 1.0

    trigger_time = datetime.now(timezone.utc)
    if event.get("started_at"):
        try:
            t = event["started_at"]
            if isinstance(t, datetime):
                trigger_time = t if t.tzinfo else t.replace(tzinfo=timezone.utc)
        except Exception:
            pass

    duty_min = _duty_minutes(trigger_time, duty)
    orders = await platform_api.get_rider_order_history(rider_id, 60)
    orders_last_60min = len(orders)
    gps_accuracy_m = float(location.get("accuracy_m", 20))
    velocity_kmh = 0.0
    jump_km = 0.0
    r = get_redis()
    if r:
        try:
            raw = await r.get(f"gps:{rider_id}")
            if raw:
                hist = json.loads(raw)
                if len(hist) >= 2:
                    a, b = hist[-2], hist[-1]
                    velocity_kmh = haversine_km(
                        float(a.get("lat", 0)),
                        float(a.get("lng", 0)),
                        float(b.get("lat", 0)),
                        float(b.get("lng", 0)),
                    ) * 30
                    jump_km = haversine_km(
                        float(a.get("lat", 0)),
                        float(a.get("lng", 0)),
                        float(location.get("lat", 0)),
                        float(location.get("lng", 0)),
                    )
        except Exception:
            pass

    from db.mongo import riders_col

    rid = await riders_col().find_one(
        {"$or": [{"partner_id": rider_id}, {"rider_id": rider_id}]}
    )
    days_active = 15
    if rid:
        days_active = int(rid.get("active_days_last_30", 15))

    row = _build_fraud_row(
        duty_min,
        orders_last_60min,
        gps_accuracy_m,
        velocity_kmh,
        jump_km,
        days_active,
        0.0,
        0.0,
    )

    if fraud_bundle is not None and fraud_bundle.get("feature_names"):
        score = _run_ml_fraud(fraud_bundle, row)
    elif fraud_bundle is not None:
        features = [
            float(duty_min),
            float(orders_last_60min),
            gps_accuracy_m,
            velocity_kmh,
            jump_km,
            float(days_active),
        ]
        score = _run_legacy_if(features)
    else:
        score = min(
            1.0,
            await check_teleportation(rider_id, location)
            + await check_order_footprint(rider_id)
            + check_duty_timing(rider_id, trigger_time, duty)
            + check_gps_accuracy(location),
        )

    print(
        f"[FRAUD] rider={rider_id} event={event_id} score={score:.3f} "
        f"ml={fraud_bundle is not None}"
    )
    return round(float(score), 3)
