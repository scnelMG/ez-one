import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { basketApi } from '@/features/basket/api/basketApi';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import { profileApi } from '@/features/profile/api/profileApi';
import { recommendationApi } from '@/features/recommendations/api/recommendationApi';
import MainPage from './MainPage.vue';

vi.mock('@/features/basket/api/basketApi', () => ({
  basketApi: {
    listJobs: vi.fn(),
    updateStatus: vi.fn(),
    archiveJob: vi.fn(),
    createJob: vi.fn()
  }
}));

vi.mock('@/features/dashboard/api/dashboardApi', () => ({
  dashboardApi: {
    getSummary: vi.fn(),
    getActivities: vi.fn(),
    getActivityLogs: vi.fn()
  }
}));

vi.mock('@/features/profile/api/profileApi', () => ({
  profileApi: {
    getUserProfile: vi.fn(),
    saveUserProfile: vi.fn()
  }
}));

vi.mock('@/features/recommendations/api/recommendationApi', () => ({
  recommendationApi: {
    listMattermostJobs: vi.fn(),
    saveMattermostJob: vi.fn()
  }
}));

const basketJobs = [
  job('101', 'Naver', 'Backend Engineer', 'IN_PROGRESS', '진행 중', '2026-06-08', '102', {
    progressPercent: 33,
    updatedAt: '2026-06-22T15:59:00'
  }),
  job('104', 'KakaoPay', 'Server Developer', 'READY', '지원 전', '2026-06-12', '105'),
  job('106', 'Line', 'Frontend Engineer', 'NOT_APPLIED', '초안 없음', '2026-06-20', '108'),
  job('107', 'Toss', 'Frontend Developer', 'COMPLETED', '제출 완료', '2026-06-25', '109'),
  job('108', 'Planet', 'Frontend Developer With A Very Long Title', 'READY', '지원 전', '2026-06-27', '110'),
  job('109', 'Overflow', 'Java Backend Engineer', 'IN_PROGRESS', '진행 중', '2026-06-30', '111')
];

const makeRouter = () => createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div>main</div>' } },
    { path: '/main', component: MainPage },
    { path: '/login', component: { template: '<div>login</div>' } },
    { path: '/basket', component: { template: '<div>basket</div>' } },
    { path: '/mypage', component: { template: '<div>mypage</div>' } },
    { path: '/study', component: { template: '<div>study</div>' } },
    { path: '/study/:studyId', component: { template: '<div>study detail</div>' } },
    { path: '/workspaces/:workspaceId', component: { template: '<div>workspace</div>' } },
    { path: '/history', component: { template: '<div>history</div>' } },
    { path: '/document-profile', component: { template: '<div>document profile</div>' } },
    { path: '/mypage/notion', component: { template: '<div>notion</div>' } },
    { path: '/mypage/terms', component: { template: '<div>terms</div>' } },
    { path: '/mypage/partnership', component: { template: '<div>partnership</div>' } },
    { path: '/recommendations/mattermost', component: { template: '<div>mattermost</div>' } }
  ]
});

