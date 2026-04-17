import axios from 'axios'
import {
  Rider,
  Policy,
  RiskScore,
  PremiumResponse,
  Claim,
  PayoutSummary,
  DetectedZone,
  TokenResponse
} from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gigsure_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Return data directly if it exists and the caller might expect just the data.
    // Axios usually returns { data, status, headers }, but the backend requirement
    // implies functions automatically resolving to `response.data`.
    return response.data
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('gigsure_token')
          localStorage.removeItem('gigsure_rider_id')
          window.location.href = '/login'
        }
      } else if (error.response.status === 422) {
        throw new Error(error.response.data.detail || 'Validation Error')
      } else if (error.response.status === 500) {
        throw new Error('Server error. Check backend.')
      } else {
        throw new Error(error.response.data?.detail || error.message)
      }
    } else if (error.request) {
      throw new Error('Cannot reach backend. Is localhost:8000 running?')
    } else {
      throw new Error(error.message)
    }
    return Promise.reject(error)
  }
)

// ── AUTH ────────────────────────────────────────────────────
export async function sendOtp(phone: string): Promise<{ message: string; phone: string; dev_otp: string }> {
  return await api.post('/api/auth/send-otp', { phone })
}

export async function verifyOtp(phone: string, otp: string): Promise<TokenResponse> {
  const data: TokenResponse = await api.post('/api/auth/verify-otp', { phone, otp })
  if (typeof window !== 'undefined') {
    localStorage.setItem('gigsure_token', data.access_token)
    localStorage.setItem('gigsure_rider_id', data.rider_id || '')
    localStorage.setItem('gigsure_is_new', String(data.is_new_rider))
  }
  return data
}

export async function detectZone(pinCode: string): Promise<DetectedZone> {
  return await api.post(`/api/auth/detect-zone?pin_code=${pinCode}`)
}

export async function registerRider(payload: Partial<Rider>): Promise<{ rider_id: string; coverage_tier: string; waitlist_status: string }> {
  return await api.post('/api/auth/register', payload)
}

export async function getMe(phone: string): Promise<Rider> {
  return await api.get(`/api/auth/me?phone=${encodeURIComponent(phone)}`)
}

export async function magicSync(payload: { phone: string, platform: string, partner_id: string }): Promise<any> {
  return await api.post('/api/auth/magic-sync', payload)
}

// ── PREMIUM ─────────────────────────────────────────────────
export async function getPremiumQuote(riderId: string): Promise<PremiumResponse> {
  return await api.get(`/api/premium/quote/${riderId}`)
}

export async function getRiskScore(zoneId: string): Promise<RiskScore> {
  return await api.get(`/api/premium/risk-score/${zoneId}`)
}

export async function getNextWeekPreview(riderId: string): Promise<{ current_week: any; next_week: any; delta: number; direction: string }> {
  return await api.get(`/api/premium/next-week/${riderId}`)
}

export async function calculatePremium(payload: object): Promise<PremiumResponse> {
  return await api.post('/api/premium/calculate', payload)
}

// ── POLICIES ────────────────────────────────────────────────
export async function createPolicy(riderId: string): Promise<{ policy_id: string; policy: Policy; premium: number }> {
  return await api.post(`/api/policies/create?rider_id=${riderId}`)
}

export async function getActivePolicy(riderId: string): Promise<Policy> {
  return await api.get(`/api/policies/active/${riderId}`)
}

export async function getPolicyHistory(riderId: string): Promise<{ policies: Policy[] }> {
  return await api.get(`/api/policies/history/${riderId}`)
}

export async function pausePolicy(policyId: string, riderId: string): Promise<any> {
  return await api.patch(`/api/policies/${policyId}/pause?rider_id=${riderId}`)
}

export async function resumePolicy(policyId: string, riderId: string): Promise<any> {
  return await api.patch(`/api/policies/${policyId}/resume?rider_id=${riderId}`)
}

export async function renewPolicy(policyId: string, riderId: string): Promise<any> {
  return await api.post(`/api/policies/${policyId}/renew?rider_id=${riderId}`)
}

// ── CLAIMS ──────────────────────────────────────────────────
export async function getActiveClaim(riderId: string): Promise<{ active_claim: Claim | null }> {
  return await api.get(`/api/claims/active/${riderId}`)
}

export async function getClaimHistory(riderId: string, status?: string): Promise<{ claims: Claim[], count: number }> {
  const query = status ? `?status=${status}` : ''
  return await api.get(`/api/claims/history/${riderId}${query}`)
}

export async function getClaimDetail(claimId: string): Promise<Claim> {
  return await api.get(`/api/claims/${claimId}`)
}

export async function simulateDisruption(payload: {
  zone_id: string
  trigger_type: string
  threshold_value: number
  source: string
  duration_hrs?: number
  latitude?: number
  longitude?: number
  affected_radius_km?: number
  severity?: string
  data_source?: string
}): Promise<{
  event_id: string
  claims_opened: number
  auto_approved_count: number
  flagged_count: number
  sample_payout_amount: number
}> {
  return await api.post('/api/claims/simulate', payload)
}

// ── PAYOUTS ─────────────────────────────────────────────────
export async function getPayoutSchedule(riderId: string): Promise<{ approved_claims: number; total_payout: number; premium_debit: number }> {
  return await api.get(`/api/payouts/schedule/${riderId}`)
}

export async function getPayoutSummary(riderId: string): Promise<PayoutSummary> {
  return await api.get(`/api/payouts/summary/${riderId}`)
}

export async function getPayoutHistory(riderId: string): Promise<{ payouts: any[] }> {
  return await api.get(`/api/payouts/history/${riderId}`)
}

export async function processSundayPayouts(): Promise<{ processed_count: number; processed: any[] }> {
  return await api.post('/api/payouts/process-sunday')
}

// ── ADMIN ───────────────────────────────────────────────────
export async function getAdminDashboard(): Promise<{
  active_policies: number
  claims_this_week: number
  total_payouts_this_week: number
  bcr_current: number
  fraud_flags_pending: number
  zone_risk_map: any
  loss_ratio: number
  predictive_analytics: {
    likely_disruptions_next_week: Array<{ zone: string; probability: number; reason: string }>
    projected_claims_count: number
    projected_payout_volume: number
  }
}> {
  return await api.get('/api/admin/dashboard')
}

export async function getFraudQueue(): Promise<{ claims: Claim[] }> {
  return await api.get('/api/admin/fraud-queue')
}

export async function approveClaimManual(claimId: string): Promise<any> {
  return await api.post(`/api/admin/approve-claim/${claimId}`)
}

export async function testNlp(headline: string, description: string): Promise<any> {
  return await api.post('/api/admin/test-nlp', { headline, description })
}
