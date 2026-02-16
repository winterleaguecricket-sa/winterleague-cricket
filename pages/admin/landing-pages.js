import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
// Note: landingPages data now fetched via API for persistence
import { getAllForms } from '../../data/forms';
import styles from '../../styles/adminSettings.module.css';

// Mobile responsive styles - scoped to landing admin only
const mobileStyles = `
  .landing-admin,
  .landing-admin * {
    word-break: normal !important;
    overflow-wrap: normal !important;
    hyphens: none !important;
  }

  @media (max-width: 768px) {
    /* Header */
    .landing-admin .landing-header {
      padding: 1.25rem !important;
    }
    .landing-admin .landing-header h1 {
      font-size: 1.5rem !important;
    }

    /* Tabs */
    .landing-admin .landing-tabs {
      display: flex !important;
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
      gap: 0.5rem !important;
      padding-bottom: 0.5rem !important;
    }
    .landing-admin .landing-tabs button {
      white-space: nowrap !important;
      flex-shrink: 0 !important;
      min-width: max-content !important;
      padding: 0.75rem 1rem !important;
      font-size: 0.95rem !important;
      display: inline-flex !important;
      align-items: center !important;
    }

    /* Content container */
    .landing-admin .landing-content {
      padding: 1rem !important;
      overflow-x: hidden !important;
    }

    /* Toggle row */
    .landing-admin .toggle-row {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 0.75rem !important;
      align-items: center !important;
    }
    .landing-admin .toggle-row span,
    .landing-admin .active-badge {
      white-space: nowrap !important;
    }

    /* Section headers */
    .landing-admin .section-header {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 0.75rem !important;
      align-items: center !important;
    }
    .landing-admin .section-header h3 {
      white-space: normal !important;
      margin: 0 !important;
    }

    /* Visibility toggle */
    .landing-admin .visibility-toggle {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 0.75rem !important;
      align-items: center !important;
    }
    .landing-admin .visibility-toggle h3,
    .landing-admin .visibility-toggle label {
      white-space: nowrap !important;
    }

    /* Buttons */
    .landing-admin .edit-btn,
    .landing-admin .save-btn,
    .landing-admin .cancel-btn {
      white-space: nowrap !important;
      min-width: max-content !important;
      display: inline-flex !important;
      align-items: center !important;
    }
    .landing-admin .button-group {
      display: flex !important;
      gap: 0.75rem !important;
      flex-wrap: nowrap !important;
      overflow-x: auto !important;
    }
    .landing-admin .button-group button {
      white-space: nowrap !important;
      flex-shrink: 0 !important;
    }

    /* Stats grid */
    .landing-admin .stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 0.75rem !important;
      width: 100% !important;
    }
    .landing-admin .stat-card {
      min-width: 0 !important;
    }

    /* Features & Testimonials */
    .landing-admin .features-grid,
    .landing-admin .testimonials-grid {
      grid-template-columns: 1fr !important;
      width: 100% !important;
    }
    .landing-admin .feature-card,
    .landing-admin .testimonial-card {
      min-width: 0 !important;
    }
  }
`;

