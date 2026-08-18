import {
  academicYearBounds,
  academicYearOf,
  academicYearRange,
  formatAcademicYear,
  isCurrentAcademicYear,
  recordAcademicYear
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
