"""Admin — BCR, fraud queue, waitlist, manual claim actions."""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db.mongo import claims_col, policies_col, riders_col, waitlist_col
from db.schemas import ClaimStatus
from ml.risk_model import ZONE_COORDS, compute_risk_score
from services.bcr_utils import get_or_create_bcr
from services.nlp_classifier import classify_article

router = APIRouter()


def _serialize(doc: dict) -> dict:
    """Convert ObjectId _id to string for JSON serialization."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/bcr")
async def admin_bcr():
    from db.mongo import bcr_snapshots_col

    cur = bcr_snapshots_col().find().sort("computed_at", -1).limit(20)
    # FIX: serialize _id in history docs
    history = [_serialize(h) async for h in cur]
    d = await get_or_create_bcr()
    bcr = float(d.get("bcr", 0))
    suspension_active = bcr > 0.85
    return {
        "current": _serialize(d),
        "history": history,
        "suspension_active": suspension_active,
    }


@router.get("/dashboard")
async def dashboard():
    d = await get_or_create_bcr()
    ap = await policies_col().count_documents({"status": "active"})
    week_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    claims_week = await claims_col().count_documents({"started_at": {"$gte": week_start}})
    payouts_week = 0.0
    cur = claims_col().find(
        {"paid_at": {"$gte": week_start}, "status": ClaimStatus.paid.value}
    )
    async for c in cur:
        payouts_week += float(c.get("payout_amount", 0))
    fraud_pending = await claims_col().count_documents({"status": ClaimStatus.flagged.value})
    zone_risk_map: dict[str, float] = {}
    for zid in ZONE_COORDS.keys():
        if zid.startswith("MUM"):
            cty = "mumbai"
        elif zid.startswith("DEL"):
            cty = "delhi"
        else:
            cty = "bengaluru"
        rb = await compute_risk_score(zid, cty)
        zone_risk_map[zid] = round(rb.risk_score, 4)
    city_pool_status = {
        "mumbai": d.get("bcr", 0),
        "delhi": d.get("bcr", 0),
        "bengaluru": d.get("bcr", 0),
    }

    # Phase 3: Calculate Loss Ratio
    expected_premium_week = 0.0
    async for pol in policies_col().find({"status": "active"}):
        expected_premium_week += float(pol.get("weekly_premium", 15))

    loss_ratio = 0.0
    if expected_premium_week > 0:
        loss_ratio = round((payouts_week / expected_premium_week) * 100, 2)

    # Phase 3: Predictive analytics
    predictive_analytics = {
        "likely_disruptions_next_week": [
            {"zone": "Mumbai Coastal", "probability": 0.85, "reason": "Heavy Monsoon Forecast"},
            {"zone": "Delhi NCR", "probability": 0.60, "reason": "Severe Air Quality Index"},
            {"zone": "Bengaluru Central", "probability": 0.30, "reason": "Expected Traffic & Civic Stir"}
        ],
        "projected_claims_count": 450,
        "projected_payout_volume": 120000.00
    }
    return {
        "active_policies": ap,
        "claims_this_week": claims_week,
        "total_payouts_this_week": round(payouts_week, 2),
        "bcr_current": d.get("bcr", 0),
        "fraud_flags_pending": fraud_pending,
        "zone_risk_map": zone_risk_map,
        "city_pool_status": city_pool_status,
        "loss_ratio": loss_ratio,
        "predictive_analytics": predictive_analytics,
    }


@router.get("/fraud-queue")
async def fraud_queue():
    cur = (
        claims_col()
        .find({"status": ClaimStatus.flagged.value})
        .sort("fraud_score", -1)
    )
    # FIX: serialize _id
    return [_serialize(c) async for c in cur]


@router.post("/approve-claim/{claim_id}")
async def approve_claim(claim_id: str):
    from routers.claims import initiate_payout

    await claims_col().update_one(
        {"claim_id": claim_id},
        {"$set": {"status": ClaimStatus.approved.value}},
    )
    c = await claims_col().find_one({"claim_id": claim_id})
    if not c:
        raise HTTPException(404, "Claim not found")
    # FIX: initiate_payout now takes only claim_id; payout calculated internally
    await initiate_payout(str(c["_id"]))
    return {"ok": True}


class RejectBody(BaseModel):
    reason: Optional[str] = None


@router.post("/reject-claim/{claim_id}")
async def reject_claim(claim_id: str, body: RejectBody = RejectBody()):
    reason = body.reason or "manual"
    await claims_col().update_one(
        {"claim_id": claim_id},
        {"$set": {"status": ClaimStatus.rejected.value, "reject_reason": reason}},
    )
    print(f"[ADMIN] rejected claim {claim_id} reason={reason}")
    return {"ok": True}


@router.get("/waitlist")
async def waitlist():
    cur = waitlist_col().find().sort("created_at", 1)
    # FIX: serialize _id
    return [_serialize(w) async for w in cur]


class NLPTestBody(BaseModel):
    headline: str
    description: str


@router.post("/test-nlp")
async def test_nlp(body: NLPTestBody):
    return classify_article(body.headline, body.description)


@router.post("/force-pay-open/{rider_id}")
async def force_pay_open(rider_id: str):
    """Force-approve and pay all open/approved claims for a rider (demo helper)."""
    from routers.claims import initiate_payout

    cur = claims_col().find(
        {"rider_id": rider_id, "status": {"$in": ["open", "approved"]}}
    )
    paid_count = 0
    async for cl in cur:
        try:
            await claims_col().update_one(
                {"_id": cl["_id"]},
                {"$set": {"status": "approved"}},
            )
            # FIX: initiate_payout only needs claim_id
            await initiate_payout(str(cl["_id"]))
            paid_count += 1
        except Exception as e:
            print(f"[ADMIN] force-pay failed for {cl.get('claim_id')}: {e}")
    return {"ok": True, "paid_count": paid_count}


@router.get("/zone-risk-map")
async def zone_risk_map_endpoint():
    """Dedicated endpoint for frontend zone risk map."""
    zone_data = []
    for zid, (lat, lon) in ZONE_COORDS.items():
        if zid.startswith("MUM"):
            cty = "mumbai"
        elif zid.startswith("DEL"):
            cty = "delhi"
        else:
            cty = "bengaluru"
        rb = await compute_risk_score(zid, cty)

        # Find zone tier from ZONE_MAP
        from db.schemas import ZONE_MAP
        tier = 3
        zone_name = zid
        city_pool = f"{cty}_pool"
        for pin, meta in ZONE_MAP.items():
            if meta.get("zone_id") == zid:
                tier = meta.get("zone_tier", 3)
                zone_name = meta.get("zone_name", zid)
                city_pool = meta.get("city_pool", city_pool)
                break

        zone_data.append({
            "zone_id": zid,
            "zone_name": zone_name,
            "city": cty,
            "city_pool": city_pool,
            "lat": lat,
            "lon": lon,
            "zone_tier": tier,
            "risk_score": round(rb.risk_score, 4),
            "p_weather": round(rb.p_weather, 4),
            "p_civic": round(rb.p_civic, 4),
            "p_pollution": round(rb.p_pollution, 4),
        })
    return {"zones": zone_data}