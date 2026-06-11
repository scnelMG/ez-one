import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension popup feature choice styling', () => {
    const css = readFileSync(resolve(__dirname, '../src/popup/popup.css'), 'utf-8');
    const modeCardSection = css.slice(css.indexOf('.mode-card {'), css.indexOf('.mode-card.disabled'));

    it('presents feature choices as equal actions without a preselected purple card', () => {
        expect(modeCardSection).toContain('.mode-card::after');
        expect(modeCardSection).toContain('min-height: 92px');
        expect(modeCardSection).not.toContain('.mode-card.active');
        expect(modeCardSection).not.toContain('background: var(--accent-soft);');
    });
});
