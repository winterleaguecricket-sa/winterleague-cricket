import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminProfile.module.css';
// Note: adminSettings uses Node.js fs module - fetch via API instead
import { getFormTemplates } from '../../data/forms';

export default function AdminProfile() {
  const [settings, setSettings] = useState(null);
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // profile, email-templates, order-emails, submission-data
  const [selectedTemplate, setSelectedTemplate] = useState('pending');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [forms, setForms] = useState([]);
  const [submissionCounts, setSubmissionCounts] = useState({});
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const sectionIcons = {
    profile: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    ),
    'email-templates': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16v12H4z" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
    'order-emails': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 7h12l-1 12H7L6 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
    ),
    'submission-data': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19V5" />
        <path d="M10 19V9" />
        <path d="M16 19V13" />
        <path d="M22 19V7" />
      </svg>
    ),
    'team-portal': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="8" r="3" />
        <path d="M2 20a6 6 0 0 1 12 0" />
        <path d="M10 20a6 6 0 0 1 12 0" />
      </svg>
    ),
    'parent-portal': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
        <path d="M17 10h4m-2-2v4" />
      </svg>
    ),
    'parent-emails': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16v12H4z" />
        <path d="m4 7 8 6 8-6" />
        <path d="M17 2h4m-2-2v4" />
      </svg>
    ),
    'email-config': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a7.5 7.5 0 0 0 .1-6l2-1.2-2-3.4-2.3.9a7.6 7.6 0 0 0-5.2-3L11 2H7l-.7 2.3a7.6 7.6 0 0 0-5.2 3L.8 6.4 3 9.8a7.5 7.5 0 0 0 0 4.4L.8 17.6l2 3.4 2.3-.9a7.6 7.6 0 0 0 5.2 3L11 22h4l.7-2.3a7.6 7.6 0 0 0 5.2-3l2.3.9 2-3.4Z" />
      </svg>
    )
  };

  useEffect(() => {
    // Fetch admin settings via API (adminSettings uses Node.js fs, can't run client-side)
    const loadAdminSettings = async () => {
      try {
        const res = await fetch('/api/admin-settings');
        const adminSettings = await res.json();
        const safeSettings = {
          ...adminSettings,
          emailTemplates: adminSettings?.emailTemplates || {
            pending: { subject: '', body: '' },
            reviewed: { subject: '', body: '' },
            complete: { subject: '', body: '' },
            orderConfirmation: { subject: '', body: '' },
            supplierForward: { subject: '', body: '' },
            parentPaymentSuccess: { subject: '', body: '' },
            parentPlayerApproved: { subject: '', body: '' }
          }
        };
        setSettings(safeSettings);
        setEmail(safeSettings.email || '');
        setSupplierEmail(safeSettings.supplierEmail || '');
        
        // Load initial template
        if (safeSettings.emailTemplates[selectedTemplate]) {
          setTemplateSubject(safeSettings.emailTemplates[selectedTemplate].subject || '');
          setTemplateBody(safeSettings.emailTemplates[selectedTemplate].body || '');
        }
      } catch (error) {
        console.error('Error loading admin settings:', error);
      }
    };
    loadAdminSettings();
    
    const formTemplates = getFormTemplates();
    setForms(formTemplates);
    
    // Load submission counts from database
    const loadSubmissionCounts = async () => {
      const counts = {};
      for (const form of formTemplates) {
        try {
          const res = await fetch(`/api/submissions?formId=${form.id}`);
          if (res.ok) {
            const data = await res.json();
            counts[form.id] = (data.submissions || []).length;
          } else {
            counts[form.id] = 0;
          }
        } catch {
          counts[form.id] = 0;
        }
      }
      setSubmissionCounts(counts);
    };
    loadSubmissionCounts();
  }, []);

  useEffect(() => {
    if (settings?.emailTemplates?.[selectedTemplate]) {
      setTemplateSubject(settings.emailTemplates[selectedTemplate].subject || '');
      setTemplateBody(settings.emailTemplates[selectedTemplate].body || '');
    }
  }, [selectedTemplate, settings]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (password && password !== confirmPassword) {
      setSaveMessage('Passwords do not match');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    // Update email via API
    try {
      await fetch('/api/admin-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateEmail', email })
      });
    } catch (error) {
      console.error('Error updating email:', error);
    }
    
    if (password) {
      if (!currentPassword) {
        setSaveMessage('Current password is required to change password');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
      
      setIsUpdatingPassword(true);
      try {
        const response = await fetch('/api/admin-auth', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            currentPassword, 
            newPassword: password 
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setSaveMessage('Password updated successfully!');
        } else {
          setSaveMessage(data.error || 'Failed to update password');
        }
      } catch (error) {
        console.error('Password update error:', error);
        setSaveMessage('Failed to update password. Please try again.');
      } finally {
        setIsUpdatingPassword(false);
      }
    } else {
      setSaveMessage('Profile updated successfully!');
    }
    
    setTimeout(() => setSaveMessage(''), 3000);
    setCurrentPassword('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/admin-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateTemplate',
          templateName: selectedTemplate,
          subject: templateSubject,
          body: templateBody
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        setSaveMessage(errorData?.error || 'Failed to update template');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }

      const updatedSettings = await res.json();
      setSettings(updatedSettings);

      // Re-fetch the template from server to ensure saved values are used
      const templateRes = await fetch(`/api/admin-settings?template=${selectedTemplate}`);
      if (templateRes.ok) {
        const template = await templateRes.json();
        setTemplateSubject(template.subject || '');
        setTemplateBody(template.body || '');
      }
      
      setSaveMessage('Email template updated successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error updating template:', error);
      setSaveMessage('Failed to update template');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleSaveSupplierEmail = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/admin-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateSupplierEmail', supplierEmail })
      });
      
      const updatedSettings = await res.json();
      setSettings(updatedSettings);
      
      setSaveMessage('Supplier email updated successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error updating supplier email:', error);
      setSaveMessage('Failed to update supplier email');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };


  const handleResetAllSubmissions = async () => {
    if (confirm('⚠️ WARNING: This will permanently delete ALL form submissions from ALL forms. This action cannot be undone. Are you absolutely sure?')) {
      try {
        const res = await fetch('/api/submissions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteAll: true })
        });
        
        if (res.ok) {
          // Refresh submission counts
          const counts = {};
          const formTemplates = getFormTemplates();
          for (const form of formTemplates) {
            counts[form.id] = 0;
          }
          setSubmissionCounts(counts);
          setSaveMessage('All submissions have been deleted from the database!');
        } else {
          setSaveMessage('Failed to delete submissions. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting submissions:', error);
        setSaveMessage('Error deleting submissions. Please try again.');
      }
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <>
      <Head>
        <title>Admin Profile & Settings</title>
      </Head>

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.logo}>⚙️ Admin Settings</h1>
            <Link href="/admin" className={styles.backLink}>
              ← Back to Admin
            </Link>
          </div>
        </div>

        <div className={styles.main}>

        {/* Save Message */}
        {saveMessage && (
          <div className={styles.saveMessage}>
            ✓ {saveMessage}
          </div>
        )}

        {/* Section Selector */}
        <div className={styles.sectionSelector}>
          <div className={styles.sectionIcon}>{sectionIcons[activeTab]}</div>
          <div className={styles.sectionLabel}>Section</div>
          <select
            className={styles.sectionSelect}
            value={activeTab}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'email-config') {
                window.location.href = '/admin/email-config';
                return;
              }
              setActiveTab(value);
              // Set appropriate default template when switching tabs
              if (value === 'email-templates') {
                setSelectedTemplate('pending');
              } else if (value === 'order-emails') {
                setSelectedTemplate('orderConfirmation');
              } else if (value === 'parent-emails') {
                setSelectedTemplate('parentPaymentSuccess');
              }
            }}
          >
            <option value="profile">👤︎ Profile</option>
            <option value="email-templates">✉︎ Team Registration Email</option>
            <option value="parent-emails">👶︎ Parent Registration Email</option>
            <option value="order-emails">🛒︎ Order Emails</option>
            <option value="submission-data">📊︎ Submission Data</option>
            <option value="team-portal">👥︎ Team Portal</option>
            <option value="parent-portal">👤︎ Parent Portal</option>
            <option value="email-config">⚙︎ Email Config</option>
          </select>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Admin Profile Settings</h2>
            <form onSubmit={handleSaveProfile}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className={styles.label}>
                  Admin Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={styles.input}
                  placeholder="admin@example.com"
                />
                <p className={styles.helpText}>
                  This email will be used as the sender address for approval notifications
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className={styles.label}>
                  Current Password (required to change password)
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Enter current password"
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className={styles.label}>
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Enter new password"
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className={styles.label}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className={styles.primaryButton}
                style={{ background: isUpdatingPassword ? '#9ca3af' : undefined, cursor: isUpdatingPassword ? 'wait' : 'pointer' }}
                onMouseEnter={(e) => !isUpdatingPassword && (e.target.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                {isUpdatingPassword ? '⏳ Updating...' : '💾 Save Profile'}
              </button>
            </form>
          </div>
        )}

        {/* Email Templates Tab */}
        {activeTab === 'email-templates' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Team Registration Email Template</h2>
            <p className={styles.cardSubtitle}>
              This email is automatically sent to teams when they complete their registration.
            </p>
            <p className={styles.cardSubtitle}>
              Available variables: <code style={{ background: '#f3f4f6', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>
                {'{teamName}'}, {'{coachName}'}, {'{email}'}, {'{password}'}, {'{registrationId}'}, {'{loginUrl}'}
              </code>
            </p>

            {/* Template Selector */}
            <div className={styles.templateButtons}>
              {['pending', 'reviewed', 'complete'].map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedTemplate(status)}
                  className={`${styles.templateButton} ${selectedTemplate === status ? styles.templateButtonActive : ''}`}
                >
                  {status === 'pending' && '⏳'} 
                  {status === 'reviewed' && '👀'} 
                  {status === 'complete' && '✅'} 
                  {' '}{status}
                </button>
              ))}
            </div>

            {/* Template Editor */}
            <form onSubmit={handleSaveTemplate}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className={styles.label}>
                  Email Subject
                </label>
                <input
                  type="text"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className={styles.label}>
                  Email Body
                </label>
                <textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  required
                  rows={12}
                  className={styles.textarea}
                />
              </div>

              <button
                type="submit"
                className={styles.primaryButton}
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                💾 Save Template
              </button>
            </form>
          </div>
        )}

        {/* Order Emails Tab */}
        {activeTab === 'order-emails' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Product Order Email Settings</h2>
            <p className={styles.cardSubtitle}>
              Configure automated emails for product orders. These emails are sent automatically when a customer places a product order (not registration orders).
            </p>

            {/* Supplier Email Configuration */}
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '2rem'
            }}>
              <h3 className={styles.cardTitle} style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                📦 Supplier Email Address
              </h3>
              <p className={styles.cardSubtitle}>
                This email address will receive a copy of all product orders for fulfillment.
              </p>
              <form onSubmit={handleSaveSupplierEmail}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
                  <div style={{ flex: 1 }}>
                    <label className={styles.label}>
                      Supplier Email
                    </label>
                    <input
                      type="email"
                      value={supplierEmail}
                      onChange={(e) => setSupplierEmail(e.target.value)}
                      placeholder="supplier@example.com"
                      required
                      className={styles.input}
                    />
                  </div>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', whiteSpace: 'nowrap' }}
                  >
                    💾 Save
                  </button>
                </div>
              </form>
            </div>

            {/* Email Template Editor */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div className={styles.templateButtons}>
                <button
                  onClick={() => setSelectedTemplate('orderConfirmation')}
                  className={`${styles.templateButton} ${selectedTemplate === 'orderConfirmation' ? styles.templateButtonActive : ''}`}
                >
                  📧 Customer Confirmation
                </button>
                <button
                  onClick={() => setSelectedTemplate('supplierForward')}
                  className={`${styles.templateButton} ${selectedTemplate === 'supplierForward' ? styles.templateButtonActive : ''}`}
                >
                  📦 Supplier Forward
                </button>
              </div>

              <div className={styles.alertBox}>
                <strong>Available Variables:</strong> {'{orderNumber}'}, {'{orderDate}'}, {'{customerName}'}, {'{customerEmail}'}, {'{customerPhone}'}, {'{totalAmount}'}, {'{orderItems}'}, {'{shippingAddress}'}
              </div>

              {/* Template Form */}
              <form onSubmit={handleSaveTemplate}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className={styles.label}>
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    required
                    className={styles.input}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label className={styles.label}>
                    Email Body
                  </label>
                  <textarea
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    required
                    rows={14}
                    className={styles.textarea}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.primaryButton}
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  💾 Save Template
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Parent Emails Tab */}
        {activeTab === 'parent-emails' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Parent Registration Email Templates</h2>
            <p className={styles.cardSubtitle}>
              These emails are automatically sent to parents during the player registration process.
            </p>
            <p className={styles.cardSubtitle}>
              Available variables: <code style={{ background: '#f3f4f6', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>
                {'{parentName}'}, {'{playerName}'}, {'{teamName}'}, {'{email}'}, {'{password}'}, {'{orderNumber}'}, {'{totalAmount}'}, {'{loginUrl}'}
              </code>
            </p>

            {/* Template Selector */}
            <div className={styles.templateButtons}>
              <button
                onClick={() => setSelectedTemplate('parentPaymentSuccess')}
                className={`${styles.templateButton} ${selectedTemplate === 'parentPaymentSuccess' ? styles.templateButtonActive : ''}`}
              >
                💳 Payment Success
              </button>
              <button
                onClick={() => setSelectedTemplate('parentPlayerApproved')}
                className={`${styles.templateButton} ${selectedTemplate === 'parentPlayerApproved' ? styles.templateButtonActive : ''}`}
              >
                ✅ Player Approved
              </button>
            </div>

            <div className={styles.alertBox}>
              <strong>
                {selectedTemplate === 'parentPaymentSuccess' 
                  ? '💳 Payment Success Email — Sent automatically when a parent\'s payment is confirmed by Yoco.'
                  : '✅ Player Approved Email — Sent automatically when an admin approves a player registration submission.'
                }
              </strong>
            </div>

            {/* Template Editor */}
            <form onSubmit={handleSaveTemplate}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className={styles.label}>
                  Email Subject
                </label>
                <input
                  type="text"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className={styles.label}>
                  Email Body
                </label>
                <textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  required
                  rows={14}
                  className={styles.textarea}
                />
              </div>

              <button
                type="submit"
                className={styles.primaryButton}
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                💾 Save Template
              </button>
            </form>
          </div>
        )}

        {/* Submission Data Tab */}
        {activeTab === 'submission-data' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Submission Data Management</h2>
            <p className={styles.cardSubtitle}>
              View submission counts for each form and reset counters if needed.
            </p>

            {/* Form Submission Counts */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 className={styles.cardTitle} style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                📊 Current Submission Counts
              </h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {forms.map(form => (
                  <div key={form.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#111827', fontSize: '0.9rem' }}>
                        {form.name}
                      </span>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '700'
                    }}>
                      {submissionCounts[form.id] || 0} submissions
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            <div style={{
              padding: '1.25rem',
              background: '#fef2f2',
              border: '2px solid #fecaca',
              borderRadius: '8px'
            }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#991b1b', fontWeight: '700' }}>
                ⚠️ Danger Zone
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#7f1d1d', marginBottom: '1rem' }}>
                Resetting submission counters will permanently delete ALL submission data from ALL forms. This action cannot be undone.
              </p>
              <button
                onClick={handleResetAllSubmissions}
                style={{
                  padding: '0.65rem 2rem',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                🗑️ Reset All Submission Counters
              </button>
            </div>
          </div>
        )}

        {/* Team Portal Tab */}
        {activeTab === 'team-portal' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Team Portal Management</h2>
            
            <div style={{
              padding: '1.25rem',
              background: '#f0f9ff',
              border: '2px solid #0ea5e9',
              borderRadius: '10px',
              marginBottom: '1.5rem'
            }}>
              <p style={{ fontSize: '0.95rem', color: '#0c4a6e', marginBottom: '0.75rem', fontWeight: '600' }}>
                📋 Team Portal Overview
              </p>
              <p style={{ fontSize: '0.85rem', color: '#075985', marginBottom: 0 }}>
                The Team Portal is a private dashboard where registered teams can log in to view their team details, players, fixtures, messages from admin, and payment history. Teams use their email or team name with their assigned password to access their portal.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                background: 'white',
                padding: '1.25rem',
                border: '2px solid #e5e7eb',
                borderRadius: '10px'
              }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#111827', fontWeight: '700' }}>
                  🔗 Portal URL
                </h3>
                <div style={{
                  padding: '0.75rem',
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  color: '#374151',
                  marginBottom: '0.75rem'
                }}>
                  /team-portal
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>
                  Share this link with registered teams so they can access their dashboard
                </p>
              </div>

              <div style={{
                background: 'white',
                padding: '1.25rem',
                border: '2px solid #e5e7eb',
                borderRadius: '10px'
              }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#111827', fontWeight: '700' }}>
                  🏏 Access Team Portal
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
                  Click below to access the team portal directly from the admin panel. You can view the portal as teams see it and test the functionality.
                </p>
                <a
                  href="/team-portal?admin=true"
                  style={{
                    display: 'inline-block',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                    color: 'white',
                    textDecoration: 'none',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    boxShadow: '0 4px 12px rgba(220, 0, 0, 0.2)'
                  }}
                >
                  Open Team Portal (Admin Mode) →
                </a>
              </div>
            </div>

            <div style={{
              background: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '10px',
              padding: '1.25rem'
            }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#92400e', fontWeight: '700' }}>
                💡 Portal Features
              </h3>
              <ul style={{ 
                fontSize: '0.85rem', 
                color: '#78350f', 
                margin: 0,
                paddingLeft: '1.5rem',
                lineHeight: '1.8'
              }}>
                <li>Team login with email or team name + password</li>
                <li>Dashboard with stats (players, fixtures, messages, payments)</li>
                <li>Player roster management</li>
                <li>View upcoming fixtures and match schedules</li>
                <li>Read messages from admin with unread notifications</li>
                <li>View payment history and registration status</li>
                <li>Change password functionality</li>
                <li>Team status badges (pending/approved/active/suspended)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Parent Portal Tab */}
        {activeTab === 'parent-portal' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Parent Portal Management</h2>

            <div style={{
              padding: '1.25rem',
              background: '#f0f9ff',
              border: '2px solid #0ea5e9',
              borderRadius: '10px',
              marginBottom: '1.5rem'
            }}>
              <p style={{ fontSize: '0.95rem', color: '#0c4a6e', marginBottom: '0.75rem', fontWeight: '600' }}>
                🧾 Parent Portal Overview
              </p>
              <p style={{ fontSize: '0.85rem', color: '#075985', marginBottom: 0 }}>
                The Parent Portal lets parents/players view their profile and order history after registration or purchase.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                background: 'white',
                padding: '1.25rem',
                border: '2px solid #e5e7eb',
                borderRadius: '10px'
              }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#111827', fontWeight: '700' }}>
                  🔗 Portal URL
                </h3>
                <div style={{
                  padding: '0.75rem',
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  color: '#374151',
                  marginBottom: '0.75rem'
                }}>
                  /parent-portal
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>
                  Share this link with registered parents/players so they can access the parent portal
                </p>
              </div>

              <div style={{
                background: 'white',
                padding: '1.25rem',
                border: '2px solid #e5e7eb',
                borderRadius: '10px'
              }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#111827', fontWeight: '700' }}>
                  🧾 Access Parent Portal
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
                  View the parent portal as users see it. Use admin preview mode to browse parent profiles.
                </p>
                <a
                  href="/parent-portal?admin=true"
                  style={{
                    display: 'inline-block',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                    color: 'white',
                    textDecoration: 'none',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    boxShadow: '0 4px 12px rgba(220, 0, 0, 0.2)'
                  }}
                >
                  Open Parent Portal (Admin Mode) →
                </a>
              </div>
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
