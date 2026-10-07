import React, { useRef, useState } from 'react';
import { FiUser, FiX } from 'react-icons/fi';
import { useData } from '../context/DataContext';
import './AuthorPicker.css';

export const EMPTY_AUTHOR = {
  authorOfficerId: '',
  authorName: '',
  authorPosition: '',
  authorImage: ''
};

/**
 * Author selector for blog-style records.
 * Pick someone from the SSC officer roster, or switch to "Someone else" to type
 * a name (and optionally attach a photo).
 *
 * The parent gives this a `key` tied to the record being edited, so the mode
 * below is seeded from the saved data each time a different record is opened.
 */
const AuthorPicker = ({ value, onChange, imageFile, onImageFileChange }) => {
  const { officers } = useData();
  const fileInputRef = useRef(null);

  // Mode is held in state rather than derived, so choosing "Someone else"
  // doesn't snap back to "No author" while the name field is still empty.
  const [mode, setMode] = useState(() => {
    if (value.authorOfficerId) return 'officer';
    if (value.authorName || value.authorPosition || value.authorImage) return 'custom';
    return 'none';
  });

  const handleModeChange = (nextMode) => {
    onImageFileChange?.(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setMode(nextMode);

    if (nextMode === 'none') {
      onChange({ ...EMPTY_AUTHOR });
      return;
    }
    if (nextMode === 'custom') {
      onChange({ ...EMPTY_AUTHOR, authorName: value.authorName || '' });
      return;
    }
    onChange({ ...EMPTY_AUTHOR, authorOfficerId: officers[0]?.id ? String(officers[0].id) : '' });
  };

  const selectedOfficer = officers.find((entry) => String(entry.id) === String(value.authorOfficerId));

  return (
    <div className="author-picker">
      <div className="author-picker-modes">
        {[
          { id: 'none', label: 'No author' },
          { id: 'officer', label: 'SSC Officer' },
          { id: 'custom', label: 'Someone else' }
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            className={`author-mode-btn ${mode === option.id ? 'active' : ''}`}
            onClick={() => handleModeChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === 'officer' && (
        <div className="author-picker-body">
          {officers.length ? (
            <>
              <select
                value={value.authorOfficerId || ''}
                onChange={(e) => onChange({ ...EMPTY_AUTHOR, authorOfficerId: e.target.value })}
              >
                <option value="">Select an officer</option>
                {officers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.name}
                    {officer.position ? ` (${officer.position})` : ''}
                  </option>
                ))}
              </select>
              {selectedOfficer && (
                <div className="author-preview">
                  <div className="author-preview-avatar">
                    {selectedOfficer.image ? (
                      <img src={selectedOfficer.image} alt={selectedOfficer.name} />
                    ) : (
                      <FiUser />
                    )}
                  </div>
                  <div>
                    <strong>{selectedOfficer.name}</strong>
                    {selectedOfficer.position && <span>{selectedOfficer.position}</span>}
                  </div>
                </div>
              )}
              <small>The officer's current name and photo are used automatically.</small>
            </>
          ) : (
            <small>No officers have been added yet. Use “Someone else” to type a name.</small>
          )}
        </div>
      )}

      {mode === 'custom' && (
        <div className="author-picker-body">
          <input
            type="text"
            placeholder="Author name"
            value={value.authorName || ''}
            onChange={(e) => onChange({ ...value, authorOfficerId: '', authorName: e.target.value })}
          />
          <input
            type="text"
            placeholder="Role or title (optional)"
            value={value.authorPosition || ''}
            onChange={(e) => onChange({ ...value, authorOfficerId: '', authorPosition: e.target.value })}
          />

          <label className="author-file-label">Photo (optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => onImageFileChange?.(e.target.files?.[0] || null)}
          />
          {imageFile && (
            <div className="author-selected-file">
              <span>{imageFile.name}</span>
              <button
                type="button"
                onClick={() => {
                  onImageFileChange?.(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <FiX /> Remove
              </button>
            </div>
          )}

          <input
            type="url"
            placeholder="Or paste a photo URL (optional)"
            value={value.authorImage || ''}
            onChange={(e) => onChange({ ...value, authorOfficerId: '', authorImage: e.target.value })}
          />
        </div>
      )}
    </div>
  );
};

export default AuthorPicker;
