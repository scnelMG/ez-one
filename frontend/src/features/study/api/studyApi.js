import { defaultHttpClient as apiClient } from '@/shared/apiClient';

export const studyApi = {
  async getMyStudies() {
    const { data } = await apiClient.get('/api/study/my');
    return data;
  },

  async createStudy(studyData) {
    const { data } = await apiClient.post('/api/study', studyData);
    return data;
  },

  async getStudyDetail(studyId) {
    const { data } = await apiClient.get(`/api/study/${studyId}`);
    return data;
  },

  async inviteMember(studyId, email) {
    const { data } = await apiClient.post(`/api/study/${studyId}/invite`, { inviteeEmail: email });
    return data;
  },

  async getMyInvites() {
    // 백엔드 API 부재로 빈 배열 리턴
    return [];
  },

  async respondToInvite(inviteId, accept) {
    // 백엔드 API 부재
    console.log(`응답: ${accept}`);
    return {};
  },

  async getSharedEssays(studyId) {
    const { data } = await apiClient.get(`/api/study/${studyId}/essays`);
    return data;
  },

  async shareEssay(studyId, workspaceId, versionIds) {
    const { data } = await apiClient.post(`/api/study/${studyId}/essay`, {
      workspaceId,
      versionIds
    });
    return data;
  },

  async getSharedEssayDetail(studyId, sharedEssayId) {
    const { data } = await apiClient.get(`/api/study/${studyId}/essay/${sharedEssayId}`);
    return data;
  },

  async addEssayFeedback(studyId, sharedEssayId, content) {
    const { data } = await apiClient.post(`/api/study/${studyId}/essay/${sharedEssayId}/feedback`, { content });
    return data;
  },

  async getEssayFeedbacks(sharedEssayId) {
    const { data } = await apiClient.get(`/api/study/essays/${sharedEssayId}/feedbacks`);
    return data;
  },

  async leaveFeedback(sharedEssayId, content) {
    const { data } = await apiClient.post(`/api/study/essays/${sharedEssayId}/feedbacks`, { content });
    return data;
  },

  async getSharedJobs(studyId) {
    const { data } = await apiClient.get(`/api/study/${studyId}/jobs`);
    return data;
  },

  async recommendJob(studyId, jobData) {
    const { data } = await apiClient.post(`/api/study/${studyId}/job`, jobData);
    return data;
  },

  async uploadStudyImage(studyId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/study/${studyId}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};
