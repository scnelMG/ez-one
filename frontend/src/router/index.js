import { createRouter, createWebHistory } from 'vue-router';
import BasketPage from '@/pages/BasketPage.vue';
import BasketDetailPage from '@/pages/BasketDetailPage.vue';
import DocumentProfilePage from '@/pages/DocumentProfilePage.vue';
import { isAuthenticated, requiresOnboarding } from '@/features/auth/session/authSession';
import LoginPage from '@/pages/LoginPage.vue';
import LoginCallbackPage from '@/pages/LoginCallbackPage.vue';
import ExtensionConnectPage from '@/pages/ExtensionConnectPage.vue';
import MainPage from '@/pages/MainPage.vue';
import MyPage from '@/pages/MyPage.vue';
import NotionSettingsPage from '@/pages/NotionSettingsPage.vue';
import RecommendationPage from '@/pages/RecommendationPage.vue';
import WorkspacePage from '@/pages/WorkspacePage.vue';
import StudyListPage from '@/pages/StudyListPage.vue';
import StudyDetailPage from '@/pages/StudyDetailPage.vue';

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'main',
            component: MainPage,
            meta: { requiresAuth: true }
        },
        {
            path: '/login',
            name: 'login',
            component: LoginPage
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
            path: '/main',
            redirect: '/'
        },
        {
            path: '/basket',
            name: 'basket',
            component: BasketPage,
            meta: { requiresAuth: true }
        },
        {
            path: '/basket/:basketJobId',
            name: 'basket-detail',
            component: BasketDetailPage,
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
            path: '/study',
            name: 'study-list',
            component: StudyListPage,
            meta: { requiresAuth: true }
        },
        {
            path: '/study/:studyId',
            name: 'study-detail',
            component: StudyDetailPage,
            meta: { requiresAuth: true }
        },
        {
            path: '/mypage',
            name: 'mypage-account',
            component: MyPage,
            meta: { requiresAuth: true, mypageSection: 'account' }
        },
        {
            path: '/mypage/notion',
            name: 'mypage-notion',
            component: NotionSettingsPage,
            meta: { requiresAuth: true }
        },
        {
            path: '/mypage/onboarding',
            name: 'mypage-onboarding',
            component: MyPage,
            meta: { requiresAuth: true, mypageSection: 'onboarding' }
        },
        {
            path: '/mypage/qna',
            name: 'mypage-qna',
            component: MyPage,
            meta: { requiresAuth: true, mypageSection: 'qna' }
        },
        {
            path: '/mypage/inquiry',
            name: 'mypage-inquiry',
            component: MyPage,
            meta: { requiresAuth: true, mypageSection: 'inquiry' }
        },
        {
            path: '/mypage/partnership',
            name: 'mypage-partnership',
            component: MyPage,
            meta: { requiresAuth: true, mypageSection: 'partnership' }
        },
        {
            path: '/mypage/terms',
            name: 'mypage-terms',
            component: MyPage,
            meta: { requiresAuth: true, mypageSection: 'terms' }
        }
    ]
});
router.beforeEach((to) => {
    if (to.name === 'login' && isAuthenticated()) {
        return getAuthenticatedHomePath(to.query.redirect);
    }
    if (to.name === 'main' && isAuthenticated() && typeof to.query.redirect === 'string') {
        return getAuthenticatedHomePath(to.query.redirect);
    }
    if (!to.meta.requiresAuth) {
        return true;
    }
    if (hasAccessToken()) {
        if (to.name !== 'main' && to.name !== 'study-list' && to.name !== 'study-detail' && requiresOnboarding()) {
            return '/';
        }
        return true;
    }
    return {
        name: 'login',
        query: {
            redirect: to.fullPath
        }
    };
});
function hasAccessToken() {
    return isAuthenticated();
}
function getAuthenticatedHomePath(redirect = undefined) {
    if (requiresOnboarding()) {
        return '/';
    }
    return typeof redirect === 'string' && isSafeRedirectPath(redirect) ? redirect : '/';
}
function isSafeRedirectPath(path) {
    return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/login');
}
