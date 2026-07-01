# Extension AGENTS.md

## Overview

Chrome extension for supported job posting preview/save and user-triggered application form input assistance.

## Structure

| Path | Purpose |
| --- | --- |
| `manifest.json` | Extension permission and runtime contract. |
| `src/background.js` | Service worker and cross-context coordination. |
| `src/content` | Site extraction, panel injection, and autofill logic. |
| `src/popup` | Popup UI and user-triggered actions. |
| `src/shared` | Auth, API, token, and environment helpers. |
| `tests` | DOM fixture extraction, popup, and autofill behavior tests. |

## Where To Look

| Task | Start Here |
| --- | --- |
| Job save issue | Extractor fixture test, then `src/content/jobExtractor.js` and popup preview flow. |
| Autofill issue | `tests/applicationAutoFill.test.js`, then `src/content/applicationAutoFill.js`. |
| Auth/session issue | `src/shared` auth/token helpers and backend refresh contract. |
| Store upload issue | `manifest.json`, production build output, and package script. |
| Permission review | `manifest.json` plus Chrome Web Store privacy justifications. |

## Conventions

- Treat every DOM extraction result as untrusted input.
- Show preview before saving; never silently save incomplete posting data.
- Keep job extraction and document autofill logic separate.
- Autofill must be user-triggered and scoped to supported pages.
- Production packaging must not include local HTTP origins, broad wildcard access, or a manifest `key`.
- Bump the extension version before uploading a new Chrome Web Store package.

## Anti-Patterns

- Do not scrape unsupported pages as if they were supported.
- Do not persist raw page content beyond the feature need.
- Do not loosen host permissions to fix one site quickly.
- Do not rely on timing-only waits for complex autocomplete fields; prefer observable DOM state.
- Do not commit Web Store packages containing local-dev secrets or extension handoff URLs.

## Commands

```powershell
cd extension
npm run test
npm run build
npm run build:local
npm run package
```
