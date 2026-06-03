import axios, { type AxiosInstance } from 'axios'

export interface GoogleLoginRequest {
  authorizationCode: string
  redirectUri: string
}

export interface CurrentUserResponse {
  id: number
  email: string
  name: string
  nickname: string
  profileCompleted: boolean
}

export interface AuthTokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: CurrentUserResponse
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
  error: null | {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

interface HttpClient {
  post<T>(url: string, body?: unknown): Promise<{ data: T }>
}

const defaultHttpClient: AxiosInstance = axios.create()

export function createAuthApi(httpClient: HttpClient = defaultHttpClient) {
  return {
    async loginWithGoogle(request: GoogleLoginRequest): Promise<AuthTokenResponse> {
      const response = await httpClient.post<ApiEnvelope<AuthTokenResponse>>(
        '/api/auth/google',
        request
      )

      return response.data.data
    }
  }
}

export const authApi = createAuthApi()
