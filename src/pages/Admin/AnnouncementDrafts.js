import React, { useEffect, useMemo, useState } from 'react';
import { FiClock, FiEdit2, FiInfo, FiSend, FiTrash2, FiFileText, FiCalendar } from 'react-icons/fi';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../components/DialogProvider';
import RichTextEditor from '../../components/RichTextEditor';
import RichContent from '../../components/RichContent';
import { richTextToPlain } from '../../components/richText';
import './AnnouncementDrafts.css';

const CATEGORIES = [
  'Admin Announcements',
  'Vacancies for Scholarships',
  'ID/UNIFORM',
  'Leniencies',
  'Advisory'
];

const EMPTY = { title: '', category: 'Admin Announcements', content: '', publishAt: '' };

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time. */
const toLocalInput = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const describeWhen = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

/**
 * Write an announcement now, publish it later.
 *
 * Drafts live in their own admin-only collection, so an unpublished post is
 * genuinely unreadable rather than merely hidden.
 */
const AnnouncementDrafts = () => {
  const { drafts, saveDraft, deleteDraft, publishDraft, publishScheduledDrafts } = useData();
  const { confirm, notify } = useDialog();

  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Catch up on anything whose time passed while nobody was looking.
  useEffect(() => {
    publishScheduledDrafts().then((count) => {
      if (count) {
        notify({
          title: `${count} scheduled ${count === 1 ? 'post' : 'posts'} published`,
          message: 'They were due, so they have just gone live on the board.',
          tone: 'success'
        });
      }
    });
    // Deliberately once per visit to this section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { scheduled, plain } = useMemo(
    () => ({
      scheduled: drafts.filter((d) => d.publishAt),
      plain: drafts.filter((d) => !d.publishAt)
    }),
    [drafts]
  );

  const reset = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      notify({ title: 'Add a title', message: 'A draft needs a title to be findable later.', tone: 'info' });
      return;
    }
    if (!richTextToPlain(form.content).trim()) {
      notify({ title: 'Nothing to save', message: 'Write the announcement content first.', tone: 'info' });
      return;
    }

    setIsSaving(true);
    try {
      await saveDraft(
        { ...form, publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : '' },
        editingId
      );
      reset();
      notify({ title: 'Draft saved', message: 'It stays private until you publish it.', tone: 'success' });
    } catch (error) {
      notify({ title: 'Could not save', message: error?.message || 'Please try again.', tone: 'warning' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (draft) => {
    setEditingId(draft.id);
    setForm({
      title: draft.title || '',
      category: draft.category || 'Admin Announcements',
      content: draft.content || '',
      publishAt: toLocalInput(draft.publishAt)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePublish = async (draft) => {
    const ok = await confirm({
      title: 'Publish this announcement?',
      message: 'It will appear on the public board immediately.',
      confirmLabel: 'Publish',
      tone: 'info'
    });
    if (!ok) return;
    try {
      await publishDraft(draft);
      notify({ title: 'Published', message: 'It is live on the board now.', tone: 'success' });
    } catch (error) {
      notify({ title: 'Could not publish', message: error?.message || 'Please try again.', tone: 'warning' });
    }
  };

  const handleDelete = async (draft) => {
    const ok = await confirm({
      title: 'Delete this draft?',
      message: 'It has never been published, so nobody else has seen it. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (ok) await deleteDraft(draft.id);
  };

  const renderCard = (draft) => {
    const when = describeWhen(draft.publishAt);
    const isDue = draft.publishAt && new Date(draft.publishAt).getTime() <= Date.now();

    return (
      <article key={draft.id} className="draft-card">
        <header className="draft-head">
          <span className="draft-category">{draft.category}</span>
          {when ? (
            <span className={`draft-when ${isDue ? 'due' : ''}`}>
              <FiClock /> {isDue ? `Due since ${when}` : `Scheduled for ${when}`}
            </span>
          ) : (
            <span className="draft-when"><FiFileText /> Draft</span>
          )}
        </header>

        <h3 className="draft-title">{draft.title || 'Untitled'}</h3>
        <RichContent html={draft.content} className="rich-preview draft-preview" />

        <footer className="draft-actions">
          <button type="button" className="btn-primary" onClick={() => handlePublish(draft)}>
            <FiSend /> Publish now
          </button>
          <button type="button" className="btn-secondary" onClick={() => handleEdit(draft)}>
            <FiEdit2 /> Edit
          </button>
          <button type="button" className="submission-delete" onClick={() => handleDelete(draft)} title="Delete draft">
            <FiTrash2 />
          </button>
        </footer>
      </article>
    );
  };

  return (
    <div className="manager-content">
      <div className="manager-header">
        <h2>Drafts &amp; Scheduled</h2>
      </div>

      <p className="draft-explainer">
        <FiInfo />
        <span>
          Drafts are stored where only signed-in officers can read them, so an unpublished post is
          genuinely private rather than just hidden. <strong>Scheduling caveat:</strong> the board
          has no server of its own, so a scheduled post goes live the next time an officer opens
          this page after its time, so the same day in practice, but not to the minute. For anything that
          must not be seen a moment early, leave it a draft and publish it by hand.
        </span>
      </p>

      <form className="draft-form" onSubmit={handleSave}>
        <h3>{editingId ? 'Edit draft' : 'New draft'}</h3>

        <div className="form-group">
          <label className="form-label">Title</label>
          <input
            className="form-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Announcement title"
          />
        </div>

        <div className="draft-form-row">
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              <FiCalendar /> Publish at <span>(optional)</span>
            </label>
            <input
              type="datetime-local"
              className="form-input"
              value={form.publishAt}
              onChange={(e) => setForm({ ...form, publishAt: e.target.value })}
            />
            <small>Leave empty to keep it a plain draft.</small>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Content</label>
          <RichTextEditor
            value={form.content}
            onChange={(html) => setForm({ ...form, content: html })}
            placeholder="Write the announcement. Use the toolbar for bold, italics, headings and lists."
            minHeight={200}
          />
        </div>

        <div className="draft-form-actions">
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : editingId ? 'Update draft' : 'Save draft'}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={reset}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {!!scheduled.length && (
        <section className="draft-section">
          <h3><FiClock /> Scheduled ({scheduled.length})</h3>
          <div className="draft-list">{scheduled.map(renderCard)}</div>
        </section>
      )}

      <section className="draft-section">
        <h3><FiFileText /> Drafts ({plain.length})</h3>
        {plain.length ? (
          <div className="draft-list">{plain.map(renderCard)}</div>
        ) : (
          <div className="admin-search-empty">
            No drafts yet. Anything you save above stays private until you publish it.
          </div>
        )}
      </section>
    </div>
  );
};

export default AnnouncementDrafts;
