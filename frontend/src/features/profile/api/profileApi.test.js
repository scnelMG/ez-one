import { describe, expect, it, vi } from 'vitest';
import { defaultHttpClient } from '@/shared/apiClient';
import { createProfileApi, profileApi } from './profileApi';

const profileResponse = {
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
};

describe('profileApi', () => {
    it('ONB-001: loads the current onboarding profile', async () => {
        const get = vi.fn().mockResolvedValue({
            data: profileResponse
        });
        const api = createProfileApi({ get, put: vi.fn() });
        const profile = await api.getUserProfile();
        expect(get).toHaveBeenCalledWith('/api/me/profile');
        expect(profile.desiredRoles).toEqual(['백엔드 개발자']);
        expect(profile.completed).toBe(true);
    });

    it('ONB-002: lets the default auth client refresh expired tokens while loading profile', async () => {
        const getSpy = vi.spyOn(defaultHttpClient, 'get').mockResolvedValue({
            data: profileResponse
        });

        try {
            const profile = await profileApi.getUserProfile();

            expect(getSpy).toHaveBeenCalledWith('/api/me/profile');
            expect(profile.completed).toBe(true);
        } finally {
            getSpy.mockRestore();
        }
    });

    it('ONB-001: surfaces profile load failures instead of replacing them with empty preferences', async () => {
        const api = createProfileApi({
            get: vi.fn().mockRejectedValue(new Error('server restarting')),
            put: vi.fn()
        });

        await expect(api.getUserProfile()).rejects.toThrow('server restarting');
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

