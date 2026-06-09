import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension popup script', () => {
    const script = readFileSync(resolve(__dirname, '../src/popup/popup.js'), 'utf-8');

    it('loads the job extractor on demand before reading the current tab', () => {
        expect(script).toContain("files: ['assets/jobExtractor.js']");
        expect(script).toContain('window.ezOneExtractJobPosting');
        expect(script).not.toContain("type: 'EZONE_EXTRACT_JOB'");
    });

    it('returns to the login panel when the extension session expires', () => {
        expect(script).toContain('AUTH_EXPIRED_MESSAGE');
        expect(script).toContain('async function handleAuthExpired(error)');
        expect(script).toContain('await clearExtensionSession();');
        expect(script).toContain('showPanel(loginPanel);');
    });
});
