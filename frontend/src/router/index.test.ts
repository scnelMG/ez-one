import { router } from './index'

describe('router', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('registers P1 route shells before API-backed slices', () => {
    const routeNames = router.getRoutes().map((route) => route.name)

    expect(routeNames).toContain('login')
    expect(routeNames).toContain('onboarding')
    expect(routeNames).toContain('main')
    expect(routeNames).toContain('basket')
    expect(routeNames).toContain('workspace')
    expect(routeNames).toContain('document-profile')
    expect(routeNames).toContain('recommendations')
    expect(routeNames).toContain('notion-settings')
  })

  it('uses the login page as the first page and keeps the dashboard behind /main', () => {
    const routes = router.getRoutes()

    expect(routes.find((route) => route.path === '/')?.name).toBe('login')
    expect(routes.find((route) => route.path === '/main')?.name).toBe('main')
  })

  it('redirects protected P1 pages to login when the user is not authenticated', async () => {
    await router.push('/basket')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/basket')
  })

  it('allows protected P1 pages when an access token exists', async () => {
    localStorage.setItem('ezone.accessToken', 'test-token')
    localStorage.setItem(
      'ezone.currentUser',
      JSON.stringify({
        id: 1,
        email: 'user@example.com',
        name: 'Hong Gil Dong',
        nickname: 'Gil Dong',
        profileCompleted: true
      })
    )

    await router.push('/basket')

    expect(router.currentRoute.value.name).toBe('basket')
  })

  it('redirects first-login users to onboarding before protected work pages', async () => {
    localStorage.setItem('ezone.accessToken', 'test-token')
    localStorage.setItem(
      'ezone.currentUser',
      JSON.stringify({
        id: 1,
        email: 'user@example.com',
        name: 'Hong Gil Dong',
        nickname: 'Gil Dong',
        profileCompleted: false
      })
    )

    await router.push('/document-profile')

    expect(router.currentRoute.value.name).toBe('onboarding')
  })

  it('sends authenticated first-login users from login to onboarding', async () => {
    localStorage.setItem('ezone.accessToken', 'test-token')
    localStorage.setItem(
      'ezone.currentUser',
      JSON.stringify({
        id: 1,
        email: 'user@example.com',
        name: 'Hong Gil Dong',
        nickname: 'Gil Dong',
        profileCompleted: false
      })
    )

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('onboarding')
  })

  it('does not activate P2-only route shells', () => {
    const routePaths = router.getRoutes().map((route) => route.path)

    expect(routePaths).not.toContain('/history')
    expect(routePaths).not.toContain('/alerts')
    expect(routePaths).not.toContain('/basket/calendar')
    expect(routePaths).not.toContain('/mypage/support')
  })
})
