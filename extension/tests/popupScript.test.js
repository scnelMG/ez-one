import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveApiBaseUrlCandidates } from '../src/shared/api/extensionApiBaseUrl';

const popupMarkup = readFileSync(resolve(__dirname, '../popup.html'), 'utf-8');
const bodyMarkup = popupMarkup.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? '';
const session = { accessToken: 'access-token', refreshToken: 'refresh-token', user: { id: 1 } };
const supportedTab = { id: 42, url: 'https://jasoseol.com/recruit/1?campaignid=15830248521' };
const posting = {
    companyName: 'Naver',
    positionTitle: 'Backend Developer',
    deadlineLabel: 'D-10',
    sourceUrl: supportedTab.url,
    roleOptions: ['신입 · Backend', '경력 · Platform'],
    essayQuestions: []
};
const documentProfile = { sections: { basicInfo: { nameKo: 'Kim One' } }, customFields: [] };
const previewAutoFill = {
    mode: 'preview',
    planned: [{ label: 'Name', fieldKey: 'basicInfo.nameKo', value: 'Kim One', displayOrder: 1 }],
    failed: [{ label: 'Essay', fieldKey: 'essay.0', reason: 'manual_free_text', displayOrder: 2 }],
    copyCandidates: []
};
const appliedAutoFill = {
    mode: 'apply',
    filled: [{ label: 'Name', fieldKey: 'basicInfo.nameKo', value: 'Kim One', displayOrder: 1 }],
    failed: [],
    copyCandidates: []
};

