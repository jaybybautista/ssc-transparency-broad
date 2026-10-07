import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import {
  accomplishments as sampleAccomplishments,
  announcements as sampleAnnouncements,
  calendarEvents as sampleEvents,
  memorandumOrders as sampleMemorandums,
  minutesOfMeeting as sampleMeetings,
  narrativeReports as sampleNarrativeReports,
  officers as sampleOfficers,
  requestLetterTypes as sampleRequestTypes,
  resolutions as sampleResolutions
} from '../data/sampleData';
import { db, isFirebaseEnabled } from '../lib/firebase';
import { ALERT_TOPICS } from '../lib/notifications';
import { deleteRecordFiles } from '../lib/uploads';
import { recordAudit } from '../lib/auditLog';
import { registerView, subscribeToViewCounts, viewDocId } from '../lib/viewCounts';
import {
  academicYearBounds,
  academicYearOf,
  academicYearRange,
  defaultActiveYear
} from '../lib/academicYear';
import {
  normalizeSiteProfile,
  profileByteSize,
  PROFILE_SIZE_LIMIT
} from '../lib/siteProfile';
import { useVoterAuth } from './VoterAuthContext';

const DataContext = createContext(null);

/**
 * Normalises an image list: accepts either the modern `imageUrls` array or a
 * legacy single `imageUrl`, drops blanks, and removes duplicates.
 * The de-duplication matters because the edit forms pre-fill the "paste URLs"
 * box with the saved images, which would otherwise re-append them on each save.
 */
const normalizeImageUrls = (item) => {
  const list = Array.isArray(item.imageUrls)
    ? item.imageUrls
    : item.imageUrl
      ? [item.imageUrl]
      : [];
  return [...new Set(list.filter(Boolean).map((url) => String(url).trim()))];
};

/**
 * Author byline fields shared by meetings and narrative reports.
 * `authorOfficerId` links to the officers collection; the name/position/image
 * snapshot keeps the byline readable if that officer is later removed, and is
 * the only source for manually entered authors.
 */
const normalizeAuthor = (item) => ({
  authorOfficerId: item.authorOfficerId ? String(item.authorOfficerId) : '',
  authorName: item.authorName || '',
  authorPosition: item.authorPosition || '',
  authorImage: item.authorImage || ''
});

const normalizeAnnouncement = (item) => ({
  title: item.title || '',
  content: item.content || '',
  category: item.category || 'Admin Announcements',
  date: item.date || new Date().toISOString().split('T')[0],
  isPinned: Boolean(item.isPinned),
  imageUrls: normalizeImageUrls(item)
});

const normalizeEvent = (item) => ({
  title: item.title || '',
  date: item.date || new Date().toISOString().split('T')[0],
  time: item.time || '',
  location: item.location || '',
  description: item.description || '',
  status: (item.status || 'planned').toLowerCase(),
  category: item.category || 'Activity',
  imageUrls: normalizeImageUrls(item)
});

const normalizeResolution = (item) => ({
  number: item.number || '',
  title: item.title || '',
  description: item.description || '',
  date: item.date || new Date().toISOString().split('T')[0],
  status: (item.status || 'pending').toLowerCase(),
  votesFor: Number(item.votesFor) || 0,
  votesAgainst: Number(item.votesAgainst) || 0,
  abstain: Number(item.abstain ?? item.abstained) || 0,
  imageUrls: normalizeImageUrls(item),
  fileName: item.fileName || '',
  fileUrl: item.fileUrl || ''
});

const normalizeOfficer = (item, fallbackYear = '') => ({
  /*
   * Officers are the one content type with no date, so the academic year has to
   * be stored.
   *
   * The fallback is the year the board has declared, passed in by the caller,
   * and never the calendar's. Deriving it here stamped every officer saved
   * without an explicit year with whatever term the clock was in: save one in
   * September and it landed in a year that has held no election, where nobody
   * looking at the current council would ever see it.
   */
  academicYear: item.academicYear || fallbackYear,
  name: item.name || '',
  position: item.position || '',
  division: item.division || 'Core Officers',
  course: item.course || '',
  yearLevel: item.yearLevel || '',
  image: item.image || '',
  email: item.email || '',
  quote: item.quote || '',
  // Where the admin placed this officer in their section. null means nobody
  // has arranged that section, so it falls back to seniority of title.
  // Written as a number because 0 is a real position, not "unset".
  order: Number.isFinite(Number(item.order)) && item.order !== null && item.order !== ''
    ? Number(item.order)
    : null
});

const normalizeMeeting = (item) => ({
  title: item.title || '',
  date: item.date || new Date().toISOString().split('T')[0],
  attendees: Number(item.attendees) || 0,
  location: item.location || '',
  agenda: Array.isArray(item.agenda) ? item.agenda.filter(Boolean) : [],
  summary: item.summary || '',
  imageUrls: normalizeImageUrls(item),
  fileName: item.fileName || '',
  fileUrl: item.fileUrl || '',
  ...normalizeAuthor(item)
});

const normalizeAccomplishment = (item) => ({
  title: item.title || '',
  date: item.date || new Date().toISOString().split('T')[0],
  category: item.category || '',
  status: item.status || 'Upcoming',
  description: item.description || '',
  // Evidence. Without it an accomplishment is only the council's own account
  // of itself; the link and the photos are what make it a record.
  linkUrl: item.linkUrl || '',
  linkLabel: item.linkLabel || '',
  modifiedBy: item.modifiedBy || '',
  imageUrls: normalizeImageUrls(item)
});

const normalizeRequestType = (item) => ({
  type: item.type || '',
  description: item.description || '',
  requirements: Array.isArray(item.requirements) ? item.requirements.filter(Boolean) : [],
  templateName: item.templateName || '',
  templateUrl: item.templateUrl || '',
  imageUrls: normalizeImageUrls(item)
});

const normalizeMemorandum = (item) => ({
  number: item.number || '',
  title: item.title || '',
  date: item.date || new Date().toISOString().split('T')[0],
  effectiveDate: item.effectiveDate || new Date().toISOString().split('T')[0],
  description: item.description || '',
  pdfUrl: item.pdfUrl || ''
});

const normalizeConstitutionDoc = (item) => ({
  title: item.title || '',
  category: item.category || 'Constitution',
  version: item.version || '',
  effectiveDate: item.effectiveDate || new Date().toISOString().split('T')[0],
  description: item.description || '',
  fileName: item.fileName || '',
  fileUrl: item.fileUrl || ''
});

