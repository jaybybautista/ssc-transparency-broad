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
export const academicYearBounds = (academicYear, { openEnded = false } = {}) => {
  const [start] = String(academicYear || '').split('-').map(Number);
  if (!start) return null;

  const month = String(AY_START_MONTH).padStart(2, '0');
  const endMonth = String(AY_START_MONTH - 1).padStart(2, '0');

  /*
   * `openEnded` is for the term that is actually running.
   *
   * A council's term does not end because the calendar rolled over to August.
   * It ends when the next council takes over, and that is an event the council
   * declares, not a date. Closing the sitting term at 31 July meant everything
   * the 2025-2026 council posted in August and September 2026 fell outside its
   * own year and vanished from the board, while the year it fell into had no
   * council, no election and nothing else in it.
   *
   * So the running term has a start and no end: it holds everything from its
   * first day until a later year is declared current, at which point this one
   * gets its upper bound back and becomes a closed archive.
   */
  if (openEnded) return { start: `${start}-${month}-01`, end: '' };

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
  /*
   * With nothing known, offer nothing. Falling back to the calendar here put a
   * year in the switcher that no council had declared, which is the one thing
   * this module exists to avoid.
   */
  const top = latest || earliest;
  if (!top) return [];
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

/**
 * Which academic year the board opens on when no admin has declared one.
 *
 * The answer is the *earliest* year that has content, and it is deliberate:
 * combined with the open-ended bounds above, that one term then holds every
 * record on the board, and the board never advances a term by itself.
 *
 * Every previous attempt to be cleverer than this got it wrong, because the
 * information simply is not in the data. A handover is an election and a
 * turnover ceremony, not a date arithmetic problem. Guessing from the calendar
 * declared a 2026-2027 term that had held no election and had no officers;
 * guessing from the newest post did the same the moment the sitting council
 * posted anything in August. Both hid that council's own work from its own
 * board.
 *
 * So the board waits to be told. An admin declares the year in
 * settings/board — Admin -> Academic Year — and that declaration is the only
 * thing that ever moves it on.
 *
 * Returns '' when there is no content at all, leaving the choice to the caller.
 */
export const defaultActiveYear = (earliestContentYear) => earliestContentYear || '';
