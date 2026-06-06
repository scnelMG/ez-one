import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/pages/OnboardingPage.vue'), 'utf8');

describe('OnboardingPage', () => {
    it('ONB-001: exposes Korean onboarding preferences for the P1 flow', () => {
        expect(source).toContain('선호 조건을 알려주세요');
        expect(source).toContain("desiredRoles: ['백엔드 개발자']");
        expect(source).toContain("companyTypes: ['스타트업']");
        expect(source).toContain("const regionInput = ref('서울')");
        expect(source).toContain("const industryInput = ref('커머스')");
    });

    it('ONBOARD-004: routes completed onboarding to the documented main route', () => {
        expect(source).toContain("await router.push('/')");
    });
});

