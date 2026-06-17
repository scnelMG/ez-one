import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DocumentProfilePage from './DocumentProfilePage.vue';

const mocks = vi.hoisted(() => ({
    getDocumentProfile: vi.fn(),
    saveSection: vi.fn()
}));

vi.mock('@/features/document-profile/api/documentProfileApi', () => ({
    documentProfileApi: {
        getDocumentProfile: mocks.getDocumentProfile,
        saveSection: mocks.saveSection
    }
}));

const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/document-profile', component: DocumentProfilePage },
        { path: '/main', component: { template: '<div>main</div>' } },
        { path: '/basket', component: { template: '<div>basket</div>' } },
        { path: '/mypage', component: { template: '<div>mypage</div>' } },
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
                    nameEn: 'Hong Gildong',
                    nameHanja: '洪吉童',
                    email: 'user@example.com',
                    phone: '010-1234-5678',
                    gender: '남',
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
                military: [{ title: '군필', summary: '육군 / 병장 / 만기제대' }],
                internships: [{ title: 'Startup Intern', summary: 'Backend internship' }],
                trainings: [{ title: 'Cloud Course', summary: '120 hours' }],
                activities: [{ title: 'Student Club', summary: 'Backend lead' }]
            },
            customFields: [],
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
    });

    it('PROFILE-001: uses the extension settings structure without visible requirement IDs or autosave copy', async () => {
        const wrapper = await mountPage();

        expect(mocks.getDocumentProfile).toHaveBeenCalled();
        expect(wrapper.get('h1').text()).toBe('정보 입력');
        const savedAt = wrapper.get('.last-saved-at').text();
        expect(savedAt).toContain('마지막 저장: 2026년 06월 05일');
        expect(savedAt).not.toContain('T12:00:00Z');
        expect(wrapper.text()).not.toContain('PROFILE-001');
        expect(wrapper.text()).not.toContain('자동 저장');
        expect(wrapper.find('[data-testid="document-autosave-status"]').exists()).toBe(false);
        expect(wrapper.find('.workspace-tabs').exists()).toBe(false);
        expect(wrapper.find('.wire-side-panel').exists()).toBe(false);
        expect(wrapper.get('[data-testid="save-document-profile"]').text()).toContain('저장');
        expect(wrapper.get('[data-testid="basic-info-name"]').element.value).toBe('홍길동');
    });

    it('PROFILE-001: exposes the same major setting sections from the PDF', async () => {
        const wrapper = await mountPage();

        const sectionLabels = wrapper.findAll('.document-section-rail button').map((button) => button.text());
        expect(sectionLabels).toEqual([
            '기본 정보',
            '병역 / 장애 / 보훈',
            '학교 정보',
            '경력',
            '프로젝트',
            '자격증 / 어학',
            '수상/교육/활동/해외경험'
        ]);
    });

    it('PROFILE-001: saves the active section from the single save button', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="basic-info-name"]').setValue('김지원');
        await wrapper.get('[data-testid="basic-info-email"]').setValue('jiwon@example.com');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();
        expect(mocks.saveSection).toHaveBeenCalledWith('basicInfo', {
            nameKo: '김지원',
            nameEn: 'Hong Gildong',
            nameHanja: '洪吉童',
            email: 'jiwon@example.com',
            phone: '010-1234-5678',
            gender: '남',
            birthdate: '1999-01-01',
            address: 'Seoul',
            addressDetail: 'Gangnam-gu'
        });

        await wrapper.get('[data-testid="section-projects"]').trigger('click');
        await wrapper.get('[data-testid="projects-0-projectName"]').setValue('EZ-ONE Renewal');
        await wrapper.get('[data-testid="projects-0-contribution"]').setValue('Workspace and profile integration');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();
        expect(mocks.saveSection).toHaveBeenLastCalledWith('projects', expect.objectContaining({
            projects: [
                expect.objectContaining({
                    projectName: 'EZ-ONE Renewal',
                    contribution: 'Workspace and profile integration'
                })
            ]
        }));
    });

    it('PROFILE-011: uses selects for military classification fields', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-military"]').trigger('click');
        const status = wrapper.get('[data-testid="military-status"]');
        const branch = wrapper.get('[data-testid="military-branch"]');
        const rank = wrapper.get('[data-testid="military-rank"]');
        const dischargeType = wrapper.get('[data-testid="military-dischargeType"]');

        expect(status.element.tagName).toBe('SELECT');
        expect(branch.element.tagName).toBe('SELECT');
        expect(branch.text()).toContain('육군');
        expect(branch.text()).toContain('해군');
        expect(branch.text()).toContain('공군');
        expect(rank.element.tagName).toBe('SELECT');
        expect(rank.text()).toContain('병장');
        expect(dischargeType.element.tagName).toBe('SELECT');
        expect(dischargeType.text()).toContain('만기제대');
        expect(dischargeType.text()).toContain('의병제대');
    });

    it('PROFILE-011: renders disability and veteran groups like application-form choices', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-military"]').trigger('click');
        const disabilityChoice = wrapper.get('[data-testid="disability-hasDisability-radio-group"]');
        const veteranChoice = wrapper.get('[data-testid="veteran-isVeteran-radio-group"]');
        const disabilityLevel = wrapper.get('[data-testid="disability-disabilityLevel"]');
        const veteranRelation = wrapper.get('[data-testid="veteran-veteranRelation"]');

        expect(disabilityChoice.text()).toContain('비대상');
        expect(disabilityChoice.text()).toContain('대상');
        expect(veteranChoice.text()).toContain('비대상');
        expect(veteranChoice.text()).toContain('대상');
        expect(disabilityLevel.element.tagName).toBe('SELECT');
        expect(disabilityLevel.text()).toContain('중증');
        expect(disabilityLevel.text()).toContain('경증');
        expect(veteranRelation.element.tagName).toBe('SELECT');
        expect(veteranRelation.text()).toContain('본인');
        expect(veteranRelation.text()).toContain('부');
        expect(veteranRelation.text()).toContain('모');
    });

    it('PROFILE-012/013: uses day-level school dates and removes high school GPA', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-education"]').trigger('click');

        expect(wrapper.find('[data-testid="highSchool-grade"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="highSchool-gradeScale"]').exists()).toBe(false);
        expect(wrapper.get('[data-testid="highSchool-entranceDate"]').attributes('type')).toBe('text');
        expect(wrapper.get('[data-testid="highSchool-graduationDate"]').attributes('type')).toBe('text');
        expect(wrapper.get('[data-testid="universities-0-entranceDate"]').attributes('type')).toBe('text');
        expect(wrapper.get('[data-testid="universities-0-graduationDate"]').attributes('type')).toBe('text');
        expect(wrapper.get('[data-testid="universities-0-gradeScale"]').element.closest('label')?.textContent)
            .toContain('만점');
        expect(wrapper.get('[data-testid="universities-0-subMajor"]').element.closest('label')?.textContent)
            .toContain('복수전공/부전공');
        expect(wrapper.get('[data-testid="universities-0-isTransfer"]').element.closest('label')?.textContent)
            .toContain('편입 여부');
        expect(wrapper.get('[data-testid="universities-0-majorGrade"]').element.closest('label')?.textContent)
            .toContain('전공 평점');
        expect(wrapper.get('[data-testid="universities-0-majorGradeScale"]').element.closest('label')?.textContent)
            .toContain('전공 만점');
        expect(wrapper.get('[data-testid="universities-0-gradeRank"]').element.closest('label')?.textContent)
            .toContain('학점 석차/상위 퍼센트');
        expect(wrapper.get('[data-testid="graduateSchools-0-subMajor"]').element.closest('label')?.textContent)
            .toContain('복수전공/부전공');
    });

    it('PROFILE-012/013: formats date input as YYYY-MM-DD and ignores extra digits', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-education"]').trigger('click');
        const graduationDate = wrapper.get('[data-testid="highSchool-graduationDate"]');

        await graduationDate.setValue('202409030579');

        expect(graduationDate.element.value).toBe('2024-09-03');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();
        expect(mocks.saveSection).toHaveBeenLastCalledWith('education', expect.objectContaining({
            highSchool: expect.objectContaining({
                graduationDate: '2024-09-03'
            })
        }));
    });

    it('PROFILE-001: still auto-saves the active section without showing autosave text', async () => {
        const wrapper = await mountPage();

        vi.useFakeTimers();
        await wrapper.get('[data-testid="basic-info-phone"]').setValue('010-9999-0000');
        expect(wrapper.text()).not.toContain('자동 저장');
        await vi.advanceTimersByTimeAsync(2000);
        expect(mocks.saveSection).toHaveBeenCalledWith('basicInfo', expect.objectContaining({ phone: '010-9999-0000' }));
    });

    it('PROFILE-012/013: uses registration number instead of expiry date for language tests', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-certificates"]').trigger('click');

        expect(wrapper.find('[data-testid="languageTests-0-expiryDate"]').exists()).toBe(false);
        const testName = wrapper.get('[data-testid="languageTests-0-testName"]');
        expect(testName.element.tagName).toBe('SELECT');
        expect(testName.text()).toContain('OPIc(영어)');
        expect(testName.text()).toContain('TOEIC');
        expect(testName.text()).toContain('HSK');
        await testName.setValue('OPIc(영어)');
        const registrationNumber = wrapper.get('[data-testid="languageTests-0-registrationNumber"]');
        expect(registrationNumber.element.closest('label')?.textContent).toContain('등록번호');
        await registrationNumber.setValue('OPIC-2024-001');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();
        expect(mocks.saveSection).toHaveBeenLastCalledWith('certificates', expect.objectContaining({
            languageTests: [
                expect.objectContaining({
                    testName: 'OPIc(영어)',
                    registrationNumber: 'OPIC-2024-001'
                })
            ]
        }));
    });

    it('PROFILE-024: adds and deletes repeatable items before using the global save button', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-projects"]').trigger('click');
        await wrapper.get('[data-testid="projects-0-projectName"]').setValue('First Project');
        await wrapper.get('[data-testid="add-projects"]').trigger('click');
        await wrapper.get('[data-testid="projects-1-projectName"]').setValue('Second Project');
        await wrapper.get('[data-testid="projects-1-summary"]').setValue('Second project summary');
        await wrapper.get('[data-testid="delete-projects-0"]').trigger('click');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();
        expect(mocks.saveSection).toHaveBeenLastCalledWith('projects', expect.objectContaining({
            projects: [
                expect.objectContaining({
                    projectName: 'Second Project',
                    summary: 'Second project summary'
                })
            ]
        }));
    });

    it('PROFILE-001/PROFILE-006: removes custom field controls from the document profile page', async () => {
        const wrapper = await mountPage();

        expect(wrapper.find('[data-testid="section-custom"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="custom-label"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="create-custom-field"]').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('커스텀 필드');
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
