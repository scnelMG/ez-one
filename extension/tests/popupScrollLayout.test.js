import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension popup scroll layout', () => {
    const css = readFileSync(resolve(__dirname, '../src/popup/popup.css'), 'utf-8');

    it('keeps the brand header visible while the popup content scrolls', () => {
        expect(css).toContain('height: 100%;');
        expect(css).toContain('width: 100vw;');
        expect(css).toContain('min-width: 320px;');
        expect(css).toContain('grid-template-rows: auto minmax(0, 1fr);');
        expect(css).toContain('position: sticky;');
        expect(css).toContain('overflow-y: auto;');
        expect(css).toContain('scrollbar-gutter: stable;');
        expect(css).toContain('.action-stack');
        expect(css).toContain('box-shadow: 0 -10px 24px rgba(16, 24, 40, 0.08);');
    });

    it('makes long role lists visibly scrollable and keeps employment badges secondary to role names', () => {
        expect(css).toContain('max-height: 190px;');
        expect(css).toContain('background-attachment: local, local, scroll, scroll;');
        expect(css).toContain('.role-employment-badge');
        expect(css).toContain('.role-employment-badge--new');
        expect(css).toContain('.role-employment-badge--career');
        expect(css).toContain('.role-employment-badge--mixed');
        expect(css).toContain('.role-options label:has(input:checked) .role-employment-badge--new');
        expect(css).toContain('.role-title');
        expect(css).toContain('.role-option-text--with-badge');
        expect(css).toContain('grid-template-columns: 52px minmax(0, 1fr);');
        expect(css).toContain('.role-options label:has(input:checked) .role-title');
        expect(css).toContain('color: var(--ink);');
        expect(css).toContain('box-sizing: border-box;');
        expect(css).toContain('flex-shrink: 0;');
    });

    it('uses product-grade interaction affordances for keyboard and long essay content', () => {
        expect(css).toContain('--focus-ring');
        expect(css).toContain('summary:focus-visible');
        expect(css).toContain('.essay-question-action::before');
        expect(css).toContain('.essay-question-item-header');
        expect(css).toContain('grid-template-columns: minmax(0, 1fr) auto;');
        expect(css).toContain('.essay-question-item[open] .essay-question-preview');
        expect(css).toContain('display: none;');
        expect(css).toContain('overflow: clip;');
        expect(css).toContain('scroll-padding: 10px 0 16px;');
        expect(css).toContain('width: auto;');
        expect(css).toContain('margin: 12px 14px 14px;');
        expect(css).toContain('box-shadow: inset 0 0 0 1px var(--accent), 0 0 0 2px rgba(91, 69, 240, 0.08);');
        expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    });
});
