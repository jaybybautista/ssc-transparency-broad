import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseEnabled } from './firebase';

/**
 * Append-only record of who changed what.
 *
 * Matters as soon as more than one officer has access: "the announcement is
 * gone and nobody knows who removed it" is otherwise unanswerable, and content
 * deletion is unrecoverable.
 *
 * Three deliberate choices:
 *
 *  - **Append only.** The rules allow create and read for admins, and forbid
 *    update and delete to everyone including admins. A log an admin can edit is
 *    not evidence of anything.
 *  - **Written by the client, and honest about it.** The uid and email come
 *    from the signed-in session; the rules pin the recorded uid to the caller's
 *    own, so nobody can write an entry in someone else's name. What a client
 *    *can* do is skip logging entirely, so this is an accountability aid among
 *    colleagues, not a forensic audit trail. Only a Cloud Function triggered by
 *    the write itself would be that.
 *  - **Never blocks the action.** A failed log must not make a successful save
 *    look like a failure, so every call is fire-and-forget.
 */

/** A short, readable label for the thing that was acted on. */
const describeTarget = (payload) => {
  if (!payload) return '';
  const label =
    payload.title ||
    payload.name ||
    payload.type ||
    payload.number ||
    payload.subject ||
    '';
  return String(label).slice(0, 140);
};

export const AUDIT_ACTIONS = ['create', 'update', 'delete', 'publish', 'settings'];

/**
 * Records one admin action.
 *
 * @param {'create'|'update'|'delete'|'publish'|'settings'} action
 * @param {string} collectionName  which collection was touched
 * @param {string} documentId
 * @param {object} [payload]       the data written, used only for a label
 */
export const recordAudit = (action, collectionName, documentId, payload) => {
  if (!isFirebaseEnabled || !db) return;

  const user = auth?.currentUser;
  // Not signed in means the write is about to be rejected by the rules anyway.
  if (!user) return;

  addDoc(collection(db, 'auditLog'), {
    action,
    collectionName,
    documentId: String(documentId || ''),
    target: describeTarget(payload),
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    at: serverTimestamp()
  }).catch(() => {
    // Deliberately silent: the action itself succeeded, and surfacing a logging
    // failure would make a completed save look broken.
  });
};
