import { router } from './index'

describe('router', () => {
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

  it('does not activate P2-only route shells', () => {
    const routePaths = router.getRoutes().map((route) => route.path)

    expect(routePaths).not.toContain('/history')
    expect(routePaths).not.toContain('/alerts')
    expect(routePaths).not.toContain('/basket/calendar')
    expect(routePaths).not.toContain('/mypage/support')
  })
})
