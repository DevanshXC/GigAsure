"""Risk scoring — XGBoost bundle (weather/civic/pollution) or live API fallback."""

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx
import joblib
import numpy as np
from dotenv import load_dotenv
import os

from db.schemas import RiskScoreBreakdown, ZONE_MAP

load_dotenv()

risk_model: Optional[dict[str, Any]] = None
OWM_KEY = os.getenv("OPENWEATHER_API_KEY", "")

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "risk_model.pkl"

ZONE_COORDS: dict[str, tuple[float, float]] = {
    "MUM-ANDHERI-W": (19.1252, 72.8464),
    "MUM-BANDRA-W": (19.0596, 72.8295),
    "MUM-DHARAVI": (19.0440, 72.8557),
    "MUM-POWAI": (19.1176, 72.9090),
    "MUM-FORT": (18.9345, 72.8376),
    "DEL-CONNAUGHT": (28.6315, 77.2167),
    "DEL-OKHLA": (28.5244, 77.2834),
    "DEL-ROHINI": (28.7495, 77.0627),
    "BLR-WHITEFIELD": (12.9698, 77.7499),
    "BLR-KORAMANGALA": (12.9352, 77.6245),
}

HISTORICAL_CIVIC_RISK: dict[str, float] = {
    "MUM-ANDHERI-W": 0.10,
    "MUM-DHARAVI": 0.30,
    "DEL-CONNAUGHT": 0.25,
    "DEL-OKHLA": 0.35,
    "BLR-WHITEFIELD": 0.05,
    "BLR-KORAMANGALA": 0.08,
}

HISTORICAL_POLLUTION_RISK: dict[str, float] = {
    "MUM-ANDHERI-W": 0.10,
    "MUM-DHARAVI": 0.12,
    "DEL-CONNAUGHT": 0.55,
    "DEL-OKHLA": 0.65,
    "DEL-ROHINI": 0.48,
    "BLR-WHITEFIELD": 0.12,
    "BLR-KORAMANGALA": 0.08,
}


def load_risk_model() -> None:
    global risk_model
    try:
        if MODEL_PATH.exists():
            raw = joblib.load(MODEL_PATH)
            if isinstance(raw, dict) and "weather" in raw:
                risk_model = raw
                print("Risk model (XGBoost bundle) loaded from disk.")
            else:
                risk_model = None
                print("Risk model file format unknown — using API fallback.")
        else:
            risk_model = None
            print("Risk model .pkl not found — using live API fallback.")
    except Exception as e:
        risk_model = None
        print(f"Risk model load failed ({e}) — using API fallback.")


def _delhi_zone(zone_id: str) -> bool:
    return zone_id.startswith("DEL-")


def _flood_zone_tier(zone_id: str) -> int:
    for _pin, meta in ZONE_MAP.items():
        if meta.get("zone_id") == zone_id:
            return int(meta.get("zone_tier", 3))
    return 3


def _encode_city(le: Any, city: str) -> int:
    c = str(city).lower().strip()
    classes = list(le.classes_)
    if c in classes:
        return int(le.transform([c])[0])
    return int(le.transform([classes[0]])[0])


def _month_to_season_str(month: int) -> str:
    if month in (6, 7, 8, 9):
        return "monsoon"
    if month in (12, 1, 2):
        return "winter"
    if month in (3, 4, 5):
        return "summer"
    return "autumn"


async def fetch_weather_probability(lat: float, lon: float, city: str) -> float:
    """OWM forecast — ratio of periods with rain probability > 0.5."""
    if not OWM_KEY:
        return 0.40
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={"lat": lat, "lon": lon, "appid": OWM_KEY, "cnt": 40},
            )
            r.raise_for_status()
            data = r.json()
            list_ = data.get("list") or []
            rainish = 0
            for p in list_:
                if (p.get("pop") or 0) > 0.5:
                    rainish += 1
            if not list_:
                return 0.40
            return min(1.0, rainish / len(list_))
    except Exception:
        return 0.40


async def fetch_current_rain_temp(lat: float, lon: float) -> tuple[float, float]:
    """Current rain (mm/h proxy) and temp (C) for feature row."""
    if not OWM_KEY:
        return 5.0, 32.0
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={"lat": lat, "lon": lon, "appid": OWM_KEY, "units": "metric"},
            )
            r.raise_for_status()
            data = r.json()
            rain = float((data.get("rain") or {}).get("1h", 0) or 0)
            temp = float((data.get("main") or {}).get("temp", 28.0))
            return rain, temp
    except Exception:
        return 5.0, 32.0


