import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('application autofill runtime integration', () => {
    const script = readFileSync(resolve(__dirname, '../src/content/applicationAutoFill.js'), 'utf-8');

    it('does not notify the popup for application form structure changes', () => {
        expect(script).not.toContain("const APPLICATION_FORM_CHANGED_MESSAGE = 'EZONE_APPLICATION_FORM_CHANGED'");
        expect(script).not.toContain('function startApplicationFormChangeObserver');
        expect(script).not.toContain('function sendRuntimeMessageSafely');
        expect(script).toContain('new MutationObserver');
        expect(script).not.toContain('mutationTouchesApplicationForm');
        expect(script).not.toContain('chrome.runtime.sendMessage');
        expect(script).not.toContain('buildApplicationFormSignature(document)');
        expect(script).not.toContain("type: APPLICATION_FORM_CHANGED_MESSAGE");
    });

    it('EXT-021: scopes expensive plain text option scans to open dropdown roots first', () => {
        expect(script).toContain('function plainCustomOptionSearchRoots(documentRef, sourceControl)');
        expect(script).toContain('return scopedRoots.length > 0 ? scopedRoots : [documentRef];');
        expect(script).toContain('const searchRoots = plainCustomOptionSearchRoots(documentRef, sourceControl);');
    });
});
