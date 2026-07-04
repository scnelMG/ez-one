import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension vite config', () => {
    const config = readFileSync(resolve(__dirname, '../vite.config.js'), 'utf-8');
    const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

    it('wraps reinjectable content scripts so repeated injection does not redeclare top-level bindings', () => {
        expect(config).toContain('wrapReinjectableContentScripts');
        expect(config).toContain("'assets/jobExtractor.js'");
        expect(config).toContain("'assets/applicationAutoFill.js'");
        expect(config).toContain("chunk.code = `(() => {\\n${chunk.code}\\n})();\\n`;");
    });

    it('uses a Vite-safe mode name for the local manifest build', () => {
        expect(packageJson.scripts['build:local']).toContain('--mode localdev');
        expect(config).toContain("mode !== 'localdev'");
        expect(packageJson.scripts['build:local']).not.toMatch(/--mode\s+local(?:\s|$)/);
    });
});
