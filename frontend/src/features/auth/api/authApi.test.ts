import { describe, expect, it, vi } from 'vitest'

import { createAuthApi } from './authApi'

describe('authApi', () => {
  it('AUTH-001: Google 로그인 요청을 계약 경로로 보내고 토큰 응답을 반환한다', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          tokenType: 'Bearer',
          expiresIn: 3600,
          user: {
            id: 1,
            email: 'user@example.com',
            name: '홍길동',
            nickname: '길동',
            profileCompleted: false
          }
        },
        error: null
      }
    })

    const authApi = createAuthApi({ post })
    const response = await authApi.loginWithGoogle({
      authorizationCode: 'google-oauth-code',
      redirectUri: 'http://localhost:5173/login/callback'
    })

    expect(post).toHaveBeenCalledWith('/api/auth/google', {
      authorizationCode: 'google-oauth-code',
      redirectUri: 'http://localhost:5173/login/callback'
    })
    expect(response.accessToken).toBe('access-token')
    expect(response.refreshToken).toBe('refresh-token')
    expect(response.user.profileCompleted).toBe(false)
  })
})
