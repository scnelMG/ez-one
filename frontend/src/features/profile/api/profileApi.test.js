import { describe, expect, it, vi } from 'vitest';
import { createProfileApi } from './profileApi';
describe('profileApi', () => {
    it('ONB-001: loads the current onboarding profile', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    desiredRoles: ['백엔드 개발자'],
                    companyTypes: ['스타트업'],
                    industries: ['Commerce'],
                    regions: ['서울'],
                    skills: ['Java', 'Spring Boot'],
                    ssafy: true,
                    completed: true
                },
                error: null
            }
        });
        const api = createProfileApi({ get, put: vi.fn() });
        const profile = await api.getUserProfile();
        expect(get).toHaveBeenCalledWith('/api/me/profile', {});
        expect(profile.desiredRoles).toEqual(['백엔드 개발자']);
        expect(profile.completed).toBe(true);
    });
    it('ONB-001: saves onboarding preferences through /api/me/profile', async () => {
        const put = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    desiredRoles: ['백엔드 개발자'],
                    companyTypes: ['스타트업'],
                    industries: ['Commerce'],
                    regions: ['서울'],
                    skills: ['Java', 'Spring Boot'],
                    ssafy: false,
                    completed: true
                },
                error: null
            }
        });
        const api = createProfileApi({ get: vi.fn(), put });
        const profile = await api.saveUserProfile({
            desiredRoles: ['백엔드 개발자'],
            companyTypes: ['스타트업'],
            industries: ['Commerce'],
            regions: ['서울'],
            skills: ['Java', 'Spring Boot'],
            ssafy: false
        });
        expect(put).toHaveBeenCalledWith('/api/me/profile', {
            desiredRoles: ['백엔드 개발자'],
            companyTypes: ['스타트업'],
            industries: ['Commerce'],
            regions: ['서울'],
            skills: ['Java', 'Spring Boot'],
            ssafy: false
        });
        expect(profile.completed).toBe(true);
    });
});

