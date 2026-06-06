# EZ-ONE Chrome Extension

EZ-ONE Chrome Extension은 자소설닷컴 공고 페이지에서 공고 정보를 읽고, 사용자가 확인 및 수정한 뒤 EZ-ONE 장바구니에 저장하는 P1 확장프로그램이다.

## P1 범위

- 미로그인 사용자는 먼저 EZ-ONE 웹 로그인으로 연결한다.
- 로그인 후 `공고 저장하기`와 `서류 정보 입력하기` 중 기능을 선택한다.
- P1에서는 `공고 저장하기`만 활성화하고, `서류 정보 입력하기`는 P2 비활성 기능으로 둔다.
- 자소설닷컴 공고에서 회사명, 공고명, 마감일, 원문 URL, 직무 후보, 자소서 문항을 추출한다.
- 저장 전 회사명, 공고명, 마감일을 사용자가 수정할 수 있다.
- 직무 후보는 다중 선택할 수 있고, 선택한 직무별로 장바구니 저장을 요청한다.

## 실행 명령

```powershell
npm install
npm run test
npm run build
```

## Chrome에서 직접 테스트

1. `C:\ez-one\extension`에서 `npm run build`를 실행한다.
2. Chrome 주소창에서 `chrome://extensions`를 연다.
3. 오른쪽 위 `개발자 모드`를 켠다.
4. `압축해제된 확장 프로그램을 로드합니다`를 누른다.
5. `C:\ez-one\extension\dist` 폴더를 선택한다.
6. 자소설닷컴 공고 페이지에서 `EZ-ONE Job Saver` 아이콘을 누른다.

실제 저장까지 확인하려면 EZ-ONE 웹은 `http://localhost:5173`, API는 `http://localhost:8080/api`에서 실행되어야 한다.

## Zip 패키지 생성

```powershell
npm run package
```

명령을 실행하면 `extension/ez-one-extension.zip`이 생성된다. Chrome 웹스토어 업로드 전 검토용 패키지이며, 로컬 테스트는 `dist/` 폴더 로드가 더 빠르다.

## 문서

- 요구사항: `../docs/04_requirements.md`
- 화면 설계: `../docs/09_screen-design.md`
- 기능 명세: `../docs/10_feature-spec.md`
- API 계약: `../docs/13_api-spec.md`
