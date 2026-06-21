import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('application autofill runtime integration', () => {
    const script = readFileSync(resolve(__dirname, '../src/content/applicationAutoFill.js'), 'utf-8');

    it('notifies the popup when the application form structure changes', () => {
        expect(script).toContain("const APPLICATION_FORM_CHANGED_MESSAGE = 'EZONE_APPLICATION_FORM_CHANGED'");
        expect(script).toContain('function startApplicationFormChangeObserver');
        expect(script).toContain('function sendRuntimeMessageSafely');
        expect(script).toContain('new MutationObserver');
        expect(script).toContain('mutationTouchesApplicationForm');
        expect(script).toContain('chrome.runtime.sendMessage');
        expect(script).not.toContain('chrome.runtime.sendMessage({');
        expect(script).toContain('buildApplicationFormSignature(document)');
        expect(script).toContain("type: APPLICATION_FORM_CHANGED_MESSAGE");
    });
});
