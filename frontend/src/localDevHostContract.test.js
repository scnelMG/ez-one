import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('local dev login host contract', () => {
    it('AUTH-004/EXT-003: serves the local frontend on localhost for OAuth and extension login handoff', () => {
        const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));
        const startScript = readFileSync(resolve(__dirname, '../../tools/start-local-dev.ps1'), 'utf-8');

        expect(packageJson.scripts['dev:vite']).toBe('vite --host localhost');
        expect(startScript).toContain('$frontendUrl = "http://localhost:5173"');
        expect(startScript).toContain('@($viteEntry, "--host", "localhost", "--port", "5173")');
        expect(startScript).not.toContain('--host", "::1"');
        expect(startScript).not.toContain('http://[::1]:5173');
    });
});
