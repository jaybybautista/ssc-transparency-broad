import {
  FiGrid,
  FiBell,
  FiEdit2,
  FiCalendar,
  FiFileText,
  FiCheckSquare,
  FiBookOpen,
  FiFlag,
  FiClipboard,
  FiBook,
  FiAward,
  FiMail,
  FiUsers,
  FiSend,
  FiInbox,
  FiMessageSquare,
  FiArchive,
  FiClock,
  FiSettings
} from 'react-icons/fi';

/**
 * The admin sections, grouped.
 *
 * Nineteen buttons in one undivided column is a list you read top to bottom
 * every time rather than a menu you learn. Grouping them by the job being done
 * gives each item a fixed neighbourhood, so after a week the council reaches
 * for "third block, second item" without reading at all.
 *
 * `keywords` exist for the filter box: people search for the word they have in
 * mind, not the word on the button. Someone looking for the logo types "logo",
 * not "Site Profile".
 */
export const ADMIN_NAV = [
  {
    group: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: FiGrid, keywords: 'home summary stats overview' }]
  },
  {
    group: 'Publishing',
    items: [
      { id: 'announcements', label: 'Announcements', icon: FiBell, keywords: 'news post notice bulletin' },
      { id: 'drafts', label: 'Drafts & Scheduled', icon: FiEdit2, keywords: 'unpublished queue later schedule' },
      { id: 'events', label: 'Calendar Events', icon: FiCalendar, keywords: 'activity activities schedule date' }
    ]
  },
  {
    group: 'Governance',
    items: [
      { id: 'resolutions', label: 'Resolutions', icon: FiFileText, keywords: 'legislation motion passed' },
      { id: 'resolution-votes', label: 'Resolution Votes', icon: FiCheckSquare, keywords: 'voting tally ballot yes no' },
      { id: 'constitution', label: 'Constitution & By-Laws', icon: FiBookOpen, keywords: 'charter rules bylaws' },
      { id: 'memorandums', label: 'Memorandum Orders', icon: FiFlag, keywords: 'memo order directive circular' }
    ]
  },
  {
    group: 'Records',
    items: [
      { id: 'mom', label: 'Minutes of Meeting', icon: FiClipboard, keywords: 'minutes meeting notes session' },
      { id: 'narrative-reports', label: 'Narrative Reports', icon: FiBook, keywords: 'report writeup documentation' },
      { id: 'accomplishments', label: 'Accomplishments', icon: FiAward, keywords: 'achievement tracker progress' },
      { id: 'requests', label: 'Request Letters', icon: FiMail, keywords: 'letter template request form' }
    ]
  },
  {
    group: 'People',
    items: [
      { id: 'officers', label: 'Officers', icon: FiUsers, keywords: 'members council org chart photo' },
      { id: 'subscribers', label: 'Alert Subscribers', icon: FiSend, keywords: 'email list notify mailing' }
    ]
  },
  {
    group: 'Student Voice',
    items: [
      { id: 'tickets', label: 'Student Tickets', icon: FiInbox, keywords: 'concern complaint help support' },
      { id: 'suggestions', label: 'Suggestion Box', icon: FiMessageSquare, keywords: 'feedback idea comment' }
    ]
  },
  {
    group: 'System',
    items: [
      { id: 'academic-year', label: 'Academic Year', icon: FiArchive, keywords: 'term ay archive 2025 2026' },
      { id: 'audit-log', label: 'Activity Log', icon: FiClock, keywords: 'history audit trail who changed' },
      { id: 'site-profile', label: 'Site Profile', icon: FiSettings, keywords: 'logo mission vision contact settings branding chart' }
    ]
  }
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV.flatMap((section) => section.items);

/** The item plus the group it sits in, so the top bar can show both. */
export const findNavItem = (id) => {
  for (const section of ADMIN_NAV) {
    const item = section.items.find((entry) => entry.id === id);
    if (item) return { ...item, group: section.group };
  }
  return null;
};

const normalise = (value) => String(value || '').toLowerCase().trim();

/**
 * Filter the groups by a typed query, dropping any group left with nothing.
 * An empty query returns the menu untouched, so the filter costs nothing when
 * it is not being used.
 */
export const filterNav = (query) => {
  const needle = normalise(query);
  if (!needle) return ADMIN_NAV;
  return ADMIN_NAV.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        normalise(item.label).includes(needle) ||
        normalise(item.keywords).includes(needle) ||
        normalise(section.group).includes(needle)
    )
  })).filter((section) => section.items.length > 0);
};
