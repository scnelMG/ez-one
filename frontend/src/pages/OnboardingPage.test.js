import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/pages/OnboardingPage.vue'), 'utf8');

describe('OnboardingPage', () => {
    it('ONB-001: exposes the floating onboarding modal content for the P1 flow', () => {
        expect(source).toContain('data-testid="onboarding-modal"');
        expect(source).toContain('desiredRoles: [roleOptions[0]]');
        expect(source).toContain('companyTypes: [companyTypeOptions[0]]');
        expect(source).toContain('industries: [industryOptions[0]]');
        expect(source).toContain('regions: [regionOptions[0]]');
        expect(source).toContain('skills: []');
        expect(source).toContain('placeholder="React, Java, Spring 입력 후 Enter"');
    });

    it('ONBOARD-004: emits completion instead of routing to a standalone onboarding page', () => {
        expect(source).toContain("defineEmits(['completed'])");
        expect(source).toContain("emit('completed')");
        expect(source).not.toContain("router.push('/onboarding')");
    });
});