describe('MainPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('ezone.currentUser', JSON.stringify({
      id: 1,
      email: 'user@example.com',
      name: '박민규',
      nickname: '민규',
      profileCompleted: true
    }));

    vi.mocked(basketApi.listJobs).mockReset();
    vi.mocked(basketApi.listJobs).mockResolvedValue(basketJobs);
    vi.mocked(basketApi.archiveJob).mockReset();
    vi.mocked(basketApi.archiveJob).mockResolvedValue(undefined);
    vi.mocked(basketApi.updateStatus).mockReset();
    vi.mocked(basketApi.updateStatus).mockResolvedValue({
      ...basketJobs[0],
      status: 'COMPLETED',
      statusLabel: '제출 완료'
    });
    vi.mocked(basketApi.createJob).mockReset();

    vi.mocked(dashboardApi.getSummary).mockReset();
    vi.mocked(dashboardApi.getSummary).mockResolvedValue({
      summary: {
        totalApplications: 6,
        inProgress: 2,
        notStarted: 2,
        deadlineSoon: 2
      },
      todayJobs: []
    });
    vi.mocked(dashboardApi.getActivities).mockReset();
    vi.mocked(dashboardApi.getActivities).mockResolvedValue([
      { date: '2026-06-20', score: 4 }
    ]);
    vi.mocked(dashboardApi.getActivityLogs).mockReset();
    vi.mocked(dashboardApi.getActivityLogs).mockResolvedValue([]);

    vi.mocked(profileApi.getUserProfile).mockReset();
    vi.mocked(profileApi.getUserProfile).mockResolvedValue({
      desiredRoles: [],
      companyTypes: [],
      industries: [],
      regions: [],
      skills: [],
      ssafy: false,
      completed: true
    });
    vi.mocked(profileApi.saveUserProfile).mockReset();
    vi.mocked(profileApi.saveUserProfile).mockResolvedValue({
      desiredRoles: ['프론트엔드'],
      companyTypes: ['중견기업'],
      industries: ['IT/플랫폼'],
      regions: ['서울'],
      skills: ['Vue'],
      ssafy: false,
      completed: true
    });

    vi.mocked(recommendationApi.listMattermostJobs).mockReset();
    vi.mocked(recommendationApi.listMattermostJobs).mockResolvedValue([]);
    vi.mocked(recommendationApi.saveMattermostJob).mockReset();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('DASH-001: renders the new dashboard hero without changing global navigation links', async () => {
    const wrapper = await mountMain();

    expect(wrapper.findAll('.primary-nav a').map((link) => link.attributes('href'))).toEqual([
      '/basket',
      '/document-profile',
      '/study',
      '/history'
    ]);
    expect(wrapper.get('[data-testid="main-dashboard-hero"]').text()).toContain('오늘의 지원 현황');
    expect(wrapper.find('.main-kicker').exists()).toBe(false);
    expect(wrapper.get('[data-testid="metric-total"]').text()).toContain('전체 공고');
    expect(wrapper.get('[data-testid="metric-total"]').text()).toContain('6');
    expect(wrapper.get('[data-testid="metric-not-started"]').text()).toContain('지원 전');
    expect(wrapper.get('[data-testid="metric-progress"]').text()).toContain('진행 중');
    expect(wrapper.get('[data-testid="metric-deadline"]').text()).toContain('마감 임박');
    expect(wrapper.findAll('[data-testid="main-metric-icon"]')).toHaveLength(4);
    expect(wrapper.findAll('.main-metric-card.metric-lift-card')).toHaveLength(4);
    expect(wrapper.findAll('[data-testid="metric-helper"]').map((helper) => helper.text())).toEqual([
      '저장 총합',
      '지원 전 공고',
      '작성 중 지원서',
      '일주일 이내'
    ]);
    expect(wrapper.get('[data-testid="metric-progress"]').text()).not.toContain('자소서 작성 또는 서류 준비 중');
  });

  it('renders the application character inside the hero frame', async () => {
    const wrapper = await mountMain();
    const image = wrapper.get('[data-testid="main-character-image"]');

    expect(image.attributes('alt')).toBe('지원 현황을 들고 있는 EZ-ONE 캐릭터');
    expect(image.attributes('src')).toContain('bee-backpack-main');
    expect(image.classes()).toContain('hero-face-character');
  });

  it('shows a focused draft card from the recently visited workspace first', async () => {
    localStorage.setItem('ezone.recentWorkspaces', JSON.stringify(['102']));
    const wrapper = await mountMain();
    const draftCard = wrapper.get('[data-testid="active-application-card"]');

    expect(draftCard.text()).toContain('Naver');
    expect(draftCard.text()).toContain('Backend Engineer');
    expect(draftCard.text()).toContain('33%');
    expect(draftCard.text().match(/33%/g)).toHaveLength(1);
    expect(wrapper.get('[data-testid="active-application-link"]').attributes('href')).toBe('/workspaces/102');
  });

  it('sorts the main basket preview by the nearest deadline even when D-day labels are mixed with dates', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-24T09:00:00+09:00'));
    vi.mocked(basketApi.listJobs).mockResolvedValueOnce([
      job('201', 'D Six', 'Backend Engineer', 'READY', '지원 전', '2026-06-30', '201', {
        deadlineDate: null,
        deadlineLabel: 'D-6'
      }),
      job('202', 'Tomorrow', 'Frontend Engineer', 'READY', '지원 전', '2026-06-25', '202'),
      job('203', 'Today', 'Data Engineer', 'READY', '지원 전', '2026-06-24', '203', {
        deadlineDate: null,
        deadlineLabel: '오늘'
      }),
      job('204', 'Korean Date', 'Planner', 'READY', '지원 전', '2026-06-30', '204', {
        deadlineDate: null,
        deadlineLabel: '2026년 6월 30일 23:59'
      })
    ]);

    const wrapper = await mountMain();

    expect(wrapper.findAll('[data-testid="main-basket-company"] strong').map((item) => item.text())).toEqual([
      'Today',
      'Tomorrow',
      'D Six',
      'Korean Date'
    ]);
    vi.useRealTimers();
  });

  it('renders the study panel and the responsive application list', async () => {
    const wrapper = await mountMain();

    expect(wrapper.get('[data-testid="study-panel"]').text()).toContain('취업 스터디');
    expect(wrapper.get('[data-testid="study-panel"]').text()).not.toContain('입장');
    expect(wrapper.get('[data-testid="study-panel"]').text()).not.toContain('이어서 하기');
    const studyLinks = wrapper.findAll('[data-testid="study-card-link"]');
    expect(studyLinks).toHaveLength(2);
    expect(studyLinks.map((link) => link.classes())).toEqual([
      expect.arrayContaining(['primary-gradient-action', 'compact-action']),
      expect.arrayContaining(['primary-gradient-action', 'compact-action'])
    ]);
    expect(studyLinks.map((link) => link.text())).toEqual(['›', '›']);
    expect(wrapper.findAll('[data-testid="study-stat-tag"]').map((tag) => tag.text())).toEqual([
      '공유 자소서 4개',
      '추천 공고 2개',
      '새 피드백 3개',
      '진행중 공고 7개',
      '새 피드백 1개'
    ]);
    expect(studyLinks.map((link) => link.attributes('href'))).toEqual(['/study/data-job-prep', '/study/service-interview']);
    expect(wrapper.get('[data-testid="study-more-link"]').attributes('href')).toBe('/study');
    expect(wrapper.get('[data-testid="basket-panel"]').text()).toContain('공고 장바구니');
    expect(wrapper.get('[data-testid="basket-panel"]').text()).not.toContain('지원 공고 리스트');
    expect(wrapper.get('[data-testid="basket-panel"]').classes()).toContain('basket-panel');
    expect(wrapper.get('[data-testid="basket-panel"]').classes()).toEqual(
      expect.arrayContaining(['full-width-panel', 'compact-basket-panel'])
    );
    expect(wrapper.get('.main-section-heading.compact').classes()).toContain('basket-section-heading');
    expect(wrapper.findAll('.main-basket-head span').map((cell) => cell.text())).toEqual([
      '관심',
      '회사명',
      '직무',
      '상태',
      '마감일',
      '바로가기',
      ''
    ]);
    expect(wrapper.get('[data-testid="basket-panel"]').text()).not.toContain('자소서 상태');
    expect(wrapper.findAll('[data-testid="main-basket-preview-job"]')).toHaveLength(5);
    expect(wrapper.get('[data-testid="main-basket-company"]').text()).toContain('Naver');
    expect(wrapper.get('[data-testid="main-basket-apply-link"]').text()).toBe('공고 보기');
    expect(wrapper.get('.main-basket-head span:first-child').classes()).toContain('interest-head-cell');
    expect(wrapper.get('[data-testid="main-basket-company"]').classes()).toContain('company-cell');
    expect(wrapper.get('.main-basket-position').classes()).toContain('text-start-cell');
    expect(wrapper.get('.status-menu').classes()).toContain('center-cell');
    expect(wrapper.get('.deadline-cell').classes()).toContain('deadline-align-cell');
    expect(wrapper.get('.deadline-cell').classes()).toContain('center-cell');
    expect(wrapper.get('.deadline-cell .deadline-pill').exists()).toBe(true);
    expect(wrapper.get('.deadline-cell').text()).toMatch(/D[+-]\d+|D-Day|오늘|마감/);
    expect(wrapper.get('[data-testid="main-basket-apply-link"]').classes()).toContain('center-cell');
    expect(wrapper.get('[data-testid="main-priority-101"]').attributes('aria-pressed')).toBe('false');
    await wrapper.get('[data-testid="main-priority-101"]').trigger('click');
    expect(wrapper.get('[data-testid="main-priority-101"]').classes()).toContain('active');
    expect(wrapper.get('[data-testid="main-priority-101"]').attributes('aria-pressed')).toBe('true');
  });

  it('uses rich CTA buttons and shows the honey guide inline', async () => {
    const wrapper = await mountMain();

    const basketCta = wrapper.get('[data-testid="hero-basket-link"]');
    expect(basketCta.classes()).toEqual(expect.arrayContaining(['hero-side-cta', 'primary-gradient-action']));
    expect(basketCta.classes()).not.toContain('basket-outline-action');
    expect(wrapper.get('.main-metric-toolbar').text()).toContain('지원 현황 요약');
    expect(wrapper.get('.main-metric-toolbar').text()).not.toContain('공고 장바구니 바로가기');
    expect(basketCta.text()).toContain('공고 장바구니 바로가기');
    expect(basketCta.text()).toContain('›');
    expect(wrapper.findAll('[data-testid="study-card-link"]')).toHaveLength(2);

    const honeyPanel = wrapper.get('[data-testid="honey-panel"]');
    expect(honeyPanel.text()).toContain('꿀통 채우기');
    expect(honeyPanel.text()).toContain('나의 꿀 수집 현황');
    expect(honeyPanel.text()).toContain('최근 6개월 모은 꿀');
    expect(honeyPanel.text()).toContain('어떻게 채우나요?');
    expect(honeyPanel.text()).toContain('지원 상태 업데이트');
    expect(honeyPanel.text()).not.toContain('점수 기준표 보기');
    expect(wrapper.find('[data-testid="honey-character-strip"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="honey-log-character"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="honey-log-side-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="honey-log-placeholder"]').exists()).toBe(true);
    const honeyCharacter = wrapper.get('[data-testid="honey-status-character"]');
    expect(honeyCharacter.attributes('src')).toContain('bee-honey-jar-cutout');
    expect(wrapper.findAll('.honey-pot-week').length).toBeLessThanOrEqual(27);
  });

  it('shows honey score reason logs in the graph-side panel after clicking a honey day', async () => {
    vi.mocked(dashboardApi.getActivityLogs).mockResolvedValueOnce([
      {
        time: '09:10',
        type: 'BASKET_ADD',
        description: 'KB국민은행 공고 장바구니에 담기'
      },
      {
        time: '10:20',
        type: 'STATUS_CHANGE',
        description: 'KB국민은행 지원 상태 변경'
      }
    ]);

    const wrapper = await mountMain();
    const scoredDayButton = wrapper
      .findAll('[data-testid="honey-day-button"]')
      .find((button) => button.classes().includes('level-4') && !button.classes().includes('future'));

    expect(scoredDayButton).toBeTruthy();
    await scoredDayButton.trigger('click');
    await flushPromises();

    expect(dashboardApi.getActivityLogs).toHaveBeenCalledWith('2026-06-20');
    const sidePanel = wrapper.get('[data-testid="honey-log-side-panel"]');
    expect(sidePanel.get('[data-testid="honey-score-log"]').text()).toContain('4방울을 받은 이유');
    expect(sidePanel.text()).toContain('KB국민은행 공고 장바구니에 담기');
    expect(sidePanel.text()).toContain('KB국민은행 지원 상태 변경');
    expect(wrapper.find('.honey-pot-details').exists()).toBe(false);
  });

  it('does not invent score-summary logs when a scored day has no activity logs', async () => {
    vi.mocked(dashboardApi.getActivityLogs).mockResolvedValueOnce([]);

    const wrapper = await mountMain();
    const scoredDayButton = wrapper
      .findAll('[data-testid="honey-day-button"]')
      .find((button) => button.classes().includes('level-4') && !button.classes().includes('future'));

    expect(scoredDayButton).toBeTruthy();
    await scoredDayButton.trigger('click');
    await flushPromises();

    const sidePanel = wrapper.get('[data-testid="honey-log-side-panel"]');
    expect(sidePanel.text()).toContain('4방울을 받은 이유');
    expect(sidePanel.text()).not.toContain('점수 요약');
    expect(sidePanel.text()).not.toContain('상세 로그가 아직 비어 있어요');
    expect(sidePanel.text()).toContain('기록된 활동이 없어요');
  });

  it('JOB-010: updates status from the main application list', async () => {
    const wrapper = await mountMain();

    await wrapper.get('[data-testid="main-status-101"]').trigger('click');
    expect([...wrapper.get('[data-testid="main-status-101"]').element.closest('.main-basket-row').classList]).toContain(
      'status-menu-row-open'
    );
    expect(wrapper.get('[data-testid="main-status-101-option-COMPLETED"]').element.closest('.status-option-list')).toBeTruthy();
    await wrapper.get('[data-testid="main-status-101-option-COMPLETED"]').trigger('click');
    await flushPromises();

    expect(basketApi.updateStatus).toHaveBeenCalledWith('101', 'COMPLETED');
    expect(wrapper.get('[data-testid="main-status-101"]').text()).toBe('제출 완료');
  });

  it('JOB-008: prompts confirm and reloads summary stats after deleting a job', async () => {
    const wrapper = await mountMain();
    vi.mocked(basketApi.archiveJob).mockClear();
    vi.mocked(dashboardApi.getSummary).mockClear();

    await wrapper.get('[data-testid="main-archive-101"]').trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalledWith('Naver Backend Engineer 공고를 삭제하시겠습니까?');
    expect(basketApi.archiveJob).toHaveBeenCalledWith('101');
    expect(dashboardApi.getSummary).toHaveBeenCalled();
  });

  it('does not call Mattermost recommendations from the main page and keeps honey colors delegated', async () => {
    const wrapper = await mountMain();

    expect(recommendationApi.listMattermostJobs).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="main-recommendation-preview-job"]').exists()).toBe(false);
    expect(wrapper.find('.honey-pot-graph-container').exists()).toBe(true);
    expect(wrapper.find('.honey-pot-cell.level-0').exists()).toBe(true);
  });

  it('opens onboarding only for first-login users', async () => {
    localStorage.setItem('ezone.currentUser', JSON.stringify({
      id: 1,
      email: 'first@example.com',
      name: 'First User',
      nickname: '',
      profileCompleted: false,
      onboardingRequired: true
    }));
    const wrapper = await mountMain();

    expect(wrapper.find('[data-testid="onboarding-modal"]').exists()).toBe(true);
    await wrapper.get('[data-testid="onboarding-skill-input"]').setValue('Vue');
    await wrapper.get('[data-testid="onboarding-skill-input"]').trigger('keyup.enter');
    await wrapper.get('[data-testid="save-onboarding"]').trigger('click');
    await flushPromises();
    expect(profileApi.saveUserProfile).toHaveBeenCalledWith(expect.objectContaining({
      skills: expect.arrayContaining(['Vue'])
    }));
    expect(wrapper.find('[data-testid="onboarding-modal"]').exists()).toBe(false);
  });
});

async function mountMain() {
  const router = makeRouter();
  router.push('/main');
  await router.isReady();
  const wrapper = mount(MainPage, {
    global: {
      plugins: [createPinia(), router]
    }
  });
  await flushPromises();
  return wrapper;
}

function job(id, companyName, positionTitle, status, statusLabel, deadlineDate, workspaceId, overrides = {}) {
  return {
    id,
    companyName,
    positionTitle,
    status,
    statusLabel,
    deadlineLabel: deadlineDate.replaceAll('-', '.'),
    deadlineDate,
    deadlineSoon: deadlineDate <= '2026-06-12',
    workspaceId,
    sourceUrl: `https://www.jasoseol.com/recruit/${id}`,
    ...overrides
  };
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve));
}
