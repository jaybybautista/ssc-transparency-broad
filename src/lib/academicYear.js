/**
 * Academic years.
 *
 * A council serves for one academic year and then hands over. Content from
 * previous years must stay browsable rather than being deleted to make room —
 * which is exactly what would otherwise happen at the first handover, and is
 * unrecoverable once done.
 *
 * The design deliberately avoids a data migration:
 *
 *  - Dated content (announcements, events, resolutions, minutes, reports,
 *    memorandums, accomplishments) is assigned to a year by its own `date`. No
 *    new field, no backfill, and it is filtered *server-side* with a range query
 *    on the same field it is already ordered by — so no composite index either.
 *  - Officers have no date, so they carry an explicit `academicYear`. Records
 *    written before this existed have no such field and are treated as belonging
 *    to the current year, which is where they were in fact serving.
 *  - The constitution and request-letter templates are not year-scoped at all.
 *    They are standing documents; scoping them would hide the by-laws every time
 *    someone browsed an earlier year.
 */

/**
 * The month an academic year starts in, 1-based. Philippine universities run
 * August to July.
 */
const AY_START_MONTH = 8;

/** "2025-2026" for any date inside that academic year. */
export const academicYearOf = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  return month >= AY_START_MONTH ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

/** The academic year we are in right now. */
export const currentAcademicYear = () => academicYearOf(new Date());

/** "A.Y. 2025-2026" */
export const formatAcademicYear = (academicYear) =>
  academicYear ? `A.Y. ${academicYear}` : '';

/**
 * First and last calendar day of an academic year, as the `YYYY-MM-DD` strings
 * the content documents actually store. Inclusive at both ends.
 */
export const academicYearBounds = (academicYear) => {
  const [start] = String(academicYear || '').split('-').map(Number);
  if (!start) return null;

  const month = String(AY_START_MONTH).padStart(2, '0');
  const endMonth = String(AY_START_MONTH - 1).padStart(2, '0');
  // Day 31 is safe as an upper bound for a string comparison even in a 30-day
  // month: no stored date can sort above it within that month.
  return { start: `${start}-${month}-01`, end: `${start + 1}-${endMonth}-31` };
};

/**
 * Every academic year from `earliest` up to `latest`, newest first.
 *
 * `latest` defaults to the calendar's year but callers should pass the board's
 * *active* year instead: offering a term that has not started yet gives students
 * a year to switch into that is empty by definition.
 */
export const academicYearRange = (earliest, latest) => {
  const top = latest || currentAcademicYear();
  const firstYear = Number(String(earliest || top).split('-')[0]);
  const lastYear = Number(String(top).split('-')[0]);

  if (!firstYear || !lastYear || firstYear > lastYear) return [top];

  const years = [];
  for (let year = lastYear; year >= firstYear; year -= 1) {
    years.push(`${year}-${year + 1}`);
  }
  return years;
};

/**
 * The year a record belongs to: its stored `academicYear` if it has one,
 * otherwise derived from its date. Returns '' when neither is available, which
 * callers treat as "not year-scoped".
 */
export const recordAcademicYear = (record) =>
  record?.academicYear || academicYearOf(record?.date || record?.effectiveDate || '');

export const isCurrentAcademicYear = (academicYear) => academicYear === currentAcademicYear();
