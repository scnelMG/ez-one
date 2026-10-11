# 운영 TLS 인증서 복구와 확인

2026-10-11 외부 HTTPS 검사에서 `ez-one.o-r.kr`의 인증서 만료를 확인했다. 이 문서는 복구 절차이며, 실제 서버 갱신 완료 기록은 아니다. 운영 서버 접근 권한을 가진 담당자가 실행하고 결과를 남긴다. 제품 요구사항 변경 없이 배포 운영 문서만 보완한다.

## 먼저 확인할 것

운영 서버에서 다음을 확인한다. 인증서 개인키나 환경변수 파일의 내용은 출력하지 않는다.

```bash
sudo certbot certificates
sudo nginx -t
systemctl list-timers --all | grep -i certbot
sudo journalctl -u certbot.service --since '14 days ago' --no-pager
```

- 저장소의 Nginx 설정은 `/etc/letsencrypt/live/ez-one.o-r.kr/`를 참조한다. 실제 서버의 인증서 이름과 경로가 같은지 확인한다. 다른 이름이면 아래 `--cert-name`을 실제 이름으로 바꾼다.
- 기존 인증서의 갱신 설정에서 authenticator가 nginx, webroot, standalone 중 무엇인지 확인한다. 현재 서버의 설정을 확인하지 않고 인증서를 새로 만들거나 renewal 파일을 직접 수정하지 않는다.
- DNS가 해당 서버를 가리키고 HTTP-01 검증에 필요한 외부 80번 포트가 열려 있어야 한다.

## 기존 설정으로 갱신

기존 authenticator가 현재 서비스와 함께 동작할 수 있는 nginx 또는 webroot인 경우:

```bash
sudo certbot renew --cert-name ez-one.o-r.kr --dry-run
# 모의 갱신이 성공한 경우에만 실행
sudo certbot renew --cert-name ez-one.o-r.kr --deploy-hook 'nginx -t && systemctl reload nginx'
```

standalone 방식은 80번 포트를 직접 사용하므로 실행 중인 Nginx와 충돌할 수 있다. 서비스 중단 시간을 정하고 Nginx 중지·재시작 훅을 구성하거나, 설치된 Certbot 버전에서 지원하는 `reconfigure` 절차로 nginx/webroot 방식으로 전환한 뒤 모의 갱신부터 다시 확인한다. 중지 후 갱신이 실패해도 Nginx를 다시 시작해야 한다. 현재 저장소의 80번 포트 설정에는 webroot challenge 경로가 없으므로 `--webroot` 옵션만 붙이면 해결된다고 가정하지 않는다.

자동 갱신 타이머 또는 cron이 실제로 실행되는지, 갱신 후 Nginx reload 훅이 설치돼 있는지 확인한다. 위 명령을 한 번 실행한 사실만으로 자동 갱신 구성이 완료됐다고 기록하지 않는다. 설치 방식에 따라 서비스 이름이 다를 수 있으므로 타이머 출력과 설치된 설정을 기준으로 확인한다.

## 복구 완료 기준

외부 PC에서 인증서 검증을 우회하지 않고 확인한다.

```bash
curl --fail --show-error --head https://ez-one.o-r.kr/
```

1. 인증서 체인·유효기간 검증을 통과하고 HTTPS 응답을 받는다.
2. 브라우저에서 시작 화면을 확인하고, 권한 있는 테스트 계정으로 로그인과 공고 저장 흐름을 점검한다. HTTP 200만으로 로그인·외부 연동 성공을 주장하지 않는다.
3. 갱신된 만료일, 모의 갱신 결과, 자동 실행 주기, Nginx reload 확인 시각을 운영 기록에 남긴다.
4. 검증 후 README의 상태 문구를 확인 날짜와 함께 갱신한다. 만료 인증서로 돌아가는 롤백은 복구가 아니다. 설정 변경 시 보관한 이전 Nginx 설정으로 복원하고 `nginx -t` 후 reload한다.

현재 이 문서 작성 시에는 서버 접근·인증서 갱신·로그인 시나리오를 실행하지 않았다.

공식 절차: [Certbot 인증서 갱신 및 자동 갱신 안내](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates), [기존 인증서 갱신 설정 변경](https://eff-certbot.readthedocs.io/en/stable/using.html#modifying-the-renewal-configuration-of-existing-certificates).
