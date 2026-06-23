import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExtensionConnectPage from './ExtensionConnectPage.vue';

const mocks = vi.hoisted(() => ({
    issueExtensionSession: vi.fn(),
    routeQuery: {}
}));

vi.mock('@/features/auth/api/authApi', () => ({
    authApi: {
        issueExtensionSession: mocks.issueExtensionSession
    }
}));

vi.mock('vue-router', async () => {
    const actual = await vi.importActual('vue-router');
    return {
        ...actual,
        useRoute: () => ({
            query: mocks.routeQuery
        })
    };
});

describe('ExtensionConnectPage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        mocks.issueExtensionSession.mockReset();
        mocks.routeQuery = {};
        mocks.issueExtensionSession.mockResolvedValue({
            accessToken: 'extension-access-token',
            refreshToken: 'extension-refresh-token',
            user: {
                id: 1,
                email: 'user@example.com',
                name: 'Hong Gil Dong',
                nickname: 'Gil Dong',
                profileCompleted: true
            }
        });
    });
    it('EXT-003: sends the current web session to the Chrome extension', async () => {
        vi.stubEnv('VITE_EXTENSION_ID', 'extension-id');
        const sendMessage = vi.fn((_extensionId, _message, callback) => callback({ accepted: true }));
        vi.stubGlobal('chrome', {
            runtime: {
                sendMessage
            }
        });
        localStorage.setItem('ezone.accessToken', 'access-token');
        localStorage.setItem('ezone.refreshToken', 'refresh-token');
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: 'Gil Dong',
            profileCompleted: true
        }));
        const wrapper = mount(ExtensionConnectPage, {
            global: {
                stubs: ['RouterLink']
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(sendMessage).toHaveBeenCalledWith('extension-id', {
            type: 'EZONE_EXTENSION_AUTH_SESSION',
            accessToken: 'extension-access-token',
            refreshToken: 'extension-refresh-token',
            user: {
                id: 1,
                email: 'user@example.com',
                name: 'Hong Gil Dong',
                nickname: 'Gil Dong',
                profileCompleted: true
            }
        }, expect.any(Function));
        expect(mocks.issueExtensionSession).toHaveBeenCalled();
        expect(wrapper.text()).toContain('확장프로그램 연결이 완료되었습니다.');
        expect(wrapper.text()).toContain('원래 공고 탭으로 돌아갑니다.');
        expect(wrapper.text()).not.toContain('팝업을 다시 열어 주세요.');
    });
    it('EXT-003: uses the local unpacked extension id when VITE_EXTENSION_ID is not set', async () => {
        const sendMessage = vi.fn((_extensionId, _message, callback) => callback({ accepted: true }));
        vi.stubGlobal('chrome', {
            runtime: {
                sendMessage
            }
        });
        localStorage.setItem('ezone.accessToken', 'access-token');
        localStorage.setItem('ezone.refreshToken', 'refresh-token');
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: 'Gil Dong',
            profileCompleted: true
        }));
        mount(ExtensionConnectPage, {
            global: {
                stubs: ['RouterLink']
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(sendMessage).toHaveBeenCalledWith('ikpeibohnopmikegoogggmdipmhmiadi', expect.objectContaining({
            type: 'EZONE_EXTENSION_AUTH_SESSION',
            accessToken: 'extension-access-token',
            refreshToken: 'extension-refresh-token'
        }), expect.any(Function));
    });
    it('EXT-003: returns to the original job posting URL after connecting the extension', async () => {
        vi.stubEnv('VITE_EXTENSION_ID', 'extension-id');
        const replace = vi.fn();
        vi.stubGlobal('location', { replace });
        const sendMessage = vi.fn((_extensionId, _message, callback) => callback({ accepted: true }));
        vi.stubGlobal('chrome', {
            runtime: {
                sendMessage
            }
        });
        localStorage.setItem('ezone.accessToken', 'access-token');
        mocks.routeQuery = {
            sourceUrl: 'https://jasoseol.com/?campaignid=15830248521'
        };

        mount(ExtensionConnectPage, {
            global: {
                stubs: ['RouterLink']
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(replace).toHaveBeenCalledWith('https://jasoseol.com/?campaignid=15830248521');
    });
    it('EXT-003: does not redirect the web login tab when the extension can focus the source tab', async () => {
        vi.stubEnv('VITE_EXTENSION_ID', 'extension-id');
        const replace = vi.fn();
        vi.stubGlobal('location', { replace });
        const sendMessage = vi.fn((_extensionId, _message, callback) => callback({ accepted: true }));
        vi.stubGlobal('chrome', {
            runtime: {
                sendMessage
            }
        });
        localStorage.setItem('ezone.accessToken', 'access-token');
        mocks.routeQuery = {
            sourceUrl: 'https://jasoseol.com/?campaignid=15830248521',
            sourceTabId: '42'
        };

        mount(ExtensionConnectPage, {
            global: {
                stubs: ['RouterLink']
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(replace).not.toHaveBeenCalled();
    });
    it('EXT-003: asks the extension to focus the original posting tab after login', async () => {
        vi.stubEnv('VITE_EXTENSION_ID', 'extension-id');
        vi.stubGlobal('location', { replace: vi.fn() });
        const sendMessage = vi.fn((_extensionId, _message, callback) => callback({ accepted: true }));
        vi.stubGlobal('chrome', {
            runtime: {
                sendMessage
            }
        });
        localStorage.setItem('ezone.accessToken', 'access-token');
        mocks.routeQuery = {
            sourceUrl: 'https://jasoseol.com/?campaignid=15830248521',
            sourceTabId: '42'
        };

        mount(ExtensionConnectPage, {
            global: {
                stubs: ['RouterLink']
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(sendMessage).toHaveBeenCalledWith('extension-id', expect.objectContaining({
            type: 'EZONE_EXTENSION_AUTH_SESSION',
            sourceTabId: 42,
            sourceUrl: 'https://jasoseol.com/?campaignid=15830248521'
        }), expect.any(Function));
    });
    it('EXT-003: returns to sourceUrl when the extension cannot focus the original source tab', async () => {
        vi.stubEnv('VITE_EXTENSION_ID', 'extension-id');
        const replace = vi.fn();
        vi.stubGlobal('location', { replace });
        const sendMessage = vi.fn((_extensionId, _message, callback) => callback({
            accepted: true,
            returnedToSource: false
        }));
        vi.stubGlobal('chrome', {
            runtime: {
                sendMessage
            }
        });
        localStorage.setItem('ezone.accessToken', 'access-token');
        mocks.routeQuery = {
            sourceUrl: 'https://jasoseol.com/?campaignid=15830248521',
            sourceTabId: '42'
        };

        mount(ExtensionConnectPage, {
            global: {
                stubs: ['RouterLink']
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(replace).toHaveBeenCalledWith('https://jasoseol.com/?campaignid=15830248521');
    });
    it('EXT-003: returns to sourceUrl when extension message delivery fails after login', async () => {
        vi.stubEnv('VITE_EXTENSION_ID', 'extension-id');
        const replace = vi.fn();
        vi.stubGlobal('location', { replace });
        const runtime = {
            lastError: null,
            sendMessage: vi.fn((_extensionId, _message, callback) => {
                runtime.lastError = {
                    message: 'Could not establish connection. Receiving end does not exist.'
                };
                callback(undefined);
                runtime.lastError = null;
            })
        };
        vi.stubGlobal('chrome', { runtime });
        localStorage.setItem('ezone.accessToken', 'access-token');
        mocks.routeQuery = {
            sourceUrl: 'https://jasoseol.com/?campaignid=15830248521',
            sourceTabId: '42'
        };

        mount(ExtensionConnectPage, {
            global: {
                stubs: ['RouterLink']
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(replace).toHaveBeenCalledWith('https://jasoseol.com/?campaignid=15830248521');
    });
    it('EXT-003: asks the user to log in again when web tokens are missing', async () => {
        vi.stubEnv('VITE_EXTENSION_ID', 'extension-id');
        const wrapper = mount(ExtensionConnectPage, {
            global: {
                stubs: ['RouterLink']
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(wrapper.text()).toContain('로그인 세션을 찾지 못했습니다.');
    });
    it('EXT-003: shows a friendly login retry message when extension session issuance is unauthorized', async () => {
        vi.stubEnv('VITE_EXTENSION_ID', 'extension-id');
        localStorage.setItem('ezone.accessToken', 'expired-access-token');
        localStorage.setItem('ezone.refreshToken', 'expired-refresh-token');
        mocks.issueExtensionSession.mockRejectedValue(new Error('Request failed with status code 401'));
        const wrapper = mount(ExtensionConnectPage, {
            global: {
                stubs: ['RouterLink']
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(wrapper.text()).toContain('로그인 시간이 만료되었습니다. 다시 로그인해 주세요.');
        expect(wrapper.text()).not.toContain('Request failed with status code 401');
    });
});
