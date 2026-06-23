import { describe, expect, it, vi } from 'vitest';
import { formatDDay } from './jobUtils';

describe('jobUtils', () => {
  it('calculates D-day from an absolute deadline label when deadlineDate is missing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T09:00:00+09:00'));

    expect(formatDDay({ deadlineLabel: '2026.06.30' })).toBe('D-6');
    expect(formatDDay({ deadlineLabel: '2026년 6월 23일 17:00' })).toBe('D+1');

    vi.useRealTimers();
  });
});
