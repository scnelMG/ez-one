import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const reinjectableContentScripts = new Set([
    'assets/jobExtractor.js',
    'assets/applicationAutoFill.js'
]);

export default defineConfig({
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
    plugins: [wrapReinjectableContentScripts()]
});

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
