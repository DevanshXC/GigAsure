"""Scheduled trigger polling — weather, civic, AQI; city pools isolated."""

import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import uuid

from db.mongo import disruptions_col
from db.schemas import TriggerType, zone_pool_for_zone_id

OWM_KEY = os.getenv("OPENWEATHER_API_KEY", "")
NEWSDATA_KEY = os.getenv("NEWSDATA_API_KEY", "")

RAIN_MM_HR = 20.0
HEAT_C = 45.0
AQI_THRESHOLD_OWM = 5   # OWM 1–5 scale, Very Poor
PEAK_HOURS = [(12, 15), (19, 23)]

MONITORED_ZONES: list[dict[str, Any]] = [
    {
        "zone_id": "MUM-ANDHERI-W",
        "city": "Mumbai",
        "lat": 19.1252,
        "lon": 72.8464,
        "city_pool": "mumbai_rain_pool",
        "zone_tier": 3,
    },
    {
        "zone_id": "MUM-DHARAVI",
        "city": "Mumbai",
        "lat": 19.0440,
        "lon": 72.8557,
        "city_pool": "mumbai_rain_pool",
        "zone_tier": 4,
    },
    {
        "zone_id": "DEL-CONNAUGHT",
        "city": "Delhi",
        "lat": 28.6315,
        "lon": 77.2167,
        "city_pool": "delhi_aqi_pool",
        "zone_tier": 3,
    },
    {
        "zone_id": "DEL-OKHLA",
        "city": "Delhi",
        "lat": 28.5244,
        "lon": 77.2834,
        "city_pool": "delhi_aqi_pool",
        "zone_tier": 4,
    },
    {
        "zone_id": "BLR-WHITEFIELD",
        "city": "Bengaluru",
        "lat": 12.9698,
        "lon": 77.7499,
        "city_pool": "bengaluru_pool",
        "zone_tier": 1,
    },
]

IST = timezone(timedelta(hours=5, minutes=30))


def is_peak_hour() -> bool:
    now = datetime.now(IST)
    h = now.hour
    for start, end in PEAK_HOURS:
        if start <= h < end:
            return True
    return False


async def _owm_weather(lat: float, lon: float) -> dict[str, Any]:
    if not OWM_KEY:
        return {}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={"lat": lat, "lon": lon, "appid": OWM_KEY, "units": "metric"},
            )
            r.raise_for_status()
            return r.json()
    except Exception:
        return {}


async def _owm_aqi(lat: float, lon: float) -> int:
    if not OWM_KEY:
        return 1
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://api.openweathermap.org/data/2.5/air_pollution",
                params={"lat": lat, "lon": lon, "appid": OWM_KEY},
            )
            r.raise_for_status()
            data = r.json()
            return int((data.get("list") or [{}])[0].get("main", {}).get("aqi", 1))
    except Exception:
        return 1


async def poll_weather() -> None:
    for zone in MONITORED_ZONES:
        w = await _owm_weather(zone["lat"], zone["lon"])
        if not w:
            continue
        rain = (w.get("rain") or {}).get("1h", 0) or 0
        temp = float((w.get("main") or {}).get("temp", 25))
        if rain > RAIN_MM_HR and is_peak_hour():
            await open_event_and_claims(zone, TriggerType.weather, float(rain))
        if temp > HEAT_C:
            await open_event_and_claims(zone, TriggerType.weather, temp)


CIVIC_KEYWORDS_QUERY = "protest OR curfew OR bandh India"


async def poll_civic_unrest() -> None:
    if not NEWSDATA_KEY:
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://newsdata.io/api/1/news",
                params={
                    "apikey": NEWSDATA_KEY,
                    "q": CIVIC_KEYWORDS_QUERY,
                    "country": "in",
                    "language": "en",
                },
            )
            r.raise_for_status()
            data = r.json()
    except Exception:
        return

    from services.nlp_classifier import classify_article

    results = data.get("results") or []
    for zone in MONITORED_ZONES:
        city_lower = zone["city"].lower()
        hits = []
        for art in results:
            title = art.get("title") or ""
            desc = art.get("description") or ""
            if city_lower not in (title + desc).lower():
                continue
            c = classify_article(title, desc)
            if c.get("is_disruption") and float(c.get("confidence", 0)) > 0.85:
                hits.append(art)
        if len(hits) >= 2:
            await open_event_and_claims(zone, TriggerType.civic, 1.0)


