import {
  DIVISIONS,
  OTHER_DIVISION,
  groupOfficersByDivision,
  moveInList,
  officerRank,
  orderOf,
  orderUpdates,
  sortOfficers,
  splitName
} from './officers';

describe('officerRank', () => {
  it('files the most senior title first, longest phrase wins', () => {
    /*
     * "Executive Vice President" contains "Vice President" which contains
     * "President". Matching in list order would file the President and the
     * Executive Vice President together.
     */
    expect(officerRank('President')).toBeLessThan(officerRank('Executive Vice President'));
    expect(officerRank('Executive Vice President')).toBeLessThan(
      officerRank("Vice President for Students' Right and Welfare")
    );
  });

  it('reads the senior half of a two-role title', () => {
    // The real bug on the page: the Deputy House Speaker sat among the plain
    // representatives because the title also says "Representative".
    expect(officerRank('Deputy House Speaker | BSCE Representative')).toBeLessThan(
      officerRank('BSArchi Representative')
    );
    expect(officerRank('Majority Floor Leader | BSCpE Representative')).toBeLessThan(
      officerRank('BSEE Representative')
    );
  });

  it('puts an unknown title last rather than first', () => {
    expect(officerRank('Keeper of the Seal')).toBeGreaterThan(officerRank('Member'));
    expect(officerRank('')).toBeGreaterThan(officerRank('Member'));
  });

  it('ignores case', () => {
    expect(officerRank('PRESIDENT')).toBe(officerRank('president'));
  });

  it('keeps the Speaker above the vice presidents, as the council lists them', () => {
    expect(officerRank('House Speaker | ABEL Representative')).toBeLessThan(
      officerRank('Vice President for Communications')
    );
    expect(officerRank('Executive Vice President')).toBeLessThan(
      officerRank('House Speaker | ABEL Representative')
    );
  });
});

describe('splitName', () => {
  it('takes the last word as the surname', () => {
    expect(splitName('Chester A. Agnote')).toEqual({ surname: 'Agnote', given: 'Chester A.' });
  });

  it('keeps a local particle with the surname', () => {
    expect(splitName('Robert B. De Guzman').surname).toBe('De Guzman');
    expect(splitName('Maria Dela Cruz').surname).toBe('Dela Cruz');
  });

  it('copes with one word and with nothing', () => {
    expect(splitName('Cher')).toEqual({ surname: 'Cher', given: '' });
    expect(splitName('')).toEqual({ surname: '', given: '' });
    expect(splitName(undefined)).toEqual({ surname: '', given: '' });
  });
});

describe('sortOfficers', () => {
  const byName = (list) => sortOfficers(list).map((officer) => officer.name);

  it('orders an untouched section by seniority, then surname', () => {
    const list = [
      { name: 'A Zamora', position: 'BSArchi Representative' },
      { name: 'B Cruz', position: 'BSIT Representative' },
      { name: 'C Reyes', position: 'House Speaker' }
    ];
    expect(byName(list)).toEqual(['C Reyes', 'B Cruz', 'A Zamora']);
  });

  it('honours a hand-arranged order over seniority', () => {
    const list = [
      { name: 'Speaker', position: 'House Speaker', order: 2 },
      { name: 'Rep', position: 'BSIT Representative', order: 0 },
      { name: 'Deputy', position: 'Deputy House Speaker', order: 1 }
    ];
    expect(byName(list)).toEqual(['Rep', 'Deputy', 'Speaker']);
  });

  it('drops a newly added officer at the end of a hand-arranged section', () => {
    // Predictable beats clever: a new officer must not land in the middle of an
    // order somebody chose deliberately.
    const list = [
      { name: 'Placed second', position: 'Member', order: 1 },
      { name: 'Brand new', position: 'President' },
      { name: 'Placed first', position: 'Member', order: 0 }
    ];
    expect(byName(list)).toEqual(['Placed first', 'Placed second', 'Brand new']);
  });

  it('treats order 0 as a real placement, not as missing', () => {
    // The trap: `officer.order || null` turns a legitimate 0 into "unplaced"
    // and sends the first officer to the bottom.
    expect(orderOf({ order: 0 })).toBe(0);
    expect(orderOf({ order: null })).toBeNull();
    expect(orderOf({})).toBeNull();
    expect(orderOf({ order: 'x' })).toBeNull();
  });

  it('does not modify the array it was given', () => {
    const list = [{ name: 'B', position: 'Member' }, { name: 'A', position: 'President' }];
    const copy = [...list];
    sortOfficers(list);
    expect(list).toEqual(copy);
  });

  it('handles an empty section', () => {
    expect(sortOfficers([])).toEqual([]);
    expect(sortOfficers()).toEqual([]);
  });
});

