import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getAdminSettings } from '../../data/adminSettings';

export default function EmailConfig() {
  const [activeTab, setActiveTab] = useState('setup'); // setup, test, guide
  const [settings, setSettings] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // SMTP Configuration
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('Cricket League Shop');
  const [showPassword, setShowPassword] = useState(false);
  
  // Test Email
  const [testCustomerEmail, setTestCustomerEmail] = useState('');
  const [testSupplierEmail, setTestSupplierEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  // Connection Test
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState(null);
  
  // Update .env.local
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);

  useEffect(() => {
    const adminSettings = getAdminSettings();
    setSettings(adminSettings);
    setTestSupplierEmail(adminSettings.supplierEmail || '');
    
    // Try to load from localStorage (browser-side only)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smtpConfig');
      if (saved) {
        const config = JSON.parse(saved);
        setSmtpHost(config.host || '');
        setSmtpPort(config.port || '465');
        setSmtpUser(config.user || '');
        setSmtpPassword(config.password || '');
        setSmtpFromEmail(config.fromEmail || '');
        setSmtpFromName(config.fromName || 'Cricket League Shop');
      }
    }
  }, []);

  const handleSaveConfig = (e) => {
    e.preventDefault();
    
    if (typeof window !== 'undefined') {
      const config = {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        password: smtpPassword,
        fromEmail: smtpFromEmail,
        fromName: smtpFromName
      };
      localStorage.setItem('smtpConfig', JSON.stringify(config));
      
      setSaveMessage('✓ Configuration saved! Note: For production, add these to your .env.local file.');
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  const handleTestConnection = async () => {
    setConnectionTesting(true);
    setConnectionResult(null);
    setErrorMessage('');

    try {
      const response = await fetch('/api/test-email-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          password: smtpPassword
        })
      });

      const data = await response.json();
      setConnectionResult(data);
      
      if (!data.success) {
        setErrorMessage(data.message || 'Connection test failed');
      }
    } catch (error) {
      setConnectionResult({ success: false, message: error.message });
      setErrorMessage('Failed to test connection: ' + error.message);
    } finally {
      setConnectionTesting(false);
    }
  };

  const handleUpdateEnv = async () => {
    setUpdating(true);
    setUpdateResult(null);
    setErrorMessage('');

    try {
      const response = await fetch('/api/update-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          password: smtpPassword,
          fromEmail: smtpFromEmail,
          fromName: smtpFromName
        })
      });

      const data = await response.json();
      setUpdateResult(data);
      
      if (data.success) {
        setSaveMessage(data.message);
        setTimeout(() => setSaveMessage(''), 8000);
      } else {
        setErrorMessage(data.message || 'Failed to update environment file');
      }
    } catch (error) {
      setUpdateResult({ success: false, message: error.message });
      setErrorMessage('Failed to update environment file: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    setErrorMessage('');

    try {
      const customerEmailData = {
        subject: 'Test Order Confirmation - #TEST123',
        body: `Dear Test Customer,

Thank you for your order!

Order Number: #TEST123
Order Date: ${new Date().toLocaleDateString()}
Total Amount: R500.00

Order Details:
- Test Product x2 - R500.00

Shipping Address:
123 Test Street
Test City, Test Province
1234

This is a test email from your Cricket League system.

Best regards,
Cricket League Shop`
      };

      const supplierEmailData = {
        subject: 'Test Product Order - #TEST123',
        body: `New product order received:

Order Number: #TEST123
Order Date: ${new Date().toLocaleDateString()}
Total Amount: R500.00

Customer Information:
Name: Test Customer
Email: ${testCustomerEmail}
Phone: 0821234567

Order Details:
- Test Product x2 - R500.00

Shipping Address:
123 Test Street
Test City, Test Province
1234

This is a test email from your Cricket League system.`
      };

      const response = await fetch('/api/send-order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: testCustomerEmail,
          supplierEmail: testSupplierEmail,
          customerEmailData,
          supplierEmailData,
          testMode: true,
          smtpConfig: {
            host: smtpHost,
            port: smtpPort,
            user: smtpUser,
            password: smtpPassword,
            fromEmail: smtpFromEmail,
            fromName: smtpFromName
          }
        })
      });

      const data = await response.json();
      setTestResult(data);
      
      if (!data.success) {
        setErrorMessage(data.message || 'Test email failed');
      }
    } catch (error) {
      setTestResult({ success: false, message: error.message });
      setErrorMessage('Failed to send test email: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  const presetConfigs = {
    gmail: {
      host: 'smtp.gmail.com',
      port: '465',
      name: 'Gmail'
    },
    outlook: {
      host: 'smtp-mail.outlook.com',
      port: '587',
      name: 'Outlook'
    },
    sendgrid: {
      host: 'smtp.sendgrid.net',
      port: '465',
      name: 'SendGrid'
    }
  };

  const loadPreset = (preset) => {
    setSmtpHost(presetConfigs[preset].host);
    setSmtpPort(presetConfigs[preset].port);
    setSaveMessage(`✓ ${presetConfigs[preset].name} settings loaded`);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <>
      <Head>
        <title>Email Configuration - Admin</title>
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
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>📧 Email Configuration</h1>
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

        {/* Success/Error Messages */}
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
            {saveMessage}
          </div>
        )}

        {errorMessage && (
          <div style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            ⚠️ {errorMessage}
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
            onClick={() => setActiveTab('setup')}
            style={{
              padding: '0.6rem 1.5rem',
              background: activeTab === 'setup' 
                ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                : '#f3f4f6',
              color: activeTab === 'setup' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            ⚙️ Setup
          </button>
          <button
            onClick={() => setActiveTab('test')}
            style={{
              padding: '0.6rem 1.5rem',
              background: activeTab === 'test' 
                ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                : '#f3f4f6',
              color: activeTab === 'test' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🧪 Test
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            style={{
              padding: '0.6rem 1.5rem',
              background: activeTab === 'guide' 
                ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                : '#f3f4f6',
              color: activeTab === 'guide' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📖 Guide
          </button>
        </div>

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#111827' }}>
              SMTP Configuration
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              Configure your email server settings. Settings are saved locally for testing. For production, add these to your .env.local file.
            </p>

            {/* Quick Presets */}
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#111827', fontWeight: '700' }}>
                ⚡ Quick Presets
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => loadPreset('gmail')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: 'linear-gradient(135deg, #ea4335 0%, #d33b2c 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Gmail
                </button>
                <button
                  onClick={() => loadPreset('outlook')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Outlook
                </button>
                <button
                  onClick={() => loadPreset('sendgrid')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: 'linear-gradient(135deg, #1a82e2 0%, #0052cc 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  SendGrid
                </button>
              </div>
            </div>

            {/* Configuration Form */}
            <form onSubmit={handleSaveConfig}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontWeight: '700',
                    marginBottom: '0.4rem',
                    fontSize: '0.85rem',
                    color: '#374151'
                  }}>
                    SMTP Host *
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
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

                <div>
                  <label style={{
                    display: 'block',
                    fontWeight: '700',
                    marginBottom: '0.4rem',
                    fontSize: '0.85rem',
                    color: '#374151'
                  }}>
                    SMTP Port *
                  </label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="465"
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
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '700',
                  marginBottom: '0.4rem',
                  fontSize: '0.85rem',
                  color: '#374151'
                }}>
                  SMTP Username (Email) *
                </label>
                <input
                  type="email"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="your-email@gmail.com"
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '700',
                  marginBottom: '0.4rem',
                  fontSize: '0.85rem',
                  color: '#374151'
                }}>
                  SMTP Password (App Password) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="your-app-password"
                    required
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      paddingRight: '3rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem'
                    }}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontWeight: '700',
                    marginBottom: '0.4rem',
                    fontSize: '0.85rem',
                    color: '#374151'
                  }}>
                    From Email *
                  </label>
                  <input
                    type="email"
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    placeholder="noreply@cricketleague.com"
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

                <div>
                  <label style={{
                    display: 'block',
                    fontWeight: '700',
                    marginBottom: '0.4rem',
                    fontSize: '0.85rem',
                    color: '#374151'
                  }}>
                    From Name *
                  </label>
                  <input
                    type="text"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="Cricket League Shop"
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
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
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
                >
                  💾 Save Configuration
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={connectionTesting || !smtpHost || !smtpPort || !smtpUser || !smtpPassword}
                  style={{
                    padding: '0.65rem 2rem',
                    background: connectionTesting 
                      ? '#9ca3af' 
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    cursor: connectionTesting ? 'not-allowed' : 'pointer',
                    transition: 'transform 0.2s'
                  }}
                >
                  {connectionTesting ? '⏳ Testing...' : '🔌 Test Connection'}
                </button>

                <button
                  type="button"
                  onClick={handleUpdateEnv}
                  disabled={updating || !smtpHost || !smtpPort || !smtpUser || !smtpPassword || !smtpFromEmail || !smtpFromName}
                  style={{
                    padding: '0.65rem 2rem',
                    background: updating 
                      ? '#9ca3af' 
                      : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    transition: 'transform 0.2s'
                  }}
                >
                  {updating ? '⏳ Updating...' : '🚀 Save to .env.local'}
                </button>
              </div>
            </form>

            {/* Connection Test Result */}
            {connectionResult && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: connectionResult.success ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${connectionResult.success ? '#86efac' : '#fca5a5'}`,
                borderRadius: '8px'
              }}>
                <h4 style={{ 
                  margin: 0, 
                  marginBottom: '0.5rem', 
                  color: connectionResult.success ? '#166534' : '#991b1b',
                  fontSize: '0.9rem',
                  fontWeight: '700'
                }}>
                  {connectionResult.success ? '✓ Connection Successful!' : '✗ Connection Failed'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: connectionResult.success ? '#166534' : '#991b1b' }}>
                  {connectionResult.message}
                </p>
              </div>
            )}

            {/* Update .env.local Result */}
            {updateResult && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: updateResult.success ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${updateResult.success ? '#86efac' : '#fca5a5'}`,
                borderRadius: '8px'
              }}>
                <h4 style={{ 
                  margin: 0, 
                  marginBottom: '0.5rem', 
                  color: updateResult.success ? '#166534' : '#991b1b',
                  fontSize: '0.9rem',
                  fontWeight: '700'
                }}>
                  {updateResult.success ? '✓ Environment File Updated!' : '✗ Update Failed'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: updateResult.success ? '#166534' : '#991b1b' }}>
                  {updateResult.message}
                </p>
                {updateResult.success && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    background: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: '6px'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e', fontWeight: '600' }}>
                      ⚠️ Important: Environment variables updated!
                    </p>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#92400e' }}>
                      <p style={{ margin: '0.25rem 0', fontWeight: '600' }}>Local Development:</p>
                      <p style={{ margin: '0.25rem 0 0.5rem 0' }}>
                        Stop the server (Ctrl+C) and run: <code style={{ background: 'white', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>npm run dev</code>
                      </p>
                      <p style={{ margin: '0.5rem 0 0.25rem 0', fontWeight: '600' }}>Production/Hosted (Vercel, Netlify, etc.):</p>
                      <p style={{ margin: 0 }}>
                        1. Add these variables to your hosting platform's environment settings<br/>
                        2. Redeploy your application (or it may auto-deploy on next commit)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Test Tab */}
        {activeTab === 'test' && (
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#111827' }}>
              Send Test Emails
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              Send test order emails to verify your configuration is working correctly.
            </p>

            <form onSubmit={handleSendTestEmail}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '700',
                  marginBottom: '0.4rem',
                  fontSize: '0.85rem',
                  color: '#374151'
                }}>
                  Customer Email (To receive confirmation) *
                </label>
                <input
                  type="email"
                  value={testCustomerEmail}
                  onChange={(e) => setTestCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
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
                  Supplier Email (To receive forward) *
                </label>
                <input
                  type="email"
                  value={testSupplierEmail}
                  onChange={(e) => setTestSupplierEmail(e.target.value)}
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
                disabled={testing || !testCustomerEmail || !testSupplierEmail}
                style={{
                  padding: '0.65rem 2rem',
                  background: testing 
                    ? '#9ca3af' 
                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: testing ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.2s'
                }}
              >
                {testing ? '📨 Sending...' : '📧 Send Test Emails'}
              </button>
            </form>

            {/* Test Result */}
            {testResult && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: testResult.success ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${testResult.success ? '#86efac' : '#fca5a5'}`,
                borderRadius: '8px'
              }}>
                <h4 style={{ 
                  margin: 0, 
                  marginBottom: '0.5rem', 
                  color: testResult.success ? '#166534' : '#991b1b',
                  fontSize: '0.9rem',
                  fontWeight: '700'
                }}>
                  {testResult.success ? '✓ Test Emails Sent!' : '✗ Test Failed'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: testResult.success ? '#166534' : '#991b1b' }}>
                  {testResult.message}
                </p>
                {testResult.success && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#166534' }}>
                    <div>✓ Customer email sent to: {testCustomerEmail}</div>
                    <div>✓ Supplier email sent to: {testSupplierEmail}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Guide Tab */}
        {activeTab === 'guide' && (
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#111827' }}>
              Email Setup Guide
            </h2>

            {/* Gmail Instructions */}
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#92400e', fontWeight: '700' }}>
                📧 Gmail Setup (Most Common)
              </h3>
              <ol style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.85rem', color: '#92400e', lineHeight: '1.6' }}>
                <li>Go to <a href="https://myaccount.google.com/security" target="_blank" style={{ color: '#92400e', fontWeight: '700' }}>Google Account Security</a></li>
                <li>Enable "2-Step Verification" if not already enabled</li>
                <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" style={{ color: '#92400e', fontWeight: '700' }}>App Passwords</a></li>
                <li>Select app: "Mail", Device: "Other (Custom name)"</li>
                <li>Click "Generate" and copy the 16-character password</li>
                <li>Use this password in the "SMTP Password" field above</li>
              </ol>
            </div>

            {/* Production Setup */}
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#0c4a6e', fontWeight: '700' }}>
                🚀 Production Setup
              </h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#0c4a6e', fontWeight: '700' }}>
                  Option 1: Local .env.local File
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#0c4a6e', marginBottom: '0.75rem' }}>
                  For local development, use the <strong>🚀 Save to .env.local</strong> button above, then restart your dev server.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#0c4a6e', fontWeight: '700' }}>
                  Option 2: Hosting Platform (Vercel, Netlify, etc.)
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#0c4a6e', marginBottom: '0.75rem' }}>
                  Add these environment variables in your hosting platform's dashboard:
                </p>
                <pre style={{
                  background: '#1e293b',
                  color: '#e2e8f0',
                  padding: '1rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  margin: 0
                }}>
{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Cricket League Shop`}
                </pre>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#0c4a6e' }}>
                  <p style={{ margin: '0.25rem 0', fontWeight: '600' }}>📍 Where to add them:</p>
                  <ul style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>
                    <li><strong>Vercel:</strong> Project Settings → Environment Variables</li>
                    <li><strong>Netlify:</strong> Site Settings → Environment Variables</li>
                    <li><strong>Railway:</strong> Project → Variables tab</li>
                    <li><strong>Render:</strong> Environment → Environment Variables</li>
                    <li><strong>AWS/Heroku:</strong> Config Vars / Environment Settings</li>
                  </ul>
                  <p style={{ margin: '0.5rem 0 0 0', fontWeight: '600' }}>🔄 After adding variables:</p>
                  <p style={{ margin: '0.25rem 0' }}>Most platforms auto-redeploy. If not, trigger a manual redeploy.</p>
                </div>
              </div>
            </div>

            {/* Common Issues */}
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#991b1b', fontWeight: '700' }}>
                ⚠️ Common Issues
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.85rem', color: '#991b1b', lineHeight: '1.6' }}>
                <li><strong>Authentication Failed:</strong> Use App Password, not your regular Gmail password</li>
                <li><strong>Connection Timeout:</strong> Check your internet connection and firewall settings</li>
                <li><strong>Emails go to Spam:</strong> Normal for test emails, use a verified domain in production</li>
                <li><strong>Port blocked:</strong> Try port 587 instead of 465</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
