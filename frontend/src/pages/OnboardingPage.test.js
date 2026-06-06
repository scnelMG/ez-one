import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/pages/OnboardingPage.vue'), 'utf8');

describe('OnboardingPage', () => {
    it('ONB-001: exposes the floating onboarding modal content for the P1 flow', () => {
        expect(source).toContain('data-testid="onboarding-modal"');
        expect(source).toContain('맞춤 공고 추천 정보 입력');
        expect(source).toContain('희망 직무');
        expect(source).toContain('보유 스킬');
        expect(source).toContain("desiredRoles: ['프론트엔드', '백엔드']");
    });

    it('ONBOARD-004: emits completion instead of routing to a standalone onboarding page', () => {
        expect(source).toContain("defineEmits(['completed'])");
        expect(source).toContain("emit('completed')");
        expect(source).not.toContain("router.push('/onboarding')");
    });
});
