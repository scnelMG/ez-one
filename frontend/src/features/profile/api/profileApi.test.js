import { describe, expect, it, vi } from 'vitest';
import { createProfileApi } from './profileApi';
describe('profileApi', () => {
    it('ONB-001: loads the current onboarding profile', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    desiredRoles: ['Backend Developer'],
                    companyTypes: ['Startup'],
                    industries: ['Commerce'],
                    regions: ['Seoul'],
                    skills: ['Java', 'Spring Boot'],
                    ssafy: true,
                    completed: true
                },
                error: null
            }
        });
        const api = createProfileApi({ get, put: vi.fn() });
        const profile = await api.getUserProfile();
        expect(get).toHaveBeenCalledWith('/api/me/profile');
        expect(profile.desiredRoles).toEqual(['Backend Developer']);
        expect(profile.completed).toBe(true);
    });
    it('ONB-001: saves onboarding preferences through /api/me/profile', async () => {
        const put = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    desiredRoles: ['Backend Developer'],
                    companyTypes: ['Startup'],
                    industries: ['Commerce'],
                    regions: ['Seoul'],
                    skills: ['Java', 'Spring Boot'],
                    ssafy: false,
                    completed: true
                },
                error: null
            }
        });
        const api = createProfileApi({ get: vi.fn(), put });
        const profile = await api.saveUserProfile({
            desiredRoles: ['Backend Developer'],
            companyTypes: ['Startup'],
            industries: ['Commerce'],
            regions: ['Seoul'],
            skills: ['Java', 'Spring Boot'],
            ssafy: false
        });
        expect(put).toHaveBeenCalledWith('/api/me/profile', {
            desiredRoles: ['Backend Developer'],
            companyTypes: ['Startup'],
            industries: ['Commerce'],
            regions: ['Seoul'],
            skills: ['Java', 'Spring Boot'],
            ssafy: false
        });
        expect(profile.completed).toBe(true);
    });
});
