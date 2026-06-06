import { resolve } from 'node:path';
import { defineConfig } from 'vite';
export default defineConfig({
    build: {
        emptyOutDir: true,
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'popup.html'),
                background: resolve(__dirname, 'src/background.js'),
                jobExtractor: resolve(__dirname, 'src/content/jobExtractor.js'),
                applicationAutoFill: resolve(__dirname, 'src/content/applicationAutoFill.js')
            },
            output: {
                entryFileNames: 'assets/[name].js'
            }
        }
    }
});
