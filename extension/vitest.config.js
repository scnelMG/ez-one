import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        testTimeout: 90000,
        pool: 'threads',
        maxWorkers: 1,
        fileParallelism: false
    }
});
