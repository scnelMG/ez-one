# EZ-ONE Design System

## 1. Atmosphere & Identity

EZ-ONE should feel like a quiet job-application command center: dependable, focused, and readable under repeated daily use. The signature is calm neutral depth with a restrained violet action color, so public trust pages and app surfaces feel related without becoming a marketing redesign.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| Surface/primary | `--surface` | `#ffffff` | not supported | Main cards and paper surfaces |
| Surface/page | `--bg` | `#f8fafc` | not supported | App and public page background |
| Surface/soft | `--surface-soft` | `#f1f5f9` | not supported | Soft panels, empty states, secondary blocks |
| Text/primary | `--ink` | `#0f172a` | not supported | Headings and primary labels |
| Text/body | `--text` | `#334155` | not supported | Body text |
| Text/muted | `--muted` | `#64748b` | not supported | Supporting text and metadata |
| Text/quiet | `--quiet` | `#94a3b8` | not supported | Tertiary labels |
| Border/default | `--line` | `#e2e8f0` | not supported | Dividers and card outlines |
| Border/strong | `--line-strong` | `#cbd5e1` | not supported | Inputs and stronger outlines |
| Accent/primary | `--blue` | `#4f46e5` | not supported | Primary CTAs, focus, active state |
| Accent/hover | `--blue-strong` | `#4338ca` | not supported | CTA hover |
| Accent/soft | `--blue-soft` | `#eef2ff` | not supported | Selected and informational backgrounds |
| Accent/line | `--blue-line` | `#c7d2fe` | not supported | Selected borders |
| Public accent | `--public-accent` | `#6d4dff` | not supported | Public page eyebrow labels and small accent text |
| Public muted legacy | `--public-muted-legacy` | `#475569` | not supported | Public page supporting text retained for release visual stability |
| Public primary hover | `--public-primary-hover` | `#263244` | not supported | Public page dark CTA hover |
| Public border | `--public-line` | `#dbe3ee` | not supported | Public page card and paper outlines |
| Status/success | `--green` | `#059669` | not supported | Confirmations |
| Status/warning | `--warning` | `#b45309` | not supported | Deadline and caution text |
| Status/warning soft | `--warning-soft` | `#fef3c7` | not supported | Warning backgrounds |

### Rules

- Accent color is for interaction, selected state, and focus, not decoration.
- Public pages use neutral surfaces first and reserve violet for small labels or CTA affordances.
- Avoid broad purple/blue gradients and decorative blobs; any depth should come from tonal surfaces, borders, and modest shadows.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
| --- | --- | --- | --- | --- | --- |
| Display | `clamp(2.35rem, 6vw, 4.2rem)` | 750 | 1.12 | 0 | Public hero headings |
| H1 | `1.28rem` to `2.2rem` | 700-800 | 1.2 | 0 | App and section page titles |
| H2 | `0.96rem` to `1.45rem` | 700 | 1.3 | 0 | Section headings |
| H3 | `0.88rem` to `1.2rem` | 700 | 1.35 | 0 | Card titles |
| Body/lg | `1.05rem` | 500 | 1.7 | 0 | Public lead copy |
| Body | `1rem` | 400-600 | 1.6 | 0 | Default text |
| Body/sm | `0.86rem` | 600-800 | 1.5 | 0 | Secondary UI text |
| Caption | `0.72rem` | 700-900 | 1.4 | 0 | Labels, chips, metadata |

### Font Stack

- Primary: `"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif`
- Mono: system monospace only when existing code needs numeric alignment.
- Serif: not used.

### Rules

