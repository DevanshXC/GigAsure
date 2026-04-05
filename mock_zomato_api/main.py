"""Zomato Partner API (Mock) — income & GPS for GigaSure demos."""

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import FastAPI, Query

app = FastAPI(title="Zomato Partner API (Mock)")

IST = timezone(timedelta(hours=5, minutes=30))

RIDERS: dict[str, dict[str, Any]] = {
    "ZMT-MUM-4872": {
        "name": "Arjun",
        "zone_id": "MUM-ANDHERI-W",
        "duty": "ON",
        "lat": 19.1252,
        "lng": 72.8464,
        "accuracy_m": 18,
        "orders_last_60min": 3,
        "active_days_last_30": 15,
        "avg_weekly_income": 4500,
        "hours_worked": 45,
        "since": (datetime.now(IST) - timedelta(hours=3)).isoformat(),
        "jitter": True,
    },
    "ZMT-MUM-3341": {
        "name": "Ravi",
        "zone_id": "MUM-DHARAVI",
        "duty": "ON",
        "lat": 19.0440,
        "lng": 72.8557,
        "accuracy_m": 22,
        "orders_last_60min": 2,
        "active_days_last_30": 12,
        "avg_weekly_income": 3800,
        "hours_worked": 42,
        "since": (datetime.now(IST) - timedelta(hours=2)).isoformat(),
        "jitter": True,
    },
    "ZMT-DEL-5511": {
        "name": "Priya",
        "zone_id": "DEL-CONNAUGHT",
        "duty": "ON",
        "lat": 28.6315,
        "lng": 77.2167,
        "accuracy_m": 25,
        "orders_last_60min": 4,
        "active_days_last_30": 18,
        "avg_weekly_income": 5200,
        "hours_worked": 48,
        "since": (datetime.now(IST) - timedelta(hours=4)).isoformat(),
        "jitter": True,
    },
    "ZMT-MUM-9910": {
        "name": "Sarthak Singh",
        "zone_id": "MUM-ANDHERI-W",
        "duty": "ON",
        "lat": 19.0820,
        "lng": 72.9010,
        "accuracy_m": 4,
        "orders_last_60min": 0,
        "active_days_last_30": 2,
        "avg_weekly_income": 4200,
        "hours_worked": 10,
        "since": (datetime.now(IST) - timedelta(minutes=1)).isoformat(),
        "jitter": False,
    },
    # ── Mumbai – Bandra West (Tier 1) ──
    "ZMT-MUM-1122": {
        "name": "Neha Sharma",
        "zone_id": "MUM-BANDRA-W",
        "duty": "ON",
        "lat": 19.0596,
        "lng": 72.8295,
        "accuracy_m": 14,
        "orders_last_60min": 5,
        "active_days_last_30": 22,
        "avg_weekly_income": 6200,
        "hours_worked": 52,
        "since": (datetime.now(IST) - timedelta(hours=6)).isoformat(),
        "jitter": True,
    },
    # ── Mumbai – Powai (Tier 2) ──
    "ZMT-MUM-2233": {
        "name": "Vikram Patil",
        "zone_id": "MUM-POWAI",
        "duty": "ON",
        "lat": 19.1175,
        "lng": 72.9060,
        "accuracy_m": 20,
        "orders_last_60min": 3,
        "active_days_last_30": 16,
        "avg_weekly_income": 4800,
        "hours_worked": 44,
        "since": (datetime.now(IST) - timedelta(hours=2)).isoformat(),
        "jitter": True,
    },
    # ── Mumbai – Fort (Tier 2) ──
    "ZMT-MUM-3344": {
        "name": "Aisha Khan",
        "zone_id": "MUM-FORT",
        "duty": "ON",
        "lat": 18.9340,
        "lng": 72.8355,
        "accuracy_m": 16,
        "orders_last_60min": 4,
        "active_days_last_30": 20,
        "avg_weekly_income": 5500,
        "hours_worked": 50,
        "since": (datetime.now(IST) - timedelta(hours=5)).isoformat(),
        "jitter": True,
    },
    # ── Delhi – Okhla (Tier 4, high risk) ──
    "ZMT-DEL-6622": {
        "name": "Rohit Verma",
        "zone_id": "DEL-OKHLA",
        "duty": "ON",
        "lat": 28.5355,
        "lng": 77.2720,
        "accuracy_m": 30,
        "orders_last_60min": 2,
        "active_days_last_30": 10,
        "avg_weekly_income": 3600,
        "hours_worked": 38,
        "since": (datetime.now(IST) - timedelta(hours=1)).isoformat(),
        "jitter": True,
    },
    # ── Delhi – Rohini (Tier 3) ──
    "ZMT-DEL-7733": {
        "name": "Meena Kumari",
        "zone_id": "DEL-ROHINI",
        "duty": "ON",
        "lat": 28.7095,
        "lng": 77.1135,
        "accuracy_m": 18,
        "orders_last_60min": 3,
        "active_days_last_30": 14,
        "avg_weekly_income": 4100,
        "hours_worked": 40,
        "since": (datetime.now(IST) - timedelta(hours=3)).isoformat(),
        "jitter": True,
    },
    # ── Bengaluru – Whitefield (Tier 1) ──
    "ZMT-BLR-8844": {
        "name": "Kiran Rao",
        "zone_id": "BLR-WHITEFIELD",
        "duty": "ON",
        "lat": 12.9698,
        "lng": 77.7500,
        "accuracy_m": 12,
        "orders_last_60min": 6,
        "active_days_last_30": 25,
        "avg_weekly_income": 7000,
        "hours_worked": 55,
        "since": (datetime.now(IST) - timedelta(hours=7)).isoformat(),
        "jitter": True,
    },
    # ── Bengaluru – Koramangala (Tier 2) ──
    "ZMT-BLR-9955": {
        "name": "Divya Nair",
        "zone_id": "BLR-KORAMANGALA",
        "duty": "ON",
        "lat": 12.9352,
        "lng": 77.6245,
        "accuracy_m": 15,
        "orders_last_60min": 4,
        "active_days_last_30": 19,
        "avg_weekly_income": 5800,
        "hours_worked": 46,
        "since": (datetime.now(IST) - timedelta(hours=4)).isoformat(),
        "jitter": True,
    },
    # ── Low-activity rider (will trigger waitlist / reduced coverage) ──
    "ZMT-MUM-0001": {
        "name": "Amit Tiwari",
        "zone_id": "MUM-DHARAVI",
        "duty": "OFF",
        "lat": 19.0425,
        "lng": 72.8540,
        "accuracy_m": 35,
        "orders_last_60min": 0,
        "active_days_last_30": 3,
        "avg_weekly_income": 1800,
        "hours_worked": 8,
        "since": (datetime.now(IST) - timedelta(days=2)).isoformat(),
        "jitter": False,
    },
}


