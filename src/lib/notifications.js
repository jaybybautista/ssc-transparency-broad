/**
 * Email alert preferences for the SSC Virtual Board.
 *
 * The board is a static React app with no mail server of its own, so a
 * subscription is a record rather than a delivery: the student's address and
 * chosen topics go into the `subscribers` collection, and an officer sends the
 * batch from Admin → Alert Subscribers. NOTIFICATIONS.md documents the Cloud
 * Function upgrade that would make the send automatic.
 *
 * The address and topic choices are also cached in localStorage so the panel can
 * show a returning student what they already signed up for, and offer to
 * unsubscribe, without the board having to expose the roster publicly.
 */

const PREFS_KEY = 'ssc_alert_prefs';

/** Topics a student can subscribe to. */
export const ALERT_TOPICS = [
  {
    id: 'urgentAnnouncements',
    label: 'Urgent announcements',
    hint: 'Pinned posts and anything filed as Important, Urgent or Emergency.'
  },
  {
    id: 'allAnnouncements',
    label: 'All announcements',
    hint: 'Every announcement, not just the urgent ones.'
  },
  {
    id: 'memorandums',
    label: 'Memorandum orders',
    hint: 'Official directives as soon as they are published.'
  },
  {
    id: 'events',
    label: 'New calendar activities',
    hint: 'When an activity is added to the calendar of activities.'
  },
  {
    id: 'resolutions',
    label: 'Resolutions open for voting',
    hint: 'So you can cast your vote before it closes.'
  }
];

export const DEFAULT_TOPICS = {
  urgentAnnouncements: true,
  allAnnouncements: false,
  memorandums: true,
  events: false,
  resolutions: false
};

const safeParse = (raw, fallback) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
};

export const loadAlertPrefs = () => {
  const stored = safeParse(localStorage.getItem(PREFS_KEY), {});
  return {
    email: typeof stored.email === 'string' ? stored.email : '',
    topics: { ...DEFAULT_TOPICS, ...(stored.topics || {}) }
  };
};

export const saveAlertPrefs = (prefs) => {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  // Lets the "Notify me" pill update itself; the native `storage` event only
  // fires in other tabs.
  window.dispatchEvent(new CustomEvent('ssc-alert-prefs-changed', { detail: prefs }));
};

/** Categories that count as urgent, used when choosing who to mail. */
const URGENT_PATTERN = /urgent|important|emergency|critical|advisory|suspension/i;

export const isUrgentAnnouncement = (item) =>
  Boolean(item?.isPinned) || URGENT_PATTERN.test(String(item?.category || ''));