async def poll_aqi() -> None:
    for zone in MONITORED_ZONES:
        if zone["city_pool"] != "delhi_aqi_pool":
            continue
        aqi = await _owm_aqi(zone["lat"], zone["lon"])
        if aqi >= AQI_THRESHOLD_OWM:
            await open_event_and_claims(zone, TriggerType.aqi, float(aqi))


async def close_resolved_events() -> None:
    col = disruptions_col()
    now = datetime.now(timezone.utc)
    cursor = col.find({"is_active": True})
    async for ev in cursor:
        z = next((z for z in MONITORED_ZONES if z["zone_id"] == ev["zone_id"]), None)
        if not z:
            continue
        resolved = False
        tt = ev.get("trigger_type")
        if tt == "weather":
            w = await _owm_weather(z["lat"], z["lon"])
            rain = (w.get("rain") or {}).get("1h", 0) or 0
            temp = float((w.get("main") or {}).get("temp", 25))
            if rain < RAIN_MM_HR / 2 and temp < HEAT_C - 2:
                resolved = True
        elif tt == "aqi":
            aq = await _owm_aqi(z["lat"], z["lon"])
            if aq < AQI_THRESHOLD_OWM - 1:
                resolved = True
        elif tt == "civic":
            resolved = False   # Civic events resolved manually

        if resolved:
            await col.update_one(
                {"event_id": ev["event_id"]},
                {"$set": {"is_active": False, "ended_at": now}},
            )
            # FIX: close_claim_for_event now exists in claims.py after our fix
            from routers.claims import close_claim_for_event
            await close_claim_for_event(ev["event_id"], now)


async def open_event_and_claims(
    zone: dict[str, Any], trigger_type: TriggerType, value: float
) -> None:
    pool = zone["city_pool"]
    expected = zone_pool_for_zone_id(zone["zone_id"])
    if expected and expected != pool:
        print(f"[TRIGGER] pool mismatch skip zone={zone['zone_id']}")
        return

    col = disruptions_col()
    existing = await col.find_one(
        {
            "zone_id": zone["zone_id"],
            "trigger_type": trigger_type.value,
            "is_active": True,
        }
    )
    if existing:
        return

    event_id = f"EVT-{uuid.uuid4().hex[:12]}"
    doc = {
        "event_id": event_id,
        "trigger_type": trigger_type.value,
        "zone_id": zone["zone_id"],
        "city": zone["city"],
        "started_at": datetime.now(timezone.utc),
        "ended_at": None,
        "is_active": True,
        "threshold_value": value,
        "source": "openweather" if trigger_type != TriggerType.civic else "newsdata",
        "city_pool": pool,
    }
    await col.insert_one(doc)
    print(
        f"[TRIGGER] opened event {event_id} type={trigger_type.value} "
        f"zone={zone['zone_id']} pool={pool}"
    )

    # FIX: open_claim_for_rider now exists in claims.py after our fix
    from routers.claims import open_claim_for_rider
    from db.mongo import policies_col

    cur = policies_col().find({"zone_id": zone["zone_id"], "status": "active"})
    async for pol in cur:
        rider_id = pol.get("rider_id")
        if rider_id:
            await open_claim_for_rider(str(rider_id), doc)


async def poll_all_triggers() -> None:
    await poll_weather()
    await poll_civic_unrest()
    await poll_aqi()
    await close_resolved_events()
    ts = datetime.now(timezone.utc).isoformat()
    print(f"[POLL] {ts} — trigger check complete")