describe('extension popup script behavior', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_EXTENSION_WEB_APP_URL', 'https://ez-one.o-r.kr');
        vi.stubEnv('VITE_EXTENSION_API_BASE_URL', 'https://ez-one.o-r.kr/api');
        vi.resetModules();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.resetModules();
        vi.doUnmock('../src/shared/auth/extensionAuth');
        vi.doUnmock('../src/shared/api/extensionJobApi');
        vi.doUnmock('../src/shared/api/extensionDocumentProfileApi');
        document.body.innerHTML = '';
    });

    it('EXT-003: shows the login handoff and opens the web login continuation when no session exists', async () => {
        const popup = await mountPopup({ sessionQueue: [null] });

        expect(document.getElementById('login-panel').hidden).toBe(false);
        document.getElementById('login-button').click();
        await flushPromises();

        expect(document.getElementById('status-panel').hidden).toBe(false);
        expect(popup.storage.remove).toHaveBeenCalledWith(['ezonePendingExtensionContinuation']);
        expect(popup.chrome.tabs.create).toHaveBeenCalledTimes(1);
        const loginUrl = new URL(popup.chrome.tabs.create.mock.calls[0][0].url);
        expect(loginUrl.origin).toBe('https://ez-one.o-r.kr');
        expect(loginUrl.pathname).toBe('/login');
        expect(loginUrl.searchParams.get('redirect')).toContain('/extension/connect');
        expect(loginUrl.searchParams.get('redirect')).toContain('sourceTabId=42');
        expect(loginUrl.searchParams.get('redirect')).toContain('jasoseol.com');
    });

    it('uses configured production origins for popup links and API clients without localhost fallback', async () => {
        const popup = await mountPopup();

        expect(resolveApiBaseUrlCandidates('https://ez-one.o-r.kr/api', '')).toEqual(['https://ez-one.o-r.kr/api']);
        expect(document.getElementById('home-link').href).toBe('https://ez-one.o-r.kr/');
        expect(document.getElementById('web-link').href).toBe('https://ez-one.o-r.kr/');
        expect(popup.createExtensionJobApi).toHaveBeenCalledWith(expect.objectContaining({
            apiBaseUrl: 'https://ez-one.o-r.kr/api',
            apiFallbackBaseUrls: ''
        }));
        expect(popup.createExtensionDocumentProfileApi).toHaveBeenCalledWith(expect.objectContaining({
            apiBaseUrl: 'https://ez-one.o-r.kr/api'
        }));
    });

    it('previews the current supported posting, disables while saving, and shows saved jobs on success', async () => {
        const saveDeferred = deferred();
        const save = vi.fn(() => saveDeferred.promise);
        const popup = await mountPopup({ save });

        await openJobPreview();
        const firstRole = document.querySelector('#role-options input');
        firstRole.checked = true;
        document.getElementById('company-name-input').value = 'Edited Co';
        document.getElementById('save-button').click();
        await flushPromises();

        expect(document.getElementById('preview-panel').hidden).toBe(false);
        expect(document.getElementById('save-button').disabled).toBe(true);
        saveDeferred.resolve([{ basketJobId: 10, workspaceId: 20, companyName: 'Edited Co', positionTitle: 'Backend' }]);
        await flushPromises();

        expect(popup.jobApi.preview).toHaveBeenCalledWith(expect.objectContaining({ companyName: 'Naver' }));
        expect(save).toHaveBeenCalledWith(expect.objectContaining({
            companyName: 'Edited Co',
            selectedRoles: ['신입 · Backend']
        }));
        expect(document.getElementById('result-panel').hidden).toBe(false);
        expect(document.getElementById('saved-job-list').textContent).toContain('Edited Co');
        expect(document.getElementById('basket-link').href).toBe('https://ez-one.o-r.kr/basket');
    });

    it('keeps the save surface recoverable when the extension save API fails', async () => {
        await mountPopup({ save: vi.fn().mockRejectedValue(new Error('save failed')) });

        await openJobPreview();
        document.querySelector('#role-options input').checked = true;
        document.getElementById('save-button').click();
        await flushPromises();

        expect(document.getElementById('status-panel').hidden).toBe(false);
        expect(document.getElementById('status-message').textContent).toBe('save failed');
        expect(document.getElementById('save-button').disabled).toBe(false);
    });

    it('returns to login and remembers the selected action when the session expires before a feature action', async () => {
        const popup = await mountPopup({ sessionQueue: [session, null] });

        document.getElementById('job-save-mode-button').click();
        await flushPromises();

        expect(document.getElementById('login-panel').hidden).toBe(false);
        expect(popup.storage.set).toHaveBeenCalledWith({ ezonePendingExtensionContinuation: 'jobPreview' });
        expect(popup.storage.remove).toHaveBeenCalledWith(expect.arrayContaining(['ezoneAccessToken', 'ezoneRefreshToken']));
    });

    it('shows a job-page notice without extracting data on unsupported pages', async () => {
        const popup = await mountPopup({ tab: { id: 43, url: 'https://example.com/jobs/1' } });

        document.getElementById('job-save-mode-button').click();
        await flushPromises();

        expect(document.getElementById('status-panel').hidden).toBe(false);
        expect(document.getElementById('status-panel').classList.contains('is-guidance')).toBe(true);
        expect(popup.jobApi.preview).not.toHaveBeenCalled();
        expect(popup.chrome.scripting.executeScript).not.toHaveBeenCalled();
    });

    it('previews document profile autofill and applies it only after the user confirms', async () => {
        const popup = await mountPopup();

        document.getElementById('document-input-mode-button').click();
        await flushPromises();

        expect(popup.documentProfileApi.getDocumentProfile).toHaveBeenCalledTimes(1);
        expect(popup.chrome.tabs.sendMessage).toHaveBeenCalledWith(42, {
            type: 'EZONE_PREVIEW_APPLICATION_AUTOFILL',
            profile: documentProfile
        });
        expect(document.getElementById('document-result-panel').hidden).toBe(false);
        expect(document.getElementById('autofill-filled-count').textContent).toBe('1');
        expect(document.getElementById('autofill-review-count').textContent).toBe('1');
        expect(document.getElementById('autofill-apply-button').hidden).toBe(false);

        document.getElementById('autofill-apply-button').click();
        await flushPromises();

        expect(popup.chrome.tabs.sendMessage).toHaveBeenLastCalledWith(42, {
            type: 'EZONE_APPLY_APPLICATION_AUTOFILL',
            profile: documentProfile
        });
        expect(document.getElementById('document-result-title').textContent).toContain('입력');
        expect(document.getElementById('autofill-filled-count').textContent).toBe('1');
    });

    it('retries transient autofill messaging failures before showing the document preview', async () => {
        const sendMessage = vi.fn()
            .mockRejectedValueOnce(new Error('Frame with ID 0 was removed'))
            .mockRejectedValueOnce(new Error('Receiving end does not exist'))
            .mockResolvedValue(previewAutoFill);
        const popup = await mountPopup({ sendMessage });

        document.getElementById('document-input-mode-button').click();
        await vi.advanceTimersByTimeAsync(240);
        await flushPromises();

        expect(popup.chrome.tabs.sendMessage).toHaveBeenCalledTimes(3);
        expect(document.getElementById('document-result-panel').hidden).toBe(false);
    });
});

