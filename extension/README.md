# EZ One Chrome Extension

채용 공고를 추출하고, 미리보기 후 EZ One 공고함에 저장하기 위한 Chrome Extension이다.

## 역할

- 서비스 로그인/세션 상태 확인
- 지원 대상 채용 사이트의 공고 데이터 추출
- 저장 전 추출 데이터 미리보기 제공
- backend API를 통해 공고함에 저장
- 디버깅과 품질 확인을 위한 extension event 기록

## P1 범위

- 첫 지원 사이트는 Jasoseol.com부터 시작한다.
- 공고 기본 정보와 자기소개서 문항을 추출한다.
- 사용자는 저장 전 추출 결과를 확인한다.
- 필수 정보가 부족하면 조용히 저장하지 않고 보완이 필요하다는 상태를 보여준다.
- 저장 성공 후 공고함과 워크스페이스 이동 경로를 제공한다.

## P2 예약 범위

- 서류 입력 정보 기반 외부 지원서 자동 입력
- 실패 입력 필드 복사/다운로드 보조
- 채용 사이트별 입력 selector 고도화

## 실행 명령

```powershell
npm install
npm run build
npm run test
```

로컬 확인 시 생성된 `dist/` 디렉터리를 Chrome 확장 프로그램 개발자 모드에서 로드한다.

## 문서

- extension 동작: `../docs/10_feature-spec.md`, `../docs/09_screen-design.md`
- API 계약: `../docs/13_api-spec.md`
- 데이터/개인정보 규칙: `../AGENTS.md`
