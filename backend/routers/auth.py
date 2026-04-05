"""OTP + JWT auth; zone detection; rider registration (income insurance only)."""

import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from jose import jwt
from pydantic import BaseModel

from db.mongo import riders_col, waitlist_col
from db.schemas import (
    CoverageActivityTier,
    OTPRequest,
    OTPVerify,
    RiderCreate,
    TokenResponse,
    ZONE_MAP,
)
import os

router = APIRouter()

SECRET = os.getenv("JWT_SECRET", "gigsure-dev-secret-change-me")
ALGO = "HS256"

_otp_store: dict[str, dict[str, Any]] = {}


def _issue_token(rider_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=30)
    return jwt.encode(
        {"sub": rider_id, "exp": exp},
        SECRET,
        algorithm=ALGO,
    )


@router.post("/send-otp")
async def send_otp(body: OTPRequest):
    otp = f"{random.randint(100000, 999999)}"
    _otp_store[body.phone] = {
        "otp": otp,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    return {"message": "OTP sent", "dev_otp": otp}


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(body: OTPVerify):
    rec = _otp_store.get(body.phone)
    if not rec or rec["otp"] != body.otp:
        raise HTTPException(400, "Invalid OTP")
    if rec["exp"] < datetime.now(timezone.utc):
        raise HTTPException(400, "OTP expired")
    rider = await riders_col().find_one({"phone": body.phone})
    if rider:
        rider_id = rider.get("rider_id") or str(rider["_id"])
    else:
        rider_id = body.phone
    is_new = rider is None
    meets = False
    if rider:
        meets = int(rider.get("active_days_last_30", 0)) >= 7
    return TokenResponse(
        access_token=_issue_token(rider_id),
        rider_id=rider_id,
        is_new_rider=is_new,
        meets_underwriting_threshold=meets,
    )


class ZoneDetectResponse(BaseModel):
    zone_id: str
    zone_name: str
    zone_tier: int
    city: str
    city_pool: str


@router.post("/detect-zone", response_model=ZoneDetectResponse)
async def detect_zone(pin_code: str = Query(...)):
    z = ZONE_MAP.get(pin_code)
    if not z:
        raise HTTPException(404, "Pin code not mapped")
    return ZoneDetectResponse(
        zone_id=z["zone_id"],
        zone_name=z["zone_name"],
        zone_tier=z["zone_tier"],
        city=z["city"],
        city_pool=z["city_pool"],
    )


class RegisterResponse(BaseModel):
    rider_id: str
    coverage_tier: str
    waitlist_status: str
    waitlist_position: Optional[int] = None
    estimated_eligible_date: Optional[str] = None


@router.post("/register", response_model=RegisterResponse)
async def register(body: RiderCreate):
    
    # Duplicate check
    existing = await riders_col().find_one({"phone": body.phone})
    if existing:
        rider_id = existing.get("rider_id") or str(existing["_id"])
        cov = existing.get("coverage_tier", "reduced")
        status = "waitlisted" if existing.get("waitlist") else "eligible"
        return RegisterResponse(
            rider_id=rider_id,
            coverage_tier=cov,
            waitlist_status=status,
        )

    days = body.active_days_last_30
    rider_id = body.partner_id or f"GS-{uuid.uuid4().hex[:8]}"

    if days < 5:
        pos = int((await waitlist_col().count_documents({})) + 1)
        est = (datetime.now(timezone.utc) + timedelta(days=30 - max(days, 0))).date().isoformat()
        await waitlist_col().insert_one(
            {
                "rider_id": rider_id,
                "phone": body.phone,
                "active_days_last_30": days,
                "estimated_eligible_date": est,
                "created_at": datetime.now(timezone.utc),
            }
        )
        doc = body.model_dump()
        doc["rider_id"] = rider_id
        doc["waitlist"] = True
        doc["onboarding_complete"] = False
        doc["coverage_tier"] = CoverageActivityTier.reduced.value
        await riders_col().insert_one(doc)
        return RegisterResponse(
            rider_id=rider_id,
            coverage_tier="reduced",
            waitlist_status="waitlisted",
            waitlist_position=pos,
            estimated_eligible_date=est,
        )

    if days >= 7:
        cov = CoverageActivityTier.full
    else:
        cov = CoverageActivityTier.reduced

    doc = body.model_dump()
    doc["rider_id"] = rider_id
    doc["coverage_tier"] = cov.value
    doc["onboarding_complete"] = body.onboarding
    doc["waitlist"] = False
    await riders_col().insert_one(doc)
    return RegisterResponse(
        rider_id=rider_id,
        coverage_tier=cov.value,
        waitlist_status="eligible",
    )


@router.get("/me")
async def me(phone: str):
    r = await riders_col().find_one({"phone": phone})
    if not r:
        raise HTTPException(404, "Not found")
    r["_id"] = str(r["_id"])
    return r

class MagicSyncRequest(BaseModel):
    phone: str
    platform: str
    partner_id: str

class MagicSyncResponse(BaseModel):
    rider_id: str
    name: str
    zone_id: str
    zone_tier: int
    city: str
    weekly_income: float
    risk_score_grade: str
    premium_amount_inr: float
    coverage_tier: str

@router.post("/magic-sync", response_model=MagicSyncResponse)
async def magic_sync(body: MagicSyncRequest):
    import httpx
    # 1. Fetch from mock zomato API
    base_url = "http://localhost:8001"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # We fetch all riders to match the partner_id to its zone/name
            # (since our mock API root returns the list of all riders)
            root = await client.get(f"{base_url}/")
            root.raise_for_status()
            riders_list = root.json().get("riders", [])
            
            mock_driver = None
            for r in riders_list:
                if r.get("id") == body.partner_id:
                    mock_driver = r
                    break
            
            if not mock_driver:
                raise HTTPException(404, "Partner ID not found on platform.")
            
            # Fetch deeper stats
            weekly_resp = await client.get(f"{base_url}/partner/earnings/weekly/{body.partner_id}")
            weekly_data = weekly_resp.json()
            weekly_income = weekly_data.get("avg_weekly_income", 4000)

            active_resp = await client.get(f"{base_url}/partner/active-days/{body.partner_id}")
            active_data = active_resp.json()
            active_days = active_data.get("active_days_last_30", 15)

    except Exception as e:
        raise HTTPException(500, f"Error communicating with {body.platform} platform API: {str(e)}")

    # 2. Determine Risk and Premium using the REAL engine
    zone_id = mock_driver["zone_id"]
    from db.schemas import ZONE_MAP, PremiumRequest
    from routers.premium import compute_premium

    zone_tier = 2
    city_name = "mumbai"
    for z in ZONE_MAP.values():
        if z["zone_id"] == zone_id:
            zone_tier = z["zone_tier"]
            city_name = z.get("city", "mumbai")
            break

    cov_tier = CoverageActivityTier.full.value if active_days >= 7 else CoverageActivityTier.reduced.value

    # Use the real premium engine
    premium_req = PremiumRequest(
        rider_id=body.partner_id,
        avg_weekly_income=weekly_income,
        zone_tier=zone_tier,
        clean_weeks=0,
        zone_id=zone_id,
        city=city_name,
        active_days_last_30=active_days,
    )
    premium_result = await compute_premium(premium_req, clean_weeks=0)
    premium_amount = premium_result["final_premium"]
    risk_score = premium_result["risk_score"]
    risk_grade = "High Risk" if risk_score > 0.5 else "Medium Risk" if risk_score > 0.25 else "Low Risk"

    # 3. Create or Update Rider in DB
    existing = await riders_col().find_one({"phone": body.phone})
    rider_id = body.partner_id
    doc = {
        "phone": body.phone,
        "name": mock_driver["name"],
        "dob": "1995-01-01", # Mocked
        "city": city_name,
        "pin_code": "000000",
        "platform": body.platform,
        "partner_id": body.partner_id,
        "weekly_income": weekly_income,
        "avg_weekly_income": weekly_income,
        "avg_daily_income": round(weekly_income / 7.0, 2),
        "upi_id": f"{body.phone}@ybl",
        "zone_id": zone_id,
        "active_days_last_30": active_days,
        "rider_id": rider_id,
        "coverage_tier": cov_tier,
        "waitlist": False,
        "onboarding_complete": False # Still needs activation step
    }

    if existing:
        await riders_col().update_one({"phone": body.phone}, {"$set": doc})
    else:
        doc["created_at"] = datetime.now(timezone.utc)
        await riders_col().insert_one(doc)

    return MagicSyncResponse(
        rider_id=rider_id,
        name=mock_driver["name"],
        zone_id=zone_id,
        zone_tier=zone_tier,
        city=city_name,
        weekly_income=weekly_income,
        risk_score_grade=risk_grade,
        premium_amount_inr=premium_amount,
        coverage_tier=cov_tier
    )
