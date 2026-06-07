import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExtensionConnectPage from './ExtensionConnectPage.vue';
describe('ExtensionConnectPage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
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
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            user: {
                id: 1,
                email: 'user@example.com',
                name: 'Hong Gil Dong',
                nickname: 'Gil Dong',
                profileCompleted: true
            }
        }, expect.any(Function));
        expect(wrapper.text()).toContain('확장프로그램 연결이 완료되었습니다.');
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
            accessToken: 'access-token',
            refreshToken: 'refresh-token'
        }), expect.any(Function));
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
});
