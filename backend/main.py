"""GigaSure API — parametric income-loss insurance for delivery riders."""

from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.mongo import get_redis

from db.mongo import close_db, close_redis, connect_db, connect_redis
from ml.risk_model import load_risk_model
from routers import admin, auth, claims, payouts, policies, premium
from services.fraud_detector import load_fraud_model
from services.nlp_classifier import load_nlp_model
from services.trigger_monitor import poll_all_triggers
from services.bcr_utils import get_or_create_bcr

load_dotenv()

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    connect_db()
    await connect_redis()
    load_risk_model()
    load_fraud_model()
    load_nlp_model()
    app.state.models_loaded = True

    scheduler.add_job(
        poll_all_triggers,
        "interval",
        minutes=5,
        id="poll_triggers",
    )
    scheduler.start()
    print("GigaSure backend ready. All models loaded.")
    yield
    scheduler.shutdown(wait=False)
    close_db()          # FIX: close_db is sync — no await needed
    await close_redis()


app = FastAPI(title="GigaSure API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(policies.router, prefix="/api/policies", tags=["policies"])
app.include_router(claims.router, prefix="/api/claims", tags=["claims"])
app.include_router(premium.router, prefix="/api/premium", tags=["premium"])
app.include_router(payouts.router, prefix="/api/payouts", tags=["payouts"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/")
async def root():
    return {
        "app": "GigaSure",
        "version": "1.0.0",
        "team": "Guidewire DEVTrails 2026",
        "status": "ok",
    }


@app.get("/health")
async def health():
    d = await get_or_create_bcr()
    return {
        "status": "ok",
        "scheduler": scheduler.running,
        "models_loaded": getattr(app.state, "models_loaded", False),
        "bcr_current": float(d.get("bcr", 0)),
    }


@app.get("/test-redis")
async def test_redis():
    r = get_redis()
    val = await r.get("test")
    return {"redis_value": val}


@app.get("/set-redis")
async def set_redis():
    r = get_redis()
    await r.set("test", "working")
    return {"status": "ok"}