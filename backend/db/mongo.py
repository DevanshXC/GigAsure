"""Motor async MongoDB + redis.asyncio cache."""

import os
from typing import Optional

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import redis.asyncio as redis
import mongomock_motor
import fakeredis.aioredis

load_dotenv()

_mongo_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None
_redis = None


def connect_db() -> None:
    global _mongo_client, _db
    url = os.getenv("MONGO_URL", "mock")
    # Only use TLS for Atlas URIs (contain mongodb+srv or @cluster)
    use_tls = "mongodb+srv" in url or "@cluster" in url or "mongodb.net" in url
    
    if url == "mock" or not url:
        print("🔧 Using in-memory MongoMock for local testing")
        _mongo_client = mongomock_motor.AsyncMongoMockClient()
    elif use_tls:
        _mongo_client = AsyncIOMotorClient(
            url,
            tls=True,
            tlsAllowInvalidCertificates=True,
        )
    else:
        _mongo_client = AsyncIOMotorClient(url)
    _db = _mongo_client[os.getenv("MONGO_DB", "gigsure")]


# FIX: was async but called with close_db() (no await) in lifespan — made sync
def close_db() -> None:
    global _mongo_client, _db
    if _mongo_client:
        _mongo_client.close()
    _mongo_client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not connected")
    return _db


def riders_col():
    return get_db()["riders"]


def policies_col():
    return get_db()["policies"]


def claims_col():
    return get_db()["claims"]


def disruptions_col():
    return get_db()["disruptions"]


def payouts_col():
    return get_db()["payouts"]


def bcr_snapshots_col():
    return get_db()["bcr_snapshots"]


def waitlist_col():
    return get_db()["waitlist"]


async def connect_redis():
    global _redis
    url = os.getenv("REDIS_URL", "mock")
    if url == "mock" or not url:
        print("🔧 Using in-memory FakeRedis for local testing")
        _redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    else:
        _redis = redis.from_url(url, decode_responses=True)
        await _redis.ping()
    print("✅ Redis connected (or mock)")


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()   # FIX: .close() deprecated in redis-py 5; use .aclose()
        _redis = None


def get_redis():
    return _redis