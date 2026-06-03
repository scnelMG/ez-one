# 31. Agent Workflow

This scaffold gives each project agent a bounded plan-execute-verify loop while keeping final scope and completion decisions with the root Codex session.

## Recommendation

Use local loops per agent, not fully autonomous end-to-end ownership.

| Role | Can Plan | Can Execute | Can Verify | Boundary |
| --- | --- | --- | --- | --- |
| explorer | Yes | Read-only inspection | Evidence cross-check | No edits |
| implementer | Yes | Workspace edits | Narrow tests/builds | Approved P1 slices only |
| reviewer | Yes | Read-only review | Diff/test review | No edits |

## Contract

Every agent response should include:

- `requirement_ids`: P1 IDs or `none`
- `scope`: files or directories inspected/changed
- `plan`: short intended path
- `result`: what was found or changed
- `verification`: command or review performed
- `next_actions`: concrete follow-up, if any

## Stop Conditions

- No requirement ID for product behavior
- P2 or IA-only behavior would become active P1 behavior
- Real credentials, tokens, or third-party writes are needed
- Verification cannot run and the remaining risk is unclear

## Scaffold Requirement IDs

This development scaffold supports the P1 loop without implementing product behavior directly:

- `AUTH-001`
- `ONB-001`
- `DASH-001`
- `JOB-001`
- `EXT-001`
- `PROFILE-001`
- `WS-001`
- `NOTION-001`
