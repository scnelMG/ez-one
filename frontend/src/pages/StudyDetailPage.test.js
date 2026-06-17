import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/pages/StudyDetailPage.vue'), 'utf8');

describe('StudyDetailPage security rendering', () => {
    it('renders shared essay bodies as text instead of raw HTML', () => {
        expect(source).not.toContain('v-html="item.body"');
        expect(source).toContain('{{ item.body }}');
    });

    it('uses the authenticated user email instead of a hardcoded fallback for permission UI', () => {
        expect(source).toContain("import { getCurrentUser } from '@/features/auth/session/authSession';");
        expect(source).toContain("return getCurrentUser()?.email || '';");
        expect(source).not.toContain("localStorage.getItem('ez_one_user_email')");
        expect(source).not.toContain('eunjaelee058@gmail.com');
    });
});
