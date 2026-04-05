export interface Rider {
  _id: string
  name: string
  phone: string
  city: string
  pin_code: string
  zone_id: string
  zone_tier: number
  platform: 'zomato' | 'swiggy' | 'zepto'
  partner_id: string
  upi_id: string
  avg_weekly_income: number
  clean_weeks: number
  active_days_last_30: number
  rider_id: string
  coverage_tier: 'full' | 'reduced'
  onboarding_complete: boolean
}

export interface Policy {
  _id: string
  policy_ref: string
  rider_id: string
  zone_id: string
  zone_tier: number
  city: string
  weekly_premium: number
  status: 'active' | 'paused' | 'expired'
  coverage_start: string
  coverage_end: string
  coverage_tier: 'full' | 'reduced'
  triggers_active: string[]
}

export interface RiskScore {
  p_weather: number
  p_civic: number
  p_pollution: number
  risk_score: number
  zone_id: string
  computed_at: string
}

export interface PremiumResponse {
  rider_id: string
  base_premium: number
  risk_breakdown: RiskScore
  geo_multiplier: number
  ncb_multiplier: number
  final_premium: number
  affordability_cap: number
  capped: boolean
  week_label: string
  coverage_tier: string
  actuarial_base: number
}

export interface Claim {
  _id: string
  claim_id?: string
  claim_ref: string
  rider_id: string
  policy_id: string
  event_id: string
  trigger_type: 'weather' | 'civic' | 'aqi'
  zone_id: string
  duty_confirmed: boolean
  gps_confirmed: boolean
  started_at: string
  ended_at: string | null
  duration_hrs: number | null
  disruption_tier: string | null
  avg_daily_income: number | null
  payout_amount: number | null
  fraud_score: number
  status: 'open' | 'approved' | 'flagged' | 'rejected' | 'paid'
  paid_at: string | null
  razorpay_ref: string | null
  coverage_tier?: string
}

export interface PayoutSummary {
  rider_id: string
  total_protected: number
  disruption_events: number
  message: string
}

export interface DetectedZone {
  zone_id: string
  zone_name: string
  zone_tier: number
  city: string
  city_pool: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  rider_id: string | null
  is_new_rider: boolean
  meets_underwriting_threshold: boolean
}
