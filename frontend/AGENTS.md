# Frontend AGENTS.md

## Overview

Vue 3/Vite SPA for the P1 user loop: login, onboarding, main, basket, workspace, document profile, Notion settings, and related reserved shells.

Local paths below are relative to `frontend`; repository docs are referenced from `../docs`.

## Structure

| Path | Purpose |
| --- | --- |
| `src/main.js` | SPA bootstrap. |
| `src/router/index.js` | Route map and route guards. |
| `src/pages` | Route-level screens and page state composition. |
| `src/features` | Domain components and API clients. |
| `src/stores` | Pinia state for auth, basket, workspace, etc. |
| `src/shared` | Shared UI, utilities, and cross-domain components. |

## Where To Look

| Task | Start Here |
| --- | --- |
| Route or screen change | `../docs/09_screen-design.md`, then `src/router/index.js` and `src/pages`. |
| API-backed state | Feature API module or Pinia store before page UI. |
| Empty/error/loading UX | Page component and feature component together. |
| Mobile layout | Page CSS first; keep fixed-format controls dimensionally stable. |
| Notion or extension install UX | Relevant page plus env usage for public URLs only. |

## Conventions

- Pages compose route-level state; domain behavior belongs under `features/<domain>`.
- API calls belong in API modules or stores, not deep presentational components.
- Every API-backed page handles loading, empty, error, unauthorized, and forbidden states.
- Korean product copy should be concrete and action-oriented; avoid promising unavailable P2 behavior.
- Keep P2 routes disabled/reserved unless docs and user approval explicitly activate them.
- Public frontend env values must be non-secret; never put API keys or server secrets in `VITE_*`.

## Anti-Patterns

- Do not add active calendar, alerts, support, or expanded Notion behavior just because a shell exists.
- Do not use local-only URLs or extension IDs in production-facing UI.
- Do not hide failed saves/syncs behind generic success states.
- Do not let long Korean labels resize fixed controls or overlap on mobile.

## Commands

```powershell
cd frontend
npm run test
npm run build
```
