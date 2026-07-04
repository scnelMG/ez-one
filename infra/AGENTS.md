# Infra AGENTS.md

## Overview

EC2 runtime assets for Nginx, systemd, health checks, and deployment support.

Local paths below are relative to `infra`; repository docs and scripts are referenced with `../`.

## Where To Look

| Task | Start Here |
| --- | --- |
| Nginx behavior | Nginx templates/configs in this directory and `../docs/39_production-deployment-runbook.md`. |
| Backend service runtime | systemd unit/template plus `/etc/ez-one/ez-one.prod.env` assumptions in release docs. |
| TLS/domain issue | Deployment runbook, DNS notes, and Certbot commands in docs. |
| Rollback concern | `../scripts/rollback-ec2-release.sh` and release artifact layout. |

## Conventions

- Infra files are templates and operational references, not secret stores.
- Keep HTTPS, security headers, proxy timeouts, upload limits, and health endpoint behavior explicit.
- Prefer changes that can be validated with `nginx -t`, `systemctl status`, health checks, and canary scripts.
- EC2 local MySQL decisions must stay aligned with production env checks and deployment docs.

## Anti-Patterns

- Do not embed private keys, passwords, API tokens, OAuth client secrets, or `.pem` material.
- Do not expose Swagger, local-dev auth, broad CORS, or internal health details in production config.
- Do not make rollback depend on files outside the release artifact and documented backup paths.
- Do not change ports, domains, or filesystem paths without updating scripts and release docs together.

## Verification

```bash
sudo nginx -t
systemctl status ez-one-backend --no-pager
curl -fsS https://ez-one.o-r.kr/api/health
```