async def fetch_aqi_pair(lat: float, lon: float) -> tuple[float, float]:
    """Rough aqi_avg / aqi_max proxies from OWM scale 1–5 → 0–500 scale."""
    if not OWM_KEY:
        return 150.0, 200.0
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://api.openweathermap.org/data/2.5/air_pollution",
                params={"lat": lat, "lon": lon, "appid": OWM_KEY},
            )
            r.raise_for_status()
            data = r.json()
            aqi = float((data.get("list") or [{}])[0].get("main", {}).get("aqi", 3))
            val = 50 + (aqi - 1) * 100
            return val, val + 30.0
    except Exception:
        return 150.0, 200.0


async def fetch_pollution_probability(
    lat: float, lon: float, city: str, zone_id: str
) -> float:
    """Delhi zones only: live OWM air pollution. Else historical (Mumbai/Bengaluru)."""
    if not _delhi_zone(zone_id):
        return HISTORICAL_POLLUTION_RISK.get(zone_id, 0.12)

    if not OWM_KEY:
        return HISTORICAL_POLLUTION_RISK.get(zone_id, 0.50)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://api.openweathermap.org/data/2.5/air_pollution",
                params={"lat": lat, "lon": lon, "appid": OWM_KEY},
            )
            r.raise_for_status()
            data = r.json()
            aqi = (data.get("list") or [{}])[0].get("main", {}).get("aqi", 3)
            return (float(aqi) - 1) / 4.0
    except Exception:
        return HISTORICAL_POLLUTION_RISK.get(zone_id, 0.50)


def _predict_xgboost_bundle(
    bundle: dict[str, Any],
    zone_id: str,
    city: str,
    lat: float,
    lon: float,
    month: int,
    avg_rain: float,
    max_temp: float,
    aqi_avg: float,
    aqi_max: float,
    civic_incidents: float,
) -> tuple[float, float, float]:
    le = bundle["city_encoder"]
    season_ohe = bundle["season_ohe"]
    season_cols = bundle["season_columns"]
    flood_tier = float(_flood_zone_tier(zone_id))
    city_enc = _encode_city(le, city)
    is_monsoon = int(month in (6, 7, 8, 9))
    is_delhi_aqi = int(str(city).lower().strip() == "delhi" and month in (10, 11, 12, 1, 2))
    season_str = _month_to_season_str(month)
    smat = season_ohe.transform(np.array([[season_str]], dtype=object))
    base_w = np.array(
        [
            [
                avg_rain,
                max_temp,
                month,
                is_monsoon,
                flood_tier,
                city_enc,
            ]
        ],
        dtype=float,
    )
    Xw = np.hstack([base_w, smat])
    Xc = np.array(
        [[civic_incidents, month, city_enc, flood_tier]],
        dtype=float,
    )
    Xp = np.array([[aqi_avg, aqi_max, month, city_enc, is_delhi_aqi]], dtype=float)

    pw = float(np.clip(bundle["weather"].predict(Xw)[0], 0, 1))
    pc = float(np.clip(bundle["civic"].predict(Xc)[0], 0, 1))
    pp = float(np.clip(bundle["pollution"].predict(Xp)[0], 0, 1))
    return pw, pc, pp


async def compute_risk_score(zone_id: str, city: str) -> RiskScoreBreakdown:
    lat, lon = ZONE_COORDS.get(zone_id, (19.0, 72.8))
    now = datetime.now(timezone.utc)
    month = now.month

    if risk_model is not None and isinstance(risk_model, dict) and "weather" in risk_model:
        try:
            avg_rain, max_temp = await fetch_current_rain_temp(lat, lon)
            aqi_avg, aqi_max = await fetch_aqi_pair(lat, lon)
            if not _delhi_zone(zone_id):
                aqi_avg = HISTORICAL_POLLUTION_RISK.get(zone_id, 0.12) * 400 + 50
                aqi_max = aqi_avg + 40.0
            civic_inc = HISTORICAL_CIVIC_RISK.get(zone_id, 0.1) * 50.0
            p_weather, p_civic, p_pollution = _predict_xgboost_bundle(
                risk_model,
                zone_id,
                city,
                lat,
                lon,
                month,
                avg_rain,
                max_temp,
                aqi_avg,
                aqi_max,
                civic_inc,
            )
        except Exception:
            p_weather = await fetch_weather_probability(lat, lon, city)
            p_civic = HISTORICAL_CIVIC_RISK.get(zone_id, 0.10)
            p_pollution = await fetch_pollution_probability(lat, lon, city, zone_id)
    else:
        p_weather = await fetch_weather_probability(lat, lon, city)
        p_civic = HISTORICAL_CIVIC_RISK.get(zone_id, 0.10)
        p_pollution = await fetch_pollution_probability(lat, lon, city, zone_id)

    risk_score = 0.45 * p_weather + 0.30 * p_civic + 0.25 * p_pollution

    return RiskScoreBreakdown(
        p_weather=p_weather,
        p_civic=p_civic,
        p_pollution=p_pollution,
        risk_score=risk_score,
        zone_id=zone_id,
        computed_at=now,
    )
