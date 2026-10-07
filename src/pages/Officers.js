import React, { useContext, useState, useRef, useEffect } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import { AuthContext } from '../App';
import { useData } from '../context/DataContext';
import useModalBehaviour from '../components/useModalBehaviour';
import { useDialog } from '../components/DialogProvider';
import { uploadImages } from '../lib/uploads';
import { programOptions } from '../data/sampleData';
import OfficerDirectory from '../components/OfficerDirectory';
import '../components/OfficerListView.css';
import { DIVISIONS } from '../lib/officers';
import { formatAcademicYear } from '../lib/academicYear';
import { useLanguage } from '../context/LanguageContext';
import './Officers.css';

const Officers = () => {
  const { t } = useLanguage();
  const { isAdmin } = useContext(AuthContext);
  const { confirm, notify } = useDialog();
  const { officers, createOfficer, updateOfficer, deleteOfficer, reorderOfficers, selectedYear, availableYears, siteProfile } = useData();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    division: 'Core Officers',
    course: '',
    yearLevel: '',
    image: '',
    email: '',
    quote: '',
    academicYear: ''
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (selectedImageFile) {
      const objectUrl = URL.createObjectURL(selectedImageFile);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewUrl(formData.image || '');
    }
  }, [selectedImageFile, formData.image]);

  const handleAdd = () => {
    setEditItem(null);
    setFormData({ name: '', position: '', division: 'Core Officers', course: '', yearLevel: '', image: '', email: '', quote: '', academicYear: selectedYear });
    setSelectedImageFile(null);
    setPreviewUrl('');
    setUploadStatus('');
    setShowAdminModal(true);
  };

  const handleEdit = (officer) => {
    setEditItem(officer);
    setFormData({
      name: officer.name || '',
      position: officer.position || '',
      division: officer.division || 'Core Officers',
      course: officer.course || '',
      yearLevel: officer.yearLevel || '',
      image: officer.image || '',
      email: officer.email || '',
      quote: officer.quote || '',
      // Officers saved before year-scoping existed have no field; they belong
      // to the year currently being viewed.
      academicYear: officer.academicYear || selectedYear
    });
    setSelectedImageFile(null);
    setPreviewUrl(officer.image || '');
    setUploadStatus('');
    setShowAdminModal(true);
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm({
      title: 'Delete officer?',
      message: 'This officer comes off the site right away. You will have a few seconds to undo it.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!shouldDelete) return;
    deleteOfficer(id);
  };

  const handleReorder = async (updates) => {
    try {
      await reorderOfficers(updates);
    } catch (error) {
      console.error('Failed saving the officer order:', error);
      notify('Could not save the new order: ' + (error?.message || String(error)));
    }
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setFormData((prev) => ({ ...prev, image: '' }));
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Checked explicitly rather than left to the inputs' `required` attribute:
    // that native validation bubble anchors unreliably on a field inside this
    // modal's fixed, scrolling layout, so a blank name or position could
    // silently block the submit with no visible message.
    if (!formData.name.trim() || !formData.position.trim()) {
      notify('Please give this officer a name and a position before saving.');
      return;
    }
    setIsSaving(true);
    let uploadedImage = '';

    if (selectedImageFile) {
      try {
        const [url] = await uploadImages([selectedImageFile], 'officers', ({ status, successCount, failedCount }) => {
          if (status === 'uploading') setUploadStatus('Uploading photo...');
          if (status === 'done') setUploadStatus(`Photo: ${successCount} uploaded, ${failedCount} skipped.`);
        });
        uploadedImage = url || '';
      } catch (error) {
        uploadedImage = '';
      }

      if (!uploadedImage) {
        notify('Failed to process/upload the photo. Please try choosing a different image file.');
        setIsSaving(false);
        return;
      }
    }

    const payload = {
      ...formData,
      image: uploadedImage || formData.image || ''
    };

    try {
      if (editItem) {
        await updateOfficer(editItem.id, payload);
      } else {
        await createOfficer(payload);
      }
      setShowAdminModal(false);
      setEditItem(null);
    } catch (error) {
      console.error('Failed saving officer:', error);
      notify('Saving officer failed: ' + (error?.message || String(error)));
    } finally {
      setIsSaving(false);
    }
  };

  // Handed to useModalBehaviour so Tab stays inside the dialog.
  const adminModalRef = useRef(null);
  useModalBehaviour(showAdminModal, () => setShowAdminModal(false), adminModalRef);

  return (
    <div className="officers-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>{t('off.title')}</h1>
          <p>{t('off.subtitle')}</p>
          {isAdmin && (
            <button className="admin-add-btn" onClick={handleAdd}>
              <FiPlus /> Add Officer
            </button>
          )}
        </div>
      </div>

      <div className="container section">
        {!officers.length && (
          <div className="officers-message">
            <h3>{t('off.none')}</h3>
            <p>Add officers from the admin form and they will appear here automatically.</p>
          </div>
        )}

        <OfficerDirectory
          officers={officers}
          orgChartUrl={siteProfile.orgChartUrl}
          academicYear={selectedYear}
          isAdmin={isAdmin}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReorder={handleReorder}
          headingLevel="h2"
        />


        {/* Message from SSC */}
        <div className="officers-message">
          <h3>{t('about.message')}</h3>
          <p>
            We are honored to serve as your Student Supreme Council officers. Our commitment is to represent 
            your voice, address your concerns, and create meaningful opportunities for growth and development. 
            Together, we can build a stronger, more united student community.
          </p>
          <p>
            <strong>{t('about.voiceMatters')}</strong> Don't hesitate to reach out to any of our officers for 
            questions, suggestions, or concerns. We are here to serve you.
          </p>
        </div>
      </div>

      {showAdminModal && (
        <div className="admin-modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="admin-modal" ref={adminModalRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editItem ? 'Edit Officer' : 'Add New Officer'}</h3>
              <button className="admin-modal-close" onClick={() => setShowAdminModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="admin-modal-form">
              <div className="form-group"><label>Name</label><input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="form-group"><label>Position</label><input value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} /></div>
              <div className="form-group">
                <label>Section</label>
                <select value={formData.division || 'Core Officers'} onChange={(e) => setFormData({ ...formData, division: e.target.value })}>
                  {DIVISIONS.map((division) => (
                    <option key={division} value={division}>{division}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Academic Year</label>
                <select
                  value={formData.academicYear || selectedYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>{formatAcademicYear(year)}</option>
                  ))}
                </select>
                <small>Officers are listed under the year they served.</small>
              </div>
              <div className="form-group">
                <label>Program</label>
                <select value={formData.course} onChange={(e) => setFormData({ ...formData, course: e.target.value })}>
                  <option value="">Select program</option>
                  {programOptions.map((program) => (
                    <option key={program.name} value={program.name}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group"><label>Year Level</label><input value={formData.yearLevel} onChange={(e) => setFormData({ ...formData, yearLevel: e.target.value })} /></div>
              <div className="form-group"><label>Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
              
              <div className="form-group">
                <label>Upload Officer Photo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedImageFile(e.target.files?.[0] || null)}
                />
                {previewUrl && (
                  <div className="officer-preview-box" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img
                      src={previewUrl}
                      alt="Preview"
                      style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #4f46e5' }}
                    />
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={handleRemoveImage}
                      style={{ padding: '0.4rem 0.75rem', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
                    >
                      <FiX /> Remove Photo
                    </button>
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>Or Photo URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAdminModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={isSaving}>
                  {isSaving ? 'Uploading...' : `${editItem ? 'Update' : 'Add'} Officer`}
                </button>
              </div>
              {!!uploadStatus && <p className={`upload-status-text ${isSaving ? 'uploading' : ''}`}>{uploadStatus}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Officers;
