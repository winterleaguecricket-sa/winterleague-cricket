import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getAdminSettings, updateAdminEmail, updateAdminPassword, updateEmailTemplate, updateSupplierEmail } from '../../data/adminSettings';
import { resetSubmissionCounters, getFormTemplates, getFormSubmissions } from '../../data/forms';

export default function AdminProfile() {
  const [settings, setSettings] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // profile, email-templates, order-emails, submission-data
  const [selectedTemplate, setSelectedTemplate] = useState('pending');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [forms, setForms] = useState([]);

  useEffect(() => {
    const adminSettings = getAdminSettings();
    setSettings(adminSettings);
    setEmail(adminSettings.email);
    setSupplierEmail(adminSettings.supplierEmail || '');
    setForms(getFormTemplates());
    
    // Load initial template
    if (adminSettings.emailTemplates[selectedTemplate]) {
      setTemplateSubject(adminSettings.emailTemplates[selectedTemplate].subject);
      setTemplateBody(adminSettings.emailTemplates[selectedTemplate].body);
    }
  }, []);

  useEffect(() => {
    if (settings && settings.emailTemplates[selectedTemplate]) {
      setTemplateSubject(settings.emailTemplates[selectedTemplate].subject);
      setTemplateBody(settings.emailTemplates[selectedTemplate].body);
    }
  }, [selectedTemplate, settings]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    
    if (password && password !== confirmPassword) {
      setSaveMessage('Passwords do not match');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    updateAdminEmail(email);
    if (password) {
      updateAdminPassword(password);
    }
    
    setSaveMessage('Profile updated successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSaveTemplate = (e) => {
    e.preventDefault();
    
    updateEmailTemplate(selectedTemplate, {
      subject: templateSubject,
      body: templateBody
    });
    
    const updatedSettings = getAdminSettings();
    setSettings(updatedSettings);
    
    setSaveMessage('Email template updated successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleSaveSupplierEmail = (e) => {
    e.preventDefault();
    
    updateSupplierEmail(supplierEmail);
    
    const updatedSettings = getAdminSettings();
    setSettings(updatedSettings);
    
    setSaveMessage('Supplier email updated successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleResetAllSubmissions = () => {
    if (confirm('⚠️ WARNING: This will permanently delete ALL form submissions from ALL forms. This action cannot be undone. Are you absolutely sure?')) {
      resetSubmissionCounters();
      setForms(getFormTemplates()); // Refresh to show updated counts
      setSaveMessage('All submission counters have been reset!');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <>
      <Head>
        <title>Admin Profile & Settings</title>
      </Head>

      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
          color: 'white',
          padding: '0.85rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>⚙️ Admin Settings</h1>
          <Link href="/admin" style={{
            color: 'white',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
            ← Back to Admin
          </Link>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            ✓ {saveMessage}
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '0.5rem'
        }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '0.6rem 1.5rem',
              background: activeTab === 'profile' 
                ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                : '#f3f4f6',
              color: activeTab === 'profile' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            👤 Profile
          </button>
          <button
            onClick={() => setActiveTab('email-templates')}
            style={{
              padding: '0.6rem 1.5rem',
              background: activeTab === 'email-templates' 
                ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                : '#f3f4f6',
              color: activeTab === 'email-templates' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📧 Email Templates
          </button>
          <button
            onClick={() => setActiveTab('order-emails')}
            style={{
              padding: '0.6rem 1.5rem',
              background: activeTab === 'order-emails' 
                ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                : '#f3f4f6',
              color: activeTab === 'order-emails' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🛍️ Order Emails
          </button>
          <button
            onClick={() => setActiveTab('submission-data')}
            style={{
              padding: '0.6rem 1.5rem',
              background: activeTab === 'submission-data' 
                ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                : '#f3f4f6',
              color: activeTab === 'submission-data' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📊 Submission Data
          </button>
          <button
            onClick={() => window.location.href = '/admin/email-config'}
            style={{
              padding: '0.6rem 1.5rem',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            ⚙️ Email Config
          </button>
          <button
            onClick={() => setActiveTab('team-portal')}
            style={{
              padding: '0.6rem 1.5rem',
              background: activeTab === 'team-portal' 
                ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                : '#f3f4f6',
              color: activeTab === 'team-portal' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🏏 Team Portal
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#111827' }}>
              Admin Profile Settings
            </h2>
            <form onSubmit={handleSaveProfile}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '700',
                  marginBottom: '0.4rem',
                  fontSize: '0.85rem',
                  color: '#374151'
                }}>
                  Admin Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit'
                  }}
                  placeholder="admin@example.com"
                />
                <p style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '0.3rem',
                  marginBottom: 0
                }}>
                  This email will be used as the sender address for approval notifications
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '700',
                  marginBottom: '0.4rem',
                  fontSize: '0.85rem',
                  color: '#374151'
                }}>
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Enter new password"
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '700',
                  marginBottom: '0.4rem',
                  fontSize: '0.85rem',
                  color: '#374151'
                }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: '0.65rem 2rem',
                  background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
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
                💾 Save Profile
              </button>
            </form>
          </div>
        )}

        {/* Email Templates Tab */}
        {activeTab === 'email-templates' && (
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#111827' }}>
              Email Templates for Approval Status
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              Customize the email sent to teams when their approval status changes.
              Available variables: <code style={{ background: '#f3f4f6', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>
                {'{teamName}'}, {'{coachName}'}, {'{registrationId}'}
              </code>
            </p>

            {/* Template Selector */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap'
            }}>
              {['pending', 'reviewed', 'complete'].map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedTemplate(status)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: selectedTemplate === status 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                      : '#f3f4f6',
                    color: selectedTemplate === status ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s'
                  }}
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
                <label style={{
                  display: 'block',
                  fontWeight: '700',
                  marginBottom: '0.4rem',
                  fontSize: '0.85rem',
                  color: '#374151'
                }}>
                  Email Subject
                </label>
                <input
                  type="text"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '700',
                  marginBottom: '0.4rem',
                  fontSize: '0.85rem',
                  color: '#374151'
                }}>
                  Email Body
                </label>
                <textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  required
                  rows={12}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: '0.65rem 2rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
                💾 Save Template
              </button>
            </form>
          </div>
        )}

        {/* Order Emails Tab */}
        {activeTab === 'order-emails' && (
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#111827' }}>
              Product Order Email Settings
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              Configure automated emails for product orders. These emails are sent automatically when a customer places a product order (not registration orders).
            </p>

            {/* Supplier Email Configuration */}
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#111827', fontWeight: '700' }}>
                📦 Supplier Email Address
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }}>
                This email address will receive a copy of all product orders for fulfillment.
              </p>
              <form onSubmit={handleSaveSupplierEmail}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: 'block',
                      fontWeight: '700',
                      marginBottom: '0.4rem',
                      fontSize: '0.85rem',
                      color: '#374151'
                    }}>
                      Supplier Email
                    </label>
                    <input
                      type="email"
                      value={supplierEmail}
                      onChange={(e) => setSupplierEmail(e.target.value)}
                      placeholder="supplier@example.com"
                      required
                      style={{
                        width: '100%',
                        padding: '0.55rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: '0.55rem 1.5rem',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    💾 Save
                  </button>
                </div>
              </form>
            </div>

            {/* Email Template Editor */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setSelectedTemplate('orderConfirmation')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: selectedTemplate === 'orderConfirmation' 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                      : '#f3f4f6',
                    color: selectedTemplate === 'orderConfirmation' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  📧 Customer Confirmation
                </button>
                <button
                  onClick={() => setSelectedTemplate('supplierForward')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: selectedTemplate === 'supplierForward' 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                      : '#f3f4f6',
                    color: selectedTemplate === 'supplierForward' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  📦 Supplier Forward
                </button>
              </div>

              <div style={{
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.8rem',
                color: '#92400e'
              }}>
                <strong>Available Variables:</strong> {'{orderNumber}'}, {'{orderDate}'}, {'{customerName}'}, {'{customerEmail}'}, {'{customerPhone}'}, {'{totalAmount}'}, {'{orderItems}'}, {'{shippingAddress}'}
              </div>

              {/* Template Form */}
              <form onSubmit={handleSaveTemplate}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: '700',
                    marginBottom: '0.4rem',
                    fontSize: '0.85rem',
                    color: '#374151'
                  }}>
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: '700',
                    marginBottom: '0.4rem',
                    fontSize: '0.85rem',
                    color: '#374151'
                  }}>
                    Email Body
                  </label>
                  <textarea
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    required
                    rows={14}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '0.65rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
                  💾 Save Template
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Submission Data Tab */}
        {activeTab === 'submission-data' && (
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#111827' }}>
              Submission Data Management
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              View submission counts for each form and reset counters if needed.
            </p>

            {/* Form Submission Counts */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#374151', fontWeight: '700' }}>
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
                      {getFormSubmissions(form.id).length} submissions
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
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#111827' }}>
              Team Portal Management
            </h2>
            
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
                <Link
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
                </Link>
              </div>
            </div>

            <div style={{
              background: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '10px',
              padding: '1.25rem'
            }}>
              <h3 style={{ 
                fontSize: '0.95rem', 
                marginBottom: '0.75rem', 
                color: '#92400e', 
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
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
      </div>
    </>
  );
}
