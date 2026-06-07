import { beforeEach, describe, expect, it } from 'vitest';
import { getRecentWorkspaceIds, isRecentWorkspace, rememberRecentWorkspace } from './recentWorkspaces';

describe('recentWorkspaces', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('JOB-005/WS-011: keeps only one recently worked workspace', () => {
        rememberRecentWorkspace('102');
        rememberRecentWorkspace('105');

        expect(getRecentWorkspaceIds()).toEqual(['105']);
        expect(isRecentWorkspace('105')).toBe(true);
        expect(isRecentWorkspace('102')).toBe(false);
    });

    it('JOB-005: ignores older stored values when checking recent work', () => {
        localStorage.setItem('ezone.recentWorkspaces', JSON.stringify(['102', '105']));

        expect(getRecentWorkspaceIds()).toEqual(['102']);
        expect(isRecentWorkspace('102')).toBe(true);
        expect(isRecentWorkspace('105')).toBe(false);
    });
});
