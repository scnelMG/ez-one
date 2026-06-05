import {
  defaultHttpClient,
  unwrapApiData,
  type ApiEnvelope,
  type HttpClient
} from '@/shared/apiClient'

export interface UserProfile {
  desiredRoles: string[]
  companyTypes: string[]
  industries: string[]
  regions: string[]
  skills: string[]
  ssafy: boolean
  completed: boolean
}

export type UserProfileRequest = Omit<UserProfile, 'completed'>

type ProfileHttpClient = Pick<HttpClient, 'get' | 'put'>

export function createProfileApi(httpClient: ProfileHttpClient = defaultHttpClient) {
  return {
    async getUserProfile(): Promise<UserProfile> {
      const response = await httpClient.get<ApiEnvelope<UserProfile>>('/api/me/profile')
      return unwrapApiData(response.data)
    },

    async saveUserProfile(payload: UserProfileRequest): Promise<UserProfile> {
      const response = await httpClient.put<ApiEnvelope<UserProfile>>('/api/me/profile', payload)
      return unwrapApiData(response.data)
    }
  }
}

export const profileApi = createProfileApi()
