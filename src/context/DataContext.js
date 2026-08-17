import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
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

const normalizeOfficer = (item) => ({
  name: item.name || '',
  position: item.position || '',
  division: item.division || 'Core Officers',
  course: item.course || '',
  yearLevel: item.yearLevel || '',
  image: item.image || '',
  email: item.email || '',
  quote: item.quote || ''
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
  description: item.description || ''
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
  { key: 'announcements', orderField: 'date', direction: 'desc', label: 'announcements' },
  {
    key: 'events',
    orderField: 'date',
    direction: 'desc',
    label: 'calendar events',
    // Fetch latest-dated first (so upcoming activities survive the limit),
    // display oldest-first (so the calendar reads chronologically).
    sort: (a, b) => new Date(a.date) - new Date(b.date)
  },
  { key: 'resolutions', orderField: 'date', direction: 'desc', label: 'resolutions' },
  { key: 'officers', label: 'officers' },
  { key: 'meetings', orderField: 'date', direction: 'desc', label: 'meeting records' },
  { key: 'accomplishments', orderField: 'date', direction: 'desc', label: 'accomplishments' },
  { key: 'requestTypes', label: 'request letter types' },
  { key: 'memorandums', orderField: 'date', direction: 'desc', label: 'memorandums' },
  { key: 'narrativeReports', orderField: 'date', direction: 'desc', label: 'narrative reports' },
  { key: 'constitution', orderField: 'effectiveDate', direction: 'desc', label: 'constitution documents' }
];

/**
 * Deletes a document and then the uploaded files it referenced.
 *
 * Order matters: the document goes first, so a cleanup that fails cannot leave
 * the record undeletable. The file removal is deliberately not awaited by
 * callers — an orphaned object in Storage is a housekeeping issue, not
 * something that should make "Delete" appear to fail.
 *
 * Only files in this project's Storage bucket are removed. Base64 fallbacks
 * live inside the document and vanish with it; Google Drive links belong to
 * someone's Drive and are left alone. See deleteRecordFiles.
 */
const removeDocAndFiles = async (collectionName, id) => {
  const reference = doc(db, collectionName, String(id));

  // Read the record rather than looking it up in local state: the listeners
  // are paginated, so a document outside the current page would not be found
  // in the array, and its files would be orphaned silently.
  let record = null;
  try {
    const snapshot = await getDoc(reference);
    if (snapshot.exists()) record = snapshot.data();
  } catch (error) {
    // Fall through — losing the file cleanup is better than blocking a delete.
  }

  await deleteDoc(reference);

  if (record) {
    deleteRecordFiles(record).catch(() => {
      /* already logged; never surfaced as a failed delete */
    });
  }
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
  const [isLoading, setIsLoading] = useState(isFirebaseEnabled);
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

  useEffect(() => {
    if (!isFirebaseEnabled || !db) {
      setIsLoading(false);
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
      const cap = limits[config.key] ?? PAGE_SIZE;

      // orderBy would drop documents missing the field, so collections without a
      // date get a bare cap instead.
      const constraints = config.orderField
        ? [orderBy(config.orderField, config.direction || 'desc'), limit(cap)]
        : [limit(cap)];

      const sortFn = config.sort || (config.orderField ? byNewestDate(config.orderField) : null);

      return onSnapshot(
        query(collection(db, config.key), ...constraints),
        (snapshot) => {
          const list = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
          setters[config.key](sortFn ? [...list].sort(sortFn) : list);
          setHasMore((prev) => ({ ...prev, [config.key]: snapshot.size >= cap }));
        },
        () => setError(`Failed to load ${config.label} from cloud database.`)
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

    setIsLoading(false);

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubResolutionVotes();
    };
  }, [limits]);

  /** Fetch another page of one collection. */
  const loadMore = (collectionKey) => {
    setLimits((prev) => ({ ...prev, [collectionKey]: (prev[collectionKey] ?? PAGE_SIZE) + PAGE_SIZE }));
  };



  const createAnnouncement = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeAnnouncement(payload) };
      setAnnouncements((prev) => [newItem, ...prev]);
      return;
    }
    await addDoc(collection(db, 'announcements'), normalizeAnnouncement(payload));
  };

  const updateAnnouncement = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setAnnouncements((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeAnnouncement(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'announcements', String(id)), normalizeAnnouncement(payload));
  };

  const deleteAnnouncement = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setAnnouncements((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await removeDocAndFiles('announcements', id);
  };

  const createEvent = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeEvent(payload) };
      setEvents((prev) => [...prev, newItem]);
      return;
    }
    await addDoc(collection(db, 'events'), normalizeEvent(payload));
  };

  const updateEvent = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setEvents((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeEvent(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'events', String(id)), normalizeEvent(payload));
  };

  const deleteEvent = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setEvents((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await removeDocAndFiles('events', id);
  };

  const createResolution = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeResolution(payload) };
      setResolutions((prev) => [newItem, ...prev]);
      return;
    }
    await addDoc(collection(db, 'resolutions'), normalizeResolution(payload));
  };

  const updateResolution = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setResolutions((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeResolution(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'resolutions', String(id)), normalizeResolution(payload));
  };

  const deleteResolution = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setResolutions((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await removeDocAndFiles('resolutions', id);
  };

  const createOfficer = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeOfficer(payload) };
      setOfficers((prev) => [...prev, newItem]);
      return;
    }
    await addDoc(collection(db, 'officers'), normalizeOfficer(payload));
  };

  const updateOfficer = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setOfficers((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeOfficer(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'officers', String(id)), normalizeOfficer(payload));
  };

  const deleteOfficer = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setOfficers((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await removeDocAndFiles('officers', id);
  };

  const createMeeting = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeMeeting(payload) };
      setMeetings((prev) => [newItem, ...prev]);
      return;
    }
    await addDoc(collection(db, 'meetings'), normalizeMeeting(payload));
  };

  const updateMeeting = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setMeetings((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeMeeting(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'meetings', String(id)), normalizeMeeting(payload));
  };

  const deleteMeeting = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setMeetings((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await removeDocAndFiles('meetings', id);
  };

  const createAccomplishment = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeAccomplishment(payload) };
      setAccomplishments((prev) => [newItem, ...prev]);
      return;
    }
    await addDoc(collection(db, 'accomplishments'), normalizeAccomplishment(payload));
  };

  const updateAccomplishment = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setAccomplishments((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeAccomplishment(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'accomplishments', String(id)), normalizeAccomplishment(payload));
  };

  const deleteAccomplishment = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setAccomplishments((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await removeDocAndFiles('accomplishments', id);
  };

  const createRequestType = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeRequestType(payload) };
      setRequestTypes((prev) => [...prev, newItem]);
      return;
    }
    await addDoc(collection(db, 'requestTypes'), normalizeRequestType(payload));
  };

  const updateRequestType = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setRequestTypes((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeRequestType(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'requestTypes', String(id)), normalizeRequestType(payload));
  };

  const deleteRequestType = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setRequestTypes((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await removeDocAndFiles('requestTypes', id);
  };

  const createMemorandum = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeMemorandum(payload) };
      setMemorandums((prev) => [newItem, ...prev]);
      return;
    }
    await addDoc(collection(db, 'memorandums'), normalizeMemorandum(payload));
  };

  const updateMemorandum = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setMemorandums((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeMemorandum(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'memorandums', String(id)), normalizeMemorandum(payload));
  };

  const deleteMemorandum = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setMemorandums((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await removeDocAndFiles('memorandums', id);
  };

  const createNarrativeReport = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      const newItem = { id: Date.now(), ...normalizeNarrativeReport(payload) };
      setNarrativeReports((prev) => [newItem, ...prev]);
      return;
    }
    await addDoc(collection(db, 'narrativeReports'), normalizeNarrativeReport(payload));
  };

  const updateNarrativeReport = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setNarrativeReports((prev) => prev.map((item) => (item.id === id ? { ...item, ...normalizeNarrativeReport(payload) } : item)));
      return;
    }
    await updateDoc(doc(db, 'narrativeReports', String(id)), normalizeNarrativeReport(payload));
  };

  const deleteNarrativeReport = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setNarrativeReports((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await removeDocAndFiles('narrativeReports', id);
  };

  const createConstitutionDoc = async (payload) => {
    if (!isFirebaseEnabled || !db) {
      setConstitutionDocs((prev) => [{ id: Date.now(), ...normalizeConstitutionDoc(payload) }, ...prev]);
      return;
    }
    await addDoc(collection(db, 'constitution'), normalizeConstitutionDoc(payload));
  };

  const updateConstitutionDoc = async (id, payload) => {
    if (!isFirebaseEnabled || !db) {
      setConstitutionDocs((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...normalizeConstitutionDoc(payload) } : item))
      );
      return;
    }
    await updateDoc(doc(db, 'constitution', String(id)), normalizeConstitutionDoc(payload));
  };

  const deleteConstitutionDoc = async (id) => {
    if (!isFirebaseEnabled || !db) {
      setConstitutionDocs((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    await removeDocAndFiles('constitution', id);
  };

  // Admin-only listeners. Kept in their own effect so they attach and detach
  // with the admin session rather than on mount.
  useEffect(() => {
    if (!isFirebaseEnabled || !db || !isSscAdmin) {
      setTickets([]);
      setSuggestions([]);
      setSubscribers([]);
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

    return () => {
      unsubTickets();
      unsubSuggestions();
      unsubSubscribers();
    };
  }, [isSscAdmin]);

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

  const value = useMemo(
    () => ({
      announcements,
      events,
      resolutions,
      officers,
      meetings,
      accomplishments,
      requestTypes,
      memorandums,
      narrativeReports,
      isLoading,
      error,
      isCloudMode: isFirebaseEnabled,
      // Paging: `hasMore.announcements` is true while more may exist,
      // `loadMore('announcements')` fetches the next page.
      hasMore,
      loadMore,
      pageSize: PAGE_SIZE,
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
    [announcements, events, resolutions, officers, meetings, accomplishments, requestTypes, memorandums, narrativeReports, constitutionDocs, resolutionVotes, voteTallies, tickets, suggestions, subscribers, isLoading, error, hasMore]
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
