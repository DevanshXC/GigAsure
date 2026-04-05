export const formatRupees = (amount: number) =>
  `₹${amount.toFixed(2)}`

export const formatDate = (iso: string) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export const formatTime = (iso: string) => {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  })
}

export const formatDateTime = (iso: string) =>
  `${formatDate(iso)} ${formatTime(iso)}`

export const formatElapsed = (startIso: string) => {
  if (!startIso) return '00:00:00'
  const seconds = Math.floor(
    (Date.now() - new Date(startIso).getTime()) / 1000)
  if (seconds < 0) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export const getRiskLabel = (score: number) => {
  if (score <= 0.25) return { label:'LOW',   color:'success' }
  if (score <= 0.50) return { label:'MOD',   color:'warning' }
  if (score <= 0.75) return { label:'HIGH',  color:'danger'  }
  return               { label:'VERY HIGH', color:'danger'  }
}

export const getFraudLabel = (score: number) => {
  if (score < 0.4)  return { label:'Passed ✓',      color:'success' }
  if (score < 0.7)  return { label:'Under review',  color:'warning' }
  return                   { label:'Flagged',        color:'danger'  }
}

export const getClaimStatusColor = (status: string) => (({
  open:     'warning',
  approved: 'success',
  paid:     'success',
  flagged:  'warning',
  rejected: 'danger',
} as Record<string, string>)[status] || 'neutral')

export const getTriggerIcon = (type: string) => (({
  weather: '🌧',
  civic:   '🚫',
  aqi:     '💨',
} as Record<string, string>)[type] || '⚡')

export const getTriggerLabel = (type: string) => (({
  weather: 'Heavy Rainfall',
  civic:   'Civic Disruption',
  aqi:     'Severe Pollution',
} as Record<string, string>)[type] || type)

export const getDisruptionTierLabel = (tier: string) => (({
  partial_low:  '< 4 hrs (30% daily)',
  partial_high: '4–8 hrs (65% daily)',
  full_day:     '> 8 hrs (100% daily)',
} as Record<string, string>)[tier] || tier)
