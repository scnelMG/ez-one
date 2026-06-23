import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import PreferenceForm from './PreferenceForm.vue';

const stylesSource = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

function mountPreferenceForm(form = {}) {
    return mount(PreferenceForm, {
        props: {
            testPrefix: 'profile',
            form: {
                desiredRoles: [],
                companyTypes: [],
                industries: [],
                regions: [],
                skills: [],
                ssafy: false,
                ...form
            }
        }
    });
}

describe('PreferenceForm', () => {
    it('ONB-001: starts from broad role groups without selecting a default role', async () => {
        const wrapper = mountPreferenceForm();

        expect(wrapper.text()).toContain('관심 직무군');
        expect(wrapper.text()).toContain('SW 개발');
        expect(wrapper.text()).toContain('AI/데이터');
        expect(wrapper.text()).toContain('클라우드/인프라');
        expect(wrapper.text()).toContain('공공기관 전산/IT');
        expect(wrapper.text()).toContain('아직 명확하지 않음');
        expect(wrapper.get('[data-testid="profile-role-group-option-SW 개발"]').classes()).not.toContain('active');

        await wrapper.get('[data-testid="profile-role-group-option-SW 개발"]').trigger('click');
        await wrapper.get('[data-testid="profile-role-detail-option-프론트엔드"]').trigger('click');

        expect(wrapper.props('form').desiredRoles).toEqual(['SW 개발', '프론트엔드']);
    });

    it('ONB-001: selecting undecided clears detailed role choices', async () => {
        const wrapper = mountPreferenceForm({
            desiredRoles: ['SW 개발', '프론트엔드', '백엔드']
        });

        await wrapper.get('[data-testid="profile-role-group-option-아직 명확하지 않음"]').trigger('click');

        expect(wrapper.props('form').desiredRoles).toEqual(['아직 명확하지 않음']);
        expect(wrapper.find('[data-testid="profile-role-detail-option-프론트엔드"]').exists()).toBe(false);
    });

    it('ONB-001: adds suggested skills without forcing free-text entry', async () => {
        const wrapper = mountPreferenceForm();

        await wrapper.get('[data-testid="profile-skill-suggestion-React"]').trigger('click');
        await wrapper.get('[data-testid="profile-skill-suggestion-SQL"]').trigger('click');

        expect(wrapper.props('form').skills).toEqual(['React', 'SQL']);
        expect(wrapper.get('[data-testid="profile-skill-suggestion-React"]').classes()).toContain('active');
    });

    it('ONB-001: uses a horizontal row layout for desktop onboarding preferences', () => {
        expect(stylesSource).toContain('width: min(1040px, calc(100vw - 40px));');
        expect(stylesSource).toContain('grid-template-columns: minmax(150px, 210px) minmax(0, 1fr);');
        expect(stylesSource).toContain('.preference-section > .onboarding-chip-list');
        expect(stylesSource).toContain('.preference-section > .skill-input-shell');
    });
});
