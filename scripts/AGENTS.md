# Scripts AGENTS.md

## Overview

Local QA, release gating, artifact packaging, EC2 deployment, rollback, canary, and environment validation helpers.

Local paths below are relative to `scripts`; repository docs are referenced from `../docs`.

## Where To Look

| Task | Start Here |
| --- | --- |
| Local release gate | `release-local-gate.ps1` |
| Artifact packaging | `package-release-artifacts.ps1` |
| EC2 deploy | `deploy-ec2-release.sh` |
| EC2 rollback | `rollback-ec2-release.sh` |
| Post-deploy canary | `run-release-canary.ps1` |
| Prod env checks | `check-prod-env.ps1`, `check-client-prod-env.ps1`, `check-deployment-prereqs.ps1` |
| Release evidence | `release-evidence-schema.ps1`, `../docs/40_release-evidence.template.json` |

## Conventions

- Treat scripts as release controls; changes need narrow verification even when docs-only behavior looks simple.
- Never print secret values. Report key names, file paths, and presence/absence instead.
- Production checks should reject localhost, local extension IDs, development origins, and permissive CORS unless the script explicitly documents a rehearsal mode.
- Prefer dry-run or validation steps before remote mutation.
- Keep Windows PowerShell scripts and Git Bash/EC2 shell scripts platform-specific; do not mix path semantics inside one script without tests.

## Anti-Patterns

- Do not make `ALLOW_DIRTY_RELEASE=true` the normal release path.
- Do not weaken checksum, artifact-name, health-check, or rollback validation to get a deployment through.
- Do not store generated release artifacts or `.env` values inside scripts.
- Do not silently skip backend/frontend/extension gates unless a parameter name and output make the skip obvious.

## Commands

```powershell
.\scripts\release-local-gate.ps1
.\scripts\release-local-gate.ps1 -SkipSlow
.\scripts\check-prod-env.ps1 -EnvFile C:\ez-one\secrets\ez-one.prod.env
.\scripts\check-client-prod-env.ps1
.\scripts\package-release-artifacts.ps1
.\scripts\run-release-canary.ps1
```
