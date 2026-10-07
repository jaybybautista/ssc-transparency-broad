import { DEFAULT_PER_PAGE, clampPage, pageCountOf, pageNumbers, paginate } from './pagination';

const list = (n) => Array.from({ length: n }, (_, i) => i + 1);

describe('pageCountOf', () => {
  it('counts whole and part pages', () => {
    expect(pageCountOf(0)).toBe(1);
    expect(pageCountOf(25, 25)).toBe(1);
    expect(pageCountOf(26, 25)).toBe(2);
    expect(pageCountOf(200, 25)).toBe(8);
  });

  it('never reports zero pages, so the controls always have something to say', () => {
    expect(pageCountOf(0, 25)).toBe(1);
    expect(pageCountOf(-5, 25)).toBe(1);
  });

  it('survives a nonsense page size instead of dividing by zero', () => {
    expect(pageCountOf(50, 0)).toBe(pageCountOf(50, DEFAULT_PER_PAGE));
    expect(Number.isFinite(pageCountOf(50, -3))).toBe(true);
  });
});

describe('clampPage', () => {
  it('pulls a page past the end back to the last real one', () => {
    /*
     * The case that matters: someone is on page 7, then filters the list down
     * to 30 entries. Page 7 no longer exists, and rendering it shows an empty
     * list under a control claiming there are 30 entries.
     */
    expect(clampPage(7, 30, 25)).toBe(2);
  });

  it('refuses page zero and negatives', () => {
    expect(clampPage(0, 100, 25)).toBe(1);
    expect(clampPage(-4, 100, 25)).toBe(1);
  });

  it('leaves a page that exists alone', () => {
    expect(clampPage(3, 100, 25)).toBe(3);
  });
});

describe('paginate', () => {
  it('returns the requested slice', () => {
    const result = paginate(list(100), 2, 25);
    expect(result.items[0]).toBe(26);
    expect(result.items).toHaveLength(25);
    expect(result.page).toBe(2);
    expect(result.pageCount).toBe(4);
  });

  it('describes the slice for a "showing X to Y of Z" line', () => {
    expect(paginate(list(100), 2, 25)).toMatchObject({ from: 26, to: 50, total: 100 });
    // The last page is short, and must not claim to reach 100.
    expect(paginate(list(90), 4, 25)).toMatchObject({ from: 76, to: 90, total: 90 });
  });

  it('reports the clamped page, so a caller cannot render an empty one', () => {
    const result = paginate(list(30), 7, 25);
    expect(result.page).toBe(2);
    expect(result.items).toEqual([26, 27, 28, 29, 30]);
  });

  it('says from 0 for an empty list rather than starting at 1', () => {
    expect(paginate([], 1, 25)).toMatchObject({ items: [], from: 0, to: 0, total: 0, pageCount: 1 });
  });

  it('copes with nothing at all', () => {
    expect(paginate()).toMatchObject({ items: [], total: 0 });
    expect(paginate(null, 1, 25).items).toEqual([]);
  });

  it('does not modify the list it was given', () => {
    const original = list(10);
    const copy = [...original];
    paginate(original, 1, 5);
    expect(original).toEqual(copy);
  });
});

describe('pageNumbers', () => {
  it('shows every page when the whole set is small', () => {
    // Windowing five pages gives "1 2 ... 5": the same width as listing them
    // all, minus two pages.
    expect(pageNumbers(1, 5, 1)).toEqual([1, 2, 3, 4, 5]);
    expect(pageNumbers(4, 7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('starts windowing once the row would not fit', () => {
    expect(pageNumbers(1, 8, 1)).toEqual([1, 2, '...', 8]);
  });

  it('windows around the current page and keeps the ends reachable', () => {
    expect(pageNumbers(6, 12, 1)).toEqual([1, '...', 5, 6, 7, '...', 12]);
  });

  it('fills a gap of exactly one instead of hiding a page behind dots', () => {
    // "1 ... 3" costs the same width as "1 2 3" and shows less.
    expect(pageNumbers(3, 12, 1)).toEqual([1, 2, 3, 4, '...', 12]);
  });

  it('handles the first and last pages without stray gaps', () => {
    expect(pageNumbers(1, 12, 1)).toEqual([1, 2, '...', 12]);
    expect(pageNumbers(12, 12, 1)).toEqual([1, '...', 11, 12]);
  });

  it('never repeats a number', () => {
    for (const current of [1, 2, 6, 11, 12]) {
      const numbers = pageNumbers(current, 12, 1).filter((n) => typeof n === 'number');
      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });

  it('is just [1] when there is one page', () => {
    expect(pageNumbers(1, 1, 1)).toEqual([1]);
    expect(pageNumbers(1, 0, 1)).toEqual([1]);
  });
});
