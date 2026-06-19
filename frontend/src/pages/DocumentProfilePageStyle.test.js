import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('DocumentProfilePage styles', () => {
    const styles = readFileSync(resolve(__dirname, '../styles.css'), 'utf-8');

    it('PROFILE-001/PROFILE-024: keeps the document profile layout calm and non-overlapping', () => {
        expect(styles).toContain('.document-editor-grid-focused {\n  grid-template-columns: 200px minmax(0, 1fr);');
        expect(styles).toContain('.document-form-panel-focused {\n  min-height: 0;');
        expect(styles).toContain('box-shadow: none;');
        expect(styles).toContain('background: transparent;');
        expect(styles).toContain('.document-save-actions {\n  position: static;');
        expect(styles).toContain('margin: 28px 0 0;');
        expect(styles).toContain('.document-save-feedback.saved');
        expect(styles).toContain('background: #ffffff;');
        expect(styles).toContain('.document-save-feedback-icon');
        expect(styles).not.toContain('margin: 32px -32px -32px;');
        expect(styles).not.toContain('margin: 28px -24px -24px;');
        expect(styles).not.toContain('margin: 24px -18px -18px;');
        expect(styles).toContain('.profile-group-card {\n  border: 1px solid #e4eaf3;');
        expect(styles).toContain('border-radius: 10px;');
        expect(styles).toContain('background: #ffffff;');
        expect(styles).toContain('.profile-subsection-heading {\n  border-bottom: 1px solid #e8eef6;');
        expect(styles).not.toContain('border-left: 4px solid var(--blue);');
        expect(styles).toContain('.document-section-rail {\n  display: flex;');
        expect(styles).toContain('border: 1px solid #e6edf6;');
    });

    it('PROFILE-011: keeps radio controls compact in disability and veteran sections', () => {
        expect(styles).toContain('.document-profile-page input:not([type="checkbox"]):not([type="radio"])');
        expect(styles).toContain('.document-profile-page input:not([type="checkbox"]):not([type="radio"]):hover');
        expect(styles).toContain('.document-profile-page input:not([type="checkbox"]):not([type="radio"]):focus');
        expect(styles).toContain('.application-choice-heading');
        expect(styles).toContain('.application-choice-status');
        const choiceHeadingRule = styles.match(/\.profile-group-card\.application-choice-card \.application-choice-heading \{[^}]+}/)?.[0] ?? '';
        expect(choiceHeadingRule).toContain('justify-content: flex-start;');
        expect(choiceHeadingRule).not.toContain('justify-content: space-between;');
        expect(styles).toContain('.application-radio-group.application-radio-group-compact');
        expect(styles).toContain('grid-template-columns: repeat(2, minmax(68px, auto));');
        expect(styles).toContain('.application-radio-option input');
        expect(styles).toContain('position: absolute');
        expect(styles).toContain('opacity: 0');
        expect(styles).toContain('.application-radio-option span::before');
        expect(styles).toContain('.application-radio-option:has(input:checked) span::before');
    });
});
