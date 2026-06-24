import { describe, expect, it, vi } from 'vitest';
import { deadlineRank, formatDDay } from './jobUtils';

describe('jobUtils', () => {
  it('calculates D-day from an absolute deadline label when deadlineDate is missing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T09:00:00+09:00'));

    expect(formatDDay({ deadlineLabel: '2026.06.30' })).toBe('D-6');
    expect(formatDDay({ deadlineLabel: '2026년 6월 23일 17:00' })).toBe('D+1');

    vi.useRealTimers();
  });

  it('sorts mixed absolute and relative deadline labels by actual deadline date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T09:00:00+09:00'));

    const jobs = [
      { companyName: 'D-6 Label', deadlineLabel: 'D-6' },
      { companyName: 'Tomorrow Date', deadlineLabel: '2026.06.25' },
      { companyName: 'Today Label', deadlineLabel: '오늘' },
      { companyName: 'Korean Date', deadlineLabel: '2026년 6월 30일 23:59' }
    ];

    expect([...jobs].sort((left, right) => deadlineRank(left) - deadlineRank(right)).map((job) => job.companyName)).toEqual([
      'Today Label',
      'Tomorrow Date',
      'D-6 Label',
      'Korean Date'
    ]);

    vi.useRealTimers();
  });
});
