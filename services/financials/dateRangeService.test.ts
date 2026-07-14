import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dateRangeService } from './dateRangeService';

// Mock timeService to return a fixed date
vi.mock('../timeService', () => ({
  default: {
    getVerifiedDate: vi.fn().mockReturnValue(new Date('2026-05-28T12:00:00.000Z')),
  },
}));

describe('dateRangeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate date range for today', () => {
    const range = dateRangeService.getDateRange('today');
    const start = new Date(range.start);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(4); // May
    expect(start.getDate()).toBe(28);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it('should calculate date range for this_month', () => {
    const range = dateRangeService.getDateRange('this_month');
    const start = new Date(range.start);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(4); // May
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
  });

  it('should calculate date range for last_month', () => {
    const range = dateRangeService.getDateRange('last_month');
    const start = new Date(range.start);
    const end = new Date(range.end);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(3); // April
    expect(start.getDate()).toBe(1);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(3); // April
    expect(end.getDate()).toBe(30);
  });

  it('should identify closed months', () => {
    const closed = dateRangeService.getClosedMonths('2026-01-15T00:00:00Z', '2026-05-28T00:00:00Z');
    // February, March, April are fully closed and contained.
    // January is partial (starts 15th), May is open (current month).
    expect(closed).toEqual(['2026-02', '2026-03', '2026-04']);
  });
});
