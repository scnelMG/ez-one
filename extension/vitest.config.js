import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        testTimeout: 10000,
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: true
            }
        }
    }
});
