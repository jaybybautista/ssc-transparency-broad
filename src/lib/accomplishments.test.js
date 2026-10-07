import {
  ACCOMPLISHMENT_CATEGORIES,
  ACCOMPLISHMENT_STATUSES,
  categoryOptions,
  evidenceLabel,
  evidenceUrl,
  groupByMonth,
  monthKeyOf,
  monthLabel,
  STAGGER_LIMIT,
  staggerDelay,
  statusCounts,
  statusLabel,
  statusSlug
} from './accomplishments';

describe('statuses', () => {
  it('keeps the stored value that Firestore already holds', () => {
    // Renaming the stored value would need a migration over every existing
    // document. Only the label is new.
    expect(ACCOMPLISHMENT_STATUSES.map((entry) => entry.value)).toEqual([
      'Upcoming',
      'In Progress',
      'Completed'
    ]);
  });

  it('shows the new wording', () => {
    expect(statusLabel('Upcoming')).toBe('Planned');
    expect(statusLabel('In Progress')).toBe('Ongoing');
    expect(statusLabel('Completed')).toBe('Delivered');
  });

  it('shows an unrecognised status as written instead of hiding it', () => {
    expect(statusLabel('Deferred')).toBe('Deferred');
  });

  it('survives a record saved without a status', () => {
    /*
     * The page called status.toLowerCase() directly. One document written by
     * hand in the Firebase console with no status field threw during render,
     * which takes down the whole list rather than just that card.
     */
    expect(() => statusSlug(undefined)).not.toThrow();
    expect(statusSlug(undefined)).toBe('upcoming');
    expect(statusLabel(null)).toBe('Planned');
  });

  it('turns a status into a class suffix', () => {
    expect(statusSlug('In Progress')).toBe('in-progress');
    expect(statusSlug('Completed')).toBe('completed');
  });
});

describe('statusCounts', () => {
  it('counts each state and the whole set', () => {
    const counts = statusCounts([
      { status: 'Completed' },
      { status: 'Completed' },
      { status: 'Upcoming' }
    ]);
    expect(counts).toEqual({ all: 3, Upcoming: 1, 'In Progress': 0, Completed: 2 });
  });

  it('reports zeroes rather than gaps for an empty list', () => {
    expect(statusCounts([])).toEqual({ all: 0, Upcoming: 0, 'In Progress': 0, Completed: 0 });
  });

  it('counts a record with no status as Planned, matching the card and the filter', () => {
    // The chip must not read zero and then list a record when clicked.
    const counts = statusCounts([{ title: 'Saved by hand, no status' }]);
    expect(counts.Upcoming).toBe(1);
    expect(counts.all).toBe(1);
  });

  it('ignores a status nobody defined without miscounting the total', () => {
    const counts = statusCounts([{ status: 'Deferred' }, { status: 'Completed' }]);
    expect(counts.all).toBe(2);
    expect(counts.Completed).toBe(1);
  });
});

describe('categoryOptions', () => {
  it('offers the fixed list when the records are all on it', () => {
    expect(categoryOptions([{ category: 'Academic' }])).toEqual(ACCOMPLISHMENT_CATEGORIES);
  });

  it('keeps a category typed before the list existed', () => {
    // Otherwise editing an old record silently swaps its category for whatever
    // happens to be first in the dropdown.
    const options = categoryOptions([{ category: 'Service' }, { category: 'Advocacy' }]);
    expect(options).toContain('Service');
    expect(options).toContain('Advocacy');
    expect(options.slice(0, ACCOMPLISHMENT_CATEGORIES.length)).toEqual(ACCOMPLISHMENT_CATEGORIES);
  });

  it('does not repeat a legacy value that appears many times', () => {
    const options = categoryOptions([{ category: 'Service' }, { category: 'Service' }]);
    expect(options.filter((entry) => entry === 'Service')).toHaveLength(1);
  });

  it('ignores blank categories', () => {
    expect(categoryOptions([{ category: '  ' }, { category: '' }, {}])).toEqual(
      ACCOMPLISHMENT_CATEGORIES
    );
  });
});