const normalizeNarrativeReport = (item) => ({
  title: item.title || '',
  date: item.date || new Date().toISOString().split('T')[0],
  event: item.event || item.eventType || '',
  eventType: item.eventType || item.event || '',
  participants: Number(item.participants) || 0,
  summary: item.summary || item.description || '',
  description: item.description || item.summary || '',
  imageUrls: normalizeImageUrls(item),
  fileName: item.fileName || '',
  fileUrl: item.fileUrl || '',
  ...normalizeAuthor(item)
});

/**
 * Unpublished announcements — drafts and scheduled posts.
 *
 * They live in their OWN collection rather than as a flag on `announcements`,
 * which matters for three reasons:
 *
 *  1. Privacy is real. A collection admins alone may read cannot leak; a flag
 *     on a world-readable document can be read straight off the API however the
 *     UI chooses to hide it.
 *  2. No migration. A `where('isDraft','==',false)` filter would silently omit
 *     every announcement written before the field existed — the same trap as
 *     ordering by a field some documents lack.
 *  3. No composite index, and no clash with the academic-year range filter,
 *     which already uses this query's one permitted range field.
 *
 * Publishing moves the document across. See publishScheduledDrafts for the one
 * honest limitation of scheduling without a server.
 */
const normalizeDraft = (item) => ({
  ...normalizeAnnouncement(item),
  // ISO datetime, or '' for a plain draft with no scheduled time.
  publishAt: item.publishAt || '',
  savedBy: item.savedBy || ''
});

export const TICKET_TYPES = [
  'General Inquiry',
  'Venue Reservation Request',
  'Equipment Borrowing Request',
  'Formal Grievance',
  'Document Request',
  'Other'
];

export const TICKET_STATUSES = ['new', 'in-progress', 'resolved', 'closed'];

export const SUGGESTION_CATEGORIES = [
  'Policy Suggestion',
  'Facilities',
  'Academics',
  'Student Services',
  'Events & Activities',
  'Other'
];

/**
 * Human-readable, unguessable reference code, also used as the document id.
 *
 * Because the id is the secret, firestore.rules can allow a single-document
 * `get` (so a student can track their own ticket with the code) while still
 * denying `list` to everyone but admins — nobody can browse other people's
 * grievances.
 */
export const generateReferenceCode = () => {
  // Avoids look-alike characters (0/O, 1/I) so codes are easy to read out.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (count) => {
    const values = new Uint32Array(count);
    (window.crypto || window.msCrypto).getRandomValues(values);
    return Array.from(values, (v) => alphabet[v % alphabet.length]).join('');
  };
  return `SSC-${pick(4)}-${pick(4)}`;
};

const normalizeTicket = (item) => ({
  referenceCode: item.referenceCode || '',
  type: TICKET_TYPES.includes(item.type) ? item.type : 'General Inquiry',
  subject: item.subject || '',
  message: item.message || '',
  studentName: item.studentName || '',
  studentEmail: item.studentEmail || '',
  program: item.program || '',
  yearLevel: item.yearLevel || '',
  status: TICKET_STATUSES.includes(item.status) ? item.status : 'new',
  adminResponse: item.adminResponse || ''
});

const normalizeSuggestion = (item) => ({
  category: SUGGESTION_CATEGORIES.includes(item.category) ? item.category : 'Other',
  message: item.message || '',
  status: item.status === 'reviewed' ? 'reviewed' : 'new'
});

/**
 * Email alert subscriptions.
 *
 * The document id is the lowercased email address. That makes re-subscribing
 * idempotent (it updates the same record instead of creating a duplicate) and
 * lets a student unsubscribe themselves without needing an account or a token
 * mailed to them.
 */
const normalizeSubscriber = (item) => ({
  email: String(item.email || '').trim().toLowerCase(),
  name: String(item.name || '').trim().slice(0, 120),
  program: String(item.program || '').trim().slice(0, 120),
  topics: ALERT_TOPICS.reduce((acc, topic) => {
    acc[topic.id] = Boolean(item.topics?.[topic.id]);
    return acc;
  }, {})
});

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());

export const VOTE_CHOICES = ['for', 'against', 'abstain'];

/**
 * One vote document per account per resolution.
 * The id is derived rather than random so a second vote from the same account
 * overwrites the first instead of adding another — duplicate voting is
 * impossible by construction, and firestore.rules pins the id to the caller's
 * own uid so nobody can write a vote in someone else's name.
 */
export const voteDocId = (resolutionId, uid) => `${resolutionId}__${uid}`;

/**
 * How many documents each public collection loads at a time.
 *
 * Before this existed, every listener pulled its entire collection on every page
 * load and sorted client-side. Fine at a few dozen documents; at several hundred
 * — especially with images embedded as base64 data URLs — it is a slow first
 * paint and a large share of the free Firestore read quota, on every visit.
 */
export const PAGE_SIZE = 60;

/**
 * The listener table.
 *
 * `orderField` moves the sort to the server so `limit` returns the *newest*
 * documents rather than an arbitrary slice.
 *
 * Two things to know before adding a row:
 *
 *  1. A Firestore `orderBy` **silently omits documents that lack that field**.
 *     Only fields the normalisers always write are safe here — every
 *     `normalize*` above defaults `date`/`effectiveDate`, which is what makes
 *     this sound. `officers` and `requestTypes` have no date at all, so they get
 *     a cap and no ordering.
 *  2. `sort` is still applied client-side, because the display order is not
 *     always the fetch order: events are fetched newest-first so the limit keeps
 *     upcoming activities, then flipped to chronological for the calendar.
 */
const PUBLIC_COLLECTIONS = [
  { key: 'announcements', orderField: 'date', direction: 'desc', label: 'announcements', yearScoped: true },
  {
    key: 'events',
    orderField: 'date',
    direction: 'desc',
    label: 'calendar events',
    yearScoped: true,
    // Fetch latest-dated first (so upcoming activities survive the limit),
    // display oldest-first (so the calendar reads chronologically).
    sort: (a, b) => new Date(a.date) - new Date(b.date)
  },
  { key: 'resolutions', orderField: 'date', direction: 'desc', label: 'resolutions', yearScoped: true },
  {
    key: 'officers',
    label: 'officers',
    // Officers are a bounded set, one council per year, and both pages show
    // everybody at once with no Load More to reach past a cap. At 49 of 60 the
    // council was one round of committee appointments away from an officer
    // silently not existing on the site.
    pageSize: 400
  },
  { key: 'meetings', orderField: 'date', direction: 'desc', label: 'meeting records', yearScoped: true },
  { key: 'accomplishments', orderField: 'date', direction: 'desc', label: 'accomplishments', yearScoped: true },
  { key: 'requestTypes', label: 'request letter types' },
  { key: 'memorandums', orderField: 'date', direction: 'desc', label: 'memorandums', yearScoped: true },
  { key: 'narrativeReports', orderField: 'date', direction: 'desc', label: 'narrative reports', yearScoped: true },
  { key: 'constitution', orderField: 'effectiveDate', direction: 'desc', label: 'constitution documents' }
];

