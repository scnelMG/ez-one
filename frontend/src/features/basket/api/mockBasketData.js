export const mockBasketJobs = [
    {
        id: '101',
        companyName: '네이버',
        positionTitle: '백엔드 개발자',
        status: 'IN_PROGRESS',
        statusLabel: '진행 중',
        deadlineLabel: '2026.06.11',
        deadlineDate: '2026-06-11',
        deadlineSoon: true,
        companyLogoUrl: logoUrlFor('navercorp.com'),
        workspaceId: '102',
        sourceUrl: 'https://www.jasoseol.com/',
        applicationMemo: ''
    },
    {
        id: '104',
        companyName: '카카오페이',
        positionTitle: '서버 개발자',
        status: 'NOT_STARTED',
        statusLabel: '지원 전',
        deadlineLabel: '2026.06.20',
        deadlineDate: '2026-06-20',
        deadlineSoon: true,
        companyLogoUrl: logoUrlFor('kakaopay.com'),
        workspaceId: '105',
        sourceUrl: 'https://www.jasoseol.com/',
        applicationMemo: ''
    },
    {
        id: '107',
        companyName: '토스',
        positionTitle: '프론트엔드 엔지니어',
        status: 'SUBMITTED',
        statusLabel: '지원 완료',
        deadlineLabel: '2026.06.23',
        deadlineDate: '2026-06-23',
        deadlineSoon: false,
        companyLogoUrl: logoUrlFor('toss.im'),
        workspaceId: '108',
        sourceUrl: 'https://www.jasoseol.com/',
        applicationMemo: ''
    },
    {
        id: '110',
        companyName: 'LINE',
        positionTitle: '플랫폼 엔지니어',
        status: 'NOT_STARTED',
        statusLabel: '지원 전',
        deadlineLabel: '2026.06.28',
        deadlineDate: '2026-06-28',
        deadlineSoon: false,
        companyLogoUrl: logoUrlFor('line.me'),
        workspaceId: '111',
        sourceUrl: 'https://www.jasoseol.com/',
        applicationMemo: ''
    },
    {
        id: '113',
        companyName: '당근',
        positionTitle: '프로덕트 백엔드 개발자',
        status: 'IN_PROGRESS',
        statusLabel: '진행 중',
        deadlineLabel: '2026.06.30',
        deadlineDate: '2026-06-30',
        deadlineSoon: false,
        companyLogoUrl: logoUrlFor('daangn.com'),
        workspaceId: '114',
        sourceUrl: 'https://www.jasoseol.com/',
        applicationMemo: ''
    }
];

function logoUrlFor(domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
