import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    beforeEach(() => {
        mocks.getDocumentProfile.mockReset();
        mocks.saveSection.mockReset();
        mocks.createCustomField.mockReset();
        mocks.updateCustomField.mockReset();
        mocks.deleteCustomField.mockReset();
        mocks.getDocumentProfile.mockResolvedValue({
            sections: {
                basicInfo: {
                    nameKo: 'Hong Gil Dong',
                    nameEn: 'Gil Dong Hong',
                    nameHanja: '洪吉東',
                    email: 'user@example.com',
                    phone: '010-1234-5678',
                    gender: '남성',
                    birthdate: '1999-01-01',
                    address: 'Seoul',
                    addressDetail: 'Gangnam-gu'
                },
                education: [{ title: 'Korea University', summary: 'Computer Science' }],
                career: [{ title: 'Naver Cloud', summary: 'Backend Engineer' }],
                projects: [{ title: 'EZ One', summary: 'Job workspace MVP' }],
                certificates: [{ title: 'TOEIC', summary: '900' }],
                awards: [{ title: 'Hackathon Grand Prize', summary: 'P1 service award' }],
                courses: [{ title: 'Database Systems', summary: 'MySQL schema design and query tuning' }],
                essays: [{ title: '지원동기 기본안', summary: '산업 관심과 백엔드 경험을 연결한 초안' }],
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
        mocks.saveSection.mockResolvedValue({
            sections: {
                basicInfo: {
                    nameKo: 'Kim Jiwon',
                    nameEn: 'Jiwon Kim',
                    nameHanja: '金智媛',
                    email: 'jiwon@example.com',
                    phone: '010-1234-5678',
                    gender: '여성',
                    birthdate: '1998-02-03',
                    address: 'Seoul',
                    addressDetail: 'Mapo-gu'
                },
                education: [{ title: 'Korea University', summary: 'Computer Science' }],
                career: [{ title: 'Naver Cloud Platform', summary: 'Platform backend' }],
                projects: [{ title: 'EZ One Renewal', summary: 'Workspace and profile integration' }],
                certificates: [{ title: 'TOEIC', summary: '900' }],
                awards: [{ title: 'Hackathon Grand Prize', summary: 'P1 service award' }],
                courses: [{ title: 'Data Engineering', summary: 'ETL and analytics project' }],
                essays: [{ title: '지원동기 기본안', summary: '산업 관심과 백엔드 경험을 연결한 초안' }],
                military: [{ title: 'Completed', summary: 'Army / Sergeant / 2022.03-2023.09' }],
                internships: [{ title: 'Startup Intern', summary: 'Backend internship' }],
                trainings: [{ title: 'Cloud Course', summary: '120 hours' }],
                activities: [{ title: 'Student Club', summary: 'Backend lead' }]
            },
            customFields: []
        });
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
    it('PROFILE-001: renders saved basic info and persists edits', async () => {
        const wrapper = await mountPage();
        expect(mocks.getDocumentProfile).toHaveBeenCalled();
        expect(wrapper.get('[data-testid="basic-info-name"]').element.value).toBe('Hong Gil Dong');
        expect(wrapper.get('[data-testid="basic-info-name-en"]').element.value).toBe('Gil Dong Hong');
        expect(wrapper.get('[data-testid="basic-info-name-hanja"]').element.value).toBe('洪吉東');
        expect(wrapper.get('[data-testid="basic-info-email"]').element.value).toBe('user@example.com');
        expect(wrapper.get('[data-testid="basic-info-gender"]').element.value).toBe('남성');
        expect(wrapper.get('[data-testid="basic-info-birthdate"]').element.value).toBe('1999-01-01');
        expect(wrapper.get('[data-testid="basic-info-address-detail"]').element.value).toBe('Gangnam-gu');
        expect(wrapper.text()).toContain('2026-06-05T12:00:00Z');
        await wrapper.get('[data-testid="basic-info-name"]').setValue('Kim Jiwon');
        await wrapper.get('[data-testid="basic-info-name-en"]').setValue('Jiwon Kim');
        await wrapper.get('[data-testid="basic-info-name-hanja"]').setValue('金智媛');
        await wrapper.get('[data-testid="basic-info-email"]').setValue('jiwon@example.com');
        await wrapper.get('[data-testid="basic-info-gender"]').setValue('여성');
        await wrapper.get('[data-testid="basic-info-birthdate"]').setValue('1998-02-03');
        await wrapper.get('[data-testid="basic-info-address-detail"]').setValue('Mapo-gu');
        await wrapper.get('button.primary-button').trigger('click');
        expect(mocks.saveSection).toHaveBeenCalledWith('basicInfo', {
            nameKo: 'Kim Jiwon',
            nameEn: 'Jiwon Kim',
            nameHanja: '金智媛',
            email: 'jiwon@example.com',
            phone: '010-1234-5678',
            gender: '여성',
            birthdate: '1998-02-03',
            address: 'Seoul',
            addressDetail: 'Mapo-gu'
        });
    });
    it('PROFILE-004/PROFILE-005: renders and saves project and award sections', async () => {
        const wrapper = await mountPage();
        await wrapper.get('[data-testid="section-projects"]').trigger('click');
        expect(wrapper.get('[data-testid="section-title"]').element.value).toBe('EZ One');
        expect(wrapper.get('[data-testid="section-summary"]').element.value).toBe('Job workspace MVP');
        await wrapper.get('[data-testid="section-title"]').setValue('EZ One Renewal');
        await wrapper.get('[data-testid="section-summary"]').setValue('Workspace and profile integration');
        await wrapper.get('[data-testid="save-section"]').trigger('click');
        expect(mocks.saveSection).toHaveBeenCalledWith('projects', [
            {
                title: 'EZ One Renewal',
                summary: 'Workspace and profile integration'
            }
        ]);
        await wrapper.get('[data-testid="section-awards"]').trigger('click');
        expect(wrapper.get('[data-testid="section-title"]').element.value).toBe('Hackathon Grand Prize');
    });
    it('PROFILE-024: adds and deletes repeatable project items before saving', async () => {
        const wrapper = await mountPage();
        await wrapper.get('[data-testid="section-projects"]').trigger('click');
        await wrapper.get('[data-testid="add-reusable-item"]').trigger('click');
        await wrapper.get('[data-testid="section-title"]').setValue('Second Project');
        await wrapper.get('[data-testid="section-summary"]').setValue('Second project summary');
        await wrapper.get('[data-testid="save-reusable-item"]').trigger('click');
        await wrapper.get('[data-testid="delete-reusable-0"]').trigger('click');
        await wrapper.get('[data-testid="save-section"]').trigger('click');
        expect(mocks.saveSection).toHaveBeenLastCalledWith('projects', [
            {
                title: 'Second Project',
                summary: 'Second project summary'
            }
        ]);
    });
    it('PROFILE-012/PROFILE-014/PROFILE-015: edits education, career, and certificate sections', async () => {
        const wrapper = await mountPage();
        await wrapper.get('[data-testid="section-education"]').trigger('click');
        expect(wrapper.get('[data-testid="section-title"]').element.value).toBe('Korea University');
        await wrapper.get('[data-testid="section-career"]').trigger('click');
        expect(wrapper.get('[data-testid="section-title"]').element.value).toBe('Naver Cloud');
        await wrapper.get('[data-testid="section-title"]').setValue('Naver Cloud Platform');
        await wrapper.get('[data-testid="section-summary"]').setValue('Platform backend');
        await wrapper.get('[data-testid="save-section"]').trigger('click');
        expect(mocks.saveSection).toHaveBeenLastCalledWith('career', [
            {
                title: 'Naver Cloud Platform',
                summary: 'Platform backend'
            }
        ]);
        await wrapper.get('[data-testid="section-certificates"]').trigger('click');
        expect(wrapper.get('[data-testid="section-title"]').element.value).toBe('TOEIC');
    });
    it('PROFILE-011/PROFILE-018/PROFILE-020/PROFILE-021: edits remaining P1 profile sections', async () => {
        const wrapper = await mountPage();
        await wrapper.get('[data-testid="section-military"]').trigger('click');
        expect(wrapper.get('[data-testid="section-title"]').element.value).toBe('Completed');
        await wrapper.get('[data-testid="section-internships"]').trigger('click');
        expect(wrapper.get('[data-testid="section-title"]').element.value).toBe('Startup Intern');
        await wrapper.get('[data-testid="section-title"]').setValue('Platform Intern');
        await wrapper.get('[data-testid="section-summary"]').setValue('Platform operations internship');
        await wrapper.get('[data-testid="save-section"]').trigger('click');
        expect(mocks.saveSection).toHaveBeenLastCalledWith('internships', [
            {
                title: 'Platform Intern',
                summary: 'Platform operations internship'
            }
        ]);
        await wrapper.get('[data-testid="section-trainings"]').trigger('click');
        expect(wrapper.get('[data-testid="section-title"]').element.value).toBe('Cloud Course');
        await wrapper.get('[data-testid="section-activities"]').trigger('click');
        expect(wrapper.get('[data-testid="section-title"]').element.value).toBe('Student Club');
    });
    it('PROFILE-002/PROFILE-016: edits course and prewritten essay sections', async () => {
        const wrapper = await mountPage();
        await wrapper.get('[data-testid="section-courses"]').trigger('click');
        expect(wrapper.get('[data-testid="section-title"]').element.value).toBe('Database Systems');
        await wrapper.get('[data-testid="section-title"]').setValue('Data Engineering');
        await wrapper.get('[data-testid="section-summary"]').setValue('ETL and analytics project');
        await wrapper.get('[data-testid="save-section"]').trigger('click');
        expect(mocks.saveSection).toHaveBeenLastCalledWith('courses', [
            {
                title: 'Data Engineering',
                summary: 'ETL and analytics project'
            }
        ]);
        await wrapper.get('[data-testid="section-essays"]').trigger('click');
        expect(wrapper.get('[data-testid="section-title"]').element.value).toBe('지원동기 기본안');
        await wrapper.get('[data-testid="section-title"]').setValue('성장과정 기본안');
        await wrapper.get('[data-testid="section-summary"]').setValue('문제 해결 경험을 정리한 사전 작성 자소서');
        await wrapper.get('[data-testid="save-section"]').trigger('click');
        expect(mocks.saveSection).toHaveBeenLastCalledWith('essays', [
            {
                title: '성장과정 기본안',
                summary: '문제 해결 경험을 정리한 사전 작성 자소서'
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
