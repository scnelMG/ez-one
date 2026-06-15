import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
describe('extension manifest', () => {
    const manifest = JSON.parse(readFileSync(resolve(__dirname, '../public/manifest.json'), 'utf-8'));
    it('EXT-008: grants host permissions for local EZ-ONE API saves', () => {
        expect(manifest.host_permissions).toEqual(expect.arrayContaining([
            'http://localhost:8080/*',
            'http://127.0.0.1:8080/*'
        ]));
    });
    it('EXT-013: uses click-triggered scripting without broad always-on content scripts', () => {
        expect(manifest.permissions).toEqual(expect.arrayContaining(['activeTab', 'storage', 'scripting']));
        expect(manifest.host_permissions).not.toContain('<all_urls>');
        expect(manifest.content_scripts.flatMap((item) => item.matches)).not.toContain('<all_urls>');
    });
    it('EXT-006: opens the extension UI as an in-page floating panel instead of OS window or Chrome side panel', () => {
        expect(manifest.permissions).not.toContain('windows');
        expect(manifest.permissions).not.toContain('sidePanel');
        expect(manifest).not.toHaveProperty('side_panel');
        expect(manifest.action).not.toHaveProperty('default_popup');
        expect(manifest.web_accessible_resources).toEqual(expect.arrayContaining([
            expect.objectContaining({
                resources: expect.arrayContaining(['popup.html', 'assets/*.js', 'assets/*.css']),
                matches: expect.arrayContaining(['http://*/*', 'https://*/*'])
            })
        ]));
    });
    it('EXT-003: keeps the unpacked extension id stable for web login handoff', () => {
        expect(extensionIdFromManifestKey(manifest.key)).toBe('ikpeibohnopmikegoogggmdipmhmiadi');
        expect(manifest.externally_connectable.matches).toEqual(expect.arrayContaining([
            'http://localhost/*',
            'http://127.0.0.1/*'
        ]));
    });
});

function extensionIdFromManifestKey(key) {
    const hash = createHash('sha256').update(Buffer.from(key, 'base64')).digest();
    return Array.from(hash.subarray(0, 16))
        .map((byte) => String.fromCharCode(97 + (byte >> 4)) + String.fromCharCode(97 + (byte & 15)))
        .join('');
}