describe('groupOfficersByDivision', () => {
  it('keeps the council section order and skips empty sections', () => {
    const groups = groupOfficersByDivision([
      { name: 'A', division: 'Executive Committees', position: 'Member' },
      { name: 'B', division: 'Core Officers', position: 'President' }
    ]);
    expect(groups.map((group) => group.division)).toEqual(['Core Officers', 'Executive Committees']);
  });

  it('never loses an officer whose division is misspelt', () => {
    /*
     * Both pages used to render only exact matches against the six known
     * divisions, so a typo removed that officer from the site silently while
     * the count above the grid still included them.
     */
    const officers = [
      { name: 'A', division: 'Core Officers', position: 'President' },
      { name: 'B', division: 'Executive Committee', position: 'Member' },
      { name: 'C', division: 'Something Else', position: 'Member' }
    ];
    const groups = groupOfficersByDivision(officers);
    const shown = groups.reduce((count, group) => count + group.officers.length, 0);
    expect(shown).toBe(officers.length);
    expect(groups[groups.length - 1].division).toBe(OTHER_DIVISION);
    expect(groups[groups.length - 1].officers.map((officer) => officer.name)).toEqual(['B', 'C']);
  });

  it('files an officer with no division under the first section', () => {
    const groups = groupOfficersByDivision([{ name: 'A', position: 'President' }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].division).toBe(DIVISIONS[0]);
  });

  it('sorts inside each section', () => {
    const groups = groupOfficersByDivision([
      { name: 'Z Rep', division: 'Legislative Department', position: 'BSIT Representative' },
      { name: 'A Speaker', division: 'Legislative Department', position: 'House Speaker' }
    ]);
    expect(groups[0].officers.map((officer) => officer.name)).toEqual(['A Speaker', 'Z Rep']);
  });

  it('returns nothing for nothing', () => {
    expect(groupOfficersByDivision([])).toEqual([]);
    expect(groupOfficersByDivision()).toEqual([]);
  });
});

describe('moveInList', () => {
  const list = ['a', 'b', 'c', 'd'];

  it('moves an entry up and down', () => {
    expect(moveInList(list, 2, 0)).toEqual(['c', 'a', 'b', 'd']);
    expect(moveInList(list, 0, 3)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('refuses to run off either end', () => {
    expect(moveInList(list, 0, -1)).toEqual(list);
    expect(moveInList(list, 3, 4)).toEqual(list);
    expect(moveInList(list, 1, 1)).toEqual(list);
  });

  it('leaves the original alone', () => {
    const copy = [...list];
    moveInList(list, 0, 2);
    expect(list).toEqual(copy);
  });
});

describe('orderUpdates', () => {
  it('numbers the whole section, so it cannot end up half arranged', () => {
    const updates = orderUpdates([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(updates).toEqual([
      { id: 'a', order: 0 },
      { id: 'b', order: 1 },
      { id: 'c', order: 2 }
    ]);
  });

  it('writes only the officers whose number actually changed', () => {
    // Nudging one officer up in a section of twenty should not be twenty writes.
    const updates = orderUpdates([
      { id: 'a', order: 0 },
      { id: 'c', order: 2 },
      { id: 'b', order: 1 }
    ]);
    expect(updates).toEqual([
      { id: 'c', order: 1 },
      { id: 'b', order: 2 }
    ]);
  });

  it('has nothing to write when the section is already numbered in place', () => {
    expect(orderUpdates([{ id: 'a', order: 0 }, { id: 'b', order: 1 }])).toEqual([]);
  });
});
