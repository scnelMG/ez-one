import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';
import { logoUrlFor, resolveCompanyLogoUrl } from '@/features/jobs/companyLogo';
export function createRecommendationApi(httpClient = defaultHttpClient) {
    return {
        async listJobs() {
            try {
                const response = await httpClient.get('/api/recommendations/jobs', readConfig(httpClient));
                return unwrapApiData(response.data).map(toRecommendationJob);
            } catch {
                return mockRecommendationJobs;
            }
        },
        async saveJob(recommendationId) {
            const response = await httpClient.post(`/api/recommendations/jobs/${recommendationId}/save`);
            const data = unwrapApiData(response.data);
            return {
                basketJobId: String(data.id),
                workspaceId: String(data.workspaceId),
                companyName: data.companyName,
                positionTitle: data.positionTitle
            };
        }
    };
}
function toRecommendationJob(dto) {
    return {
        id: String(dto.basketJobId),
        companyName: dto.companyName,
        positionTitle: dto.positionTitle,
        deadlineLabel: dto.deadlineLabel,
        deadlineDate: dto.deadlineDate ?? null,
        companyLogoUrl: resolveCompanyLogoUrl(dto),
        participantCount: dto.participantCount ?? dto.applicantCount ?? 0,
        workspaceId: dto.workspaceId == null ? null : String(dto.workspaceId)
    };
}
function readConfig(httpClient) {
    return httpClient === defaultHttpClient ? { skipAuthRefresh: true } : {};
}
export const recommendationApi = createRecommendationApi();

const mockRecommendationJobs = [
    {
        id: 'mock-rec-1',
        companyName: '우리은행',
        positionTitle: '일반 (하계 체험형)',
        deadlineLabel: '22시간 남음',
        deadlineDate: '2026-06-08',
        participantCount: 2135,
        companyLogoUrl: logoUrlFor('wooribank.com'),
        workspaceId: null
    },
    {
        id: 'mock-rec-2',
        companyName: 'SK하이닉스',
        positionTitle: '청년 Hy-Five 15기',
        deadlineLabel: '4일 남음',
        deadlineDate: '2026-06-11',
        participantCount: 485,
        companyLogoUrl: logoUrlFor('skhynix.com'),
        workspaceId: null
    },
    {
        id: 'mock-rec-3',
        companyName: '손해보험협회',
        positionTitle: '일반사무',
        deadlineLabel: '8시간 남음',
        deadlineDate: '2026-06-08',
        participantCount: 544,
        companyLogoUrl: logoUrlFor('knia.or.kr'),
        workspaceId: null
    },
    {
        id: 'mock-rec-4',
        companyName: '아이마켓코리아',
        positionTitle: '경영지원',
        deadlineLabel: '8시간 남음',
        deadlineDate: '2026-06-08',
        participantCount: 488,
        companyLogoUrl: logoUrlFor('imarketkorea.com'),
        workspaceId: null
    },
    {
        id: 'mock-rec-5',
        companyName: '롯데그룹',
        positionTitle: '[롯데월드] HR',
        deadlineLabel: '8일 남음',
        deadlineDate: '2026-06-15',
        participantCount: 1485,
        companyLogoUrl: logoUrlFor('lotte.co.kr'),
        workspaceId: null
    },
    {
        id: 'mock-rec-6',
        companyName: '홍익대학교',
        positionTitle: '일반행정 사무직(8급)',
        deadlineLabel: '8시간 남음',
        deadlineDate: '2026-06-08',
        participantCount: 150,
        companyLogoUrl: logoUrlFor('hongik.ac.kr'),
        workspaceId: null
    },
    {
        id: 'mock-rec-7',
        companyName: '인천공항시설관리',
        positionTitle: '정규직(신입)_경영지원',
        deadlineLabel: '2일 남음',
        deadlineDate: '2026-06-09',
        participantCount: 362,
        companyLogoUrl: logoUrlFor('airportfc.co.kr'),
        workspaceId: null
    },
    {
        id: 'mock-rec-8',
        companyName: '국가보안기술연구소',
        positionTitle: '행정직',
        deadlineLabel: '10일 남음',
        deadlineDate: '2026-06-17',
        participantCount: 194,
        companyLogoUrl: logoUrlFor('nsr.re.kr'),
        workspaceId: null
    }
];
