import { TokenResponse } from '@/types'

export const getToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('gigsure_token')
}

export const getRiderId = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('gigsure_rider_id')
}

export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false
  return !!getToken() && !!getRiderId()
}

export const clearAuth = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('gigsure_token')
  localStorage.removeItem('gigsure_rider_id')
  localStorage.removeItem('gigsure_is_new')
  localStorage.removeItem('gigsure_phone')
  localStorage.removeItem('gigsure_zone')
  localStorage.removeItem('gigsure_register_data')
}

export const savePhone = (phone: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gigsure_phone', phone)
  }
}

export const getPhone = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('gigsure_phone')
}