describe('month grouping', () => {
  it('reads the month off the string, never through a Date', () => {
    /*
     * new Date('2026-03-01') is UTC midnight, which is still February for
     * anyone behind Greenwich. Slicing the string cannot drift.
     */
    expect(monthKeyOf('2026-03-01')).toBe('2026-03');
    expect(monthLabel('2026-03')).toBe('March 2026');
  });

  it('handles a missing or malformed date instead of inventing one', () => {
    expect(monthKeyOf(undefined)).toBe('');
    expect(monthKeyOf('not a date')).toBe('');
    expect(monthLabel('')).toBe('No date given');
  });

  it('keeps the order the listener sent, newest first', () => {
    const groups = groupByMonth([
      { id: 1, date: '2026-03-14' },
      { id: 2, date: '2026-03-02' },
      { id: 3, date: '2026-01-20' }
    ]);
    expect(groups.map((group) => group.label)).toEqual(['March 2026', 'January 2026']);
    expect(groups[0].items.map((item) => item.id)).toEqual([1, 2]);
    expect(groups[1].items.map((item) => item.id)).toEqual([3]);
  });

  it('gathers the undated records rather than dropping them', () => {
    const groups = groupByMonth([{ id: 1, date: '2026-03-14' }, { id: 2 }]);
    expect(groups).toHaveLength(2);
    expect(groups[1].label).toBe('No date given');
  });

  it('returns nothing for nothing', () => {
    expect(groupByMonth([])).toEqual([]);
    expect(groupByMonth()).toEqual([]);
  });
});

describe('evidenceUrl', () => {
  /*
   * The failure this prevents: a bare domain in an href is a relative path, so
   * the link goes to /facebook.com/... inside this site. It looks like a link
   * and lands on a 404.
   */
  it('adds the scheme to a bare domain', () => {
    expect(evidenceUrl('facebook.com/PSUurdanetaSSC')).toBe('https://facebook.com/PSUurdanetaSSC');
  });

  it('leaves a real link alone', () => {
    expect(evidenceUrl('https://x.test/a')).toBe('https://x.test/a');
    expect(evidenceUrl('http://x.test/a')).toBe('http://x.test/a');
  });

  it('never produces a relative path', () => {
    for (const input of ['a.com', 'a.com/b', '/a.com/b', 'www.a.com']) {
      expect(evidenceUrl(input).startsWith('http')).toBe(true);
    }
  });

  it('stays empty for nothing, so no button is drawn', () => {
    expect(evidenceUrl('')).toBe('');
    expect(evidenceUrl('   ')).toBe('');
    expect(evidenceUrl(undefined)).toBe('');
  });
});

describe('evidenceLabel', () => {
  it('prefers what the council typed', () => {
    expect(evidenceLabel('https://x.test/a', 'See the turnover photos')).toBe(
      'See the turnover photos'
    );
  });

  it('names the destination when no label was given', () => {
    expect(evidenceLabel('https://www.facebook.com/PSUurdanetaSSC/posts/1')).toBe(
      'View the Facebook post'
    );
    expect(evidenceLabel('https://drive.google.com/file/d/abc/view')).toBe('View the document');
    expect(evidenceLabel('https://psu.edu.ph/news')).toBe('View on psu.edu.ph');
  });

  it('is empty when there is no link at all', () => {
    expect(evidenceLabel('', '')).toBe('');
  });
});

describe('staggerDelay', () => {
  it('stops staggering, so a long list does not crawl in', () => {
    // index * 0.1s uncapped means the thirtieth card lands three seconds late
    // and the page looks like it is still loading.
    expect(staggerDelay(0)).toBe('0s');
    expect(staggerDelay(STAGGER_LIMIT)).toBe(staggerDelay(60));
    expect(parseFloat(staggerDelay(500))).toBeLessThanOrEqual(0.5);
  });
});
