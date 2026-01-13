import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getAllLandingPages, updateLandingPage, toggleLandingPage, updateLandingPageFeatures, updateLandingPageTestimonials, updateLandingPageStats } from '../../data/landingPages';
import { getAllForms } from '../../data/forms';
import styles from '../../styles/adminSettings.module.css';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827', margin: 0 }}>Stats Section</h3>
        {!isEditing && <button onClick={onEdit} style={{ background: '#dc0000', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>Edit</button>}
      </div>
      {isEditing ? (
        <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            {stats.map((stat, idx) => (
              <div key={idx} style={{ border: '2px solid #e5e7eb', borderRadius: '8px', padding: '1rem', background: 'white' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Number</label>
                  <input type="text" defaultValue={stat.number} id={`stat-num-${idx}`} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Label</label>
                  <input type="text" defaultValue={stat.label} id={`stat-label-${idx}`} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button onClick={handleSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button>
            <button onClick={onCancel} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {stats.map((stat, idx) => (
            <div key={idx} style={{ padding: '1.25rem', background: '#f9fafb', borderRadius: '8px', textAlign: 'center', border: '2px solid #e5e7eb' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#dc0000', marginBottom: '0.5rem' }}>{stat.number}</div>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827', margin: 0 }}>Features Section</h3>
        {!isEditing && <button onClick={onEdit} style={{ background: '#dc0000', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>Edit</button>}
      </div>
      {isEditing ? (
        <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {features.map((feat, idx) => (
              <div key={idx} style={{ border: '2px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', background: 'white' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>Feature {idx + 1}</h4>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Icon (emoji)</label>
                    <input type="text" defaultValue={feat.icon} id={`feat-icon-${idx}`} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Title</label>
                    <input type="text" defaultValue={feat.title} id={`feat-title-${idx}`} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Description</label>
                    <textarea defaultValue={feat.description} id={`feat-desc-${idx}`} rows={2} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button onClick={handleSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button>
            <button onClick={onCancel} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
          {features.map((feat, idx) => (
            <div key={idx} style={{ padding: '1.5rem', background: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{feat.icon}</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>{feat.title}</h4>
              <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>{feat.description}</p>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827', margin: 0 }}>Benefits Section</h3>
        {!isEditing && <button onClick={onEdit} style={{ background: '#dc0000', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>Edit</button>}
      </div>
      {isEditing ? (
        <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Section Title</label>
            <input type="text" defaultValue={benefits.title} id="benefits-title" style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }} />
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.2rem', color: '#10b981' }}>✓</span>
                <input type="text" defaultValue={item} id={`benefit-${idx}`} style={{ flex: 1, padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }} />
                {items.length > 1 && (
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>✕</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setItems([...items, ''])} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '6px', marginTop: '1rem', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>+ Add Benefit</button>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button onClick={handleSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button>
            <button onClick={onCancel} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '1.5rem', background: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb' }}>
          <h4 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>{benefits.title}</h4>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {benefits.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#10b981', fontWeight: '700', fontSize: '1.1rem' }}>✓</span>
                <span style={{ fontSize: '0.95rem', color: '#374151' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Testimonials Editor Component
function TestimonialsEditor({ testimonials, isEditing, onEdit, onSave, onCancel }) {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827', margin: 0 }}>Testimonials Section</h3>
        {!isEditing && <button onClick={onEdit} style={{ background: '#dc0000', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>Edit</button>}
      </div>
      {isEditing ? (
        <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {testimonials.map((test, idx) => (
              <div key={idx} style={{ border: '2px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', background: 'white' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>Testimonial {idx + 1}</h4>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Quote</label>
                    <textarea defaultValue={test.quote} id={`test-quote-${idx}`} rows={3} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Author Name</label>
                    <input type="text" defaultValue={test.author} id={`test-author-${idx}`} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Role/Title</label>
                    <input type="text" defaultValue={test.role} id={`test-role-${idx}`} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button onClick={handleSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button>
            <button onClick={onCancel} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
          {testimonials.map((test, idx) => (
            <div key={idx} style={{ padding: '1.5rem', background: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb' }}>
              <div style={{ fontSize: '2rem', color: '#dc0000', marginBottom: '1rem' }}>"</div>
              <p style={{ fontSize: '1rem', fontStyle: 'italic', color: '#374151', marginBottom: '1rem', lineHeight: '1.6' }}>{test.quote}</p>
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

  useEffect(() => {
    setLandingPages(getAllLandingPages());
    setForms(getAllForms());
  }, []);

  const refreshData = () => {
    setLandingPages(getAllLandingPages());
  };

  const handleToggle = (formId, enabled) => {
    toggleLandingPage(formId, enabled);
    refreshData();
    setSaveMessage(`Landing page ${enabled ? 'enabled' : 'disabled'}`);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleUpdateHero = (formId, updates) => {
    updateLandingPage(formId, { heroSection: updates });
    refreshData();
    setSaveMessage('Hero section updated successfully');
    setTimeout(() => setSaveMessage(''), 3000);
    setEditingSection(null);
  };

  const handleUpdateBenefits = (formId, title, items) => {
    updateLandingPage(formId, { benefits: { title, items } });
    refreshData();
    setSaveMessage('Benefits updated successfully');
    setTimeout(() => setSaveMessage(''), 3000);
    setEditingSection(null);
  };

  const handleUpdateFeatures = (formId, features) => {
    updateLandingPageFeatures(formId, features);
    refreshData();
    setSaveMessage('Features updated successfully');
    setTimeout(() => setSaveMessage(''), 3000);
    setEditingSection(null);
  };

  const handleUpdateTestimonials = (formId, testimonials) => {
    updateLandingPageTestimonials(formId, testimonials);
    refreshData();
    setSaveMessage('Testimonials updated successfully');
    setTimeout(() => setSaveMessage(''), 3000);
    setEditingSection(null);
  };

  const handleUpdateStats = (formId, stats) => {
    updateLandingPageStats(formId, stats);
    refreshData();
    setSaveMessage('Stats updated successfully');
    setTimeout(() => setSaveMessage(''), 3000);
    setEditingSection(null);
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
      </Head>

      <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #dc0000 0%, #b30000 100%)', padding: '2rem', color: 'white' }}>
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
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e5e7eb' }}>
            {landingPages.map((page) => (
              <button
                key={page.id}
                onClick={() => setActiveTab(page.formId)}
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
                  marginBottom: '-2px'
                }}
              >
                {getFormName(page.formId)}
              </button>
            ))}
          </div>

          {/* Active Page Content */}
          {activePage && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              
              {/* Enable/Disable Toggle */}
              <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #e5e7eb' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={activePage.enabled}
                    onChange={(e) => handleToggle(activePage.formId, e.target.checked)}
                    style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: '#dc0000' }}
                  />
                  <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827' }}>Enable Landing Page</span>
                  {activePage.enabled && (
                    <span style={{
                      background: '#d1fae5',
                      color: '#065f46',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: '700'
                    }}>
                      ACTIVE
                    </span>
                  )}
                </label>
              </div>

              {/* Hero Section */}
              <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    Hero Section
                  </h3>
                  {editingSection !== 'hero' && (
                    <button
                      onClick={() => setEditingSection('hero')}
                      style={{
                        background: '#dc0000',
                        color: 'white',
                        border: 'none',
                        padding: '0.6rem 1.25rem',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer'
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
                          fontSize: '0.95rem'
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
                          fontSize: '0.95rem'
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
                          fontSize: '0.95rem'
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
                          fontSize: '0.95rem'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <button
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
                            overlayColor
                          });
                        }}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingSection(null)}
                        style={{
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer'
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
                    <div>
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
                isEditing={editingSection === 'testimonials'}
                onEdit={() => setEditingSection('testimonials')}
                onSave={(testimonials) => handleUpdateTestimonials(activePage.formId, testimonials)}
                onCancel={() => setEditingSection(null)}
              />

              {/* Preview Link */}
              <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '2px solid #e5e7eb' }}>
                <Link 
                  href={`/forms?form=${activePage.formId}`}
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
