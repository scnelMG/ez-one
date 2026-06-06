import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DocumentProfilePage from './DocumentProfilePage.vue';

const mocks = vi.hoisted(() => ({
    getDocumentProfile: vi.fn(),
    saveSection: vi.fn(),
    createCustomField: vi.fn(),
    updateCustomField: vi.fn(),
    deleteCustomField: vi.fn()
}));

vi.mock('@/features/document-profile/api/documentProfileApi', () => ({
    documentProfileApi: {
        getDocumentProfile: mocks.getDocumentProfile,
        saveSection: mocks.saveSection,
        createCustomField: mocks.createCustomField,
        updateCustomField: mocks.updateCustomField,
        deleteCustomField: mocks.deleteCustomField
    }
}));

const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/document-profile', component: DocumentProfilePage },
        { path: '/main', component: { template: '<div>main</div>' } },
        { path: '/basket', component: { template: '<div>basket</div>' } },
        { path: '/mypage', component: { template: '<div>mypage</div>' } },
        { path: '/recommendations', component: { template: '<div>recommendations</div>' } }
    ]
});

describe('DocumentProfilePage', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    beforeEach(() => {
        Object.values(mocks).forEach((mock) => mock.mockReset());
        mocks.getDocumentProfile.mockResolvedValue({
            sections: {
                basicInfo: {
                    nameKo: '홍길동',
                    nameEn: 'Gil Dong Hong',
                    nameHanja: '洪吉童',
                    email: 'user@example.com',
                    phone: '010-1234-5678',
                    gender: '남성',
                    birthdate: '1999-01-01',
                    address: 'Seoul',
                    addressDetail: 'Gangnam-gu'
                },
                education: [{ title: 'Korea University', summary: 'Computer Science' }],
                career: [{ title: 'Naver Cloud', summary: 'Backend Engineer' }],
                projects: [{ title: 'EZ-ONE', summary: 'Job workspace MVP' }],
                certificates: [{ title: 'TOEIC', summary: '900' }],
                awards: [{ title: 'Hackathon Grand Prize', summary: 'P1 service award' }],
                courses: [{ title: 'Database Systems', summary: 'MySQL schema design and query tuning' }],
                essays: [{ title: '지원동기 기본값', summary: '산업 관심과 백엔드 경험을 연결한 초안' }],
                military: [{ title: 'Completed', summary: 'Army / Sergeant / 2022.03-2023.09' }],
                internships: [{ title: 'Startup Intern', summary: 'Backend internship' }],
                trainings: [{ title: 'Cloud Course', summary: '120 hours' }],
                activities: [{ title: 'Student Club', summary: 'Backend lead' }]
            },
            customFields: [
                {
                    id: '501',
                    label: 'Portfolio',
                    fieldType: 'URL',
                    value: 'https://example.com'
                }
            ],
            lastSavedAt: '2026-06-05T12:00:00Z'
        });
        mocks.saveSection.mockImplementation((sectionType, payload) => Promise.resolve({
            sections: {
                basicInfo: sectionType === 'basicInfo' ? payload : {},
                education: [],
                career: [],
                projects: sectionType === 'projects' ? payload : [],
                certificates: [],
                awards: [],
                courses: [],
                essays: [],
                military: [],
                internships: [],
                trainings: [],
                activities: []
            },
            customFields: []
        }));
        mocks.createCustomField.mockResolvedValue({
            id: '601',
            label: 'Blog',
            fieldType: 'URL',
            value: 'https://blog.example.com'
        });
        mocks.updateCustomField.mockResolvedValue({
            id: '501',
            label: 'Portfolio Updated',
            fieldType: 'URL',
            value: 'https://example.com/updated'
        });
        mocks.deleteCustomField.mockResolvedValue(undefined);
    });

    it('PROFILE-001: removes the right helper panel and keeps one global save button', async () => {
        const wrapper = await mountPage();

        expect(mocks.getDocumentProfile).toHaveBeenCalled();
        expect(wrapper.text()).toContain('서류 입력 정보');
        expect(wrapper.find('.wire-side-panel').exists()).toBe(false);
        expect(wrapper.find('[data-testid="save-section"]').exists()).toBe(false);
        expect(wrapper.get('[data-testid="save-document-profile"]').text()).toContain('저장');
        expect(wrapper.get('[data-testid="basic-info-name"]').element.value).toBe('홍길동');
        expect(wrapper.text()).toContain('2026-06-05T12:00:00Z');
    });

    it('PROFILE-001: saves the active section from the single save button', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="basic-info-name"]').setValue('김지원');
        await wrapper.get('[data-testid="basic-info-email"]').setValue('jiwon@example.com');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();
        expect(mocks.saveSection).toHaveBeenCalledWith('basicInfo', {
            nameKo: '김지원',
            nameEn: 'Gil Dong Hong',
            nameHanja: '洪吉童',
            email: 'jiwon@example.com',
            phone: '010-1234-5678',
            gender: '남성',
            birthdate: '1999-01-01',
            address: 'Seoul',
            addressDetail: 'Gangnam-gu'
        });

        await wrapper.get('[data-testid="section-projects"]').trigger('click');
        await wrapper.get('[data-testid="section-title"]').setValue('EZ-ONE Renewal');
        await wrapper.get('[data-testid="section-summary"]').setValue('Workspace and profile integration');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();
        expect(mocks.saveSection).toHaveBeenLastCalledWith('projects', [
            {
                title: 'EZ-ONE Renewal',
                summary: 'Workspace and profile integration'
            }
        ]);
    });

    it('PROFILE-001: auto-saves the active section after two idle seconds', async () => {
        const wrapper = await mountPage();

        vi.useFakeTimers();
        await wrapper.get('[data-testid="basic-info-phone"]').setValue('010-9999-0000');
        expect(wrapper.get('[data-testid="document-autosave-status"]').attributes('data-save-state')).toBe('waiting');
        await vi.advanceTimersByTimeAsync(1999);
        expect(mocks.saveSection).not.toHaveBeenCalledWith('basicInfo', expect.objectContaining({ phone: '010-9999-0000' }));
        await vi.advanceTimersByTimeAsync(1);
        expect(mocks.saveSection).toHaveBeenCalledWith('basicInfo', expect.objectContaining({ phone: '010-9999-0000' }));
    });

    it('PROFILE-024: adds and deletes repeatable items before using the global save button', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-projects"]').trigger('click');
        await wrapper.get('[data-testid="add-reusable-item"]').trigger('click');
        await wrapper.get('[data-testid="section-title"]').setValue('Second Project');
        await wrapper.get('[data-testid="section-summary"]').setValue('Second project summary');
        await wrapper.get('[data-testid="delete-reusable-0"]').trigger('click');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();
        expect(mocks.saveSection).toHaveBeenLastCalledWith('projects', [
            {
                title: 'Second Project',
                summary: 'Second project summary'
            }
        ]);
    });

    it('PROFILE-001/PROFILE-006: creates, updates, and deletes custom fields', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-custom"]').trigger('click');
        expect(wrapper.text()).toContain('Portfolio');
        await wrapper.get('[data-testid="custom-label"]').setValue('Blog');
        await wrapper.get('[data-testid="custom-type"]').setValue('URL');
        await wrapper.get('[data-testid="custom-value"]').setValue('https://blog.example.com');
        await wrapper.get('[data-testid="create-custom-field"]').trigger('click');
        expect(mocks.createCustomField).toHaveBeenCalledWith({
            label: 'Blog',
            fieldType: 'URL',
            value: 'https://blog.example.com'
        });

        await wrapper.get('[data-testid="edit-custom-501"]').trigger('click');
        await wrapper.get('[data-testid="custom-label"]').setValue('Portfolio Updated');
        await wrapper.get('[data-testid="custom-value"]').setValue('https://example.com/updated');
        await wrapper.get('[data-testid="update-custom-field"]').trigger('click');
        expect(mocks.updateCustomField).toHaveBeenCalledWith('501', {
            label: 'Portfolio Updated',
            fieldType: 'URL',
            value: 'https://example.com/updated'
        });

        await wrapper.get('[data-testid="delete-custom-501"]').trigger('click');
        expect(mocks.deleteCustomField).toHaveBeenCalledWith('501');
    });
});

async function mountPage() {
    const router = makeRouter();
    router.push('/document-profile');
    await router.isReady();
    const wrapper = mount(DocumentProfilePage, {
        global: {
            plugins: [createPinia(), router]
        }
    });
    await flushPromises();
    return wrapper;
}

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
