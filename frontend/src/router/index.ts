import { createRouter, createWebHistory } from 'vue-router'
import BasketPage from '@/pages/BasketPage.vue'
import DocumentProfilePage from '@/pages/DocumentProfilePage.vue'
import LoginPage from '@/pages/LoginPage.vue'
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
      path: '/login',
      name: 'login',
      component: LoginPage
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: OnboardingPage
    },
    {
      path: '/',
      name: 'main',
      component: MainPage
    },
    {
      path: '/basket',
      name: 'basket',
      component: BasketPage
    },
    {
      path: '/workspaces/:workspaceId',
      name: 'workspace',
      component: WorkspacePage
    },
    {
      path: '/document-profile',
      name: 'document-profile',
      component: DocumentProfilePage
    },
    {
      path: '/recommendations',
      name: 'recommendations',
      component: RecommendationPage
    },
    {
      path: '/mypage',
      name: 'mypage',
      component: MyPage
    },
    {
      path: '/mypage/notion',
      name: 'notion-settings',
      component: NotionSettingsPage
    }
  ]
})
