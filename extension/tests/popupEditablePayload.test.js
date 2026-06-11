import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
describe('extension popup editable preview', () => {
    const markup = readFileSync(resolve(__dirname, '../popup.html'), 'utf-8');
    it('EXT-007: renders editable preview fields before saving', () => {
        expect(markup).toContain('id="company-name-input"');
        expect(markup).toContain('id="position-title-input"');
        expect(markup).toContain('id="deadline-label-input"');
        expect(markup).toContain('id="essay-questions-input"');
        expect(markup).toContain('자소서 문항');
    });
});
