import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheck,
  FiGlobe,
  FiImage,
  FiInfo,
  FiMail,
  FiMapPin,
  FiPhone,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiShare2,
  FiTarget,
  FiTrash2,
  FiUpload,
  FiX
} from 'react-icons/fi';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../components/DialogProvider';
import { uploadImages } from '../../lib/uploads';
import {
  DEFAULT_PROFILE,
  PROFILE_SIZE_LIMIT,
  profileByteSize,
  directImageUrl,
  resolveLogo,
  SOCIAL_BASES,
  socialUrl
} from '../../lib/siteProfile';
import sscLogo from '../../assets/ssc_logo.svg';
import psuLogo from '../../assets/psu_logo.svg';
import './SiteProfile.css';

/**
 * Where the council edits its own details.
 *
 * Everything here used to be typed into the components, so correcting a phone
 * number meant editing React and redeploying. It also let one fact drift into
 * two: the footer showed one phone number and the contact page another. This
 * page is the single place all of it now comes from.
 *
 * Nothing here is year-scoped. A council's name, address and logo belong to the
 * organisation rather than to one term, and archiving them alongside content
 * would mean last year's pages rendered with last year's phone number.
 */
const SiteProfile = () => {
  const { siteProfile, updateSiteProfile, isCloudMode } = useData();
  const { confirm, notify } = useDialog();

  const [form, setForm] = useState(siteProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const sscInputRef = useRef(null);
  const psuInputRef = useRef(null);
  const chartInputRef = useRef(null);

  // The saved profile arrives asynchronously; adopt it until the officer has
  // started typing, so the form is never left showing stale defaults.
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched) setForm(siteProfile);
  }, [siteProfile, touched]);

  const set = (key, value) => {
    setTouched(true);
    setError('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const size = useMemo(() => profileByteSize(form), [form]);
  const overLimit = size > PROFILE_SIZE_LIMIT;

  // ---- logos ----------------------------------------------------------
  const handleLogoFile = async (key, file) => {
    if (!file) return;
    setUploading(key);
    setError('');
    try {
      const [url] = await uploadImages([file], 'branding', () => {});
      if (!url) throw new Error('The image could not be processed.');
      set(key, url);
    } catch (uploadError) {
      setError(
        uploadError?.message ||
          'That image could not be used. Try a smaller PNG or JPG, or paste a link to it instead.'
      );
    } finally {
      setUploading('');
    }
  };

  // ---- core values ----------------------------------------------------
  const setValue = (index, field, value) => {
    setTouched(true);
    setForm((prev) => ({
      ...prev,
      coreValues: prev.coreValues.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    }));
  };

  const addValue = () => {
    setTouched(true);
    setForm((prev) => ({ ...prev, coreValues: [...prev.coreValues, { title: '', description: '' }] }));
  };

  const removeValue = (index) => {
    setTouched(true);
    setForm((prev) => ({ ...prev, coreValues: prev.coreValues.filter((_, i) => i !== index) }));
  };

  // ---- goals ----------------------------------------------------------
  const setGoal = (index, value) => {
    setTouched(true);
    setForm((prev) => ({ ...prev, goals: prev.goals.map((goal, i) => (i === index ? value : goal)) }));
  };

  const addGoal = () => {
    setTouched(true);
    setForm((prev) => ({ ...prev, goals: [...prev.goals, ''] }));
  };

  const removeGoal = (index) => {
    setTouched(true);
    setForm((prev) => ({ ...prev, goals: prev.goals.filter((_, i) => i !== index) }));
  };

  // ---- save / reset ---------------------------------------------------
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      await updateSiteProfile(form);
      setTouched(false);
      notify({
        title: 'Details saved',
        message: 'The public site is already showing them.',
        tone: 'success'
      });
    } catch (saveError) {
      setError(saveError?.message || 'Could not save. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Put every field back to the built-in text?',
      message:
        'The name, contact details, mission, vision, values and goals all return to what the site shipped with. Your logos are cleared too. Nothing else on the board is touched, and you can edit it all again afterwards.',
      confirmLabel: 'Restore defaults',
      tone: 'danger'
    });
    if (!ok) return;
    setTouched(true);
    setForm(DEFAULT_PROFILE);
  };

  if (!isCloudMode) {
    return (
      <div className="profile-page">
        <p className="profile-note warn">
          <FiAlertTriangle /> These details are stored in the cloud database, which is not
          configured on this copy of the site.
        </p>
      </div>
    );
  }

  const logoField = (key, label, bundled, inputRef, hint) => (
    <div className="profile-logo-field">
      <div className="profile-logo-preview">
        <img src={resolveLogo(form[key], bundled)} alt={`${label} preview`} />
      </div>
      <div className="profile-logo-controls">
        <label className="form-label">{label}</label>
        <p className="profile-hint">{hint}</p>
        <input
          type="text"
          className="form-input"
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          placeholder="Paste an image link, or upload below"
        />
        <div className="profile-logo-actions">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              handleLogoFile(key, e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => inputRef.current?.click()}
            disabled={Boolean(uploading)}
          >
            <FiUpload /> {uploading === key ? 'Working…' : 'Upload'}
          </button>
          {!!form[key] && (
            <button type="button" className="profile-text-btn" onClick={() => set(key, '')}>
              Use the built-in logo
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <form className="profile-page" onSubmit={handleSave}>
      <div className="profile-head">
        <div>
          <h2>Site Profile</h2>
          <p>
            The council's own details. Everything here appears on the public site, and changes
            show up immediately for everyone.
          </p>
        </div>
        <div className="profile-head-actions">
          <button type="button" className="btn-secondary" onClick={handleReset} disabled={isSaving}>
            <FiRotateCcw /> Restore defaults
          </button>
          <button type="submit" className="btn-primary" disabled={isSaving || overLimit}>
            <FiSave /> {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {!!error && (
        <p className="profile-note warn">
          <FiAlertTriangle /> {error}
        </p>
      )}

      {overLimit && !error && (
        <p className="profile-note warn">
          <FiAlertTriangle /> These details come to {Math.round(size / 1024)}KB, over the{' '}
          {Math.round(PROFILE_SIZE_LIMIT / 1024)}KB one record can hold. An uploaded logo is
          almost always the cause — paste a link to it instead, or use a smaller image.
        </p>
      )}

      {touched && !overLimit && (
        <p className="profile-note info">
          <FiInfo /> You have unsaved changes.
        </p>
      )}

      {/* ---- identity ---- */}
      <section className="profile-card">
        <h3><FiGlobe /> Identity</h3>
        <p className="profile-card-hint">
          Used in the top bar, the footer and the browser tab.
        </p>

        <div className="profile-grid">
          <div className="form-group">
            <label className="form-label">Council name</label>
            <input className="form-input" value={form.councilName} onChange={(e) => set('councilName', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Short name</label>
            <input className="form-input" value={form.councilShortName} onChange={(e) => set('councilShortName', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Campus</label>
            <input className="form-input" value={form.campusName} onChange={(e) => set('campusName', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">University</label>
            <input className="form-input" value={form.universityName} onChange={(e) => set('universityName', e.target.value)} />
          </div>
        </div>

        <div className="profile-preview">
          <span className="profile-preview-label">How the top bar will read</span>
          <div className="profile-preview-brand">
            <img src={resolveLogo(form.psuLogoUrl, psuLogo)} alt="" />
            <img src={resolveLogo(form.sscLogoUrl, sscLogo)} alt="" />
            <div>
              <span className="pp-sub">{form.campusName}</span>
              <span className="pp-title">{form.councilName}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- logos ---- */}
      <section className="profile-card">
        <h3><FiImage /> Logos</h3>
        <p className="profile-card-hint">
          Leave a field empty to keep the logo that ships with the site. A square PNG reads best.
        </p>
        {logoField('sscLogoUrl', 'Council logo', sscLogo, sscInputRef, 'Shown first in the footer and beside the campus logo up top.')}
        {logoField('psuLogoUrl', 'University logo', psuLogo, psuInputRef, 'Shown alongside the council logo.')}
      </section>

      {/* ---- organisational chart ---- */}
      <section className="profile-card">
        <h3><FiShare2 /> Organisational chart</h3>
        <p className="profile-card-hint">
          The printed chart poster. Once set, a <strong>See Organizational Chart</strong> button
          appears on the officers page. A Google Drive link works: it is shown as the picture
          alone, so the file's name is never displayed to students.
        </p>

        <div className="form-group">
          <label className="form-label">Chart image</label>
          <input
            type="text"
            className="form-input"
            value={form.orgChartUrl}
            onChange={(e) => set('orgChartUrl', e.target.value)}
            placeholder="Paste a Drive or image link, or upload below"
          />
          <p className="profile-hint">
            A poster is usually too large to upload here while Firebase Storage is off, so a
            link is the reliable option. Leave it empty to hide the button.
          </p>
          <div className="profile-logo-actions">
            <input
              ref={chartInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                handleLogoFile('orgChartUrl', e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => chartInputRef.current?.click()}
              disabled={Boolean(uploading)}
            >
              <FiUpload /> {uploading === 'orgChartUrl' ? 'Working…' : 'Upload'}
            </button>
            {!!form.orgChartUrl && (
              <button type="button" className="profile-text-btn" onClick={() => set('orgChartUrl', '')}>
                Remove
              </button>
            )}
          </div>
        </div>

        {!!form.orgChartUrl && (
          <div className="profile-chart-preview">
            <img src={directImageUrl(form.orgChartUrl)} alt="Organisational chart preview" />
          </div>
        )}
      </section>

      {/* ---- contact ---- */}
      <section className="profile-card">
        <h3><FiMail /> Contact</h3>
        <p className="profile-card-hint">
          Shown in the footer and on the Connect with SSC page. This is how students reach you,
          so it is worth keeping right.
        </p>

        <div className="profile-grid">
          <div className="form-group">
            <label className="form-label"><FiMail /> Email</label>
            <input type="email" className="form-input" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label"><FiPhone /> Phone</label>
            <input className="form-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label"><FiMapPin /> Location (short)</label>
            <input className="form-input" value={form.officeLocation} onChange={(e) => set('officeLocation', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Office hours</label>
            <input className="form-input" value={form.officeHours} onChange={(e) => set('officeHours', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Full address</label>
          <input className="form-input" value={form.officeAddress} onChange={(e) => set('officeAddress', e.target.value)} />
        </div>
      </section>

      {/* ---- social ---- */}
      <section className="profile-card">
        <h3><FiGlobe /> Social links</h3>
        <p className="profile-card-hint">
          A handle, a domain or a full link all work. Leave one empty and its icon is simply not
          shown.
        </p>

        <div className="profile-grid">
          {[
            ['facebook', 'Facebook'],
            ['instagram', 'Instagram'],
            ['twitter', 'X (Twitter)'],
            ['youtube', 'YouTube'],
            ['tiktok', 'TikTok']
          ].map(([key, label]) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              <input
                className="form-input"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder="@handle or full link"
              />
              {!!form[key] && (
                <small className="profile-resolved">→ {socialUrl(form[key], SOCIAL_BASES[key])}</small>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---- mission and vision ---- */}
      <section className="profile-card">
        <h3><FiTarget /> Mission &amp; vision</h3>
        <p className="profile-card-hint">Shown on About SSC and the Mission &amp; Vision page.</p>

        <div className="form-group">
          <label className="form-label">Mission</label>
          <textarea className="form-input" rows="4" value={form.mission} onChange={(e) => set('mission', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Vision</label>
          <textarea className="form-input" rows="3" value={form.vision} onChange={(e) => set('vision', e.target.value)} />
        </div>
      </section>

      {/* ---- core values ---- */}
      <section className="profile-card">
        <h3><FiCheck /> Core values</h3>
        <p className="profile-card-hint">Each one appears as a card on the Mission &amp; Vision page.</p>

        <div className="profile-list">
          {form.coreValues.map((value, index) => (
            <div className="profile-list-row" key={index}>
              <input
                className="form-input profile-row-title"
                value={value.title}
                onChange={(e) => setValue(index, 'title', e.target.value)}
                placeholder="Integrity"
              />
              <input
                className="form-input"
                value={value.description}
                onChange={(e) => setValue(index, 'description', e.target.value)}
                placeholder="What it means in practice"
              />
              <button type="button" className="profile-row-remove" onClick={() => removeValue(index)} aria-label={`Remove ${value.title || 'value'}`}>
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="btn-secondary" onClick={addValue}>
          <FiPlus /> Add a value
        </button>
      </section>

      {/* ---- goals ---- */}
      <section className="profile-card">
        <h3><FiTarget /> Goals</h3>
        <p className="profile-card-hint">The council's priorities for its term.</p>

        <div className="profile-list">
          {form.goals.map((goal, index) => (
            <div className="profile-list-row" key={index}>
              <input
                className="form-input"
                value={goal}
                onChange={(e) => setGoal(index, e.target.value)}
                placeholder="What the council intends to do"
              />
              <button type="button" className="profile-row-remove" onClick={() => removeGoal(index)} aria-label="Remove goal">
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="btn-secondary" onClick={addGoal}>
          <FiPlus /> Add a goal
        </button>
      </section>

      {/* ---- footer ---- */}
      <section className="profile-card">
        <h3><FiInfo /> Footer</h3>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-input"
            rows="3"
            value={form.footerDescription}
            onChange={(e) => set('footerDescription', e.target.value)}
          />
          <small className="profile-hint">
            The academic year is added after this automatically.
          </small>
        </div>
        <div className="form-group">
          <label className="form-label">Name in the copyright line</label>
          <input className="form-input" value={form.copyrightName} onChange={(e) => set('copyrightName', e.target.value)} />
        </div>
      </section>

      <div className="profile-footer-bar">
        <span className="profile-size">
          {Math.round(size / 1024)}KB of {Math.round(PROFILE_SIZE_LIMIT / 1024)}KB used
        </span>
        <div className="profile-footer-actions">
          {touched && (
            <button
              type="button"
              className="profile-text-btn"
              onClick={() => {
                setForm(siteProfile);
                setTouched(false);
                setError('');
              }}
            >
              <FiX /> Discard changes
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={isSaving || overLimit}>
            <FiSave /> {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default SiteProfile;
