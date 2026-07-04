import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDocumentProfileStore } from '@/stores/documentProfileStore';
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
        { path: '/', component: { template: '<div>main</div>' } },
        { path: '/document-profile', component: DocumentProfilePage },
        { path: '/main', component: { template: '<div>main</div>' } },
        { path: '/basket', component: { template: '<div>basket</div>' } },
        { path: '/study', component: { template: '<div>study</div>' } },
        { path: '/history', component: { template: '<div>history</div>' } },
        { path: '/mypage', component: { template: '<div>mypage</div>' } },
        { path: '/mypage/terms', component: { template: '<div>terms</div>' } },
        { path: '/mypage/partnership', component: { template: '<div>partnership</div>' } },
    ]
});

const mountedWrappers = [];

describe('DocumentProfilePage', () => {
    afterEach(() => {
        mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
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
                    addressDetail: 'Gangnam-gu',
                    profilePhoto: {
                        name: 'resume-photo.jpg',
                        type: 'image/jpeg',
                        size: 1200,
                        dataUrl: 'data:image/jpeg;base64,old-photo'
                    }
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
                [sectionType]: payload
            },
            customFields: []
        }));
    });

    it('PROFILE-001: renders inside the shared layout without missing-route warnings', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await mountPage();

        const missingRouteWarnings = warnSpy.mock.calls
            .map(([message]) => String(message))
            .filter((message) => message.includes('[Vue Router warn]: No match found'));
        warnSpy.mockRestore();
        expect(missingRouteWarnings).toEqual([]);
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

    it('PROFILE-001: keeps the save action close to the active form instead of the page header', async () => {
        const wrapper = await mountPage();

        expect(wrapper.find('.document-profile-toolbar [data-testid="save-document-profile"]').exists()).toBe(false);
        expect(wrapper.get('.document-save-actions [data-testid="save-document-profile"]').text()).toContain('저장');
        expect(wrapper.get('.document-form-panel-focused .document-save-actions').exists()).toBe(true);
    });

    it('PROFILE-001/EXT-013: captures common application defaults for autofill', async () => {
        const wrapper = await mountPage();

        expect(wrapper.get('[data-testid="basic-info-application-career-type"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="basic-info-application-source"]').exists()).toBe(false);

        await wrapper.get('[data-testid="basic-info-application-career-type"]').setValue('신입');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.saveSection).toHaveBeenLastCalledWith('basicInfo', expect.objectContaining({
            applicationCareerType: '신입'
        }));
        expect(mocks.saveSection.mock.calls.at(-1)[1]).not.toHaveProperty('applicationSource');
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
            '수상 / 교육 / 학내외 활동'
        ]);
    });

    it('PROFILE-001: moves back to the top of the form when switching sections', async () => {
        const originalScrollIntoView = Element.prototype.scrollIntoView;
        const scrollIntoView = vi.fn();
        Element.prototype.scrollIntoView = scrollIntoView;

        try {
            const wrapper = await mountPage();

            await wrapper.get('[data-testid="section-certificates"]').trigger('click');
            await flushPromises();

            expect(scrollIntoView).toHaveBeenCalledWith({
                block: 'start',
                behavior: 'smooth'
            });
        } finally {
            if (originalScrollIntoView) {
                Element.prototype.scrollIntoView = originalScrollIntoView;
            } else {
                delete Element.prototype.scrollIntoView;
            }
        }
    });

    it('PROFILE-001: restores the selected section from the route after refresh', async () => {
        const wrapper = await mountPage('/document-profile?section=education');

        expect(wrapper.get('[data-testid="section-education"]').classes()).toContain('active');
        expect(wrapper.get('h2').text()).toContain('학교 정보');
        expect(wrapper.find('[data-testid="basic-info-name"]').exists()).toBe(false);
    });

    it('PROFILE-001: writes the selected section into the route for refresh-safe tabs', async () => {
        const { wrapper, router } = await mountPage('/document-profile?section=education', { returnRouter: true });

        await wrapper.get('[data-testid="section-certificates"]').trigger('click');
        await flushPromises();

        expect(router.currentRoute.value.query.section).toBe('certificates');
    });

    it('PROFILE-011: updates and saves military fields when the page opens directly on the military section', async () => {
        const wrapper = await mountPage('/document-profile?section=military');

        const status = wrapper.get('[data-testid="military-status"]');
        await status.setValue('미필');
        expect(status.element.value).toBe('미필');
        await flushPromises();
        expect(wrapper.get('[data-testid="military-branch"]').element.value).toBe('');
        expect(wrapper.get('[data-testid="military-rank"]').element.value).toBe('');
        expect(wrapper.get('[data-testid="military-dischargeType"]').element.value).toBe('');

        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.saveSection).toHaveBeenLastCalledWith('military', expect.objectContaining({
            military: [
                expect.objectContaining({
                    status: '미필',
                    branch: '',
                    rank: '',
                    dischargeType: ''
                })
            ]
        }));
        const savedRecord = mocks.saveSection.mock.lastCall[1].military[0];
        expect(savedRecord).not.toHaveProperty('title');
        expect(savedRecord).not.toHaveProperty('summary');
    });

    it('PROFILE-011: saves the just-selected military value when save is clicked immediately', async () => {
        const wrapper = await mountPage('/document-profile?section=military');
        const status = wrapper.get('[data-testid="military-status"]');

        status.element.value = '군필';
        const pendingModelUpdate = status.trigger('change');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await pendingModelUpdate;
        await flushPromises();

        expect(mocks.saveSection).toHaveBeenLastCalledWith('military', expect.objectContaining({
            military: [
                expect.objectContaining({ status: '군필' })
            ]
        }));
    });

    it('PROFILE-011: lets the visible military status override stale hidden preference fields', async () => {
        mocks.getDocumentProfile.mockResolvedValueOnce({
            sections: {
                military: {
                    military: [
                        {
                            status: '미필',
                            hasDisability: false,
                            isVeteran: false
                        }
                    ]
                }
            },
            customFields: [],
            lastSavedAt: '2026-06-19T18:00:00'
        });
        const wrapper = await mountPage('/document-profile?section=military');

        await wrapper.get('[data-testid="military-status"]').setValue('군필');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.saveSection).toHaveBeenLastCalledWith('military', expect.objectContaining({
            military: [
                expect.objectContaining({
                    status: '군필',
                    hasDisability: false,
                    isVeteran: false
                })
            ]
        }));
    });

    it('PROFILE-011: lets visible disability and veteran choices override stale hidden military fields', async () => {
        mocks.getDocumentProfile.mockResolvedValueOnce({
            sections: {
                military: {
                    military: [
                        {
                            status: '군필',
                            hasDisability: false,
                            isVeteran: false
                        }
                    ]
                }
            },
            customFields: [],
            lastSavedAt: '2026-06-19T18:00:00'
        });
        const wrapper = await mountPage('/document-profile?section=military');

        await wrapper.get('[data-testid="disability-hasDisability-true"]').setValue();
        await wrapper.get('[data-testid="veteran-isVeteran-true"]').setValue();
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.saveSection).toHaveBeenLastCalledWith('military', expect.objectContaining({
            military: [
                expect.objectContaining({
                    status: '군필',
                    hasDisability: true,
                    isVeteran: true
                })
            ]
        }));
    });

    it('PROFILE-011: keeps a military edit when a stale profile refresh arrives before save', async () => {
        const { wrapper, store } = await mountPage('/document-profile?section=military', { returnStore: true });

        await wrapper.get('[data-testid="military-status"]').setValue('미필');
        store.profile = {
            ...store.profile,
            sections: {
                ...store.profile.sections,
                military: [{ title: '군필', summary: '육군 / 병장 / 만기제대' }]
            }
        };
        await flushPromises();

        expect(wrapper.get('[data-testid="military-status"]').element.value).toBe('미필');
    });

    it('PROFILE-011: does not autosave military values just from loading the section', async () => {
        await mountPage('/document-profile?section=military');

        vi.useFakeTimers();
        await vi.advanceTimersByTimeAsync(700);
        await Promise.resolve();

        expect(mocks.saveSection).not.toHaveBeenCalled();
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
            addressDetail: 'Gangnam-gu',
            applicationCareerType: '',
            profilePhoto: {
                name: 'resume-photo.jpg',
                type: 'image/jpeg',
                size: 1200,
                dataUrl: 'data:image/jpeg;base64,old-photo'
            }
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

        await wrapper.get('[data-testid="section-military"]').trigger('click');
        await wrapper.get('[data-testid="military-status"]').setValue('미필');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();
        expect(mocks.saveSection).toHaveBeenLastCalledWith('military', expect.objectContaining({
            military: [
                expect.objectContaining({
                    status: '미필'
                })
            ]
        }));
    });

    it('PROFILE-005/PROFILE-009: confirms a manual save near the save button', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="basic-info-name"]').setValue('김지원');
        expect(wrapper.find('[data-testid="document-save-feedback"]').exists()).toBe(false);

        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-testid="save-document-profile"]').text()).toContain('저장됨');
        const feedback = wrapper.get('[data-testid="document-save-feedback"]');
        expect(feedback.text()).toContain('저장됐습니다');
        expect(feedback.classes()).toContain('saved');
        expect(feedback.get('[data-testid="document-save-feedback-icon"]').attributes('aria-hidden')).toBe('true');
    });

    it('PROFILE-005/PROFILE-009: keeps failed saves visible with the API error message', async () => {
        mocks.saveSection.mockRejectedValueOnce(new Error('Authentication is required.'));
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="basic-info-name"]').setValue('김지원');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-testid="save-document-profile"]').text()).toContain('다시 저장');
        const feedback = wrapper.get('[data-testid="document-save-feedback"]');
        expect(feedback.text()).toContain('저장에 실패했습니다');
        expect(feedback.text()).toContain('Authentication is required.');
        expect(wrapper.get('.state-panel').text()).toContain('Authentication is required.');
        expect(wrapper.get('[data-testid="basic-info-name"]').element.value).toBe('김지원');
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

    it('PROFILE-011: formats military dates without native date mask corruption', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-military"]').trigger('click');
        const enlistmentDate = wrapper.get('[data-testid="military-enlistmentDate"]');

        expect(enlistmentDate.attributes('type')).toBe('text');
        expect(enlistmentDate.attributes('inputmode')).toBe('numeric');
        expect(wrapper.get('[data-testid="military-enlistmentDate-picker"]').attributes('type')).toBe('date');

        await enlistmentDate.setValue('20230707');

        expect(enlistmentDate.element.value).toBe('2023-07-07');
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

    it('PROFILE-011/EXT-013: captures military preference details commonly requested by applications', async () => {
        const wrapper = await mountPage('/document-profile?section=military');

        expect(wrapper.get('[data-testid="military-servicePeriod"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="disability-disabilityRegistrationNumber"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="disability-disabilityType"]').exists()).toBe(true);

        await wrapper.get('[data-testid="military-servicePeriod"]').setValue('21 개월');
        await wrapper.get('[data-testid="disability-hasDisability-true"]').setValue();
        await wrapper.get('[data-testid="disability-disabilityRegistrationNumber"]').setValue('12-3456789');
        await wrapper.get('[data-testid="disability-disabilityType"]').setValue('지체');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.saveSection).toHaveBeenLastCalledWith('military', expect.objectContaining({
            military: [
                expect.objectContaining({
                    servicePeriod: '21 개월',
                    hasDisability: true,
                    disabilityRegistrationNumber: '12-3456789',
                    disabilityType: '지체'
                })
            ]
        }));
    });

    it('PROFILE-011: places disability and veteran target choices in the section heading', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-military"]').trigger('click');
        const disabilityChoice = wrapper.get('[data-testid="disability-hasDisability-radio-group"]');
        const veteranChoice = wrapper.get('[data-testid="veteran-isVeteran-radio-group"]');

        expect(disabilityChoice.element.closest('.profile-subsection-heading')).not.toBeNull();
        expect(veteranChoice.element.closest('.profile-subsection-heading')).not.toBeNull();
        expect(disabilityChoice.element.closest('.profile-field-grid')).toBeNull();
        expect(veteranChoice.element.closest('.profile-field-grid')).toBeNull();
        expect(wrapper.find('.application-choice-status-label').exists()).toBe(false);
        expect(disabilityChoice.element.closest('.application-choice-status')?.previousElementSibling?.tagName).toBe('H3');
        expect(veteranChoice.element.closest('.application-choice-status')?.previousElementSibling?.tagName).toBe('H3');
    });

    it('PROFILE-011: keeps disability and veteran radio choices selected after autosave sync', async () => {
        const wrapper = await mountPage();

        vi.useFakeTimers();
        await wrapper.get('[data-testid="section-military"]').trigger('click');
        const hasDisability = wrapper.get('[data-testid="disability-hasDisability-true"]');
        const isVeteran = wrapper.get('[data-testid="veteran-isVeteran-true"]');

        await hasDisability.setValue();
        await isVeteran.setValue();
        expect(hasDisability.element.checked).toBe(true);
        expect(isVeteran.element.checked).toBe(true);

        await vi.advanceTimersByTimeAsync(2000);
        await Promise.resolve();

        expect(mocks.saveSection).toHaveBeenLastCalledWith('military', expect.objectContaining({
            military: [
                expect.objectContaining({
                    hasDisability: true,
                    isVeteran: true
                })
            ]
        }));
        expect(wrapper.get('[data-testid="disability-hasDisability-true"]').element.checked).toBe(true);
        expect(wrapper.get('[data-testid="veteran-isVeteran-true"]').element.checked).toBe(true);
    });

    it('PROFILE-011: restores legacy military title and summary into editable fields', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-military"]').trigger('click');

        expect(wrapper.get('[data-testid="military-status"]').element.value).toBe('군필');
        expect(wrapper.get('[data-testid="military-branch"]').element.value).toBe('육군');
        expect(wrapper.get('[data-testid="military-rank"]').element.value).toBe('병장');
        expect(wrapper.get('[data-testid="military-dischargeType"]').element.value).toBe('만기제대');
    });

    it('PROFILE-005: does not overwrite active edits with a stale save response', async () => {
        let resolveSave;
        const pendingSave = new Promise((resolve) => {
            resolveSave = resolve;
        });
        mocks.saveSection.mockReturnValueOnce(pendingSave);
        const wrapper = await mountPage();

        vi.useFakeTimers();
        await wrapper.get('[data-testid="section-military"]').trigger('click');
        const status = wrapper.get('[data-testid="military-status"]');

        await status.setValue('미필');
        await vi.advanceTimersByTimeAsync(600);
        await Promise.resolve();
        expect(mocks.saveSection).toHaveBeenCalledWith('military', expect.objectContaining({
            military: [
                expect.objectContaining({ status: '미필' })
            ]
        }));

        await status.setValue('군필');
        resolveSave({
            sections: {
                military: {
                    military: [{ status: '미필' }]
                }
            },
            customFields: []
        });
        await Promise.resolve();
        await wrapper.vm.$nextTick();

        expect(wrapper.get('[data-testid="military-status"]').element.value).toBe('군필');
    });

    it('PROFILE-005: keeps the selected military value when a save response returns the previous value', async () => {
        let resolveSave;
        const pendingSave = new Promise((resolve) => {
            resolveSave = resolve;
        });
        mocks.saveSection.mockReturnValueOnce(pendingSave);
        const wrapper = await mountPage();

        vi.useFakeTimers();
        await wrapper.get('[data-testid="section-military"]').trigger('click');
        const status = wrapper.get('[data-testid="military-status"]');

        await status.setValue('미필');
        await vi.advanceTimersByTimeAsync(600);
        await Promise.resolve();
        expect(mocks.saveSection).toHaveBeenCalledWith('military', expect.objectContaining({
            military: [
                expect.objectContaining({ status: '미필' })
            ]
        }));

        resolveSave({
            sections: {
                military: {
                    military: [{ status: '군필' }]
                }
            },
            customFields: []
        });
        await Promise.resolve();
        await wrapper.vm.$nextTick();

        expect(wrapper.get('[data-testid="military-status"]').element.value).toBe('미필');
    });

    it('PROFILE-005/PROFILE-009: keeps military edits after autosave when a later profile refresh is stale', async () => {
        const { wrapper, store } = await mountPage('/document-profile?section=military', { returnStore: true });

        vi.useFakeTimers();
        await wrapper.get('[data-testid="military-status"]').setValue('미필');
        await vi.advanceTimersByTimeAsync(600);
        await Promise.resolve();
        await wrapper.vm.$nextTick();

        expect(mocks.saveSection).toHaveBeenCalledWith('military', expect.objectContaining({
            military: [
                expect.objectContaining({ status: '미필' })
            ]
        }));

        store.profile = {
            ...store.profile,
            sections: {
                ...store.profile.sections,
                military: [{ status: '군필' }]
            }
        };
        await Promise.resolve();
        await wrapper.vm.$nextTick();

        expect(wrapper.get('[data-testid="military-status"]').element.value).toBe('미필');
    });

    it('PROFILE-012/013: uses day-level school dates and removes high school GPA', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-education"]').trigger('click');

        expect(wrapper.find('[data-testid="highSchool-grade"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="highSchool-gradeScale"]').exists()).toBe(false);
        expect(wrapper.get('[data-testid="highSchool-entranceDate"]').attributes('type')).toBe('text');
        expect(wrapper.get('[data-testid="highSchool-entranceDate"]').attributes('inputmode')).toBe('numeric');
        expect(wrapper.get('[data-testid="highSchool-entranceDate-picker"]').attributes('type')).toBe('date');
        expect(wrapper.get('[data-testid="highSchool-graduationDate"]').attributes('type')).toBe('text');
        expect(wrapper.get('[data-testid="highSchool-graduationDate-picker"]').attributes('type')).toBe('date');
        expect(wrapper.get('[data-testid="universities-0-entranceDate"]').attributes('type')).toBe('text');
        expect(wrapper.get('[data-testid="universities-0-entranceDate-picker"]').attributes('type')).toBe('date');
        expect(wrapper.get('[data-testid="universities-0-graduationDate"]').attributes('type')).toBe('text');
        expect(wrapper.get('[data-testid="universities-0-graduationDate-picker"]').attributes('type')).toBe('date');
        expect(wrapper.get('[data-testid="universities-0-gradeScale"]').element.closest('label')?.textContent)
            .toContain('만점');
        expect(wrapper.get('[data-testid="universities-0-majors-0-major"]').element.closest('label')?.textContent)
            .toContain('\uC804\uACF5\uBA85');
        expect(wrapper.get('[data-testid="universities-0-majors-0-majorType"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="universities-0-isTransfer"]').element.closest('label')?.textContent)
            .toContain('편입 여부');
        expect(wrapper.get('[data-testid="universities-0-majorGrade"]').element.closest('label')?.textContent)
            .toContain('전공 평점');
        expect(wrapper.get('[data-testid="universities-0-majorGradeScale"]').element.closest('label')?.textContent)
            .toContain('전공 만점');
        expect(wrapper.get('[data-testid="universities-0-completedCredits"]').element.closest('label')?.textContent)
            .toContain('\uC774\uC218\uD559\uC810');
        expect(wrapper.get('[data-testid="universities-0-gradeRank"]').element.closest('label')?.textContent)
            .toContain('학점 백분율');
        expect(wrapper.get('[data-testid="graduateSchools-0-completedCredits"]').element.closest('label')?.textContent)
            .toContain('\uC774\uC218\uD559\uC810');
        expect(wrapper.get('[data-testid="graduateSchools-0-majors-0-major"]').element.closest('label')?.textContent)
            .toContain('\uC804\uACF5\uBA85');
    });

    it('PROFILE-012/013: saves completed credits from university education entries', async () => {
        const wrapper = await mountPage('/document-profile?section=education');

        await wrapper.get('[data-testid="universities-0-completedCredits"]').setValue('130');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.saveSection).toHaveBeenLastCalledWith('education', expect.objectContaining({
            universities: [
                expect.objectContaining({
                    completedCredits: '130'
                })
            ]
        }));
    });

    it('PROFILE-012/013: captures school location, track, campus, and major category for autofill', async () => {
        const wrapper = await mountPage('/document-profile?section=education');

        expect(wrapper.get('[data-testid="highSchool-track"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="universities-0-location"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="universities-0-campusType"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="universities-0-majors-0-majorCategory"]').exists()).toBe(true);

        await wrapper.get('[data-testid="highSchool-track"]').setValue('인문계');
        await wrapper.get('[data-testid="universities-0-location"]').setValue('부산');
        await wrapper.get('[data-testid="universities-0-campusType"]').setValue('본교');
        await wrapper.get('[data-testid="universities-0-majors-0-majorCategory"]').setValue('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.saveSection).toHaveBeenLastCalledWith('education', expect.objectContaining({
            highSchool: expect.objectContaining({
                track: '인문계'
            }),
            universities: [
                expect.objectContaining({
                    location: '부산',
                    campusType: '본교',
                    majors: [
                        expect.objectContaining({
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)'
                        })
                    ]
                })
            ]
        }));
    });

    it('PROFILE-012/013: captures major details required by recruiter forms', async () => {
        const wrapper = await mountPage('/document-profile?section=education');

        expect(wrapper.get('[data-testid="universities-0-majors-0-major"]').element.closest('label')?.textContent)
            .toContain('\uC804\uACF5\uBA85');
        expect(wrapper.get('[data-testid="universities-0-majors-0-majorType"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="universities-0-majors-0-majorCategory"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="universities-0-majors-0-dayNight"]').exists()).toBe(true);
        expect(Array.from(wrapper.get('[data-testid="universities-0-majors-0-majorCategory"]').element.options).map((option) => option.value))
            .toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');

        await wrapper.get('[data-testid="universities-0-majors-0-major"]').setValue('\uAE30\uACC4\uACF5\uD559');
        await wrapper.get('[data-testid="universities-0-majors-0-majorType"]').setValue('\uC8FC\uC804\uACF5');
        await wrapper.get('[data-testid="universities-0-majors-0-majorCategory"]').setValue('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        await wrapper.get('[data-testid="universities-0-majors-0-dayNight"]').setValue('\uC8FC\uAC04');
        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.saveSection).toHaveBeenLastCalledWith('education', expect.objectContaining({
            universities: [
                expect.objectContaining({
                    majors: [
                        expect.objectContaining({
                            major: '\uAE30\uACC4\uACF5\uD559',
                            majorType: '\uC8FC\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            dayNight: '\uC8FC\uAC04'
                        })
                    ]
                })
            ]
        }));
    });

    it('PROFILE-012/013: saves each major with its own category and major type', async () => {
        const wrapper = await mountPage('/document-profile?section=education');

        await wrapper.get('[data-testid="universities-0-majors-0-major"]').setValue('\uC0B0\uC5C5\uACF5\uD559\uACFC');
        await wrapper.get('[data-testid="universities-0-majors-0-majorCategory"]').setValue('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        await wrapper.get('[data-testid="universities-0-majors-0-majorType"]').setValue('\uC8FC\uC804\uACF5');
        await wrapper.get('[data-testid="add-universities-0-majors"]').trigger('click');
        await wrapper.get('[data-testid="universities-0-majors-1-major"]').setValue('\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5');
        await wrapper.get('[data-testid="universities-0-majors-1-majorCategory"]').setValue('\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)');
        await wrapper.get('[data-testid="universities-0-majors-1-majorType"]').setValue('\uC5F0\uACC4\uC804\uACF5');

        expect(wrapper.get('[data-testid="delete-universities-0-majors-0"]').text()).toContain('\uC0AD\uC81C');
        expect(wrapper.get('[data-testid="delete-universities-0-majors-1"]').text()).toContain('\uC0AD\uC81C');

        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.saveSection).toHaveBeenLastCalledWith('education', expect.objectContaining({
            universities: [
                expect.objectContaining({
                    majors: [
                        expect.objectContaining({
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            majorType: '\uC8FC\uC804\uACF5'
                        }),
                        expect.objectContaining({
                            major: '\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)',
                            majorType: '\uC5F0\uACC4\uC804\uACF5'
                        })
                    ]
                })
            ]
        }));
    });

    it('PROFILE-012/013: places transfer status in the school entry header', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-education"]').trigger('click');
        const universityTransfer = wrapper.get('[data-testid="universities-0-isTransfer"]');
        const graduateTransfer = wrapper.get('[data-testid="graduateSchools-0-isTransfer"]');

        expect(universityTransfer.element.closest('.profile-entry-card-head')).not.toBeNull();
        expect(graduateTransfer.element.closest('.profile-entry-card-head')).not.toBeNull();
        expect(universityTransfer.element.closest('.profile-field-grid')).toBeNull();
        expect(graduateTransfer.element.closest('.profile-field-grid')).toBeNull();
        expect(universityTransfer.element.closest('label')?.textContent).toContain('편입 여부');
    });

    it('PROFILE-012/013: supports calendar date inputs and normalizes typed or pasted dates', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-education"]').trigger('click');
        const graduationDate = wrapper.get('[data-testid="highSchool-graduationDate"]');

        expect(graduationDate.attributes('type')).toBe('text');
        await graduationDate.setValue('20230707');
        expect(graduationDate.element.value).toBe('2023-07-07');

        await graduationDate.trigger('paste', {
            clipboardData: {
                getData: () => '2024.09.03 05:79'
            }
        });

        expect(graduationDate.element.value).toBe('2024-09-03');
        await wrapper.get('[data-testid="highSchool-graduationDate-picker"]').setValue('2025-02-20');
        expect(graduationDate.element.value).toBe('2025-02-20');

        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();
        expect(mocks.saveSection).toHaveBeenLastCalledWith('education', expect.objectContaining({
            highSchool: expect.objectContaining({
                graduationDate: '2025-02-20'
            })
        }));
    });

    it('PROFILE-001: still auto-saves the active section without showing autosave text', async () => {
        const wrapper = await mountPage();

        vi.useFakeTimers();
        await wrapper.get('[data-testid="basic-info-phone"]').setValue('010-9999-0000');
        expect(wrapper.text()).not.toContain('자동 저장');
        expect(wrapper.find('[data-testid="document-save-feedback"]').exists()).toBe(false);
        await vi.advanceTimersByTimeAsync(600);
        expect(mocks.saveSection).toHaveBeenCalledWith('basicInfo', expect.objectContaining({ phone: '010-9999-0000' }));
        expect(wrapper.find('[data-testid="document-save-feedback"]').exists()).toBe(false);
    });

    it('PROFILE-026: saves a resume photo in basic info for extension auto-fill', async () => {
        const originalFileReader = globalThis.FileReader;
        class MockFileReader {
            onload = null;
            readAsDataURL() {
                this.result = 'data:image/png;base64,new-photo';
                this.onload?.();
            }
        }
        globalThis.FileReader = MockFileReader;

        try {
            const wrapper = await mountPage();
            const file = new File(['image-bytes'], 'profile.png', { type: 'image/png' });

            expect(wrapper.get('[data-testid="basic-info-profile-photo-name"]').text()).toContain('resume-photo.jpg');
            const fileInput = wrapper.get('[data-testid="basic-info-profile-photo-input"]');
            Object.defineProperty(fileInput.element, 'files', {
                configurable: true,
                value: [file]
            });
            await fileInput.trigger('change');
            await flushPromises();

            expect(wrapper.get('[data-testid="basic-info-profile-photo-name"]').text()).toContain('profile.png');
            expect(wrapper.get('[data-testid="basic-info-profile-photo-preview"]').attributes('src')).toBe('data:image/png;base64,new-photo');

            await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
            await flushPromises();

            expect(mocks.saveSection).toHaveBeenLastCalledWith('basicInfo', expect.objectContaining({
                profilePhoto: expect.objectContaining({
                    name: 'profile.png',
                    type: 'image/png',
                    dataUrl: 'data:image/png;base64,new-photo'
                })
            }));
        } finally {
            globalThis.FileReader = originalFileReader;
        }
    });

    it('PROFILE-026: can remove a saved resume photo before saving', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="basic-info-profile-photo-remove"]').trigger('click');
        expect(wrapper.find('[data-testid="basic-info-profile-photo-preview"]').exists()).toBe(false);
        expect(wrapper.get('[data-testid="basic-info-profile-photo-name"]').text()).toContain('등록된 사진 없음');

        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.saveSection).toHaveBeenLastCalledWith('basicInfo', expect.objectContaining({
            profilePhoto: null
        }));
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

    it('PROFILE-021: labels school activities and includes team projects as an activity type', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-other"]').trigger('click');
        const activityType = wrapper.get('[data-testid="activities-0-activityType"]');

        expect(wrapper.get('h2').text()).toContain('수상 / 교육 / 학내외 활동');
        expect(wrapper.text()).toContain('학내외 활동');
        expect(activityType.text()).toContain('팀 프로젝트');
        expect(activityType.text()).toContain('동아리');
        expect(activityType.text()).toContain('서포터즈');
        expect(wrapper.get('[data-testid="activities-0-organization"]').element.closest('label')?.textContent)
            .toContain('기관/단체');
        expect(wrapper.get('[data-testid="activities-0-startDate"]').element.closest('label')?.textContent)
            .toContain('시작일');
        expect(wrapper.get('[data-testid="activities-0-endDate"]').element.closest('label')?.textContent)
            .toContain('종료일');
        expect(wrapper.get('[data-testid="activities-0-outcome"]').element.closest('label')?.textContent)
            .toContain('성과');
    });

    it('PROFILE-024: adds and deletes repeatable items before using the global save button', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-projects"]').trigger('click');
        await wrapper.get('[data-testid="projects-0-projectName"]').setValue('First Project');
        await wrapper.get('[data-testid="add-projects"]').trigger('click');
        await wrapper.get('[data-testid="projects-1-projectName"]').setValue('Second Project');
        await wrapper.get('[data-testid="projects-1-summary"]').setValue('Second project summary');
        await wrapper.get('[data-testid="delete-projects-0"]').trigger('click');
        await wrapper.get('[data-testid="confirm-delete-projects-0"]').trigger('click');
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

    it('PROFILE-024: confirms school item deletion inline without opening a full-screen backdrop', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="section-education"]').trigger('click');
        expect(wrapper.find('[data-testid="delete-graduateSchools-0"]').exists()).toBe(true);

        await wrapper.get('[data-testid="delete-graduateSchools-0"]').trigger('click');
        expect(wrapper.find('.confirm-modal-backdrop').exists()).toBe(false);
        expect(wrapper.get('[data-testid="confirm-delete-graduateSchools-0"]').text()).toContain('삭제');

        await wrapper.get('[data-testid="cancel-delete-graduateSchools-0"]').trigger('click');
        expect(wrapper.find('[data-testid="delete-graduateSchools-0"]').exists()).toBe(true);

        await wrapper.get('[data-testid="delete-graduateSchools-0"]').trigger('click');
        await wrapper.get('[data-testid="confirm-delete-graduateSchools-0"]').trigger('click');
        expect(wrapper.find('[data-testid="delete-graduateSchools-0"]').exists()).toBe(false);

        await wrapper.get('[data-testid="save-document-profile"]').trigger('click');
        await flushPromises();
        expect(wrapper.find('[data-testid="delete-graduateSchools-0"]').exists()).toBe(false);
    });

    it('PROFILE-001/PROFILE-006: removes custom field controls from the document profile page', async () => {
        const wrapper = await mountPage();

        expect(wrapper.find('[data-testid="section-custom"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="custom-label"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="create-custom-field"]').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('커스텀 필드');
    });
});

async function mountPage(path = '/document-profile', options = {}) {
    const router = makeRouter();
    router.push(path);
    await router.isReady();
    const pinia = createPinia();
    const wrapper = mount(DocumentProfilePage, {
        global: {
            plugins: [pinia, router]
        }
    });
    mountedWrappers.push(wrapper);
    await flushPromises();
    if (options.returnRouter) {
        return { wrapper, router };
    }
    if (options.returnStore) {
        return { wrapper, store: useDocumentProfileStore(pinia) };
    }
    return wrapper;
}

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
