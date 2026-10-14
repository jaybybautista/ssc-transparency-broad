import { collection, doc, getDocs, increment, query, setDoc, where } from 'firebase/firestore';
import { db, isFirebaseEnabled } from './firebase';

/**
 * Shared view counts.
 *
 * These used to live in each visitor's localStorage, which meant every device
 * saw its own number — useless as a measure of readership, and reset whenever a
 * browser cache was cleared. They now live in Firestore, so "most read" is a
 * real figure the council can put in a report.
 *
 * Two design decisions worth knowing:
 *
 *  - **Their own collection.** Content documents are admin-only writable, and
 *    must stay that way. A counter students need to increment cannot live on
 *    them. `views/{collection}__{id}` keeps the open write confined to a
 *    document holding one number.
 *  - **Once per visitor per item.** A localStorage marker stops the count
 *    climbing every time someone re-opens the same post in one session. That is
 *    a nudge toward honest numbers, not a guarantee: clearing storage or using
 *    another browser counts again, and the rules cannot tell those apart from a
 *    genuine second reader. Treat these as "reads", not "unique people".
 */

const SEEN_KEY = 'ssc_viewed_items';

export const viewDocId = (collectionName, id) => `${collectionName}__${id}`;

const loadSeen = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch (error) {
    return new Set();
  }
};

const saveSeen = (set) => {
  try {
    // Keep the newest 500 so this cannot grow without bound.
    localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-500)));
  } catch (error) {
    /* storage full or blocked; counting still works, just less politely */
  }
};

/**
 * Registers a view, unless this browser has already counted this item.
 * Fire-and-forget: a failed count must never interrupt opening a post.
 * Returns true when it counted, so the caller can show the new number.
 */
export const registerView = (collectionName, id) => {
  if (!isFirebaseEnabled || !db || !id) return false;

  const key = viewDocId(collectionName, id);
  const seen = loadSeen();
  if (seen.has(key)) return false;

  seen.add(key);
  saveSeen(seen);

  setDoc(
    doc(db, 'views', key),
    { count: increment(1), collectionName, documentId: String(id) },
    { merge: true }
  ).catch(() => {
    // Most likely the rules are not deployed yet. Silent by design.
  });
  return true;
};

/**
 * Reads the counters for one section, once.
 *
 * This used to be a live listener on every counter on the board, held open by
 * every visitor. Each new view was then pushed to everyone online and billed as
 * a read for each of them, so the cost grew with the square of the audience.
 * A page now reads its own section's counts when it opens; the visitor's own
 * views are added locally (see registerView's return value).
 */
export const fetchViewCounts = async (collectionName) => {
  if (!isFirebaseEnabled || !db) return {};

  try {
    const snapshot = await getDocs(
      query(collection(db, 'views'), where('collectionName', '==', collectionName))
    );
    const counts = {};
    snapshot.docs.forEach((item) => {
      counts[item.id] = item.data()?.count || 0;
    });
    return counts;
  } catch (error) {
    return {};
  }
};
