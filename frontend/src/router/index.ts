import { createRouter, createWebHistory } from 'vue-router'
import BasketPage from '@/pages/BasketPage.vue'
import DocumentProfilePage from '@/pages/DocumentProfilePage.vue'
import { getCurrentUser, isAuthenticated } from '@/features/auth/session/authSession'
import LoginPage from '@/pages/LoginPage.vue'
import LoginCallbackPage from '@/pages/LoginCallbackPage.vue'
import ExtensionConnectPage from '@/pages/ExtensionConnectPage.vue'
import MainPage from '@/pages/MainPage.vue'
import MyPage from '@/pages/MyPage.vue'
import NotionSettingsPage from '@/pages/NotionSettingsPage.vue'
import OnboardingPage from '@/pages/OnboardingPage.vue'
import RecommendationPage from '@/pages/RecommendationPage.vue'
import WorkspacePage from '@/pages/WorkspacePage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginPage
    },
    {
      path: '/login',
      redirect: '/'
    },
    {
      path: '/login/callback',
      name: 'login-callback',
      component: LoginCallbackPage
    },
    {
      path: '/extension/connect',
      name: 'extension-connect',
      component: ExtensionConnectPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: OnboardingPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/main',
      name: 'main',
      component: MainPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/basket',
      name: 'basket',
      component: BasketPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/workspaces/:workspaceId',
      name: 'workspace',
      component: WorkspacePage,
      meta: { requiresAuth: true }
    },
    {
      path: '/document-profile',
      name: 'document-profile',
      component: DocumentProfilePage,
      meta: { requiresAuth: true }
    },
    {
      path: '/recommendations',
      name: 'recommendations',
      component: RecommendationPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/mypage',
      name: 'mypage',
      component: MyPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/mypage/notion',
      name: 'notion-settings',
      component: NotionSettingsPage,
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to) => {
  if (to.name === 'login' && isAuthenticated()) {
    return getAuthenticatedHomePath(to.query.redirect)
  }

  if (!to.meta.requiresAuth) {
    return true
  }

  if (hasAccessToken()) {
    if (to.name !== 'onboarding' && getCurrentUser()?.profileCompleted === false) {
      return '/onboarding'
    }

    return true
  }

  return {
    name: 'login',
    query: {
      redirect: to.fullPath
    }
  }
})

function hasAccessToken() {
  return isAuthenticated()
}

function getAuthenticatedHomePath(redirect: unknown = undefined) {
  if (getCurrentUser()?.profileCompleted === false) {
    return '/onboarding'
  }

  return typeof redirect === 'string' && isSafeRedirectPath(redirect) ? redirect : '/main'
}

function isSafeRedirectPath(path: string) {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/login')
}
