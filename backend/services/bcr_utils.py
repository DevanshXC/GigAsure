"""BCR = claims_paid / premium_collected — target 0.55–0.70; suspend enrolments if > 0.85."""

from datetime import datetime, timezone

from db.mongo import bcr_snapshots_col
from db.schemas import BCR_THRESHOLDS


async def get_or_create_bcr() -> dict:
    col = bcr_snapshots_col()
    doc = await col.find_one(sort=[("computed_at", -1)])
    if doc:
        return doc
    now = datetime.now(timezone.utc)
    initial = {
        "total_claims_paid": 0.0,
        "total_premium_collected": 1.0,
        "bcr": 0.0,
        "status": "healthy",
        "computed_at": now,
        "enrolments_suspended": False,
    }
    await col.insert_one(initial)
    return initial


async def update_bcr_on_payout(amount: float) -> dict:
    col = bcr_snapshots_col()
    doc = await get_or_create_bcr()
    paid = float(doc["total_claims_paid"]) + amount
    prem = float(doc["total_premium_collected"])
    bcr = paid / prem if prem > 0 else 0.0
    status = _bcr_status(bcr)
    suspended = bcr > BCR_THRESHOLDS["suspend"]
    now = datetime.now(timezone.utc)
    new_doc = {
        "total_claims_paid": paid,
        "total_premium_collected": prem,
        "bcr": bcr,
        "status": status,
        "computed_at": now,
        "enrolments_suspended": suspended,
    }
    await col.insert_one(new_doc)
    return new_doc


async def update_bcr_on_premium(amount: float) -> dict:
    col = bcr_snapshots_col()
    doc = await get_or_create_bcr()
    paid = float(doc["total_claims_paid"])
    prem = float(doc["total_premium_collected"]) + amount
    bcr = paid / prem if prem > 0 else 0.0
    status = _bcr_status(bcr)
    suspended = bcr > BCR_THRESHOLDS["suspend"]
    now = datetime.now(timezone.utc)
    new_doc = {
        "total_claims_paid": paid,
        "total_premium_collected": prem,
        "bcr": bcr,
        "status": status,
        "computed_at": now,
        "enrolments_suspended": suspended,
    }
    await col.insert_one(new_doc)
    return new_doc


def _bcr_status(bcr: float) -> str:
    if bcr < BCR_THRESHOLDS["healthy_min"]:
        return "low"
    if bcr <= BCR_THRESHOLDS["healthy_max"]:
        return "healthy"
    if bcr <= BCR_THRESHOLDS["watch"]:
        return "watch"
    return "critical"


async def current_bcr_value() -> float:
    d = await get_or_create_bcr()
    return float(d.get("bcr", 0.0))


async def enrolments_suspended() -> bool:
    d = await get_or_create_bcr()
    return bool(d.get("enrolments_suspended", False))
