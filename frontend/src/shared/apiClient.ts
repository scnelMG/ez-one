import axios, { type AxiosInstance } from 'axios'

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
  post<T>(url: string, body?: unknown): Promise<{ data: T }>
  patch<T>(url: string, body?: unknown): Promise<{ data: T }>
  delete<T>(url: string): Promise<{ data: T }>
}

export const defaultHttpClient: AxiosInstance = axios.create()

export function unwrapApiData<T>(envelope: ApiEnvelope<T>): T {
  if (!envelope.success) {
    throw new Error(envelope.error?.message ?? 'API request failed')
  }

  return envelope.data
}
