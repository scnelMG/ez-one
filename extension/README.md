# EZ-ONE Chrome Extension

EZ-ONE Chrome Extension은 채용 공고 페이지에서 공고 정보를 읽고, 사용자가 확인/수정한 뒤 EZ-ONE 장바구니에 저장하는 확장 프로그램입니다.

## P1 범위

- 로그인하지 않은 사용자는 먼저 EZ-ONE 웹 로그인으로 연결합니다.
- 로그인 후 `공고 저장하기`와 `서류 정보 입력하기` 기능을 제공합니다.
- P1 배포 기준에서는 공고 저장과 지원 페이지 입력 보조를 모두 테스트하되, 자동 입력은 지원 사이트 DOM 변화에 취약하므로 실제 지원 전 사용자 확인이 필요합니다.
- Jasoseol.com 공고에서 회사명, 공고명, 마감일, 원문 URL, 직무 후보, 자기소개서 문항을 추출합니다.
- 저장 전 회사명, 공고명, 마감일을 사용자가 수정할 수 있습니다.
- 직무 후보는 다중 선택할 수 있고, 선택한 직무별로 장바구니 저장을 요청합니다.

## 실행 명령

```powershell
npm install
npm run test
npm run build
npm run build:local
```

## Chrome에서 직접 테스트

1. `C:\ez-one\extension`에서 `npm run build:local`을 실행합니다.
2. Chrome 주소창에서 `chrome://extensions`를 엽니다.
3. 오른쪽 위 `개발자 모드`를 켭니다.
4. `압축해제된 확장 프로그램을 로드합니다`를 누릅니다.
5. `C:\ez-one\extension\dist` 폴더를 선택합니다.
6. Jasoseol.com 공고 페이지에서 `EZ-ONE Job Saver` 아이콘을 누릅니다.

실제 저장까지 확인하려면 EZ-ONE 웹 앱은 `http://localhost:5173`, API는 `http://localhost:8080/api`에서 실행 중이어야 합니다.

로컬 unpacked 확장 ID는 manifest key로 고정되어 있으며 `ikpeibohnopmikegoogggmdipmhmiadi`입니다. Frontend는 `VITE_EXTENSION_ID`가 비어 있으면 이 ID를 기본값으로 사용해 로그인 세션을 확장 프로그램에 전달합니다.

## Production Build

운영용 확장 artifact는 로컬 `.env`를 임의로 읽지 않도록 release packaging script에서 검증된 production env를 주입해 빌드합니다.

```powershell
.\scripts\package-release-artifacts.ps1 -ReleaseId <release-id> -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
```

운영 manifest는 local HTTP 권한, wildcard extension origin, broad `web_accessible_resources`를 포함하지 않아야 합니다.

## Zip 패키지 생성

```powershell
npm run package
```

명령을 실행하면 `extension/ez-one-extension.zip`이 생성됩니다. Chrome 웹스토어 업로드나 검수용 패키지이며, 로컬 테스트는 `dist/` 폴더 로드가 더 빠릅니다.

## 문서

- 요구사항: `../docs/04_requirements.md`
- 화면 설계: `../docs/09_screen-design.md`
- 기능 명세: `../docs/10_feature-spec.md`
- API 계약: `../docs/13_api-spec.md`
- 배포 초심자 가이드: `../docs/41_beginner-deployment-guide.md`
- 운영 배포 런북: `../docs/39_production-deployment-runbook.md`
