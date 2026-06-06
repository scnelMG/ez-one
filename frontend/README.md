# EZ-ONE Frontend

Vue 3 기반 웹 애플리케이션이다.

## 역할

- 사용자-facing 웹 화면 제공
- Vue Router 기반 P1 route shell 제공
- API client 관리
- 인증 상태, 공고함, 워크스페이스, 서류 정보 상태 관리
- Notion 연결 상태 화면 제공

## 현재 완료 범위

한국어 프론트 route shell이 `main`에 반영되어 있다.

| Route | 화면 | P1 상태 |
| --- | --- | --- |
| `/login` | Google 로그인 | 활성 shell |
| `/` | 온보딩 모달 | 최초 로그인 사용자에게만 메인 위 floating modal |
| `/` | 지원 현황 대시보드 | 활성 shell |
| `/basket` | 공고함 | 활성 shell |
| `/workspaces/:workspaceId` | 지원 워크스페이스 | 활성 shell |
| `/document-profile` | 서류 입력 정보 | 활성 shell |
| `/recommendations` | 추천공고 | 활성 shell |
| `/mypage` | 마이페이지 | 활성 shell |
| `/mypage/notion` | 노션 동기화 | 활성 shell |

P2 route인 `/history`, `/alerts`, `/basket/calendar`, `/mypage/support`는 등록하지 않는다.

## 디자인 기준

- 모든 사용자 화면 문구는 한국어로 작성한다.
- 로고의 보라색(`#6D4DFF`, `#7A5CFF`)과 네이비(`#111827`)를 포인트 색상으로 사용한다.
- 전체 UI는 흰색과 회색 기반의 간결한 서비스 화면으로 유지한다.
- P2 기능은 “예약” 또는 “비활성 경계”로만 표현하고 활성 기능처럼 만들지 않는다.

## 실행 명령

```powershell
npm install
npm run dev
npm run build
npm run test
```

## 검증

최근 프론트 route shell 검증:

- `npm run test`: 통과
- `npm run build`: 통과
- P2 전용 route 미등록 테스트 통과
- `frontend/src` 깨진 한글 문자열 검색 결과 없음

## 다음 작업

다음 추천 작업은 `DEV-ONB-001` 온보딩 프로필 저장/건너뛰기 구현이다.

프론트 시작점:

- 최초 로그인 온보딩은 별도 `/onboarding` 페이지가 아니라 `/` 메인 위 모달로 표시
- `/mypage`
- 프로필 API client
- 프로필 store

## 문서

- 화면 구조: `../docs/09_screen-design.md`
- API 계약: `../docs/13_api-spec.md`
- 에이전트 규칙: `../AGENTS.md`
