import {
  academicYearBounds,
  academicYearOf,
  academicYearRange,
  formatAcademicYear,
  isCurrentAcademicYear,
  recordAcademicYear,
  defaultActiveYear
} from './academicYear';

describe('academicYearOf', () => {
  it('puts August onwards into the year that is starting', () => {
    expect(academicYearOf('2025-08-01')).toBe('2025-2026');
    expect(academicYearOf('2025-12-31')).toBe('2025-2026');
  });

  it('puts January to July into the year that is finishing', () => {
    expect(academicYearOf('2026-01-05')).toBe('2025-2026');
    expect(academicYearOf('2026-07-31')).toBe('2025-2026');
  });

  it('rolls over on the first of August', () => {
    expect(academicYearOf('2026-07-31')).toBe('2025-2026');
    expect(academicYearOf('2026-08-01')).toBe('2026-2027');
  });

  it('returns empty for an unusable date rather than guessing', () => {
    expect(academicYearOf('')).toBe('');
    expect(academicYearOf('not a date')).toBe('');
  });
});

describe('academicYearBounds', () => {
  it('spans August to July inclusive', () => {
    expect(academicYearBounds('2025-2026')).toEqual({ start: '2025-08-01', end: '2026-07-31' });
  });

  it('brackets every date in the year and excludes the neighbours', () => {
    const { start, end } = academicYearBounds('2025-2026');
    // The listeners compare the stored YYYY-MM-DD strings directly.
    expect('2025-08-01' >= start && '2025-08-01' <= end).toBe(true);
    expect('2026-02-13' >= start && '2026-02-13' <= end).toBe(true);
    expect('2025-07-31' >= start).toBe(false);
    expect('2026-08-01' <= end).toBe(false);
  });

  it('returns null for a malformed year', () => {
    expect(academicYearBounds('')).toBeNull();
    expect(academicYearBounds('nonsense')).toBeNull();
  });
});

describe('academicYearRange', () => {
  it('lists newest first, inclusive at both ends', () => {
    expect(academicYearRange('2023-2024', '2025-2026')).toEqual([
      '2025-2026',
      '2024-2025',
      '2023-2024'
    ]);
  });

  it('never offers a year beyond the one given as the latest', () => {
    // A term that has not started would otherwise be offered as a destination
    // with nothing in it.
    expect(academicYearRange('2024-2025', '2025-2026')).not.toContain('2026-2027');
  });

  it('collapses to a single year when the range is one long or inverted', () => {
    expect(academicYearRange('2025-2026', '2025-2026')).toEqual(['2025-2026']);
    expect(academicYearRange('2027-2028', '2025-2026')).toEqual(['2025-2026']);
  });

  it('offers nothing when no year is known, rather than the calendar year', () => {
    /*
     * This used to fall back to whatever academic year the clock was in. Run in
     * September, that put a term into the year switcher that had held no
     * election and had no officers, which is the single thing this module
     * exists to prevent.
     */
    expect(academicYearRange('', '')).toEqual([]);
    expect(academicYearRange(undefined, undefined)).toEqual([]);
  });

  it('still works from either end alone', () => {
    expect(academicYearRange('', '2025-2026')).toEqual(['2025-2026']);
    expect(academicYearRange('2025-2026', '')).toEqual(['2025-2026']);
  });
});

describe('recordAcademicYear', () => {
  it('prefers an explicitly stored year', () => {
    expect(recordAcademicYear({ academicYear: '2024-2025', date: '2026-02-01' })).toBe('2024-2025');
  });

  it('falls back to the record own date, then to its effective date', () => {
    expect(recordAcademicYear({ date: '2026-02-01' })).toBe('2025-2026');
    expect(recordAcademicYear({ effectiveDate: '2025-09-10' })).toBe('2025-2026');
  });

  it('returns empty when a record is not year-scoped at all', () => {
    expect(recordAcademicYear({ title: 'Constitution' })).toBe('');
    expect(recordAcademicYear(null)).toBe('');
  });
});

describe('formatAcademicYear', () => {
  it('prefixes with A.Y. and stays empty for nothing', () => {
    expect(formatAcademicYear('2025-2026')).toBe('A.Y. 2025-2026');
    expect(formatAcademicYear('')).toBe('');
  });
});

describe('isCurrentAcademicYear', () => {
  it('agrees with the derived year', () => {
    expect(isCurrentAcademicYear(academicYearOf(new Date()))).toBe(true);
    expect(isCurrentAcademicYear('1999-2000')).toBe(false);
  });
});


/**
 * These pin down the bug that made "Add Event" look broken, and the reason it
 * kept coming back.
 *
 * The board scopes dated content to one academic year. Get that year wrong and
 * content that exists is filtered out of every view at once — calendar, public
 * pages and admin dashboard — with no error anywhere. Saving then appears to do
 * nothing, and saving again does not help.
 *
 * Two earlier versions tried to infer when a council had handed over, from the
 * calendar and then from the newest post. Both announced a 2026-2027 term that
 * had held no election and had no officers, and both hid the sitting 2025-2026
 * council's August and September work from its own board.
 */
describe('the running term has no end date', () => {
  it('is open-ended, so a sitting council keeps its own later posts', () => {
    const bounds = academicYearBounds('2025-2026', { openEnded: true });
    expect(bounds.start).toBe('2025-08-01');
    expect(bounds.end).toBe('');
  });

  it('covers work posted after the calendar year rolled over', () => {
    // The exact records that vanished: posted Aug/Sep 2026 by the 2025-2026
    // council, while its term was still running.
    const { start } = academicYearBounds('2025-2026', { openEnded: true });
    for (const date of ['2026-08-17', '2026-08-20', '2026-09-03']) {
      expect(date >= start).toBe(true);
    }
  });

  it('closes the year again once it is no longer the running term', () => {
    const bounds = academicYearBounds('2025-2026');
    expect(bounds.start).toBe('2025-08-01');
    expect(bounds.end).toBe('2026-07-31');
    expect('2026-09-03' <= bounds.end).toBe(false);
  });
});

describe('defaultActiveYear', () => {
  it('opens on the earliest year with content, never a later one', () => {
    // With the running term open-ended, that one year holds everything, so
    // nothing is hidden while no admin has declared a handover.
    expect(defaultActiveYear('2025-2026')).toBe('2025-2026');
  });

  it('never invents a term the council has not declared', () => {
    // The whole point: no calendar, no newest-post guess, no advancing.
    expect(defaultActiveYear('')).toBe('');
    expect(defaultActiveYear(undefined)).toBe('');
  });
});
