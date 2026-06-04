import type { AuthTokenResponse, CurrentUserResponse } from '@/features/auth/api/authApi'

const ACCESS_TOKEN_KEY = 'ezone.accessToken'
const REFRESH_TOKEN_KEY = 'ezone.refreshToken'
const CURRENT_USER_KEY = 'ezone.currentUser'

export function saveAuthSession(response: AuthTokenResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken)
  saveCurrentUser(response.user)
}

export function saveCurrentUser(user: CurrentUserResponse) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getCurrentUser(): CurrentUserResponse | null {
  const rawUser = localStorage.getItem(CURRENT_USER_KEY)

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser) as CurrentUserResponse
  } catch {
    clearAuthSession()
    return null
  }
}

export function isAuthenticated() {
  return Boolean(getAccessToken())
}
