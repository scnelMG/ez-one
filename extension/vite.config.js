import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const reinjectableContentScripts = new Set([
    'assets/jobExtractor.js',
    'assets/applicationAutoFill.js'
]);

const PRODUCTION_EXTENSION_WEB_APP_URL = 'https://ez-one.o-r.kr';
const PRODUCTION_EXTENSION_API_BASE_URL = 'https://ez-one.o-r.kr/api';
const PRODUCTION_EXTENSION_API_FALLBACK_BASE_URLS = '';

export default defineConfig(({ mode }) => ({
    define: resolveExtensionRuntimeEnv(mode),
    build: {
        emptyOutDir: true,
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'popup.html'),
                background: resolve(__dirname, 'src/background.js'),
                jobExtractor: resolve(__dirname, 'src/content/jobExtractor.js'),
                panelHost: resolve(__dirname, 'src/content/panelHost.js'),
                applicationAutoFill: resolve(__dirname, 'src/content/applicationAutoFill.js')
            },
            output: {
                entryFileNames: 'assets/[name].js'
            }
        }
    },
    plugins: [wrapReinjectableContentScripts(), selectManifestForMode(mode)]
}));

function resolveExtensionRuntimeEnv(mode) {
    if (mode === 'localdev') {
        return {};
    }
    return {
        'import.meta.env.VITE_EXTENSION_WEB_APP_URL': JSON.stringify(
            process.env.VITE_EXTENSION_WEB_APP_URL?.trim() || PRODUCTION_EXTENSION_WEB_APP_URL
        ),
        'import.meta.env.VITE_EXTENSION_API_BASE_URL': JSON.stringify(
            process.env.VITE_EXTENSION_API_BASE_URL?.trim() || PRODUCTION_EXTENSION_API_BASE_URL
        ),
        'import.meta.env.VITE_EXTENSION_API_FALLBACK_BASE_URLS': JSON.stringify(
            process.env.VITE_EXTENSION_API_FALLBACK_BASE_URLS?.trim() || PRODUCTION_EXTENSION_API_FALLBACK_BASE_URLS
        )
    };
}

function wrapReinjectableContentScripts() {
    return {
        name: 'wrap-reinjectable-content-scripts',
        generateBundle(_options, bundle) {
            for (const [fileName, chunk] of Object.entries(bundle)) {
                if (chunk.type !== 'chunk' || !reinjectableContentScripts.has(fileName)) {
                    continue;
                }
                chunk.code = `(() => {\n${chunk.code}\n})();\n`;
            }
        }
    };
}

function selectManifestForMode(mode) {
    return {
        name: 'select-manifest-for-mode',
        closeBundle() {
            if (mode !== 'localdev') {
                return;
            }
            copyFileSync(resolve(__dirname, 'manifests/local.json'), resolve(__dirname, 'dist/manifest.json'));
        }
    };
}
