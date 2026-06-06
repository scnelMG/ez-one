import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
describe('extension manifest', () => {
    const manifest = JSON.parse(readFileSync(resolve(__dirname, '../public/manifest.json'), 'utf-8'));
    it('EXT-008: grants host permissions for local EZ One API saves', () => {
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
});
