"""FINAL Premium Engine — Real-time + Predictive"""

import random
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from db.mongo import riders_col
from db.schemas import PremiumRequest, ZONE_MULTIPLIERS
from ml.risk_model import compute_risk_score

router = APIRouter()


# ------------------ 🧠 CORE ENGINE ------------------ #
async def compute_premium(req: PremiumRequest, clean_weeks: int, is_forecast: bool = False):

    # 🔥 risk model (safe)
    try:
        rb = await compute_risk_score(req.zone_id, req.city)
    except:
        class Dummy:
            p_weather = 0.2
            p_civic = 0.2
            p_pollution = 0.2
        rb = Dummy()

    p_w = rb.p_weather
    p_c = rb.p_civic
    p_p = rb.p_pollution

    if is_forecast:
        # Deterministic 7-day forecast shift logic (for demo dynamism)
        shift_dir = 1 if len(req.zone_id) % 2 == 0 else -1
        
        # Keep realistic floors instead of flat 0.0
        p_w = min(0.95, max(0.04, p_w + shift_dir * 0.12))
        p_c = min(0.95, max(0.03, p_c - shift_dir * 0.05))
        p_p = min(0.95, max(0.02, p_p + shift_dir * 0.08))

    # 🔥 risk score
    risk_score = (
        0.45 * p_w +
        0.30 * p_c +
        0.25 * p_p
    )

    base = 0.02 * req.avg_weekly_income
    geo = ZONE_MULTIPLIERS.get(req.zone_tier, 1.0)
    ncb = max(0.75, 1 - 0.05 * clean_weeks)

    raw = base * (1 + risk_score) * geo * ncb
    cap = 0.05 * req.avg_weekly_income

    final = min(raw, cap)

    return {
        "final_premium": round(final, 2),
        "risk_score": round(risk_score, 4),
        "breakdown": {
            "weather": round(p_w, 2),
            "civic": round(p_c, 2),
            "pollution": round(p_p, 2)
        }
    }


# ------------------ 📊 CALCULATE (REAL-TIME) ------------------ #
@router.post("/calculate")
async def calculate(req: PremiumRequest):
    return await compute_premium(req, req.clean_weeks)

# ------------------ 📊 ZONE RISK SCORE ------------------ #
@router.get("/risk-score/{zone_id}")
async def get_zone_risk_score(zone_id: str):
    city = "mumbai"
    if "DEL" in zone_id:
        city = "delhi"
    elif "BLR" in zone_id:
        city = "bengaluru"
        
    try:
        rb = await compute_risk_score(zone_id, city)
    except:
        class Dummy:
            p_weather = 0.2
            p_civic = 0.2
            p_pollution = 0.2
        rb = Dummy()
        
    rs = 0.45 * rb.p_weather + 0.30 * rb.p_civic + 0.25 * rb.p_pollution
    
    return {
        "p_weather": round(rb.p_weather, 3),
        "p_civic": round(rb.p_civic, 3),
        "p_pollution": round(rb.p_pollution, 3),
        "risk_score": round(rs, 3),
        "zone_id": zone_id,
        "computed_at": datetime.now(timezone.utc).isoformat()
    }


# ------------------ 📊 QUOTE FROM DB ------------------ #
@router.get("/quote/{rider_id}")
async def quote(rider_id: str):

    r = await riders_col().find_one(
        {"$or": [{"rider_id": rider_id}, {"partner_id": rider_id}]}
    )

    if not r:
        raise HTTPException(404, "Rider not found")

    req = PremiumRequest(
        rider_id=rider_id,
        avg_weekly_income=float(r.get("avg_weekly_income") or 4000),
        zone_tier=int(r.get("zone_tier") or 3),
        clean_weeks=int(r.get("clean_weeks") or 0),
        zone_id=r.get("zone_id") or "MUM-ANDHERI-W",
        city=r.get("city") or "mumbai",
        active_days_last_30=int(r.get("active_days_last_30") or 7),
    )

    return await compute_premium(req, req.clean_weeks)


# ------------------ 🔮 NEXT WEEK ------------------ #
@router.get("/next-week/{rider_id}")
async def next_week(rider_id: str):

    r = await riders_col().find_one(
        {"$or": [{"rider_id": rider_id}, {"partner_id": rider_id}]}
    )

    if not r:
        raise HTTPException(404, "Rider not found")

    req = PremiumRequest(
        rider_id=rider_id,
        avg_weekly_income=float(r.get("avg_weekly_income") or 4000),
        zone_tier=int(r.get("zone_tier") or 3),
        clean_weeks=int(r.get("clean_weeks") or 0),
        zone_id=r.get("zone_id") or "MUM-ANDHERI-W",
        city=r.get("city") or "mumbai",
        active_days_last_30=int(r.get("active_days_last_30") or 7),
    )

    # current
    current = await compute_premium(req, req.clean_weeks)

    # next week
    next_data = await compute_premium(req, req.clean_weeks + 1, is_forecast=True)

    # 🔥 deterministic trend (no randomness)
    trend_factor = 1 + (0.02 * (req.clean_weeks < 2))
    next_data["final_premium"] *= trend_factor

    delta = next_data["final_premium"] - current["final_premium"]

    return {
        "current": {
            "final_premium": current["final_premium"],
            "risk_score": current["risk_score"]
        },
        "next": {
            "final_premium": round(next_data["final_premium"], 2),
            "risk_score": next_data["risk_score"],
            "breakdown": next_data["breakdown"]
        },
        "delta": round(delta, 2),
        "direction": "up" if delta > 0 else "down"
    }