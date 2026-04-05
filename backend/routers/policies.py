"""Policy management — weekly (Sunday to Sunday) coverage."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Body
from bson import ObjectId

from db.mongo import policies_col, riders_col
from db.schemas import PremiumRequest
from routers.premium import compute_premium

router = APIRouter()


def serialize_policy(p: dict) -> dict:
    p["_id"] = str(p["_id"])
    # FIX: convert any nested ObjectId fields that may have slipped through
    if "_id" in p and isinstance(p["_id"], ObjectId):
        p["_id"] = str(p["_id"])
    return p


def get_week_window():
    now = datetime.now(timezone.utc)  # FIX: use timezone-aware UTC
    days_since_sunday = (now.weekday() + 1) % 7
    start = now - timedelta(days=days_since_sunday)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=7)
    return start, end


@router.get("/active/{rider_id}")
async def get_active_policy(rider_id: str):
    cur = await policies_col().find({
        "rider_id": rider_id,
        "status": "active"
    }).sort("coverage_start", -1).to_list(length=1)
    
    if not cur:
        raise HTTPException(status_code=404, detail="No active policy found")
        
    return serialize_policy(cur[0])


@router.get("/history/{rider_id}")
async def get_policy_history(rider_id: str):
    cur = policies_col().find({"rider_id": rider_id}).sort("coverage_start", -1)
    return [serialize_policy(p) async for p in cur]


# FIX: body param must have a default of None and use Optional[dict] — FastAPI
# requires body params to use Body(...) or have a Pydantic model to avoid 422 errors
@router.post("/create")
async def create_policy(
    rider_id: str = Query(None),
    data: Optional[dict] = Body(default=None),
):
    rider_id = rider_id or (data.get("rider_id") if data else None)

    if not rider_id:
        raise HTTPException(400, "rider_id required")

    existing = await policies_col().find_one({
        "rider_id": rider_id,
        "status": "active"
    })
    if existing:
        return serialize_policy(existing)

    rider = await riders_col().find_one({"rider_id": rider_id})
    if not rider:
        raise HTTPException(404, "Rider not found")

    req = PremiumRequest(
        rider_id=rider_id,
        avg_weekly_income=float(rider.get("avg_weekly_income", 4000)),
        zone_tier=int(rider.get("zone_tier", 3)),
        clean_weeks=int(rider.get("clean_weeks", 0)),
        zone_id=rider.get("zone_id", "MUM-ANDHERI-W"),
        city=rider.get("city", "mumbai"),
        active_days_last_30=int(rider.get("active_days_last_30", 7)),
    )

    premium_data = await compute_premium(req, req.clean_weeks)
    coverage_start, coverage_end = get_week_window()

    policy = {
        "policy_ref": f"GS-{rider.get('city','MUM').upper()}-{coverage_start.year}-{str(ObjectId())[:6].upper()}",
        "rider_id": rider_id,
        "platform": rider.get("platform", "zomato"),
        "zone_id": rider.get("zone_id"),
        "zone_tier": rider.get("zone_tier", 3),
        "city": rider.get("city", "mumbai"),
        "weekly_premium": premium_data["final_premium"],
        "coverage_start": coverage_start,
        "coverage_end": coverage_end,
        "coverage_tier": "full" if req.active_days_last_30 >= 7 else "reduced",
        "status": "active",
        "triggers_active": ["weather", "civic", "aqi"],
    }

    result = await policies_col().insert_one(policy)
    policy["_id"] = str(result.inserted_id)
    return policy


@router.post("/{policy_id}/renew")
async def renew_policy(policy_id: str, rider_id: str):
    if not ObjectId.is_valid(policy_id):
        raise HTTPException(400, "Invalid policy ID")

    old_policy = await policies_col().find_one({"_id": ObjectId(policy_id)})
    if not old_policy:
        raise HTTPException(404, "Policy not found")

    await policies_col().update_one(
        {"_id": ObjectId(policy_id)},
        {"$set": {"status": "expired"}},
    )

    coverage_start, coverage_end = get_week_window()

    # FIX: pop old _id so MongoDB assigns a new one; don't spread raw ObjectId
    new_policy = {k: v for k, v in old_policy.items() if k != "_id"}
    new_policy["status"] = "active"
    new_policy["coverage_start"] = coverage_start
    new_policy["coverage_end"] = coverage_end

    result = await policies_col().insert_one(new_policy)
    new_policy["_id"] = str(result.inserted_id)
    return new_policy


@router.post("/{policy_id}/pause")
async def pause_policy(policy_id: str):
    if not ObjectId.is_valid(policy_id):
        raise HTTPException(400, "Invalid policy ID")

    res = await policies_col().update_one(
        {"_id": ObjectId(policy_id)},
        {"$set": {"status": "paused"}},
    )

    if res.matched_count == 0:
        raise HTTPException(404, "Policy not found")

    return {"message": "Policy paused"}