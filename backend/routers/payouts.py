"""Payout schedule — immediate on claim clearance; Sunday UPI = premium only."""

from datetime import datetime, timezone

from fastapi import APIRouter

from db.mongo import payouts_col, policies_col, riders_col
from services.bcr_utils import update_bcr_on_premium

router = APIRouter()


def _serialize(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/schedule/{rider_id}")
async def schedule(rider_id: str):
    cur = payouts_col().find({"rider_id": rider_id}).sort("initiated_at", -1)
    # FIX: serialize _id in payout docs
    items = [_serialize(p) async for p in cur]
    return {
        "payouts": items,
        "note": (
            "Payouts are released immediately when your claim is verified. "
            "Premium is deducted separately every Sunday."
        ),
    }


@router.get("/history/{rider_id}")
async def history(rider_id: str):
    cur = payouts_col().find({"rider_id": rider_id}).sort("initiated_at", -1)
    # FIX: serialize _id
    return [_serialize(p) async for p in cur]


@router.get("/summary/{rider_id}")
async def summary(rider_id: str):
    cur = payouts_col().find({"rider_id": rider_id})
    total = 0.0
    n = 0
    async for p in cur:
        total += float(p.get("amount", 0))
        n += 1
    avg = total / n if n else 0.0
    return {
        "total_income_protected": round(total, 2),
        "disruption_count": n,
        "avg_payout_per_event": round(avg, 2),
    }


@router.post("/process-sunday")
async def process_sunday():
    """Weekly UPI AutoPay premium debit — not claim payouts."""
    now = datetime.now(timezone.utc).isoformat()
    cur = policies_col().find({"status": "active"})
    debited = []
    async for pol in cur:
        amt = float(pol.get("weekly_premium", 0))
        rid = pol.get("rider_id")
        r = await riders_col().find_one({"rider_id": rid})
        upi = (r or {}).get("upi_id", "unknown@upi")
        print(f"[SUNDAY UPI] {now} debit ₹{amt} rider={rid} upi={upi} (AutoPay)")
        await update_bcr_on_premium(amt)
        debited.append({"rider_id": rid, "amount": amt})
    return {"processed": len(debited), "debits": debited}