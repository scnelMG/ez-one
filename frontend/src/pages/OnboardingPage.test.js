import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/pages/OnboardingPage.vue'), 'utf8');

describe('OnboardingPage', () => {
    it('ONB-001: exposes the floating onboarding modal content for the P1 flow', () => {
        expect(source).toContain('data-testid="onboarding-modal"');
        expect(source).toContain('<PreferenceForm');
        expect(source).toContain('test-prefix="onboarding"');
        expect(source).toContain('desiredRoles: []');
        expect(source).toContain('companyTypes: []');
        expect(source).toContain('industries: []');
        expect(source).toContain('regions: []');
        expect(source).toContain('skills: []');
        expect(source).toContain('ssafy: false');
        expect(source).toContain("from '@/features/profile/components/PreferenceForm.vue'");
    });

    it('ONBOARD-004: emits completion instead of routing to a standalone onboarding page', () => {
        expect(source).toContain("defineEmits(['completed'])");
        expect(source).toContain("emit('completed')");
        expect(source).not.toContain("router.push('/onboarding')");
    });

    it('ONBOARD-003: saves only onboarding preferences without creating basket jobs', () => {
        expect(source).not.toContain("from '@/stores/basketStore'");
        expect(source).not.toContain('useBasketStore');
        expect(source).not.toContain('seedDummyJobs');
        expect(source).not.toContain('createJob');
        expect(source).not.toContain('/api/basket/jobs');
    });

    it('ONB-001: does not expose raw API failures inside the first onboarding modal', () => {
        expect(source).toContain('profileLoadNotice');
        expect(source).toContain('저장된 온보딩 정보를 불러오지 못해 새 정보로 시작합니다.');
        expect(source).not.toContain('title="온보딩 오류"');
    });
});
