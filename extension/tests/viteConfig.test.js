import { existsSync, readFileSync } from 'node:fs';
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

    it('hardens production builds with explicit EZ-ONE runtime URL defaults and a dist validator', () => {
        const validatorPath = resolve(__dirname, '../../scripts/assert-extension-dist-production-config.ps1');

        expect(config).toContain('PRODUCTION_EXTENSION_WEB_APP_URL');
        expect(config).toContain('https://ez-one.o-r.kr');
        expect(config).toContain('PRODUCTION_EXTENSION_API_BASE_URL');
        expect(config).toContain('https://ez-one.o-r.kr/api');
        expect(config).toContain('resolveExtensionRuntimeEnv(mode)');
        expect(existsSync(validatorPath)).toBe(true);
    });
});
