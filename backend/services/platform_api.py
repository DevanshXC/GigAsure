"""Async client for mock Zomato Partner API — httpx only, 5s timeout, safe defaults."""

import json
import os
from datetime import datetime, timezone
from typing import Any

import httpx

from db.mongo import get_redis

BASE = os.getenv("MOCK_ZOMATO_URL", "http://localhost:8001")
TIMEOUT = 5.0


async def get_rider_duty_status(rider_id: str) -> dict[str, Any]:
    r = get_redis()
    key = f"duty:{rider_id}"
    if r:
        try:
            cached = await r.get(key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass
    default = {"rider_id": rider_id, "duty": "OFF", "since": None}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(f"{BASE}/partner/duty-status/{rider_id}")
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return default
    if r:
        try:
            await r.setex(key, 300, json.dumps(data))
        except Exception:
            pass
    return data


async def _append_gps_history(rider_id: str, loc: dict[str, Any]) -> None:
    r = get_redis()
    if not r:
        return
    key = f"gps:{rider_id}"
    try:
        raw = await r.get(key)
        hist = json.loads(raw) if raw else []
        hist.append({**loc, "ts": datetime.now(timezone.utc).isoformat()})
        hist = hist[-12:]
        await r.setex(key, 3600, json.dumps(hist))
    except Exception:
        pass


async def get_rider_location(rider_id: str) -> dict[str, Any]:
    default = {
        "rider_id": rider_id,
        "lat": 19.0,
        "lng": 72.8,
        "accuracy_m": 50.0,
    }
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(f"{BASE}/partner/location/{rider_id}")
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return default
    await _append_gps_history(rider_id, data)
    return data


async def get_rider_weekly_earnings(rider_id: str) -> dict[str, Any]:
    default = {
        "rider_id": rider_id,
        "avg_weekly_income": 4000.0,
        "hours_worked_this_week": 40,
        "avg_daily_income": 4000.0 / 7,
        "orders_this_week": 50,
    }
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(f"{BASE}/partner/earnings/weekly/{rider_id}")
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return default


async def get_zone_active_riders(zone_id: str) -> list[str]:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(f"{BASE}/partner/location/zone/{zone_id}/active")
            resp.raise_for_status()
            data = resp.json()
            return data.get("rider_ids") or data.get("riders") or []
    except Exception:
        return []


async def get_rider_order_history(
    rider_id: str, last_n_minutes: int = 60
) -> list[dict[str, Any]]:
    # Demo synthetic riders have no history in the mock API, skip the HTTP call completely
    if rider_id.startswith("ZMT-DEMO-"):
        return []

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(
                f"{BASE}/partner/orders/{rider_id}",
                params={"last_minutes": last_n_minutes},
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("orders") or data.get("items") or []
    except Exception:
        return []


async def get_rider_active_days_this_month(rider_id: str) -> int:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(f"{BASE}/partner/active-days/{rider_id}")
            resp.raise_for_status()
            data = resp.json()
            return int(data.get("active_days_last_30", 0))
    except Exception:
        return 0