/** How long a deleted record can be brought back. See deleteWithUndo. */
const UNDO_WINDOW_MS = 15000;

/**
 * Deletes a document and hands back what it contained.
 *
 * The uploaded files are deliberately NOT removed here. Deleting a record is
 * the one action on this board that cannot be repaired by retyping it, so the
 * caller holds the file cleanup open for the length of the undo window and only
 * bins the files once the record can no longer come back. Binning them
 * immediately would make "Undo" restore a record whose images had already gone.
 *
 * Reads the record rather than looking it up in local state: the listeners are
 * paginated, so a document outside the current page would not be found in the
 * array, and both its files and its undo would be lost silently.
 */
const removeDoc = async (collectionName, id) => {
  const reference = doc(db, collectionName, String(id));

  let record = null;
  try {
    const snapshot = await getDoc(reference);
    if (snapshot.exists()) record = snapshot.data();
  } catch (error) {
    // Fall through — losing the undo is better than blocking a delete.
  }

  await deleteDoc(reference);
  recordAudit('delete', collectionName, id, record);
  return record;
};

export const DataProvider = ({ children }) => {
  // Tickets and suggestions are only readable by verified admins, so the
  // listeners below stay closed until an admin is signed in.
  const { isSscAdmin } = useVoterAuth();

  // Sample data is demo content for running without Firebase. When the cloud
  // database IS configured we start empty and show exactly what it contains —
  // otherwise deleted records would appear to come back until the first
  // snapshot arrives.
  const seed = (sample) => (isFirebaseEnabled ? [] : sample);

  const [announcements, setAnnouncements] = useState(() => seed(sampleAnnouncements));
  const [events, setEvents] = useState(() => seed(sampleEvents));
  const [resolutions, setResolutions] = useState(() => seed(sampleResolutions));
  const [officers, setOfficers] = useState(() => seed(sampleOfficers));
  const [meetings, setMeetings] = useState(() => seed(sampleMeetings));
  const [accomplishments, setAccomplishments] = useState(() => seed(sampleAccomplishments));
  const [requestTypes, setRequestTypes] = useState(() => seed(sampleRequestTypes));
  const [memorandums, setMemorandums] = useState(() => seed(sampleMemorandums));
  const [narrativeReports, setNarrativeReports] = useState(() => seed(sampleNarrativeReports));
  const [constitutionDocs, setConstitutionDocs] = useState([]);
  const [resolutionVotes, setResolutionVotes] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [viewCounts, setViewCounts] = useState({});
  /**
   * Which collections have received their first answer from Firestore.
   *
   * Until a listener reports, its array is empty, and an empty array on screen
   * reads as "the council has posted nothing". Pages ask isCollectionLoading()
   * so they can show a placeholder instead. A failed listener also counts as
   * answered, so a broken connection ends in the error message rather than a
   * placeholder that never goes away.
   */
  const [loadedCollections, setLoadedCollections] = useState({});
  const markLoaded = (key) =>
    setLoadedCollections((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  const isCollectionLoading = useCallback(
    (key) => isFirebaseEnabled && !!db && !loadedCollections[key],
    [loadedCollections]
  );
  const isLoading = PUBLIC_COLLECTIONS.some((config) => isCollectionLoading(config.key));
  const [error, setError] = useState('');

  /**
   * Per-collection fetch ceiling. Raised by loadMore(), which re-subscribes that
   * one listener with a larger limit.
   */
  const [limits, setLimits] = useState(() =>
    PUBLIC_COLLECTIONS.reduce((acc, config) => ({ ...acc, [config.key]: PAGE_SIZE }), {})
  );

  /**
   * True when a collection's last snapshot filled its limit exactly, i.e. there
   * are probably more documents behind it. Cheaper than a count query, and the
   * only cost of being wrong is one "Load more" that returns nothing new.
   */
  const [hasMore, setHasMore] = useState({});

  /**
   * Which academic year the board is showing. Defaults to the current one, so a
   * student always lands on this council's work.
   */
  /*
   * Empty until the board's own year is known, never seeded from the clock.
   * An empty year means "not established yet" and is treated everywhere as
   * "do not filter", so the board shows everything rather than briefly
   * claiming a term nobody declared.
   */
  const [selectedYear, setSelectedYear] = useState('');

  /** Earliest year with any content, discovered once (see the effect below). */
  const [earliestYear, setEarliestYear] = useState('');

  /**
   * The academic year the board presents as "current".
   *
   * Deliberately a stored setting rather than a calculation. Deriving it from
   * the calendar means the board silently empties itself the morning the new
   * academic year begins — before the incoming council has posted anything, and
   * while the outgoing one may not have handed over. Councils change over on
   * their own schedule, so the switch is theirs to throw.
   *
   * Falls back to the derived year until an admin sets it.
   */
  const [storedActiveYear, setStoredActiveYear] = useState('');

  /**
   * The council's own details (name, logos, contact, mission).
   *
   * Held raw and normalised on read, so the defaults in siteProfile.js stay the
   * single source of "what the site shows when this has never been edited".
   */
  const [storedProfile, setStoredProfile] = useState(null);

  /**
   * The year the board opens on.
   *
   * Precedence:
   *   1. What an admin has declared in settings/board. This is the real answer
   *      and the only thing that ever advances the board to a new term.
   *   2. Otherwise the earliest year that has content, which — because the
   *      running term has no upper bound (see academicYearBounds) — holds
   *      everything posted since. Nothing is hidden while nobody has declared.
   *   3. Nothing. An empty year filters nothing and claims nothing, which is
   *      the honest answer when no term has been declared and there is no
   *      content to infer one from.
   *
   * The board deliberately does not infer a handover. Two earlier versions
   * tried, from the calendar and then from the newest post, and both announced
   * a term that had held no election and had no officers, hiding the sitting
   * council's own work from its own board.
   */
  const activeYear = storedActiveYear || defaultActiveYear(earliestYear);

  /** Set once the visitor picks a year, so the stored setting stops overriding. */
  const hasChosenYearRef = useRef(false);

  /**
   * The same fact as the ref above, as state.
   *
   * A ref cannot be depended on, and the difference matters to any view that
   * reacts to the year rather than merely reading it: the calendar moves its
   * grid to the year you pick, and must be able to tell a deliberate pick from
   * the board settling on its default during load. Treating the settle as a
   * pick would drag the grid off today's month on every page load.
   */
  const [hasChosenYear, setHasChosenYear] = useState(false);

  const chooseYear = (year) => {
    hasChosenYearRef.current = true;
    setHasChosenYear(true);
    setSelectedYear(year);
  };

  /** The council's details, with every unset field falling back to the built-in. */
  const siteProfile = useMemo(() => normalizeSiteProfile(storedProfile), [storedProfile]);

  /**
   * Saves the council's details. Admin only.
   *
   * Written as a whole document rather than merged: the form edits every field
   * at once, and a merge would leave a cleared logo in place, since the empty
   * string that means "go back to the bundled logo" reads to merge as a value
   * worth keeping.
   */
  const updateSiteProfile = async (profile) => {
    if (!isFirebaseEnabled || !db) throw new Error('The cloud database is not configured.');

    const payload = normalizeSiteProfile(profile);
    const size = profileByteSize(payload);
    if (size > PROFILE_SIZE_LIMIT) {
      // Caught here rather than letting Firestore refuse the write, so the
      // message names the cause — almost always a logo pasted in as a data URL
      // because Storage is off — instead of surfacing a raw API error after the
      // whole form has been filled in.
      throw new Error(
        `These details come to ${Math.round(size / 1024)}KB, over the ${Math.round(
          PROFILE_SIZE_LIMIT / 1024
        )}KB a single record can hold. A logo is the usual cause: use a smaller image, or paste a link to one instead of uploading it.`
      );
    }

    await setDoc(doc(db, 'settings', 'profile'), { ...payload, updatedAt: serverTimestamp() });
    recordAudit('settings', 'settings', 'profile', { title: 'Site profile updated' });
  };

  /** Declares which year the board presents as current. Admin only. */
  const setActiveAcademicYear = async (year) => {
    if (!isFirebaseEnabled || !db) return;
    await setDoc(
      doc(db, 'settings', 'board'),
      { activeAcademicYear: year, updatedAt: serverTimestamp() },
      { merge: true }
    );
    recordAudit('settings', 'settings', 'board', { title: `Active academic year set to ${year}` });
    hasChosenYearRef.current = false;
    setHasChosenYear(false);
    setSelectedYear(year);
  };

  useEffect(() => {
    if (!isFirebaseEnabled || !db) {
      return undefined;
    }

    const setters = {
      announcements: setAnnouncements,
      events: setEvents,
      resolutions: setResolutions,
      officers: setOfficers,
      meetings: setMeetings,
      accomplishments: setAccomplishments,
      requestTypes: setRequestTypes,
      memorandums: setMemorandums,
      narrativeReports: setNarrativeReports,
      constitution: setConstitutionDocs
    };

    const byNewestDate = (field) => (a, b) => new Date(b[field]) - new Date(a[field]);

    const unsubscribers = PUBLIC_COLLECTIONS.map((config) => {
      const cap = limits[config.key] ?? config.pageSize ?? PAGE_SIZE;

      /*
       * Academic-year scoping happens here, on the server.
       *
       * The range is applied to the very field the query already orders by, so
       * Firestore needs no composite index and no new field had to be added to
       * a single existing document — the date a record carries is what decides
       * which council's year it belongs to.
       *
       * Collections without an orderField (officers) cannot be filtered this
       * way and are scoped client-side instead; standing documents (the
       * constitution, request-letter templates) are not year-scoped at all,
       * because hiding the by-laws while browsing an earlier year would be
       * worse than useless.
       *
       * Signed-in admins are never scoped. Year filtering is a reading aid for
       * students; for the officer maintaining the board it is a trap. An event
       * saved with a date outside the shown year vanished from the calendar AND
       * from the dashboard list, with no error and nothing to click — the save
       * had worked, but every view that could have confirmed it was filtered.
       * Whoever is responsible for the content has to be able to see all of it.
       */
      const bounds =
        config.yearScoped && !isSscAdmin
          ? academicYearBounds(selectedYear, { openEnded: selectedYear === activeYear })
          : null;

      // orderBy would drop documents missing the field, so collections without a
      // date get a bare cap instead.
      const constraints = config.orderField
        ? [
            ...(bounds ? [where(config.orderField, '>=', bounds.start)] : []),
            // No upper bound on the running term: it holds everything from its
            // first day onward until a later year is declared current.
            ...(bounds?.end ? [where(config.orderField, '<=', bounds.end)] : []),
            orderBy(config.orderField, config.direction || 'desc'),
            limit(cap)
          ]
        : [limit(cap)];

      const sortFn = config.sort || (config.orderField ? byNewestDate(config.orderField) : null);

      return onSnapshot(
        query(collection(db, config.key), ...constraints),
        (snapshot) => {
          const list = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
          setters[config.key](sortFn ? [...list].sort(sortFn) : list);
          setHasMore((prev) => ({ ...prev, [config.key]: snapshot.size >= cap }));
          markLoaded(config.key);
        },
        () => {
          setError(`Failed to load ${config.label} from cloud database.`);
          markLoaded(config.key);
        }
      );
    });

    /*
     * Votes are deliberately NOT limited.
     *
     * Every tally on the resolutions page is derived from these documents, so a
     * limit would not slow the page down — it would make the counts wrong, and
     * wrong quietly. One document per account per resolution means this is the
     * collection most likely to grow large, and the real fix is a maintained
     * counter per resolution (or a server-side aggregation query) rather than
     * truncating the source. Until then, correctness wins over payload size.
     */
    const unsubResolutionVotes = onSnapshot(
      collection(db, 'resolutionVotes'),
      (snapshot) => {
        setResolutionVotes(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      () => setError('Failed to load resolution votes from cloud database.')
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubResolutionVotes();
    };
    // activeYear belongs here: it decides whether the shown year is the running
    // term (open-ended) or a closed archive, so declaring a new year has to
    // resubscribe every listener with the new bounds.
  }, [limits, selectedYear, isSscAdmin, activeYear]);

  // Switching year starts that year's browsing from the first page again, and
  // shows the placeholder rather than the previous year's records until the new
  // year's arrive.
  useEffect(() => {
    setLimits(PUBLIC_COLLECTIONS.reduce((acc, config) => ({ ...acc, [config.key]: PAGE_SIZE }), {}));
    setLoadedCollections((prev) => {
      const next = { ...prev };
      PUBLIC_COLLECTIONS.forEach((config) => {
        if (config.yearScoped) delete next[config.key];
      });
      return next;
    });
  }, [selectedYear]);

  /**
   * Finds the oldest content so the year switcher only offers years that could
   * actually have something in them.
   *
   * One ascending, single-document query per dated collection — a handful of
   * reads, once per session, against the hundreds this used to spend loading
   * every collection in full on every page load.
   */
  useEffect(() => {
    if (!isFirebaseEnabled || !db) return;

    let cancelled = false;

    (async () => {
      const dated = PUBLIC_COLLECTIONS.filter((config) => config.yearScoped);

      const edge = async (config, direction) => {
        try {
          const snapshot = await getDocs(
            query(collection(db, config.key), orderBy(config.orderField, direction), limit(1))
          );
          return snapshot.docs[0]?.data()?.[config.orderField] || '';
        } catch (error) {
          return '';
        }
      };

      const oldest = await Promise.all(dated.map((config) => edge(config, 'asc')));

      if (cancelled) return;

      // The earliest dated record is both ends of the answer: it bounds the
      // year switcher, and until an admin declares a year it *is* the year the
      // board opens on. Nothing here tries to work out whether a handover has
      // happened — see defaultActiveYear.
      const earliestDate = oldest.filter(Boolean).sort()[0];
      if (earliestDate) {
        const year = academicYearOf(earliestDate);
        if (year) setEarliestYear(year);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // The board's declared current year, kept in one shared document.
  useEffect(() => {
    if (!isFirebaseEnabled || !db) return undefined;

    return onSnapshot(
      doc(db, 'settings', 'board'),
      (snapshot) => {
        setStoredActiveYear((snapshot.exists() && snapshot.data()?.activeAcademicYear) || '');
      },
      () => {
        /* No settings document yet: the derived year stands. */
      }
    );
  }, []);

  // The council's details. Public, like everything else it describes.
  useEffect(() => {
    if (!isFirebaseEnabled || !db) return undefined;

    return onSnapshot(
      doc(db, 'settings', 'profile'),
      (snapshot) => setStoredProfile(snapshot.exists() ? snapshot.data() : null),
      () => {
        /* Never edited, or unreadable: the built-in details stand. */
      }
    );
  }, []);

  /*
   * Keep the shown year on the active one until the visitor chooses otherwise.
   * Both inputs to activeYear arrive asynchronously, so this reacts to the
   * resolved value rather than to whichever snapshot happened to land first.
   */
  useEffect(() => {
    if (!hasChosenYearRef.current) setSelectedYear(activeYear);
  }, [activeYear]);

  // Shared view counts. Public, like the tallies they resemble.
  useEffect(() => subscribeToViewCounts(setViewCounts), []);

  /** Newest first, current year at the top. */
  const availableYears = useMemo(
    // Capped at the active year: a term that has not begun would otherwise be
    // offered as a destination with nothing in it.
    () => academicYearRange(earliestYear, activeYear),
    [earliestYear, activeYear]
  );

  /** Fetch another page of one collection. */
  const loadMore = (collectionKey) => {
    setLimits((prev) => ({ ...prev, [collectionKey]: (prev[collectionKey] ?? PAGE_SIZE) + PAGE_SIZE }));
  };

  /*
   * Undo for deletes.
   *
   * Everything else an officer does can be repaired by editing the record
   * again. A delete cannot: the document is gone, and on a board that is the
   * council's own record of its term, that is not recoverable by retyping.
   *
   * So a delete keeps the document's contents in memory for a short window and
   * offers to write them back under the same id. The id matters — restoring
   * under a new one would break the reference code on a ticket, the vote tally
   * keyed to a resolution, and the view count keyed to the record.
   *
   * The window also gates the file cleanup (see removeDoc), so an undo brings
   * the record back whole rather than with broken images.
   */
  const [undoableDelete, setUndoableDelete] = useState(null);
  const undoTimerRef = useRef(null);

  /*
   * The pending record is held in a ref as well as in state.
   *
   * State is what renders the toast; the ref is what the callbacks read. That
   * split keeps `undoDelete` and `dismissUndo` stable across renders — they
   * close over nothing that goes stale — which matters because the toast holds
   * on to them while a timer is running underneath it.
   */
  const pendingUndoRef = useRef(null);

  const clearUndo = useCallback(() => {
    clearTimeout(undoTimerRef.current);
    pendingUndoRef.current = null;
    setUndoableDelete(null);
  }, []);

  useEffect(() => () => clearTimeout(undoTimerRef.current), []);

  const deleteWithUndo = useCallback(async (collectionName, id, label) => {
    const record = await removeDoc(collectionName, id);
    if (!record) return;

    const pending = {
      collectionName,
      id: String(id),
      data: record,
      label: label || record.title || record.name || record.number || record.type || 'record',
      at: Date.now()
    };

    clearTimeout(undoTimerRef.current);
    pendingUndoRef.current = pending;
    setUndoableDelete(pending);

    undoTimerRef.current = setTimeout(() => {
      // The window has closed: the record is now genuinely gone, so the files
      // it owned can go too.
      deleteRecordFiles(record).catch(() => {
        /* an orphaned object is housekeeping, never a failed delete */
      });
      pendingUndoRef.current = null;
      setUndoableDelete(null);
    }, UNDO_WINDOW_MS);
  }, []);

  /** Writes the last deleted record back under its original id. */
  const undoDelete = useCallback(async () => {
    const pending = pendingUndoRef.current;
    if (!pending || !isFirebaseEnabled || !db) return false;

    // The write comes first. Clearing the offer before it succeeded would take
    // away the only remaining copy of the record the moment a restore failed —
    // a refused write or a dropped connection would lose the very thing this
    // exists to protect. The countdown is stopped, though, so the files are not
    // binned underneath a restore that is still in flight.
    clearTimeout(undoTimerRef.current);
    await setDoc(doc(db, pending.collectionName, pending.id), pending.data);

    clearUndo();
    // Logged as its own action rather than erasing the delete: the audit log is
    // append-only on purpose, and "deleted, then restored" is what happened.
    recordAudit('create', pending.collectionName, pending.id, pending.data);
    return true;
  }, [clearUndo]);

  /** Declines the offer, which lets the file cleanup go ahead now. */
  const dismissUndo = useCallback(() => {
    const pending = pendingUndoRef.current;
    clearUndo();
    if (pending?.data) {
      deleteRecordFiles(pending.data).catch(() => {});
    }
  }, [clearUndo]);



  const createAnnouncement = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeAnnouncement(payload) };
      setAnnouncements((prev) => [newItem, ...prev]);
      return;
    }
    const created = await addDoc(collection(db, 'announcements'), normalizeAnnouncement(payload));
    recordAudit('create', 'announcements', created.id, payload);
  };

  const updateAnnouncement = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setAnnouncements((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeAnnouncement(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'announcements', String(id)), normalizeAnnouncement(payload));
    recordAudit('update', 'announcements', id, payload);
  };

  const deleteAnnouncement = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setAnnouncements((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await deleteWithUndo('announcements', id, 'announcement');
  };

  const createEvent = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeEvent(payload) };
      setEvents((prev) => [...prev, newItem]);
      return;
    }
    const created = await addDoc(collection(db, 'events'), normalizeEvent(payload));
    recordAudit('create', 'events', created.id, payload);
  };

  const updateEvent = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setEvents((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeEvent(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'events', String(id)), normalizeEvent(payload));
    recordAudit('update', 'events', id, payload);
  };

  const deleteEvent = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setEvents((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await deleteWithUndo('events', id, 'event');
  };

  const createResolution = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeResolution(payload) };
      setResolutions((prev) => [newItem, ...prev]);
      return;
    }
    const created = await addDoc(collection(db, 'resolutions'), normalizeResolution(payload));
    recordAudit('create', 'resolutions', created.id, payload);
  };

  const updateResolution = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setResolutions((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeResolution(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'resolutions', String(id)), normalizeResolution(payload));
    recordAudit('update', 'resolutions', id, payload);
  };

  const deleteResolution = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setResolutions((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await deleteWithUndo('resolutions', id, 'resolution');
  };

  const createOfficer = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeOfficer(payload, activeYear) };
      setOfficers((prev) => [...prev, newItem]);
      return;
    }
    const created = await addDoc(collection(db, 'officers'), normalizeOfficer(payload, activeYear));
    recordAudit('create', 'officers', created.id, payload);
  };

  const updateOfficer = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setOfficers((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...normalizeOfficer(payload, activeYear) } : item))
      );
      return;
    }
    await updateDoc(doc(db, 'officers', String(id)), normalizeOfficer(payload, activeYear));
    recordAudit('update', 'officers', id, payload);
  };

  const deleteOfficer = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setOfficers((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await deleteWithUndo('officers', id, 'officer');
  };

  /**
   * Save a hand-arranged section.
   *
   * Takes the small list of {id, order} that orderUpdates worked out, and
   * writes only the `order` field: a full normalizeOfficer round trip here
   * would rewrite every field of every moved officer from whatever the caller
   * happened to be holding, which is how a stale photo or email gets restored
   * by someone merely dragging a name up one place.
   */
  const reorderOfficers = async (updates = []) => {
    if (!updates.length) return;
    if (!isFirebaseEnabled || !db) {
      const byId = new Map(updates.map((entry) => [entry.id, entry.order]));
      setOfficers((prev) =>
        prev.map((item) => (byId.has(item.id) ? { ...item, order: byId.get(item.id) } : item))
      );
      return;
    }
    await Promise.all(
      updates.map((entry) => updateDoc(doc(db, 'officers', String(entry.id)), { order: entry.order }))
    );
    recordAudit('update', 'officers', updates.map((entry) => entry.id).join(','), {
      reordered: updates.length
    });
  };

  const createMeeting = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeMeeting(payload) };
      setMeetings((prev) => [newItem, ...prev]);
      return;
    }
    const created = await addDoc(collection(db, 'meetings'), normalizeMeeting(payload));
    recordAudit('create', 'meetings', created.id, payload);
  };

  const updateMeeting = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setMeetings((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeMeeting(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'meetings', String(id)), normalizeMeeting(payload));
    recordAudit('update', 'meetings', id, payload);
  };

  const deleteMeeting = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setMeetings((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await deleteWithUndo('meetings', id, 'meeting record');
  };

  const createAccomplishment = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeAccomplishment(payload) };
      setAccomplishments((prev) => [newItem, ...prev]);
      return;
    }
    const created = await addDoc(collection(db, 'accomplishments'), normalizeAccomplishment(payload));
    recordAudit('create', 'accomplishments', created.id, payload);
  };

  const updateAccomplishment = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setAccomplishments((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeAccomplishment(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'accomplishments', String(id)), normalizeAccomplishment(payload));
    recordAudit('update', 'accomplishments', id, payload);
  };

  const deleteAccomplishment = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setAccomplishments((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await deleteWithUndo('accomplishments', id, 'accomplishment');
  };

  const createRequestType = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeRequestType(payload) };
      setRequestTypes((prev) => [...prev, newItem]);
      return;
    }
    const created = await addDoc(collection(db, 'requestTypes'), normalizeRequestType(payload));
    recordAudit('create', 'requestTypes', created.id, payload);
  };

  const updateRequestType = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setRequestTypes((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeRequestType(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'requestTypes', String(id)), normalizeRequestType(payload));
    recordAudit('update', 'requestTypes', id, payload);
  };

  const deleteRequestType = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setRequestTypes((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await deleteWithUndo('requestTypes', id, 'request letter type');
  };

  const createMemorandum = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeMemorandum(payload) };
      setMemorandums((prev) => [newItem, ...prev]);
      return;
    }
    const created = await addDoc(collection(db, 'memorandums'), normalizeMemorandum(payload));
    recordAudit('create', 'memorandums', created.id, payload);
  };

  const updateMemorandum = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setMemorandums((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeMemorandum(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'memorandums', String(id)), normalizeMemorandum(payload));
    recordAudit('update', 'memorandums', id, payload);
  };

  const deleteMemorandum = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setMemorandums((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await deleteWithUndo('memorandums', id, 'memorandum');
  };

  const createNarrativeReport = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeNarrativeReport(payload) };
      setNarrativeReports((prev) => [newItem, ...prev]);
      return;
    }
    const created = await addDoc(collection(db, 'narrativeReports'), normalizeNarrativeReport(payload));
    recordAudit('create', 'narrativeReports', created.id, payload);
  };

  const updateNarrativeReport = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setNarrativeReports((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeNarrativeReport(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'narrativeReports', String(id)), normalizeNarrativeReport(payload));
    recordAudit('update', 'narrativeReports', id, payload);
  };

  const deleteNarrativeReport = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setNarrativeReports((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await deleteWithUndo('narrativeReports', id, 'narrative report');
  };

  const createConstitutionDoc = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      setConstitutionDocs((prev) => [{ id: Date.now(), ...normalizeConstitutionDoc(payload) }, ...prev]);
      return;
    }
    const created = await addDoc(collection(db, 'constitution'), normalizeConstitutionDoc(payload));
    recordAudit('create', 'constitution', created.id, payload);
  };

  const updateConstitutionDoc = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setConstitutionDocs((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...normalizeConstitutionDoc(payload) } : item))
      );
      return;
    }
    await updateDoc(doc(db, 'constitution', String(id)), normalizeConstitutionDoc(payload));
    recordAudit('update', 'constitution', id, payload);
  };

  const deleteConstitutionDoc = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setConstitutionDocs((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await deleteWithUndo('constitution', id, 'constitution document');
  };

  // Admin-only listeners. Kept in their own effect so they attach and detach
  // with the admin session rather than on mount.
  useEffect(() => {
    if (!isFirebaseEnabled || !db || !isSscAdmin) {
      setTickets([]);
      setSuggestions([]);
      setSubscribers([]);
      setDrafts([]);
      setAuditLog([]);
      return undefined;
    }

    const sortByNewest = (list) =>
      list.sort((a, b) => {
        const at = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const bt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return bt - at;
      });

    const unsubTickets = onSnapshot(
      collection(db, 'tickets'),
      (snapshot) => setTickets(sortByNewest(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))),
      () => setError('Failed to load student tickets.')
    );

    const unsubSuggestions = onSnapshot(
      collection(db, 'suggestions'),
      (snapshot) => setSuggestions(sortByNewest(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))),
      () => setError('Failed to load suggestions.')
    );

    // Subscriber addresses are personal data, so the roster is admin-only for
    // the same reason tickets are.
    const unsubSubscribers = onSnapshot(
      collection(db, 'subscribers'),
      (snapshot) => setSubscribers(sortByNewest(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))),
      () => setError('Failed to load alert subscribers.')
    );

    // Unpublished announcements. Admin-only by collection, so a draft cannot be
    // read off the API by anyone else however the UI behaves.
    const unsubDrafts = onSnapshot(
      collection(db, 'announcementDrafts'),
      (snapshot) => setDrafts(sortByNewest(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))),
      () => setError('Failed to load announcement drafts.')
    );

    // Append-only history of admin actions.
    const unsubAudit = onSnapshot(
      query(collection(db, 'auditLog'), orderBy('at', 'desc'), limit(200)),
      (snapshot) => setAuditLog(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setError('Failed to load the audit log.')
    );

    return () => {
      unsubTickets();
      unsubSuggestions();
      unsubSubscribers();
      unsubDrafts();
      unsubAudit();
    };
  }, [isSscAdmin]);

  // ---- drafts and scheduling ----

  const saveDraft = async (payload, id = null) => {
    if (!isFirebaseEnabled || !db) throw new Error('The cloud database is not configured.');
    const body = { ...normalizeDraft(payload), updatedAt: serverTimestamp() };
    if (id) {
      await updateDoc(doc(db, 'announcementDrafts', String(id)), body);
      return String(id);
    }
    const created = await addDoc(collection(db, 'announcementDrafts'), {
      ...body,
      createdAt: serverTimestamp()
    });
    return created.id;
  };

  const deleteDraft = async (id) => {
    if (!isFirebaseEnabled || !db) return;
    await deleteDoc(doc(db, 'announcementDrafts', String(id)));
  };

  /** Moves a draft into the public collection. */
  const publishDraft = async (draft) => {
    if (!isFirebaseEnabled || !db) throw new Error('The cloud database is not configured.');
    await addDoc(collection(db, 'announcements'), {
      ...normalizeAnnouncement(draft),
      // Publishing dates the post now, not whenever it was first drafted.
      date: new Date().toISOString().split('T')[0]
    });
    await deleteDoc(doc(db, 'announcementDrafts', String(draft.id)));
    recordAudit('publish', 'announcements', draft.id, draft);
  };

  /**
   * Publishes any scheduled draft whose time has passed.
   *
   * The honest limitation of scheduling on a site with no server: nothing can
   * run at 08:00 on Monday by itself. This runs whenever an admin opens the
   * dashboard, so a scheduled post goes live the next time an officer is
   * looking — same day in practice, but not to the minute. The UI says so
   * rather than implying a cron job exists. NOTIFICATIONS.md describes the
   * Cloud Function that would make it exact.
   */
  const publishScheduledDrafts = async () => {
    if (!isFirebaseEnabled || !db || !isSscAdmin) return 0;
    const now = Date.now();
    const due = drafts.filter((draft) => draft.publishAt && new Date(draft.publishAt).getTime() <= now);
    for (const draft of due) {
      try {
        await publishDraft(draft);
      } catch (error) {
        /* leave it queued; the next dashboard load retries */
      }
    }
    return due.length;
  };

  /**
   * Records or updates an email alert subscription. Open to everyone — a
   * student should not need an account to be told about a class suspension.
   */
  const subscribeToAlerts = async ({ email, name = '', program = '', topics = {} }) => {
    if (!isFirebaseEnabled || !db) {
      throw new Error('Email alerts are unavailable because the cloud database is not configured.');
    }
    const address = String(email || '').trim().toLowerCase();
    if (!isValidEmail(address)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!Object.values(topics).some(Boolean)) {
      throw new Error('Choose at least one thing to be notified about.');
    }

    await setDoc(doc(db, 'subscribers', address), {
      ...normalizeSubscriber({ email: address, name, program, topics }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return address;
  };

  /** Self-service opt-out, keyed on the address the student already knows. */
  const unsubscribeFromAlerts = async (email) => {
    if (!isFirebaseEnabled || !db) return;
    const address = String(email || '').trim().toLowerCase();
    if (!address) return;
    await deleteDoc(doc(db, 'subscribers', address));
  };

  const deleteSubscriber = async (id) => {
    if (!isFirebaseEnabled || !db) return;
    await deleteDoc(doc(db, 'subscribers', String(id)));
  };

  /**
   * Submits a student ticket. Open to everyone — no sign-in required — and
   * returns the reference code the student uses to track it.
   */
  const createTicket = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      throw new Error('Submissions are unavailable because the cloud database is not configured.');
    }
    const referenceCode = generateReferenceCode();
    await setDoc(doc(db, 'tickets', referenceCode), {
      ...normalizeTicket({ ...payload, referenceCode }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return referenceCode;
  };

  /** Single-document lookup so a student can check their own ticket. */
  const lookupTicket = async (referenceCode) => {
    if (!isFirebaseEnabled || !db) return null;
    const code = String(referenceCode || '').trim().toUpperCase();
    if (!code) return null;
    const snapshot = await getDoc(doc(db, 'tickets', code));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  };

  const updateTicket = async (id, patch) => {
    if (!isFirebaseEnabled || !db) return;
    await updateDoc(doc(db, 'tickets', String(id)), { ...patch, updatedAt: serverTimestamp() });
  };

  const deleteTicket = async (id) => {
    if (!isFirebaseEnabled || !db) return;
    await deleteDoc(doc(db, 'tickets', String(id)));
  };

  /** Anonymous by construction: no uid, name or email is ever recorded. */
  const createSuggestion = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      throw new Error('Submissions are unavailable because the cloud database is not configured.');
    }
    await addDoc(collection(db, 'suggestions'), {
      ...normalizeSuggestion(payload),
      createdAt: serverTimestamp()
    });
  };

  const updateSuggestion = async (id, patch) => {
    if (!isFirebaseEnabled || !db) return;
    await updateDoc(doc(db, 'suggestions', String(id)), patch);
  };

  const deleteSuggestion = async (id) => {
    if (!isFirebaseEnabled || !db) return;
    await deleteDoc(doc(db, 'suggestions', String(id)));
  };

  /**
   * Records (or changes) the signed-in voter's choice on a resolution.
   * Writing to a deterministic document id means a repeat vote replaces the
   * previous one rather than inflating the tally.
   */
  const castResolutionVote = async (resolutionId, choice, voter) => {
    if (!isFirebaseEnabled || !db) {
      throw new Error('Voting requires the cloud database to be configured.');
    }
    if (!voter?.uid) {
      throw new Error('You must be signed in with Google to vote.');
    }
    if (!VOTE_CHOICES.includes(choice)) {
      throw new Error('Invalid vote choice.');
    }

    await setDoc(doc(db, 'resolutionVotes', voteDocId(resolutionId, voter.uid)), {
      resolutionId: String(resolutionId),
      uid: voter.uid,
      email: voter.email || '',
      displayName: voter.displayName || '',
      photoURL: voter.photoURL || '',
      choice,
      updatedAt: serverTimestamp()
    });
  };

  const retractResolutionVote = async (resolutionId, voter) => {
    if (!isFirebaseEnabled || !db || !voter?.uid) {
      throw new Error('You must be signed in with Google to change your vote.');
    }
    await deleteDoc(doc(db, 'resolutionVotes', voteDocId(resolutionId, voter.uid)));
  };

  /** Live tallies derived from the vote documents themselves. */
  const voteTallies = useMemo(() => {
    const tallies = {};
    resolutionVotes.forEach((vote) => {
      const key = String(vote.resolutionId);
      if (!tallies[key]) {
        tallies[key] = { for: 0, against: 0, abstain: 0, total: 0 };
      }
      if (VOTE_CHOICES.includes(vote.choice)) {
        tallies[key][vote.choice] += 1;
        tallies[key].total += 1;
      }
    });
    return tallies;
  }, [resolutionVotes]);

  const getResolutionTally = (resolutionId) =>
    voteTallies[String(resolutionId)] || { for: 0, against: 0, abstain: 0, total: 0 };

  const getMyResolutionVote = (resolutionId, uid) => {
    if (!uid) return null;
    return resolutionVotes.find((vote) => vote.id === voteDocId(resolutionId, uid)) || null;
  };

  /**
   * Officers for the selected year. A record with no `academicYear` predates the
   * field and is shown under the current year rather than disappearing.
   *
   * Admins see every officer, for the same reason the dated collections above
   * are unscoped for them: an officer filed under another year would otherwise
   * be invisible and therefore uneditable.
   */
  const officersForYear = useMemo(
    () =>
      // No year established yet means show everyone, not nobody: filtering on
      // an unknown year would empty the page while the settings load.
      isSscAdmin || !selectedYear
        ? officers
        : officers.filter((officer) => (officer.academicYear || activeYear) === selectedYear),
    [officers, selectedYear, activeYear, isSscAdmin]
  );

  const value = useMemo(
    () => ({
      announcements,
      events,
      resolutions,
      officers: officersForYear,
      allOfficers: officers,
      reorderOfficers,
      meetings,
      accomplishments,
      requestTypes,
      memorandums,
      narrativeReports,
      isLoading,
      isCollectionLoading,
      error,
      isCloudMode: isFirebaseEnabled,
      // Paging: `hasMore.announcements` is true while more may exist,
      // `loadMore('announcements')` fetches the next page.
      hasMore,
      loadMore,
      pageSize: PAGE_SIZE,
      // Academic year. Dated content is filtered server-side by the listeners;
      // officers are filtered here because they carry the year explicitly.
      selectedYear,
      setSelectedYear: chooseYear,
      availableYears,
      // "Current" is what the council has declared, not what the calendar says.
      currentYear: activeYear,
      setActiveAcademicYear,
      // False for admins, who are shown every year at once, so the archive
      // banner cannot claim they are looking at only a past council's work.
      isViewingArchive: !isSscAdmin && selectedYear !== activeYear,
      // True when the lists above are filtered to `selectedYear`. Admins get
      // everything, so pages can say so instead of implying a filter is active.
      isYearScoped: !isSscAdmin,
      // True once the visitor has deliberately picked a year, as opposed to the
      // board settling on its default while loading.
      hasChosenYear,
      // The council's own details: name, logos, contact, mission, vision.
      siteProfile,
      updateSiteProfile,
      // Undo for the one action that cannot be repaired by editing: delete.
      undoableDelete,
      undoDelete,
      dismissUndo,
      createAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      createEvent,
      updateEvent,
      deleteEvent,
      createResolution,
      updateResolution,
      deleteResolution,
      createOfficer,
      updateOfficer,
      deleteOfficer,
      createMeeting,
      updateMeeting,
      deleteMeeting,
      createAccomplishment,
      updateAccomplishment,
      deleteAccomplishment,
      createRequestType,
      updateRequestType,
      deleteRequestType,
      createMemorandum,
      updateMemorandum,
      deleteMemorandum,
      createNarrativeReport,
      updateNarrativeReport,
      deleteNarrativeReport,
      constitutionDocs,
      createConstitutionDoc,
      updateConstitutionDoc,
      deleteConstitutionDoc,
      tickets,
      suggestions,
      createTicket,
      lookupTicket,
      updateTicket,
      deleteTicket,
      createSuggestion,
      updateSuggestion,
      deleteSuggestion,
      auditLog,
      // Shared read counts. getViewCount reads, trackView records one.
      viewCounts,
      getViewCount: (collectionName, id) => viewCounts[viewDocId(collectionName, id)] || 0,
      trackView: registerView,
      drafts,
      saveDraft,
      deleteDraft,
      publishDraft,
      publishScheduledDrafts,
      subscribers,
      subscribeToAlerts,
      unsubscribeFromAlerts,
      deleteSubscriber,
      resolutionVotes,
      castResolutionVote,
      retractResolutionVote,
      getResolutionTally,
      getMyResolutionVote
    }),
    [announcements, events, resolutions, officers, meetings, accomplishments, requestTypes, memorandums, narrativeReports, constitutionDocs, resolutionVotes, voteTallies, tickets, suggestions, subscribers, isLoading, isCollectionLoading, error, hasMore, selectedYear, activeYear, availableYears, officersForYear, drafts, auditLog, viewCounts, isSscAdmin, hasChosenYear, undoableDelete, siteProfile]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};
