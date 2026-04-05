"""Pydantic v2 models for GigaSure — income loss insurance only."""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field

# --- Enums ---


class Platform(str, Enum):
    zomato = "zomato"
    swiggy = "swiggy"
    


class DutyStatus(str, Enum):
    ON = "ON"
    OFF = "OFF"


class PolicyStatus(str, Enum):
    active = "active"
    paused = "paused"
    expired = "expired"
    waitlist = "waitlist"


class ClaimStatus(str, Enum):
    open = "open"
    approved = "approved"
    flagged = "flagged"
    rejected = "rejected"
    paid = "paid"


class TriggerType(str, Enum):
    weather = "weather"
    civic = "civic"
    aqi = "aqi"


class ZoneTier(int, Enum):
    very_safe = 1
    safe = 2
    moderate = 3
    high_risk = 4
    very_high = 5


class CoverageActivityTier(str, Enum):
    full = "full"
    reduced = "reduced"


class City(str, Enum):
    mumbai = "mumbai"
    delhi = "delhi"
    bengaluru = "bengaluru"
    hyderabad = "hyderabad"
    chennai = "chennai"
    pune = "pune"
    kolkata = "kolkata"


# --- Constants ---

ZONE_MULTIPLIERS = {1: 0.85, 2: 1.00, 3: 1.15, 4: 1.30, 5: 1.50}

RISK_WEIGHTS = {"weather": 0.45, "civic": 0.30, "pollution": 0.25}

PAYOUT_TIERS = {
    "partial_low": {"max_hours": 4, "multiplier": 0.30},
    "partial_high": {"max_hours": 8, "multiplier": 0.65},
    "full_day": {"max_hours": 24, "multiplier": 1.00},
}

BCR_THRESHOLDS = {
    "healthy_min": 0.55,
    "healthy_max": 0.70,
    "watch": 0.85,
    "suspend": 0.85,
}

# Pin code → zone metadata (city_pool separates Delhi AQI from Mumbai rain)
ZONE_MAP: dict[str, dict[str, Any]] = {
    "400053": {
        "zone_id": "MUM-ANDHERI-W",
        "zone_name": "Andheri West",
        "zone_tier": 3,
        "city": "mumbai",
        "city_pool": "mumbai_rain_pool",
    },
    "400051": {
        "zone_id": "MUM-BANDRA-W",
        "zone_name": "Bandra West",
        "zone_tier": 1,
        "city": "mumbai",
        "city_pool": "mumbai_rain_pool",
    },
    "400017": {
        "zone_id": "MUM-DHARAVI",
        "zone_name": "Dharavi",
        "zone_tier": 4,
        "city": "mumbai",
        "city_pool": "mumbai_rain_pool",
    },
    "400078": {
        "zone_id": "MUM-POWAI",
        "zone_name": "Powai",
        "zone_tier": 2,
        "city": "mumbai",
        "city_pool": "mumbai_rain_pool",
    },
    "400001": {
        "zone_id": "MUM-FORT",
        "zone_name": "Fort",
        "zone_tier": 2,
        "city": "mumbai",
        "city_pool": "mumbai_rain_pool",
    },
    "110001": {
        "zone_id": "DEL-CONNAUGHT",
        "zone_name": "Connaught Place",
        "zone_tier": 3,
        "city": "delhi",
        "city_pool": "delhi_aqi_pool",
    },
    "110044": {
        "zone_id": "DEL-OKHLA",
        "zone_name": "Okhla",
        "zone_tier": 4,
        "city": "delhi",
        "city_pool": "delhi_aqi_pool",
    },
    "110085": {
        "zone_id": "DEL-ROHINI",
        "zone_name": "Rohini",
        "zone_tier": 3,
        "city": "delhi",
        "city_pool": "delhi_aqi_pool",
    },
    "560066": {
        "zone_id": "BLR-WHITEFIELD",
        "zone_name": "Whitefield",
        "zone_tier": 1,
        "city": "bengaluru",
        "city_pool": "bengaluru_pool",
    },
    "560034": {
        "zone_id": "BLR-KORAMANGALA",
        "zone_name": "Koramangala",
        "zone_tier": 2,
        "city": "bengaluru",
        "city_pool": "bengaluru_pool",
    },
}


