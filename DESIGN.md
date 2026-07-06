# EZ-ONE Design System

## 1. Atmosphere & Identity

EZ-ONE feels like a quiet job-preparation workspace: organized, trustworthy, and practical rather than decorative. The signature is "calm operational clarity": white document surfaces, restrained violet accents, Korean-first typography, and clear status blocks that help applicants understand what happens to their data and work.

## 2. Color

### Palette

| Role | Token | Light | Usage |
| --- | --- | --- | --- |
| Background | `--bg` | `#F8FAFC` | Page background |
| Surface | `--surface` | `#FFFFFF` | Main cards, policy document panels |
| Soft surface | `--surface-soft` | `#F1F5F9` | Subtle summary blocks |
| Text primary | `--ink` | `#0F172A` | Headings and strong body text |
| Text body | `--text` | `#334155` | Default copy |
| Text muted | `--muted` | `#64748B` | Labels, metadata, secondary copy |
| Text quiet | `--quiet` | `#94A3B8` | Low-priority helper text |
| Border | `--line` | `#E2E8F0` | Dividers and panel outlines |
| Strong border | `--line-strong` | `#CBD5E1` | High-contrast boundaries |
| Accent | `--blue` | `#4F46E5` | Primary links, badges, focus |
| Accent strong | `--blue-strong` | `#4338CA` | Pressed and emphasized accent |
| Accent soft | `--blue-soft` | `#EEF2FF` | Soft accent backgrounds |
| Accent line | `--blue-line` | `#C7D2FE` | Accent borders |
| Success | `--green` | `#059669` | Positive trust indicators |
| Warning | `--warning` | `#B45309` | Cautions and manual review states |
| Warning soft | `--warning-soft` | `#FEF3C7` | Warning backgrounds |

### Rules

- Accent is used for navigation, links, and trust markers, not broad decorative fills.
- Policy/legal pages should read like documents: white surfaces, clear dividers, minimal gradients.
- Any new color must serve a semantic state or content role.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
| --- | --- | --- | --- | --- | --- |
| Display | `clamp(34px, 5vw, 54px)` | 900 | 1.12 | 0 | Public page titles |
| H1 | `32px` | 900 | 1.18 | 0 | App page titles |
| H2 | `22px` | 900 | 1.35 | 0 | Policy section headings |
| H3 | `17px` | 900 | 1.45 | 0 | Subsection headings |
| Body/lg | `18px` | 500 | 1.7 | 0 | Lead copy |
| Body | `15px` | 500 | 1.75 | 0 | Legal and product copy |
| Body/sm | `14px` | 700 | 1.6 | 0 | Metadata and badges |
| Caption | `12px` | 800 | 1.4 | 0 | Pills and table labels |

### Font Stack

- Primary: `"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif`
- Mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`

### Rules

- Korean text uses `word-break: keep-all` with responsive widths so legal copy remains readable.
- Letter spacing is zero unless a compact caption requires uppercase-style treatment.
- Body text never drops below 14px.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-2` | 8px | Inline groups |
| `--space-3` | 12px | Compact list gaps |
| `--space-4` | 16px | Small panels |
| `--space-5` | 20px | Section inner rhythm |
| `--space-6` | 24px | Default card padding |
| `--space-8` | 32px | Document section spacing |
| `--space-10` | 40px | Page section breaks |
| `--space-12` | 48px | Large public page rhythm |
| `--space-16` | 64px | Hero bottom spacing |

### Grid

- Public document max width: 1120px.
- Legal document content: two-column desktop with sticky table of contents, single-column mobile.
- Breakpoints: mobile below 760px, document two-column from 980px.

## 5. Components

### Public Policy Page

- **Structure**: public header, hero summary, sticky table of contents, document articles, contact panel.
- **Variants**: privacy policy; future terms/support pages may reuse the same document shell.
- **Spacing**: hero uses `--space-10` to `--space-12`; article sections use `--space-8`.
- **States**: links have hover underline/color and visible focus outline.
- **Accessibility**: one `main`, one H1, anchor navigation, table headers for data categories, readable contrast.
- **Motion**: no decorative motion; legal pages prioritize stability.

### Summary Panel

- **Structure**: label, value, optional link.
- **Variants**: 시행일, 문의, 데이터 처리 원칙.
- **Spacing**: `--space-4` to `--space-5`.
- **Accessibility**: labels remain visible text, not icon-only.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | 120ms | ease-out | Link and button hover |
| Standard | 200ms | ease-in-out | Focus and panel state changes |

### Rules

- Only animate `color`, `background-color`, `border-color`, `transform`, or `opacity`.
- Policy pages avoid scroll-triggered or decorative animation.
- Respect `prefers-reduced-motion`.

## 7. Depth & Surface

### Strategy

Mixed, with restrained borders and soft shadows.

| Level | Value | Usage |
| --- | --- | --- |
| Subtle | `0 1px 2px rgba(15, 23, 42, 0.04)` | Resting document panels |
| Document | `0 18px 45px rgba(15, 23, 42, 0.08)` | Public page hero |
| Prominent | `0 24px 70px rgba(79, 70, 229, 0.12)` | Rare trust highlight |

Legal pages should not look like marketing cards. Use depth to separate reading layers, not to decorate.
