import { defaultHttpClient, type ApiEnvelope, type HttpClient } from '@/shared/apiClient'
import { isAxiosError } from 'axios'

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

export interface UpdateCurrentUserRequest {
  nickname: string
}

export function createAuthApi(httpClient: HttpClient = defaultHttpClient) {
  return {
    async loginWithGoogle(request: GoogleLoginRequest): Promise<AuthTokenResponse> {
      const response = await postAuthRequest<AuthTokenResponse>('/api/auth/google', request, httpClient)

      return response.data.data
    },
    async refresh(refreshToken: string): Promise<AuthTokenResponse> {
      const response = await httpClient.post<ApiEnvelope<AuthTokenResponse>>('/api/auth/refresh', {
        refreshToken
      })

      return response.data.data
    },
    async logout(refreshToken: string): Promise<void> {
      await httpClient.post<ApiEnvelope<null>>('/api/auth/logout', { refreshToken })
    },
    async getCurrentUser(): Promise<CurrentUserResponse> {
      const response = await httpClient.get<ApiEnvelope<CurrentUserResponse>>('/api/me')

      return response.data.data
    },
    async updateCurrentUser(request: UpdateCurrentUserRequest): Promise<CurrentUserResponse> {
      const response = await httpClient.patch<ApiEnvelope<CurrentUserResponse>>('/api/me', request)

      return response.data.data
    }
  }
}

export const authApi = createAuthApi()

async function postAuthRequest<T>(url: string, body: unknown, httpClient: HttpClient) {
  try {
    return await httpClient.post<ApiEnvelope<T>>(url, body)
  } catch (error) {
    if (isAxiosError<ApiEnvelope<unknown>>(error)) {
      const message = error.response?.data?.error?.message

      if (message) {
        throw new Error(message)
      }
    }

    throw error
  }
}
