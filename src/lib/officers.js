/**
 * The officer directory's rules: which sections exist, what order people go in
 * within one, and how a name breaks into surname and given names.
 *
 * This used to live as two copies of a DIVISIONS array, one in the admin page
 * and one in the public page, plus an ordering that did not exist at all.
 */

/** The sections, in the order the council presents them. */
export const DIVISIONS = [
  'Core Officers',
  'SSC Advisers',
  'SSC Secretaries',
  'Executive Department',
  'Legislative Department',
  'Executive Committees'
];

/** Where an officer goes when their division is not one of the six. */
export const OTHER_DIVISION = 'Other Officers';

/**
 * Rank by title, used when nobody has arranged a section by hand.
 *
 * Titles nest: every "Vice President" contains "President", every "Deputy House
 * Speaker" contains "House Speaker". See officerRank for how that is resolved.
 */
const TITLE_RANKS = [
  ['executive vice president', 20],
  // The Speaker heads the legislative side and the council's own listing had
  // them third, above the vice presidents. The default should match what the
  // council already does; anything else is for the Arrange control.
  ['house speaker', 25],
  ['vice president', 30],
  ['president', 10],
  ['adviser', 5],
  ['deputy house speaker', 45],
  ['majority floor leader', 50],
  ['minority floor leader', 55],
  ['floor leader', 57],
  ['secretary general', 60],
  ['secretary', 62],
  ['treasurer', 65],
  ['auditor', 70],
  ['business manager', 75],
  ['public information officer', 80],
  ['information officer', 80],
  ['chairperson', 85],
  ['chairman', 85],
  ['chair', 86],
  ['representative', 90],
  ['member', 95]
];

const UNRANKED = 500;

/**
 * A sort rank for a free text position.
 *
 * Two things have to be true at once, and they pull against each other.
 *
 * Titles nest, so a match on a shorter phrase is worthless when a longer
 * matched phrase contains it: "Executive Vice President" contains "President",
 * and taking the best of every match would file the Executive Vice President
 * as the President. Those swallowed phrases are dropped first.
 *
 * Titles also carry two real roles at once, as in "House Speaker | ABEL
 * Representative", where neither phrase contains the other and the senior one
 * is what should decide the sort. So of what survives, the most senior wins.
 */
export const officerRank = (position) => {
  const text = String(position || '').toLowerCase();
  if (!text.trim()) return UNRANKED;

  const matched = TITLE_RANKS.filter(([phrase]) => text.includes(phrase));
  if (!matched.length) return UNRANKED;

  const specific = matched.filter(
    ([phrase]) => !matched.some(([other]) => other !== phrase && other.includes(phrase))
  );

  return Math.min(...(specific.length ? specific : matched).map(([, rank]) => rank));
};

/** Splits "Chester A. Agnote" into the surname and the rest. */
export const splitName = (fullName) => {
  const clean = String(fullName || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { surname: '', given: '' };

  const parts = clean.split(' ');
  if (parts.length === 1) return { surname: parts[0], given: '' };

  // Names here are written "Given M. Surname", so the last word is the
  // surname, except for the multi-word surnames that are common locally
  // ("De Guzman", "Dela Cruz"), where the particle belongs with it.
  const PARTICLES = new Set(['de', 'dela', 'del', 'della', 'di', 'da', 'dos', 'van', 'von', 'san', 'santa', 'st.']);
  let cut = parts.length - 1;
  while (cut > 1 && PARTICLES.has(parts[cut - 1].toLowerCase())) cut -= 1;

  return {
    surname: parts.slice(cut).join(' '),
    given: parts.slice(0, cut).join(' ')
  };
};

/** The stored order, or null when nobody has placed this officer by hand. */
export const orderOf = (officer) => {
  const raw = officer?.order;
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

/**
 * Sort one section.
 *
 * Officers placed by hand come first, in the order they were placed. Everyone
 * else follows by seniority of title, then by surname. That way adding an
 * officer to a hand-arranged section drops them at the bottom, which is
 * predictable, rather than into the middle of an order somebody chose.
 */
export const sortOfficers = (officers = []) =>
  [...officers].sort((a, b) => {
    const orderA = orderOf(a);
    const orderB = orderOf(b);
    if (orderA !== null || orderB !== null) {
      if (orderA === null) return 1;
      if (orderB === null) return -1;
      if (orderA !== orderB) return orderA - orderB;
    }
    const rank = officerRank(a?.position) - officerRank(b?.position);
    if (rank !== 0) return rank;
    const surname = splitName(a?.name).surname.localeCompare(splitName(b?.name).surname);
    if (surname !== 0) return surname;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });

/**
 * Group officers into sections, sorted, dropping nobody.
 *
 * Both pages used to loop the six known divisions and render only exact
 * matches, so an officer whose division was misspelt or renamed vanished from
 * the site while the count above the grid still included them. Anything
 * unrecognised now lands in its own trailing section instead.
 */
export const groupOfficersByDivision = (officers = []) => {
  const buckets = new Map(DIVISIONS.map((division) => [division, []]));
  const strays = [];

  for (const officer of officers) {
    const division = String(officer?.division || '').trim() || DIVISIONS[0];
    if (buckets.has(division)) buckets.get(division).push(officer);
    else strays.push(officer);
  }

  const groups = [];
  for (const [division, list] of buckets) {
    if (list.length) groups.push({ division, officers: sortOfficers(list) });
  }
  if (strays.length) groups.push({ division: OTHER_DIVISION, officers: sortOfficers(strays) });
  return groups;
};

/** Move one entry to a new index, returning a new array. */
export const moveInList = (list = [], from, to) => {
  const next = [...list];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/**
 * The writes needed to save a hand-arranged section.
 *
 * Every officer in the section is numbered, not just the two that swapped:
 * a section that is half numbered and half not sorts in a way nobody chose.
 * Only the documents whose number actually changed are returned, so nudging
 * the last officer up by one is two writes rather than twenty.
 */
export const orderUpdates = (orderedOfficers = []) =>
  orderedOfficers
    .map((officer, index) => ({ id: officer.id, order: index }))
    .filter((entry, index) => orderOf(orderedOfficers[index]) !== entry.order);
