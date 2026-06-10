import { apiClient } from '@/shared/apiClient';

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
    // 백엔드 API 부재로 목업 데이터 리턴 (추후 백엔드 GET /api/study/{id} 구현 필요)
    return {
      id: studyId,
      name: '임시 스터디 상세',
      description: '로딩된 임시 스터디입니다.',
      members: [
        { id: '1', userEmail: 'leader@example.com', role: 'LEADER', activeJobCount: 5 },
        { id: '2', userEmail: 'member@example.com', role: 'MEMBER', activeJobCount: 2 }
      ]
    };
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
    // 백엔드 API 부재로 빈 배열 리턴
    return [];
  },

  async shareEssay(studyId, workspaceId, versionId) {
    const { data } = await apiClient.post(`/api/study/${studyId}/essay`, { workspaceId, versionId });
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
    // 백엔드 API 부재로 빈 배열 리턴
    return [];
  },

  async recommendJob(studyId, jobData) {
    const { data } = await apiClient.post(`/api/study/${studyId}/job`, jobData);
    return data;
  }
};
