import { defineStore } from 'pinia';
import { studyApi } from '@/features/study/api/studyApi';

export const useStudyStore = defineStore('study', {
  state: () => ({
    myStudies: [],
    myInvites: [],
    currentStudy: null,
    sharedEssays: [],
    sharedJobs: [],
    currentSharedEssayDetail: null,
    status: 'idle',
    errorMessage: ''
  }),
  actions: {
    async loadMyStudies() {
      try {
        this.status = 'loading';
        const [studies, invites] = await Promise.all([
          studyApi.getMyStudies(),
          studyApi.getMyInvites()
        ]);
        this.myStudies = studies;
        this.myInvites = invites;
        this.status = 'ready';
      } catch (error) {
        this.status = 'error';
        this.errorMessage = error.response?.data?.message || '스터디 목록을 불러오는 중 오류가 발생했습니다.';
      }
    },

    async createStudy(name, description) {
      try {
        const study = await studyApi.createStudy({ name, description });
        this.myStudies.push(study);
        return study;
      } catch (error) {
        throw new Error(error.response?.data?.message || '스터디 생성 실패');
      }
    },

    async loadStudyDetail(studyId) {
      try {
        this.status = 'loading';
        const study = await studyApi.getStudyDetail(studyId);
        this.currentStudy = study;
        this.status = 'ready';
      } catch (error) {
        this.status = 'error';
        this.errorMessage = error.response?.data?.message || '스터디 정보를 불러오는 중 오류가 발생했습니다.';
      }
    },

    async respondToInvite(inviteId, accept) {
      try {
        await studyApi.respondToInvite(inviteId, accept);
        await this.loadMyStudies(); // 새로고침
      } catch (error) {
        throw new Error(error.response?.data?.message || '초대 응답 실패');
      }
    },

    async loadSharedEssays(studyId) {
      try {
        this.sharedEssays = await studyApi.getSharedEssays(studyId);
      } catch (error) {
        console.error('Failed to load shared essays', error);
      }
    },

    async loadSharedJobs(studyId) {
      try {
        this.sharedJobs = await studyApi.getSharedJobs(studyId);
      } catch (error) {
        console.error('Failed to load shared jobs', error);
      }
    },

    async loadSharedEssayDetail(studyId, sharedEssayId) {
      try {
        this.status = 'loading';
        const detail = await studyApi.getSharedEssayDetail(studyId, sharedEssayId);
        this.currentSharedEssayDetail = detail;
        this.status = 'ready';
      } catch (error) {
        this.status = 'error';
        this.errorMessage = error.response?.data?.message || '자소서 상세 정보를 불러오는 중 오류가 발생했습니다.';
      }
    },

    async addEssayFeedback(studyId, sharedEssayId, content) {
      try {
        await studyApi.addEssayFeedback(studyId, sharedEssayId, content);
        await this.loadSharedEssayDetail(studyId, sharedEssayId); // 새로고침
      } catch (error) {
        throw new Error(error.response?.data?.message || '피드백 작성 실패');
      }
    },
    async uploadStudyImage(studyId, file) {
      this.status = 'saving';
      try {
        await studyApi.uploadStudyImage(studyId, file);
        this.status = 'ready';
      } catch (error) {
        this.status = 'error';
        this.errorMessage = error.message;
        throw error;
      }
    }
  }
});
