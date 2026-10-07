import { ADMIN_NAV, ADMIN_NAV_ITEMS, filterNav, findNavItem } from './adminNav';

describe('the admin menu', () => {
  it('leaves no section unreachable', () => {
    // Every id here has to match a case in the dashboard's renderContent
    // switch. A typo would silently give the council a button that lands on a
    // blank panel.
    const ids = ADMIN_NAV_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('site-profile');
  });

  it('gives every item an icon and a home', () => {
    for (const section of ADMIN_NAV) {
      expect(section.group).toBeTruthy();
      expect(section.items.length).toBeGreaterThan(0);
      for (const item of section.items) {
        expect(typeof item.icon).toBe('function');
        expect(item.label.trim()).toBe(item.label);
      }
    }
  });

  it('uses a distinct icon per item, so the collapsed rail stays readable', () => {
    // Once the labels are hidden the icon is the only thing left to tell two
    // sections apart.
    const icons = ADMIN_NAV_ITEMS.map((item) => item.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});

describe('findNavItem', () => {
  it('reports the group as well, which is what the top bar shows', () => {
    expect(findNavItem('site-profile')).toMatchObject({ label: 'Site Profile', group: 'System' });
    expect(findNavItem('events')).toMatchObject({ label: 'Calendar Events', group: 'Publishing' });
  });

  it('returns nothing for an unknown section rather than throwing', () => {
    expect(findNavItem('nope')).toBeNull();
  });
});

describe('filterNav', () => {
  it('returns the whole menu untouched when nothing is typed', () => {
    expect(filterNav('')).toBe(ADMIN_NAV);
    expect(filterNav('   ')).toBe(ADMIN_NAV);
  });

  it('drops the groups that have no match left', () => {
    const groups = filterNav('officer');
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((item) => item.id)).toEqual(['officers']);
  });

  it('finds a section by the word someone actually has in mind', () => {
    // Nobody hunting for the council logo thinks of it as "Site Profile".
    const byKeyword = (query) => filterNav(query).flatMap((g) => g.items).map((i) => i.id);
    expect(byKeyword('logo')).toContain('site-profile');
    expect(byKeyword('minutes')).toContain('mom');
    expect(byKeyword('activities')).toContain('events');
    expect(byKeyword('memo')).toContain('memorandums');
  });

  it('matches a group name, so typing a heading shows what is under it', () => {
    expect(filterNav('governance').map((g) => g.group)).toEqual(['Governance']);
  });

  it('ignores case and stray spaces', () => {
    expect(filterNav('  AUDIT ').flatMap((g) => g.items).map((i) => i.id)).toEqual(['audit-log']);
  });

  it('comes back empty for a query that matches nothing', () => {
    expect(filterNav('zzzz')).toEqual([]);
  });
});
