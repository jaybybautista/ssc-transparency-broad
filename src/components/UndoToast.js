import React, { useEffect, useState } from 'react';
import { FiRotateCcw, FiTrash2, FiX } from 'react-icons/fi';
import { useData } from '../context/DataContext';
import './UndoToast.css';

/**
 * The one chance to take a delete back.
 *
 * Deleting is the only action on this board that editing cannot repair, and a
 * council's record of its own term is not something to lose to a misplaced tap.
 * The record's contents are held for a few seconds after the delete and written
 * back under the same id if this is used. See deleteWithUndo in DataContext.
 *
 * Rendered once, at the top of the app, so it covers every page that can delete
 * something — the dashboard and the inline admin controls on the public pages
 * alike — rather than each of them growing its own copy.
 */
const WINDOW_MS = 15000;

const UndoToast = () => {
  const { undoableDelete, undoDelete, dismissUndo } = useData();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');

  // Drives the countdown bar. Keyed off `at` so a second delete restarts it.
  const [remaining, setRemaining] = useState(WINDOW_MS);

  useEffect(() => {
    if (!undoableDelete) return undefined;
    setBusy(false);
    setFailed('');
    setRemaining(WINDOW_MS);

    const startedAt = Date.now();
    const tick = setInterval(() => {
      setRemaining(Math.max(0, WINDOW_MS - (Date.now() - startedAt)));
    }, 250);
    return () => clearInterval(tick);
  }, [undoableDelete]);

  if (!undoableDelete) return null;

  const handleUndo = async () => {
    setBusy(true);
    setFailed('');
    try {
      await undoDelete();
    } catch (error) {
      // Restoring writes to the database like any other save, so it can be
      // refused. Saying so beats a button that silently does nothing.
      setBusy(false);
      setFailed('Could not restore it. Check your connection and try again.');
    }
  };

  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <span className="undo-toast-icon" aria-hidden="true">
        <FiTrash2 />
      </span>

      <div className="undo-toast-text">
        <strong>Deleted {undoableDelete.label}.</strong>
        {failed ? (
          <span className="undo-toast-error">{failed}</span>
        ) : (
          <span>You can still bring it back.</span>
        )}
      </div>

      <button type="button" className="undo-toast-action" onClick={handleUndo} disabled={busy}>
        <FiRotateCcw /> {busy ? 'Restoring…' : 'Undo'}
      </button>

      <button
        type="button"
        className="undo-toast-close"
        onClick={dismissUndo}
        aria-label="Dismiss"
        disabled={busy}
      >
        <FiX />
      </button>

      {/* How long is left, shown rather than left to guesswork. Hidden after a
          failed restore: the countdown is stopped in that case and the offer
          stays open, so a bar draining to nothing would be a lie. */}
      {!failed && (
        <span
          className="undo-toast-bar"
          style={{ transform: `scaleX(${remaining / WINDOW_MS})` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default UndoToast;
