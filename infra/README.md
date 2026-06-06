# EZ-ONE Infra

배포와 운영 자산을 관리하는 디렉터리다.

## 초기 배포 가정

- AWS EC2 단일 서버 배포
- MySQL 데이터베이스 사용
- backend API와 frontend 정적 빌드는 같은 서버 또는 reverse proxy 뒤에서 제공
- secret은 환경 변수 또는 외부 secret 관리 수단으로 주입

## 규칙

- 운영 secret을 커밋하지 않는다.
- `.env.example`에는 실제 credential이나 위험한 기본 secret을 넣지 않는다.
- DB 변경은 migration 파일 또는 명시적인 schema 변경 기록으로 남긴다.
- 배포 스크립트는 실행 전 필요한 환경 변수를 문서화한다.

## 다음 작업

초기 배포 전 다음 항목을 확정한다.

- DB migration 도구 도입 여부
- EC2 reverse proxy 구성
- 운영 환경 변수 목록
- build artifact 배포 방식
- health check와 rollback 절차
