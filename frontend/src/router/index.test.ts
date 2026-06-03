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
})