- Letter spacing is never negative because Korean headings and CTA labels must wrap naturally.
- Use `word-break: keep-all` for Korean readability and pair it with safe overflow wrapping on links/buttons.
- Body text max width should stay near 65-75 Korean characters on public pages.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of 4px.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-1` | 4px | Tight inline spacing |
| `--space-2` | 8px | Compact gaps |
| `--space-3` | 12px | Button and form interior spacing |
| `--space-4` | 16px | Standard component gap |
| `--space-5` | 20px | Comfortable mobile padding |
| `--space-6` | 24px | Card padding |
| `--space-8` | 32px | Section group gaps |
| `--space-10` | 40px | Public section rhythm |
| `--space-12` | 48px | Page top/bottom rhythm |
| `--space-16` | 64px | Hero spacing |

### Grid

- Max content width: 1120px for app/public layout, 920px for paper/legal content.
- Column system: CSS grid with `minmax(0, 1fr)` tracks; public feature cards collapse to one column on mobile.
- Breakpoints: existing 700-980px CSS media queries remain the scoped breakpoint system.

### Rules

- Mobile surfaces use `min(100% - 32px, max-width)` or equivalent padding, not fixed widths.
- Public top bars wrap instead of forcing long Korean link text into a single line.
- Page sections are unframed bands or individual cards only; no nested decorative card stacks.

## 5. Components

### Button / Link CTA

- **Structure**: `a`, `RouterLink`, or `button` with `.primary-button`, `.ghost-button`, `.text-button`, `.public-primary-link`, or `.public-secondary-link`.
- **Variants**: primary filled, secondary outlined, text.
- **Spacing**: `--space-3` horizontal/vertical rhythm, 42-48px minimum height.
- **States**: default, hover, active, focus-visible, disabled where applicable.
- **Accessibility**: visible focus ring, semantic button/link element, text can wrap on mobile.
- **Motion**: transform/box-shadow/background transitions only, 150-200ms.

### Public Page Shell

- **Structure**: `main.public-page > nav.public-topbar + section/article`.
- **Variants**: hero grid page, paper/legal page, FAQ/support list.
- **Spacing**: page padding 24px desktop, 18px mobile, section gaps 32-48px.
- **States**: normal, mobile stacked, external link focus.
- **Accessibility**: one `h1`, named navigation, section labels, no auth-required content.
- **Motion**: none beyond link/button affordance.

### Public Card

- **Structure**: `article.public-card` or `article.faq-row` with kicker/title/body.
- **Variants**: feature card, FAQ row.
- **Spacing**: 22-24px padding, 14-16px grid gap.
- **States**: default and hover/focus when interactive; current cards are static.
- **Accessibility**: semantic article with readable heading hierarchy.
- **Motion**: no decorative motion.

### State Panel

- **Structure**: existing `.state-panel`, `.basket-loading`, `.basket-inline-error`, `.workspace-loading`, and empty state classes.
- **Variants**: loading, empty, error, warning.
- **Spacing**: 18-28px padding depending on page density.
- **States**: loading and error copy must be visible without relying on color only.
- **Accessibility**: error blocks should use `role="alert"` in components when they report failures.
- **Motion**: loading spinners may rotate; reduced motion can remove rotation.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | 120-160ms | ease-out | Button hover, active press |
| Standard | 180-220ms | ease-in-out | Surface shadow/background shift |
| Loading | 800ms | linear | Existing spinner rotation |

### Rules

- Animate `transform`, `opacity`, `box-shadow`, or color/background only.
- Hover and active states must communicate an actionable element.
- Respect `prefers-reduced-motion` for repeated loading motion.

## 7. Depth & Surface

### Strategy

Mixed, with restrained borders plus small shadows for elevated public/app surfaces.

| Level | Value | Usage |
| --- | --- | --- |
| Subtle | `var(--shadow-sm)` | Header and low elevation |
| Default | `0 14px 34px rgba(15, 23, 42, 0.06)` | Public cards and papers |
| Prominent | `var(--shadow-lg)` | Modals and existing major overlays |

| Border | Value | Usage |
| --- | --- | --- |
| Default | `1px solid var(--line)` | Cards, sections, nav links |
| Strong | `1px solid var(--line-strong)` | Inputs and important outlines |

Depth must stay functional: show hierarchy, group content, or communicate interaction. Decorative atmospheric shapes are out of scope for this polish.