@app.get("/")
async def root():
    return {
        "riders": [
            {"id": k, "name": v["name"], "zone_id": v["zone_id"]}
            for k, v in RIDERS.items()
        ]
    }


def _jitter(r: dict[str, Any], lat: float, lng: float) -> tuple[float, float]:
    if not r.get("jitter"):
        return lat, lng
    import random

    return lat + random.uniform(-0.0003, 0.0003), lng + random.uniform(-0.0003, 0.0003)


@app.get("/partner/duty-status/{rider_id}")
async def duty_status(rider_id: str):
    r = RIDERS.get(rider_id, {})
    return {
        "rider_id": rider_id,
        "duty": r.get("duty", "OFF"),
        "since": r.get("since"),
    }


@app.get("/partner/location/{rider_id}")
async def location(rider_id: str):
    r = RIDERS.get(rider_id, {})
    lat, lng = float(r.get("lat", 0)), float(r.get("lng", 0))
    lat, lng = _jitter(r, lat, lng)
    ts = datetime.now(timezone.utc) - timedelta(minutes=5)
    speed = 12.0 if r.get("jitter") else 0.0
    return {
        "rider_id": rider_id,
        "lat": lat,
        "lng": lng,
        "accuracy_m": r.get("accuracy_m", 20),
        "last_lat": lat,
        "last_lng": lng,
        "last_timestamp": ts.isoformat(),
        "speed_kmph": speed,
    }


@app.get("/partner/earnings/weekly/{rider_id}")
async def weekly_earnings(rider_id: str):
    r = RIDERS.get(rider_id, {})
    w = float(r.get("avg_weekly_income", 4000))
    return {
        "rider_id": rider_id,
        "avg_weekly_income": w,
        "hours_worked_this_week": r.get("hours_worked", 40),
        "avg_daily_income": w / 7.0,
        "orders_this_week": r.get("orders_last_60min", 0) * 12,
    }


@app.get("/partner/location/zone/{zone_id}/active")
async def zone_active(zone_id: str):
    ids = [k for k, v in RIDERS.items() if v.get("zone_id") == zone_id]
    return {"zone_id": zone_id, "rider_ids": ids}


@app.get("/partner/orders/{rider_id}")
async def orders(rider_id: str, last_minutes: int = Query(60)):
    r = RIDERS.get(rider_id, {})
    n = int(r.get("orders_last_60min", 0))
    return {
        "rider_id": rider_id,
        "orders": [{"id": f"o{i}"} for i in range(n)],
    }


@app.get("/partner/active-days/{rider_id}")
async def active_days(rider_id: str):
    r = RIDERS.get(rider_id, {})
    return {"rider_id": rider_id, "active_days_last_30": r.get("active_days_last_30", 0)}


@app.post("/partner/webhook/duty-change")
async def duty_change(payload: dict[str, Any]):
    rid = payload.get("rider_id")
    if rid in RIDERS:
        RIDERS[rid]["duty"] = payload.get("duty", "OFF")
    return {"ok": True}
