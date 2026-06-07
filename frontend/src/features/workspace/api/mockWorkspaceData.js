const workspaceDefaults = {
    sourceUrl: 'https://www.jasoseol.com/',
    questions: [
        {
            id: 'q-1',
            prompt: '지원 동기와 입사 후 기여 계획을 작성하세요.',
            draft: '서비스 사용 경험을 개선한 경험과 안정적인 백엔드 설계 경험을 바탕으로 제품 속도에 기여하겠습니다.',
            maxLength: 1000
        }
    ],
    references: [
        {
            id: 'r-1',
            type: 'JD',
            title: '채용 공고 핵심 요구사항'
        },
        {
            id: 'r-2',
            type: 'FREE_MEMO',
            title: '지원 전략 메모'
        }
    ]
};

const companyDetails = {
    naver: {
        domain: 'navercorp.com',
        companyType: '대기업',
        size: '대기업',
        rating: null,
        startingSalary: null,
        logoUrl: logoUrlFor('navercorp.com')
    },
    kakaopay: {
        domain: 'kakaopay.com',
        companyType: '대기업',
        size: '대기업',
        rating: null,
        startingSalary: null,
        logoUrl: logoUrlFor('kakaopay.com')
    },
    toss: {
        domain: 'toss.im',
        companyType: '스타트업',
        size: '대기업',
        rating: null,
        startingSalary: null,
        logoUrl: logoUrlFor('toss.im')
    },
    line: {
        domain: 'line.me',
        companyType: '대기업',
        size: '대기업',
        rating: null,
        startingSalary: null,
        logoUrl: logoUrlFor('line.me')
    },
    daangn: {
        domain: 'daangn.com',
        companyType: '스타트업',
        size: '중견기업',
        rating: null,
        startingSalary: null,
        logoUrl: logoUrlFor('daangn.com')
    }
};

export const mockWorkspaces = {
    '102': {
        id: '102',
        companyName: '네이버',
        positionTitle: '백엔드 개발자',
        deadlineLabel: '2026.06.11',
        statusLabel: '진행 중',
        companyDetails: companyDetails.naver,
        ...workspaceDefaults
    },
    '105': {
        id: '105',
        companyName: '카카오페이',
        positionTitle: '서버 개발자',
        deadlineLabel: '2026.06.20',
        statusLabel: '지원 전',
        companyDetails: companyDetails.kakaopay,
        ...workspaceDefaults
    },
    '108': {
        id: '108',
        companyName: '토스',
        positionTitle: '프론트엔드 엔지니어',
        deadlineLabel: '2026.06.23',
        statusLabel: '지원 완료',
        companyDetails: companyDetails.toss,
        ...workspaceDefaults
    },
    '111': {
        id: '111',
        companyName: 'LINE',
        positionTitle: '플랫폼 엔지니어',
        deadlineLabel: '2026.06.28',
        statusLabel: '지원 전',
        companyDetails: companyDetails.line,
        ...workspaceDefaults
    },
    '114': {
        id: '114',
        companyName: '당근',
        positionTitle: '프로덕트 백엔드 개발자',
        deadlineLabel: '2026.06.30',
        statusLabel: '진행 중',
        companyDetails: companyDetails.daangn,
        ...workspaceDefaults
    }
};

function logoUrlFor(domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