async function mountPopup(options = {}) {
    document.body.innerHTML = bodyMarkup;
    const storedValues = { ...(options.storage ?? {}) };
    const sessionQueue = [...(options.sessionQueue ?? [options.session ?? session])];
    const validateStoredSession = vi.fn(async () => sessionQueue.length > 0 ? sessionQueue.shift() : options.session ?? session);
    const storage = createStorage(storedValues);
    const chromeMock = createChromeMock({ ...options, storage });
    const jobApi = {
        preview: options.preview ?? vi.fn().mockResolvedValue({ saveable: true }),
        save: options.save ?? vi.fn().mockResolvedValue([{ basketJobId: 1, workspaceId: 2, companyName: posting.companyName, positionTitle: posting.positionTitle }])
    };
    const documentProfileApi = {
        getDocumentProfile: options.getDocumentProfile ?? vi.fn().mockResolvedValue(documentProfile),
        recommendActivities: vi.fn().mockResolvedValue({ recommendations: [] })
    };
    const createExtensionJobApi = vi.fn(() => jobApi);
    const createExtensionDocumentProfileApi = vi.fn(() => documentProfileApi);

    vi.doMock('../src/shared/auth/extensionAuth', async () => ({
        ...await vi.importActual('../src/shared/auth/extensionAuth'),
        validateStoredSession
    }));
    vi.doMock('../src/shared/api/extensionJobApi', () => ({ createExtensionJobApi }));
    vi.doMock('../src/shared/api/extensionDocumentProfileApi', () => ({ createExtensionDocumentProfileApi }));
    vi.stubGlobal('chrome', chromeMock);

    await import('../src/popup/popup.js');
    await flushPromises();
    return { chrome: chromeMock, storage, validateStoredSession, jobApi, documentProfileApi, createExtensionJobApi, createExtensionDocumentProfileApi };
}

function createStorage(storedValues) {
    return {
        get: vi.fn(async (keys) => {
            const normalizedKeys = Array.isArray(keys) ? keys : [keys];
            return Object.fromEntries(normalizedKeys.map((key) => [key, storedValues[key]]));
        }),
        set: vi.fn(async (values) => {
            Object.assign(storedValues, values);
        }),
        remove: vi.fn(async (keys) => {
            for (const key of keys) delete storedValues[key];
        })
    };
}

function createChromeMock(options) {
    const sendMessage = options.sendMessage ?? vi.fn(async (_tabId, message) => (
        message.type === 'EZONE_APPLY_APPLICATION_AUTOFILL' ? appliedAutoFill : previewAutoFill
    ));
    return {
        storage: {
            local: options.storage,
            onChanged: { addListener: vi.fn() }
        },
        tabs: {
            query: vi.fn().mockResolvedValue([options.tab ?? supportedTab]),
            create: vi.fn().mockResolvedValue(undefined),
            sendMessage
        },
        scripting: {
            executeScript: vi.fn(async (details) => {
                if (details.files) return [{ result: undefined }];
                if (String(details.func).includes('ezOneExtractJobPosting')) return [{ result: options.posting ?? posting }];
                return [{ result: false }];
            })
        }
    };
}

async function openJobPreview() {
    document.getElementById('job-save-mode-button').click();
    await flushPromises();
}

async function flushPromises() {
    for (let index = 0; index < 20; index += 1) {
        await Promise.resolve();
    }
}

function deferred() {
    let resolvePromise;
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });
    return { promise, resolve: resolvePromise, reject: rejectPromise };
}
