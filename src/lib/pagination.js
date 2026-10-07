/**
 * Page maths for admin lists.
 *
 * Kept apart from the components because the interesting part is not drawing
 * the buttons, it is what happens when the list changes under a reader who is
 * already on page 7: filtering, searching, or an entry being deleted can leave
 * the requested page past the end, and a list that renders nothing while
 * insisting there are 300 entries reads as broken.
 */

export const DEFAULT_PER_PAGE = 25;

export const pageCountOf = (total, perPage = DEFAULT_PER_PAGE) => {
  const size = Math.max(1, Number(perPage) || DEFAULT_PER_PAGE);
  return Math.max(1, Math.ceil(Math.max(0, Number(total) || 0) / size));
};

/** Pull a requested page back inside the range that actually exists. */
export const clampPage = (page, total, perPage = DEFAULT_PER_PAGE) => {
  const count = pageCountOf(total, perPage);
  const wanted = Math.floor(Number(page) || 1);
  if (wanted < 1) return 1;
  return Math.min(wanted, count);
};

/**
 * One page of a list, plus everything the controls need to describe it.
 *
 * `page` in the result is the clamped page, not the requested one, so a caller
 * that renders straight from this cannot show an empty page.
 */
export const paginate = (items = [], page = 1, perPage = DEFAULT_PER_PAGE) => {
  const list = Array.isArray(items) ? items : [];
  const size = Math.max(1, Number(perPage) || DEFAULT_PER_PAGE);
  const total = list.length;
  const pageCount = pageCountOf(total, size);
  const current = clampPage(page, total, size);
  const start = (current - 1) * size;

  return {
    items: list.slice(start, start + size),
    page: current,
    pageCount,
    total,
    // 1-based and inclusive, for "Showing 26 to 50 of 300".
    from: total ? start + 1 : 0,
    to: Math.min(start + size, total)
  };
};

/**
 * The page numbers to draw, with gaps where numbers were left out.
 *
 * Three hundred entries is twelve pages, which fits; three thousand is a
 * hundred and twenty, which does not. The first and last are always offered
 * because "jump to the end" is a real thing people want, and a window follows
 * the current page. A gap is the string '...'.
 */
export const pageNumbers = (page, pageCount, window = 1) => {
  const count = Math.max(1, Number(pageCount) || 1);
  const current = clampPage(page, count, 1);
  const span = Math.max(0, Number(window) || 0);

  /*
   * Below this there is nothing to save. Windowing 5 pages gives "1 2 ... 5",
   * which is the same width as "1 2 3 4 5" and hides two pages to achieve it.
   */
  const maxWithoutGaps = 2 * span + 5;
  if (count <= maxWithoutGaps) return Array.from({ length: count }, (_, i) => i + 1);

  const wanted = new Set([1, count]);
  for (let offset = -span; offset <= span; offset += 1) {
    const candidate = current + offset;
    if (candidate >= 1 && candidate <= count) wanted.add(candidate);
  }

  const sorted = [...wanted].sort((a, b) => a - b);
  const out = [];
  let previous = 0;
  for (const number of sorted) {
    // A gap of exactly one is filled rather than replaced: "1 ... 3" wastes
    // the same space as "1 2 3" while hiding a page.
    if (previous && number - previous === 2) out.push(previous + 1);
    else if (previous && number - previous > 2) out.push('...');
    out.push(number);
    previous = number;
  }
  return out;
};
