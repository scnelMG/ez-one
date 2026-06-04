import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios'
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  saveAuthSession
} from '@/features/auth/session/authSession'
import type { AuthTokenResponse } from '@/features/auth/api/authApi'

export interface ApiEnvelope<T> {
  success: boolean
  data: T
  error: null | {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export interface HttpClient {
  get<T>(url: string, config?: unknown): Promise<{ data: T }>
  post<T>(url: string, body?: unknown, config?: unknown): Promise<{ data: T }>
  patch<T>(url: string, body?: unknown, config?: unknown): Promise<{ data: T }>
  delete<T>(url: string): Promise<{ data: T }>
}

interface RetriableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean
  skipAuthRefresh?: boolean
}

export const defaultHttpClient: AxiosInstance = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
})

defaultHttpClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

defaultHttpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.skipAuthRefresh ||
      isAuthEndpoint(originalRequest.url)
    ) {
      throw error
    }

    const refreshToken = getRefreshToken()

    if (!refreshToken) {
      clearAuthSession()
      throw error
    }

    try {
      originalRequest._retry = true
      const response = await defaultHttpClient.post<ApiEnvelope<AuthTokenResponse>>(
        '/api/auth/refresh',
        { refreshToken },
        { skipAuthRefresh: true } as RetriableRequestConfig
      )

      saveAuthSession(response.data.data)
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${response.data.data.accessToken}`
      }

      return defaultHttpClient.request(originalRequest)
    } catch (refreshError) {
      clearAuthSession()
      throw refreshError
    }
  }
)

export function unwrapApiData<T>(envelope: ApiEnvelope<T>): T {
  if (!envelope.success) {
    throw new Error(envelope.error?.message ?? 'API request failed')
  }

  return envelope.data
}

export function resolveApiBaseUrl(value: string | undefined) {
  if (!value) {
    return undefined
  }

  return value.replace(/\/api\/?$/, '')
}

function isAuthEndpoint(url: string | undefined) {
  return Boolean(url?.startsWith('/api/auth/'))
}
