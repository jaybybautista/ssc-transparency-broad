/**
 * The accomplishment tracker's vocabulary and grouping.
 *
 * Kept out of the page so the parts with actual rules (what a status is called,
 * what counts as a category, how a link is made safe, how the year breaks into
 * months) can be tested without rendering anything.
 */

/**
 * The three states.
 *
 * `value` is what sits in Firestore and must not change: hundreds of existing
 * documents already say "Upcoming". `label` is what the council and students
 * read. Renaming only the label means no migration, and reverting the wording
 * later is a one line edit here rather than a data fix.
 */
export const ACCOMPLISHMENT_STATUSES = [
  { value: 'Upcoming', label: 'Planned' },
  { value: 'In Progress', label: 'Ongoing' },
  { value: 'Completed', label: 'Delivered' }
];

const STATUS_BY_VALUE = new Map(ACCOMPLISHMENT_STATUSES.map((entry) => [entry.value, entry]));

/** What a record with no status is treated as, everywhere. */
export const DEFAULT_STATUS = 'Upcoming';

/** What a status is called on screen. An unknown value is shown as written. */
export const statusLabel = (status) => {
  const raw = String(status || '').trim();
  return STATUS_BY_VALUE.get(raw)?.label || raw || STATUS_BY_VALUE.get(DEFAULT_STATUS).label;
};

/**
 * The CSS suffix for a status.
 *
 * Deliberately tolerant: the page used to call `status.toLowerCase()` straight
 * on the record, so one document saved without a status (by hand in the
 * Firebase console, say) would throw while rendering the list and take the
 * whole page down with it.
 */
export const statusSlug = (status) => {
  const raw = String(status || '').trim().toLowerCase();
  if (!raw) return 'upcoming';
  return raw.replace(/\s+/g, '-');
};

/**
 * The categories offered in the form.
 *
 * It used to be a free text box, which is how one council ends up with
 * "Service", "service" and "Serivce" as three separate chips that no longer
 * group anything.
 */
export const ACCOMPLISHMENT_CATEGORIES = [
  'Academic',
  'Student Welfare',
  'Sports',
  'Culture and Arts',
  'Community Service',
  'Governance'
];

/**
 * The fixed list, plus whatever earlier records already use.
 *
 * Tightening the vocabulary must not orphan the entries that were typed before
 * the list existed: an admin editing an old record should still see its own
 * category selected rather than silently having it replaced.
 */
export const categoryOptions = (records = []) => {
  const seen = new Set(ACCOMPLISHMENT_CATEGORIES);
  const legacy = [];
  for (const record of records) {
    const value = String(record?.category || '').trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      legacy.push(value);
    }
  }
  return [...ACCOMPLISHMENT_CATEGORIES, ...legacy.sort()];
};

/**
 * How many records sit in each state, for the filter chips.
 *
 * A record with no status counts as Planned, because that is both what the
 * card shows for it and what the Planned filter includes. Counting it any
 * other way gives a chip that reads zero and then lists a record.
 */
export const statusCounts = (records = []) => {
  const counts = { all: records.length };
  for (const entry of ACCOMPLISHMENT_STATUSES) counts[entry.value] = 0;
  for (const record of records) {
    const raw = String(record?.status || '').trim() || DEFAULT_STATUS;
    if (counts[raw] !== undefined) counts[raw] += 1;
  }
  return counts;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * The YYYY-MM a record belongs to.
 *
 * Sliced from the string rather than parsed through Date on purpose. A bare
 * 'YYYY-MM-DD' is read as UTC midnight, which is a different month for anyone
 * west of Greenwich on the first of the month.
 */
export const monthKeyOf = (date) => {
  const raw = String(date || '').trim();
  return /^\d{4}-\d{2}/.test(raw) ? raw.slice(0, 7) : '';
};

export const monthLabel = (key) => {
  if (!key) return 'No date given';
  const [year, month] = key.split('-').map(Number);
  return `${MONTHS[month - 1] || ''} ${year}`.trim();
};

/**
 * Break a list into month blocks, keeping the order it arrived in.
 *
 * The listener already sorts by date descending, so preserving that order is
 * what keeps newest first without sorting twice. Thirty cards in one unbroken
 * column read as a pile; the same thirty under month headings read as a term.
 */
export const groupByMonth = (records = []) => {
  const groups = [];
  const byKey = new Map();
  for (const record of records) {
    const key = monthKeyOf(record?.date);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: monthLabel(key), items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(record);
  }
  return groups;
};

/**
 * Make a pasted link safe to put in an href.
 *
 * A bare domain or a Facebook handle in an href is read as a relative path, so
 * the link navigates inside this site instead of going anywhere: broken, but
 * still looking like a working link.
 */
export const evidenceUrl = (url) => {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(mailto:|tel:)/i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, '')}`;
};

/** A short, human name for an evidence link when the council did not give one. */
export const evidenceLabel = (url, label) => {
  const given = String(label || '').trim();
  if (given) return given;
  const target = evidenceUrl(url);
  if (!target) return '';
  try {
    const host = new URL(target).hostname.replace(/^www\./, '');
    if (host.includes('facebook')) return 'View the Facebook post';
    if (host.includes('drive.google') || host.includes('docs.google')) return 'View the document';
    return `View on ${host}`;
  } catch {
    return 'View the source';
  }
};

/**
 * The cards fade in one after another. Left uncapped that is index * 0.1s, so
 * the thirtieth card arrives three seconds after the page has settled and the
 * list looks like it is still loading. Stagger the first few, then stop.
 */
export const STAGGER_LIMIT = 8;
export const staggerDelay = (index) => `${Math.min(index, STAGGER_LIMIT) * 0.06}s`;