def zone_pool_for_zone_id(zone_id: str) -> Optional[str]:
    """Resolve city_pool from zone_id using ZONE_MAP."""
    for _pin, meta in ZONE_MAP.items():
        if meta.get("zone_id") == zone_id:
            return meta.get("city_pool")
    return None


# --- Models ---


class RiderBase(BaseModel):
    name: str
    phone: str
    city: str
    pin_code: str
    zone_id: str
    zone_tier: int = Field(ge=1, le=5)
    platform: Platform
    partner_id: str
    upi_id: str
    avg_weekly_income: float
    clean_weeks: int = 0
    active_days_last_30: int = 0
    coverage_tier: CoverageActivityTier = CoverageActivityTier.full
    days_active_total: int = 0
    onboarding: bool = False


class RiderCreate(RiderBase):
    """Registration payload — same fields as RiderBase."""


class PolicyBase(BaseModel):
    rider_id: str
    platform: Platform
    zone_id: str
    zone_tier: int
    city: str
    weekly_premium: float
    status: PolicyStatus
    coverage_start: datetime
    coverage_end: Optional[datetime] = None
    coverage_tier: CoverageActivityTier
    triggers_active: list[TriggerType] = Field(default_factory=list)


class RiskScoreBreakdown(BaseModel):
    p_weather: float
    p_civic: float
    p_pollution: float
    risk_score: float
    zone_id: str
    computed_at: datetime


class PremiumRequest(BaseModel):
    rider_id: str
    avg_weekly_income: float
    zone_tier: int
    clean_weeks: int
    zone_id: str
    city: str
    active_days_last_30: int


class PremiumResponse(BaseModel):
    rider_id: str
    base_premium: float
    risk_breakdown: RiskScoreBreakdown
    geo_multiplier: float
    ncb_multiplier: float
    final_premium: float
    affordability_cap: float
    capped: bool
    week_label: str
    coverage_tier: CoverageActivityTier
    actuarial_base: float


class DisruptionEvent(BaseModel):
    event_id: str
    trigger_type: TriggerType
    zone_id: str
    city: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    is_active: bool = True
    threshold_value: float
    source: str
    city_pool: str


class ClaimBase(BaseModel):
    rider_id: str
    policy_id: str
    event_id: str
    trigger_type: TriggerType
    zone_id: str
    city: str
    duty_confirmed: bool
    gps_confirmed: bool
    coverage_tier: CoverageActivityTier
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_hrs: float = 0.0
    disruption_tier: str = "partial_low"
    avg_daily_income: float
    payout_amount: float
    fraud_score: float
    status: ClaimStatus
    paid_at: Optional[datetime] = None
    razorpay_ref: Optional[str] = None


class PayoutRecord(BaseModel):
    rider_id: str
    claim_id: str
    amount: float
    upi_id: str
    status: str
    razorpay_ref: str
    initiated_at: datetime
    settled_at: Optional[datetime] = None


class BCRSnapshot(BaseModel):
    total_claims_paid: float
    total_premium_collected: float
    bcr: float
    status: str
    computed_at: datetime
    enrolments_suspended: bool


class SimulateDisruptionRequest(BaseModel):
    zone_id: str
    trigger_type: TriggerType
    duration_hrs: float = 5
    threshold_value: float
    source: str = "simulation"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    affected_radius_km: float = 2.0
    severity: str = "moderate"  # low, moderate, severe, extreme
    data_source: str = "IMD"  # IMD, CPCB, Municipal, Manual


class OTPRequest(BaseModel):
    phone: str


class OTPVerify(BaseModel):
    phone: str
    otp: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rider_id: str
    is_new_rider: bool
    meets_underwriting_threshold: bool