// Stats Editor Component
function StatsEditor({ stats, isEditing, onEdit, onSave, onCancel }) {
  const handleSave = () => {
    const updated = stats.map((stat, idx) => ({
      number: document.getElementById(`stat-num-${idx}`).value,
      label: document.getElementById(`stat-label-${idx}`).value
    }));
    onSave(updated);
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827', margin: 0 }}>Stats Section</h3>
        {!isEditing && <button className="edit-btn" onClick={onEdit} style={{ background: '#dc0000', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>Edit</button>}
      </div>
      {isEditing ? (
        <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            {stats.map((stat, idx) => (
              <div key={idx} className="stat-card" style={{ border: '2px solid #e5e7eb', borderRadius: '8px', padding: '1rem', background: 'white', minWidth: 0 }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Number</label>
                  <input type="text" defaultValue={stat.number} id={`stat-num-${idx}`} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Label</label>
                  <input type="text" defaultValue={stat.label} id={`stat-label-${idx}`} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="button-group" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="save-btn" onClick={handleSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>Save Changes</button>
            <button className="cancel-btn" onClick={onCancel} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {stats.map((stat, idx) => (
            <div key={idx} className="stat-card" style={{ padding: '1.25rem', background: '#f9fafb', borderRadius: '8px', textAlign: 'center', border: '2px solid #e5e7eb', minWidth: 0 }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#dc0000', marginBottom: '0.5rem', whiteSpace: 'nowrap' }}>{stat.number}</div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>{stat.label}</div>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}

// Features Editor Component
function FeaturesEditor({ features, isEditing, onEdit, onSave, onCancel }) {
  const handleSave = () => {
    const updated = features.map((_, idx) => ({
      icon: document.getElementById(`feat-icon-${idx}`).value,
      title: document.getElementById(`feat-title-${idx}`).value,
      description: document.getElementById(`feat-desc-${idx}`).value
    }));
    onSave(updated);
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827', margin: 0 }}>Features Section</h3>
        {!isEditing && <button className="edit-btn" onClick={onEdit} style={{ background: '#dc0000', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>Edit</button>}
      </div>
      {isEditing ? (
        <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
          <div className="features-grid" style={{ display: 'grid', gap: '1.5rem' }}>
            {features.map((feat, idx) => (
              <div key={idx} className="feature-card" style={{ border: '2px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', background: 'white', minWidth: 0 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>Feature {idx + 1}</h4>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Icon (emoji)</label>
                    <input type="text" defaultValue={feat.icon} id={`feat-icon-${idx}`} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Title</label>
                    <input type="text" defaultValue={feat.title} id={`feat-title-${idx}`} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Description</label>
                    <textarea defaultValue={feat.description} id={`feat-desc-${idx}`} rows={2} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="button-group" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="save-btn" onClick={handleSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>Save Changes</button>
            <button className="cancel-btn" onClick={onCancel} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
          {features.map((feat, idx) => (
            <div key={idx} className="feature-card" style={{ padding: '1.5rem', background: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb', minWidth: 0 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{feat.icon}</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>{feat.title}</h4>
              <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0, overflowWrap: 'break-word', wordWrap: 'break-word' }}>{feat.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Benefits Editor Component
function BenefitsEditor({ benefits, isEditing, onEdit, onSave, onCancel }) {
  const [items, setItems] = useState(benefits.items || []);
  const [title, setTitle] = useState(benefits.title || '');

  const handleSave = () => {
    const updatedItems = items.map((_, idx) => document.getElementById(`benefit-${idx}`).value).filter(item => item.trim());
    const updatedTitle = document.getElementById('benefits-title').value;
    onSave(updatedTitle, updatedItems);
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827', margin: 0 }}>Benefits Section</h3>
        {!isEditing && <button className="edit-btn" onClick={onEdit} style={{ background: '#dc0000', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>Edit</button>}
      </div>
      {isEditing ? (
        <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Section Title</label>
            <input type="text" defaultValue={benefits.title} id="benefits-title" style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
          </div>
          <div className="benefits-grid" style={{ display: 'grid', gap: '1rem' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                <span style={{ fontSize: '1.2rem', color: '#10b981', flexShrink: 0 }}>✓</span>
                <input type="text" defaultValue={item} id={`benefit-${idx}`} style={{ flex: 1, minWidth: 0, padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
                {items.length > 1 && (
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', flexShrink: 0, whiteSpace: 'nowrap' }}>✕</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setItems([...items, ''])} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '6px', marginTop: '1rem', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add Benefit</button>
          <div className="button-group" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="save-btn" onClick={handleSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>Save Changes</button>
            <button className="cancel-btn" onClick={onCancel} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '1.5rem', background: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb' }}>
          <h4 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>{benefits.title}</h4>
          <div className="benefits-grid" style={{ display: 'grid', gap: '0.75rem' }}>
            {benefits.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ color: '#10b981', fontWeight: '700', fontSize: '1.1rem', flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: '0.95rem', color: '#374151', overflowWrap: 'break-word', wordWrap: 'break-word' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Testimonials Editor Component
function TestimonialsEditor({ testimonials, testimonialsVisible, isEditing, onEdit, onSave, onCancel, onToggleVisibility }) {
  const handleSave = () => {
    const updated = testimonials.map((_, idx) => ({
      quote: document.getElementById(`test-quote-${idx}`).value,
      author: document.getElementById(`test-author-${idx}`).value,
      role: document.getElementById(`test-role-${idx}`).value
    }));
    onSave(updated);
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="visibility-toggle" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827', margin: 0 }}>Testimonials Section</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: '#6b7280', whiteSpace: 'nowrap', background: '#f3f4f6', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <input 
              type="checkbox" 
              checked={testimonialsVisible !== false}
              onChange={(e) => onToggleVisibility(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
            />
            <span style={{ color: testimonialsVisible !== false ? '#10b981' : '#6b7280', fontWeight: '600' }}>
              {testimonialsVisible !== false ? 'Visible' : 'Hidden'}
            </span>
          </label>
        </div>
        {!isEditing && <button className="edit-btn" onClick={onEdit} style={{ background: '#dc0000', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>Edit</button>}
      </div>
      {isEditing ? (
        <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
          <div className="testimonials-grid" style={{ display: 'grid', gap: '1.5rem' }}>
            {testimonials.map((test, idx) => (
              <div key={idx} className="testimonial-card" style={{ border: '2px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', background: 'white', minWidth: 0 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>Testimonial {idx + 1}</h4>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Quote</label>
                    <textarea defaultValue={test.quote} id={`test-quote-${idx}`} rows={3} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Author Name</label>
                    <input type="text" defaultValue={test.author} id={`test-author-${idx}`} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Role/Title</label>
                    <input type="text" defaultValue={test.role} id={`test-role-${idx}`} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="button-group" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="save-btn" onClick={handleSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>Save Changes</button>
            <button className="cancel-btn" onClick={onCancel} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
          {testimonials.map((test, idx) => (
            <div key={idx} className="testimonial-card" style={{ padding: '1.5rem', background: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb', minWidth: 0 }}>
              <div style={{ fontSize: '2rem', color: '#dc0000', marginBottom: '1rem' }}>"</div>
              <p style={{ fontSize: '1rem', fontStyle: 'italic', color: '#374151', marginBottom: '1rem', lineHeight: '1.6', overflowWrap: 'break-word', wordWrap: 'break-word' }}>{test.quote}</p>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#111827' }}>{test.author}</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{test.role}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LandingPagesAdmin() {
  const [landingPages, setLandingPages] = useState([]);
  const [forms, setForms] = useState([]);
  const [activeTab, setActiveTab] = useState(1);
  const [editingSection, setEditingSection] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [heroImage, setHeroImage] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-landing-page-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setHeroImage(data.url);
        setSaveMessage('Image uploaded successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Error uploading image: ' + (data.error || 'Unknown error'));
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setSaveMessage('Error uploading image');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/landing-pages');
        const data = await res.json();
        setLandingPages(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading landing pages:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    setForms(getAllForms());
  }, []);

  const refreshData = async () => {
    try {
      const res = await fetch('/api/landing-pages');
      const data = await res.json();
      setLandingPages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error refreshing landing pages:', error);
    }
  };

  const handleToggle = async (formId, enabled) => {
    try {
      await fetch(`/api/landing-pages?formId=${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      await refreshData();
      setSaveMessage(`Landing page ${enabled ? 'enabled' : 'disabled'}`);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error toggling landing page:', error);
      setSaveMessage('Error updating landing page');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleUpdateHero = async (formId, updates) => {
    try {
      await fetch(`/api/landing-pages?formId=${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroSection: updates })
      });
      await refreshData();
      setSaveMessage('Hero section updated successfully');
      setTimeout(() => setSaveMessage(''), 3000);
      setEditingSection(null);
    } catch (error) {
      console.error('Error updating hero section:', error);
      setSaveMessage('Error updating hero section');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleUpdateBenefits = async (formId, title, items) => {
    try {
      await fetch(`/api/landing-pages?formId=${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benefits: { title, items } })
      });
      await refreshData();
      setSaveMessage('Benefits updated successfully');
      setTimeout(() => setSaveMessage(''), 3000);
      setEditingSection(null);
    } catch (error) {
      console.error('Error updating benefits:', error);
      setSaveMessage('Error updating benefits');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleUpdateFeatures = async (formId, features) => {
    try {
      await fetch(`/api/landing-pages?formId=${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features })
      });
      await refreshData();
      setSaveMessage('Features updated successfully');
      setTimeout(() => setSaveMessage(''), 3000);
      setEditingSection(null);
    } catch (error) {
      console.error('Error updating features:', error);
      setSaveMessage('Error updating features');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleUpdateTestimonials = async (formId, testimonials) => {
    try {
      await fetch(`/api/landing-pages?formId=${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testimonials })
      });
      await refreshData();
      setSaveMessage('Testimonials updated successfully');
      setTimeout(() => setSaveMessage(''), 3000);
      setEditingSection(null);
    } catch (error) {
      console.error('Error updating testimonials:', error);
      setSaveMessage('Error updating testimonials');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleToggleTestimonialsVisibility = async (formId, visible) => {
    try {
      await fetch(`/api/landing-pages?formId=${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testimonialsVisible: visible })
      });
      await refreshData();
      setSaveMessage(`Testimonials ${visible ? 'shown' : 'hidden'} successfully`);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error toggling testimonials visibility:', error);
      setSaveMessage('Error updating testimonials visibility');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleUpdateStats = async (formId, stats) => {
    try {
      await fetch(`/api/landing-pages?formId=${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats })
      });
      await refreshData();
      setSaveMessage('Stats updated successfully');
      setTimeout(() => setSaveMessage(''), 3000);
      setEditingSection(null);
    } catch (error) {
      console.error('Error updating stats:', error);
      setSaveMessage('Error updating stats');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const getFormName = (formId) => {
    const form = forms.find(f => f.id === formId);
    return form ? form.name : `Form ${formId}`;
  };

  const activePage = landingPages.find(p => p.formId === activeTab);

  return (
    <>
      <Head>
        <title>Landing Pages Management - Admin</title>
        <style dangerouslySetInnerHTML={{ __html: mobileStyles }} />
      </Head>

      <div className="landing-admin" style={{ minHeight: '100vh', background: '#f3f4f6' }}>
        {/* Header */}
        <div className="landing-header" style={{ background: 'linear-gradient(135deg, #dc0000 0%, #b30000 100%)', padding: '2rem', color: 'white' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <Link href="/admin" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '1rem', display: 'inline-block' }}>
              ← Back to Admin
            </Link>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>Landing Pages Management</h1>
            <p style={{ opacity: 0.9, marginTop: '0.5rem' }}>Customize landing pages for registration forms</p>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
          {saveMessage && (
            <div style={{
              background: '#d1fae5',
              border: '1px solid #86efac',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '2rem',
              color: '#065f46'
            }}>
              {saveMessage}
            </div>
          )}

          {/* Tabs */}
          <div className="landing-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e5e7eb' }}>
            {landingPages.map((page) => (
              <button
                key={page.id}
                onClick={() => setActiveTab(page.formId)}
                data-active={activeTab === page.formId}
                style={{
                  padding: '1rem 2rem',
                  background: activeTab === page.formId ? 'white' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === page.formId ? '3px solid #dc0000' : '3px solid transparent',
                  color: activeTab === page.formId ? '#dc0000' : '#6b7280',
                  fontWeight: activeTab === page.formId ? '700' : '500',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: '-2px',
                  whiteSpace: 'nowrap'
                }}
              >
                {getFormName(page.formId)}
              </button>
            ))}
          </div>

          {/* Active Page Content */}
          {activePage && (
            <div className="landing-content" style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              
              {/* Enable/Disable Toggle */}
              <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #e5e7eb' }}>
                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', flexWrap: 'wrap' }}>
                  <input
                    type="checkbox"
                    checked={activePage.enabled}
                    onChange={(e) => handleToggle(activePage.formId, e.target.checked)}
                    style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: '#dc0000' }}
                  />
                  <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827' }}>Enable Landing Page</span>
                  {activePage.enabled && (
                    <span className="active-badge" style={{
                      background: '#d1fae5',
                      color: '#065f46',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      whiteSpace: 'nowrap'
                    }}>
                      ACTIVE
                    </span>
                  )}
                </label>
              </div>

              {/* Hero Section */}
              <div style={{ marginBottom: '2.5rem' }}>
                <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    Hero Section
                  </h3>
                  {editingSection !== 'hero' && (
                    <button
                      className="edit-btn"
                      onClick={() => {
                        setEditingSection('hero');
                        setHeroImage(activePage.heroSection.backgroundImage || '');
                      }}
                      style={{
                        background: '#dc0000',
                        color: 'white',
                        border: 'none',
                        padding: '0.6rem 1.25rem',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editingSection === 'hero' ? (
                  <div style={{ display: 'grid', gap: '1.25rem', background: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                        Title
                      </label>
                      <input
                        type="text"
                        defaultValue={activePage.heroSection.title}
                        id="hero-title"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '16px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                        Subtitle
                      </label>
                      <textarea
                        defaultValue={activePage.heroSection.subtitle}
                        id="hero-subtitle"
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '16px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                        CTA Button Text
                      </label>
                      <input
                        type="text"
                        defaultValue={activePage.heroSection.ctaText}
                        id="hero-cta"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '16px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                        Button Color
                      </label>
                      <input
                        type="color"
                        defaultValue={activePage.heroSection.ctaColor}
                        id="hero-color"
                        style={{
                          width: '100px',
                          height: '45px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                        Overlay Color (with transparency)
                      </label>
                      <input
                        type="text"
                        defaultValue={activePage.heroSection.overlayColor}
                        id="hero-overlay"
                        placeholder="rgba(220, 0, 0, 0.85)"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '16px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                        Background Image
                      </label>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '16px',
                              background: 'white',
                              boxSizing: 'border-box'
                            }}
                          />
                          {uploadingImage && (
                            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.5rem' }}>Uploading...</p>
                          )}
                          {heroImage && (
                            <p style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                              Current: {heroImage}
                            </p>
                          )}
                        </div>
                        {heroImage && (
                          <div style={{ 
                            width: '120px', 
                            height: '80px', 
                            borderRadius: '8px', 
                            overflow: 'hidden',
                            border: '2px solid #e5e7eb'
                          }}>
                            <img 
                              src={heroImage} 
                              alt="Hero preview" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="button-group" style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <button
                        className="save-btn"
                        onClick={() => {
                          const title = document.getElementById('hero-title').value;
                          const subtitle = document.getElementById('hero-subtitle').value;
                          const ctaText = document.getElementById('hero-cta').value;
                          const ctaColor = document.getElementById('hero-color').value;
                          const overlayColor = document.getElementById('hero-overlay').value;
                          handleUpdateHero(activePage.formId, { 
                            ...activePage.heroSection,
                            title, 
                            subtitle, 
                            ctaText,
                            ctaColor,
                            overlayColor,
                            backgroundImage: heroImage || activePage.heroSection.backgroundImage
                          });
                        }}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Save Changes
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={() => setEditingSection(null)}
                        style={{
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>Title: </span>
                      <span style={{ fontSize: '0.95rem', color: '#111827' }}>{activePage.heroSection.title}</span>
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>Subtitle: </span>
                      <span style={{ fontSize: '0.95rem', color: '#111827' }}>{activePage.heroSection.subtitle}</span>
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>Button: </span>
                      <span style={{ 
                        background: activePage.heroSection.ctaColor,
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        {activePage.heroSection.ctaText}
                      </span>
                    </div>
                    {activePage.heroSection.backgroundImage && (
                      <div style={{ marginTop: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Background Image: </span>
                        <img 
                          src={activePage.heroSection.backgroundImage} 
                          alt="Hero background" 
                          style={{ 
                            maxWidth: '200px', 
                            height: 'auto', 
                            borderRadius: '8px',
                            border: '2px solid #e5e7eb'
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stats Section */}
              <StatsEditor 
                stats={activePage.stats}
                isEditing={editingSection === 'stats'}
                onEdit={() => setEditingSection('stats')}
                onSave={(stats) => handleUpdateStats(activePage.formId, stats)}
                onCancel={() => setEditingSection(null)}
              />

              {/* Features Section */}
              <FeaturesEditor 
                features={activePage.features}
                isEditing={editingSection === 'features'}
                onEdit={() => setEditingSection('features')}
                onSave={(features) => handleUpdateFeatures(activePage.formId, features)}
                onCancel={() => setEditingSection(null)}
              />

              {/* Benefits Section */}
              <BenefitsEditor 
                benefits={activePage.benefits}
                isEditing={editingSection === 'benefits'}
                onEdit={() => setEditingSection('benefits')}
                onSave={(title, items) => handleUpdateBenefits(activePage.formId, title, items)}
                onCancel={() => setEditingSection(null)}
              />

              {/* Testimonials Section */}
              <TestimonialsEditor 
                testimonials={activePage.testimonials}
                testimonialsVisible={activePage.testimonialsVisible}
                isEditing={editingSection === 'testimonials'}
                onEdit={() => setEditingSection('testimonials')}
                onSave={(testimonials) => handleUpdateTestimonials(activePage.formId, testimonials)}
                onCancel={() => setEditingSection(null)}
                onToggleVisibility={(visible) => handleToggleTestimonialsVisibility(activePage.formId, visible)}
              />

              {/* Preview Link */}
              <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '2px solid #e5e7eb' }}>
                <Link 
                  href={`/forms?formId=${activePage.formId}`}
                  target="_blank"
                  style={{
                    display: 'inline-block',
                    background: '#3b82f6',
                    color: 'white',
                    padding: '0.85rem 2rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '1rem'
                  }}
                >
                  🔍 Preview Landing Page
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Force SSR to prevent prerender errors during build
export async function getServerSideProps() {
  return { props: {} };
}
