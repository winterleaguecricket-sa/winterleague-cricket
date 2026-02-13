import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminSettings.module.css';

export default function PaymentSettings() {
  const router = useRouter();
  const [activeGateway, setActiveGateway] = useState('payfast');
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState({
    merchantId: '',
    merchantKey: '',
    passphrase: '',
    testMode: true
  });
  const [yocoConfig, setYocoConfig] = useState({
    secretKey: '',
    publicKey: '',
    testMode: true
  });
  const [saveStatus, setSaveStatus] = useState('');
  const [yocoSaveStatus, setYocoSaveStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [siteOrigin, setSiteOrigin] = useState('');

  useEffect(() => {
    const loadAll = async () => {
      try {
        // Load active gateway, PayFast config, and Yoco config in parallel
        const [gatewayRes, payfastRes, yocoRes] = await Promise.all([
          fetch('/api/payment-gateway'),
          fetch('/api/payfast/config?admin=true'),
          fetch('/api/yoco/config')
        ]);

        const gatewayData = await gatewayRes.json();
        if (gatewayData.success) {
          setActiveGateway(gatewayData.gateway || 'payfast');
        }

        const payfastData = await payfastRes.json();
        if (payfastData.success && payfastData.config) {
          setPaymentConfig({
            merchantId: payfastData.config.merchantId || '',
            merchantKey: payfastData.config.merchantKey || '',
            passphrase: payfastData.config.passphrase || '',
            testMode: payfastData.config.testMode !== undefined ? payfastData.config.testMode : true,
            _isConfigured: payfastData.config.isConfigured
          });
        }

        const yocoData = await yocoRes.json();
        if (yocoData.success && yocoData.config) {
          setYocoConfig({
            secretKey: yocoData.config.secretKey || '',
            publicKey: yocoData.config.publicKey || '',
            testMode: yocoData.config.testMode !== undefined ? yocoData.config.testMode : true,
            _isConfigured: yocoData.config.isConfigured
          });
        }
      } catch (error) {
        console.error('Error loading payment configs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
    setSiteOrigin(window.location.origin);
  }, []);

  const handleGatewaySwitch = async (gateway) => {
    setGatewayLoading(true);
    const adminPassword = typeof window !== 'undefined' ? sessionStorage.getItem('adminPassword') : '';
    try {
      const res = await fetch('/api/payment-gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateway, adminPassword })
      });
      const data = await res.json();
      if (data.success) {
        setActiveGateway(gateway);
        setSaveStatus(`✅ Active gateway switched to ${gateway === 'payfast' ? 'PayFast' : 'Yoco'}!`);
        setTimeout(() => setSaveStatus(''), 4000);
      }
    } catch (error) {
      console.error('Error switching gateway:', error);
    } finally {
      setGatewayLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPaymentConfig({
      ...paymentConfig,
      [name]: type === 'checkbox' ? checked : value
    });
    setSaveStatus('');
  };

  const handleYocoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setYocoConfig({
      ...yocoConfig,
      [name]: type === 'checkbox' ? checked : value
    });
    setYocoSaveStatus('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('');

    try {
      const res = await fetch('/api/payfast/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: paymentConfig.merchantId,
          merchantKey: paymentConfig.merchantKey,
          passphrase: paymentConfig.passphrase,
          testMode: paymentConfig.testMode
        })
      });

      const data = await res.json();
      if (data.success) {
        setSaveStatus('PayFast configuration saved to database successfully!');
        const verifyRes = await fetch('/api/payfast/config?admin=true');
        const verifyData = await verifyRes.json();
        if (verifyData.success && verifyData.config && verifyData.config.merchantId) {
          setSaveStatus('✅ PayFast configuration saved AND verified in database!');
        } else {
          setSaveStatus('⚠️ Saved but could not verify — credentials may not have persisted.');
        }
        setTimeout(() => setSaveStatus(''), 5000);
      } else {
        setSaveStatus(`Error: ${data.error || 'Failed to save'}`);
      }
    } catch (error) {
      console.error('Error saving PayFast config:', error);
      setSaveStatus('Error: Failed to save configuration');
    }
  };

  const handleYocoSubmit = async (e) => {
    e.preventDefault();
    setYocoSaveStatus('');

    // Don't send masked placeholder back as the secret key
    if (yocoConfig.secretKey.startsWith('sk_...')) {
      setYocoSaveStatus('Error: Please enter the full secret key to update configuration');
      return;
    }

    // Get admin password from session for auth
    const adminPassword = typeof window !== 'undefined' ? sessionStorage.getItem('adminPassword') : '';

    try {
      const res = await fetch('/api/yoco/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretKey: yocoConfig.secretKey,
          publicKey: yocoConfig.publicKey,
          testMode: yocoConfig.testMode,
          adminPassword: adminPassword
        })
      });

      const data = await res.json();
      if (data.success) {
        setYocoSaveStatus('✅ Yoco configuration saved AND verified in database!');
        // Refresh to get masked key
        const refreshRes = await fetch('/api/yoco/config');
        const refreshData = await refreshRes.json();
        if (refreshData.success && refreshData.config) {
          setYocoConfig({
            secretKey: refreshData.config.secretKey || '',
            publicKey: refreshData.config.publicKey || '',
            testMode: refreshData.config.testMode !== undefined ? refreshData.config.testMode : true,
            _isConfigured: refreshData.config.isConfigured
          });
        }
        setTimeout(() => setYocoSaveStatus(''), 5000);
      } else {
        setYocoSaveStatus(`Error: ${data.error || 'Failed to save'}`);
      }
    } catch (error) {
      console.error('Error saving Yoco config:', error);
      setYocoSaveStatus('Error: Failed to save configuration');
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Payment Settings - Admin</title>
      </Head>

      <header className={styles.header} style={{
        background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
        padding: '0.85rem 1.5rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className={styles.logo} style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>💳 Payment Settings</h1>
          <nav className={styles.nav} style={{ display: 'flex', gap: '1.25rem' }}>
            <Link href="/admin/settings" className={styles.navLink} style={{ fontSize: '0.9rem' }}>← Settings</Link>
            <Link href="/admin" className={styles.navLink} style={{ fontSize: '0.9rem' }}>Admin Panel</Link>
          </nav>
        </div>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem' }}>

        {/* ===== ACTIVE GATEWAY TOGGLE ===== */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          marginBottom: '1rem',
          border: '2px solid #6366f1'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔀</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>Active Payment Gateway</h2>
              <p style={{ margin: '0.2rem 0 0 0', color: '#6b7280', fontSize: '0.8rem' }}>
                Choose which payment gateway is used at checkout
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => handleGatewaySwitch('payfast')}
              disabled={gatewayLoading}
              style={{
                flex: 1,
                padding: '0.85rem',
                border: activeGateway === 'payfast' ? '3px solid #10b981' : '2px solid #e5e7eb',
                background: activeGateway === 'payfast' ? '#ecfdf5' : 'white',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: gatewayLoading ? 'wait' : 'pointer',
                fontSize: '0.95rem',
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              {activeGateway === 'payfast' && <span style={{ position: 'absolute', top: '6px', right: '10px', fontSize: '1rem' }}>✅</span>}
              💳 PayFast
            </button>
            <button
              type="button"
              onClick={() => handleGatewaySwitch('yoco')}
              disabled={gatewayLoading}
              style={{
                flex: 1,
                padding: '0.85rem',
                border: activeGateway === 'yoco' ? '3px solid #10b981' : '2px solid #e5e7eb',
                background: activeGateway === 'yoco' ? '#ecfdf5' : 'white',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: gatewayLoading ? 'wait' : 'pointer',
                fontSize: '0.95rem',
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              {activeGateway === 'yoco' && <span style={{ position: 'absolute', top: '6px', right: '10px', fontSize: '1rem' }}>✅</span>}
              💰 Yoco
            </button>
          </div>
        </div>

        {/* ===== STATUS MESSAGE ===== */}
        {saveStatus && (
          <div style={{
            background: saveStatus.startsWith('Error') ? '#fee2e2' : '#d1fae5',
            border: `2px solid ${saveStatus.startsWith('Error') ? '#ef4444' : '#10b981'}`,
            borderRadius: '8px',
            padding: '0.6rem 0.85rem',
            marginBottom: '1rem',
            color: saveStatus.startsWith('Error') ? '#991b1b' : '#065f46',
            fontSize: '0.85rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            {saveStatus}
          </div>
        )}

        {/* ===== PAYFAST CONFIGURATION ===== */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          marginBottom: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            marginBottom: '0.75rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>🔐</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>PayFast Integration</h2>
              <p style={{ margin: '0.2rem 0 0 0', color: '#6b7280', fontSize: '0.8rem' }}>
                Configure your PayFast merchant credentials for secure payment processing
              </p>
            </div>
            {activeGateway === 'payfast' && (
              <span style={{ marginLeft: 'auto', padding: '0.25rem 0.65rem', background: '#10b981', color: 'white', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700 }}>ACTIVE</span>
            )}
          </div>
          <div style={{
            padding: '0.6rem 0.85rem',
            background: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: '#92400e'
          }}>
            <strong>⚠️ Note:</strong> Test mode uses PayFast sandbox. Disable for live payments.
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label htmlFor="merchantId" style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Merchant ID *</label>
              <input
                type="text"
                id="merchantId"
                name="merchantId"
                value={paymentConfig.merchantId}
                onChange={handleChange}
                required
                placeholder="10000100"
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#dc0000'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <small style={{ display: 'block', marginTop: '0.3rem', color: '#6b7280', fontSize: '0.72rem' }}>From PayFast dashboard</small>
            </div>

            <div>
              <label htmlFor="merchantKey" style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Merchant Key *</label>
              <input
                type="text"
                id="merchantKey"
                name="merchantKey"
                value={paymentConfig.merchantKey}
                onChange={handleChange}
                required
                placeholder="46f0cd694581a"
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#dc0000'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <small style={{ display: 'block', marginTop: '0.3rem', color: '#6b7280', fontSize: '0.72rem' }}>From PayFast dashboard</small>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <label htmlFor="passphrase" style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Passphrase (Optional but Recommended)</label>
            <input
              type="text"
              id="passphrase"
              name="passphrase"
              value={paymentConfig.passphrase}
              onChange={handleChange}
              placeholder="Enter secure passphrase"
              style={{
                width: '100%',
                padding: '0.55rem',
                border: '2px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.85rem',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#dc0000'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            <small style={{ display: 'block', marginTop: '0.3rem', color: '#6b7280', fontSize: '0.72rem' }}>Set in PayFast dashboard under Settings → Integration</small>
          </div>

          <div style={{ marginTop: '1.25rem', padding: '0.85rem', background: '#f9fafb', borderRadius: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="testMode"
                checked={paymentConfig.testMode}
                onChange={handleChange}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>Test Mode (Sandbox)</span>
            </label>
            <small style={{ display: 'block', marginTop: '0.3rem', marginLeft: '1.4rem', color: '#6b7280', fontSize: '0.72rem' }}>Use PayFast sandbox for testing. Uncheck for live payments.</small>
          </div>

          <div style={{ display: 'flex', gap: '0.85rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '2px solid #e5e7eb' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '0.7rem',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 12px rgba(220, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(220, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(220, 0, 0, 0.2)';
              }}
            >
              💾 Save Configuration
            </button>
            <button 
              type="button" 
              onClick={() => router.push('/admin/settings')}
              style={{
                padding: '0.7rem 1.25rem',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
              onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
            >
              Cancel
            </button>
          </div>
        </form>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.25rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '10px',
            padding: '1.25rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '2px solid #e0e7ff'
          }}>
            <h3 style={{ margin: '0 0 0.65rem 0', fontSize: '1rem', fontWeight: '700', color: '#1e40af' }}>📋 Callback URLs</h3>
            <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.8rem', color: '#6b7280' }}>Configure in PayFast dashboard:</p>
            <div style={{ fontSize: '0.75rem', lineHeight: '1.7' }}>
              <div style={{ marginBottom: '0.45rem' }}>
                <strong style={{ color: '#374151' }}>Return URL:</strong>
                <div style={{ padding: '0.35rem', background: '#f9fafb', borderRadius: '4px', marginTop: '0.2rem', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                  {siteOrigin}/checkout/success
                </div>
              </div>
              <div style={{ marginBottom: '0.45rem' }}>
                <strong style={{ color: '#374151' }}>Cancel URL:</strong>
                <div style={{ padding: '0.35rem', background: '#f9fafb', borderRadius: '4px', marginTop: '0.2rem', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                  {siteOrigin}/checkout
                </div>
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Notify URL (ITN):</strong>
                <div style={{ padding: '0.35rem', background: '#f9fafb', borderRadius: '4px', marginTop: '0.2rem', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                  {siteOrigin}/api/payfast/notify
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '10px',
            padding: '1.25rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '2px solid #fef3c7'
          }}>
            <h3 style={{ margin: '0 0 0.65rem 0', fontSize: '1rem', fontWeight: '700', color: '#92400e' }}>🧪 Test Credentials</h3>
            <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.8rem', color: '#6b7280' }}>PayFast sandbox credentials:</p>
            <div style={{ fontSize: '0.8rem', lineHeight: '1.7' }}>
              <div style={{ marginBottom: '0.35rem' }}>
                <strong style={{ color: '#374151' }}>Merchant ID:</strong>
                <code style={{ marginLeft: '0.45rem', padding: '0.15rem 0.45rem', background: '#fef3c7', borderRadius: '4px', fontSize: '0.75rem' }}>10000100</code>
              </div>
              <div style={{ marginBottom: '0.35rem' }}>
                <strong style={{ color: '#374151' }}>Merchant Key:</strong>
                <code style={{ marginLeft: '0.45rem', padding: '0.15rem 0.45rem', background: '#fef3c7', borderRadius: '4px', fontSize: '0.75rem' }}>46f0cd694581a</code>
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Passphrase:</strong>
                <span style={{ marginLeft: '0.45rem', color: '#6b7280', fontSize: '0.75rem', fontStyle: 'italic' }}>(leave empty)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== YOCO CONFIGURATION ===== */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          marginTop: '1.5rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            marginBottom: '0.75rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>💰</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>Yoco Integration</h2>
              <p style={{ margin: '0.2rem 0 0 0', color: '#6b7280', fontSize: '0.8rem' }}>
                Configure your Yoco payment credentials for online checkout
              </p>
            </div>
            {activeGateway === 'yoco' && (
              <span style={{ marginLeft: 'auto', padding: '0.25rem 0.65rem', background: '#10b981', color: 'white', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700 }}>ACTIVE</span>
            )}
          </div>
          <div style={{
            padding: '0.6rem 0.85rem',
            background: '#ede9fe',
            border: '2px solid #8b5cf6',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: '#5b21b6'
          }}>
            <strong>ℹ️ Note:</strong> Get your Yoco API keys from the <a href="https://portal.yoco.com" target="_blank" rel="noopener noreferrer" style={{ color: '#5b21b6', fontWeight: 700 }}>Yoco Business Portal</a>. Use test keys for sandbox mode.
          </div>
        </div>

        {yocoSaveStatus && (
          <div style={{
            background: yocoSaveStatus.startsWith('Error') ? '#fee2e2' : '#d1fae5',
            border: `2px solid ${yocoSaveStatus.startsWith('Error') ? '#ef4444' : '#10b981'}`,
            borderRadius: '8px',
            padding: '0.6rem 0.85rem',
            marginBottom: '1rem',
            color: yocoSaveStatus.startsWith('Error') ? '#991b1b' : '#065f46',
            fontSize: '0.85rem',
            fontWeight: '600'
          }}>
            {yocoSaveStatus}
          </div>
        )}

        <form onSubmit={handleYocoSubmit} style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          marginBottom: '1.25rem'
        }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="secretKey" style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Secret Key *</label>
            <input
              type="text"
              id="secretKey"
              name="secretKey"
              value={yocoConfig.secretKey}
              onChange={handleYocoChange}
              required
              placeholder="sk_live_xxxxxxxxxxxx or sk_test_xxxxxxxxxxxx"
              style={{
                width: '100%',
                padding: '0.55rem',
                border: '2px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.85rem',
                transition: 'border-color 0.3s',
                fontFamily: 'monospace'
              }}
              onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            <small style={{ display: 'block', marginTop: '0.3rem', color: '#6b7280', fontSize: '0.72rem' }}>From Yoco Business Portal → API Keys. Use sk_test_ keys for testing.</small>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="publicKey" style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Public Key (Optional)</label>
            <input
              type="text"
              id="publicKey"
              name="publicKey"
              value={yocoConfig.publicKey}
              onChange={handleYocoChange}
              placeholder="pk_live_xxxxxxxxxxxx or pk_test_xxxxxxxxxxxx"
              style={{
                width: '100%',
                padding: '0.55rem',
                border: '2px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.85rem',
                transition: 'border-color 0.3s',
                fontFamily: 'monospace'
              }}
              onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            <small style={{ display: 'block', marginTop: '0.3rem', color: '#6b7280', fontSize: '0.72rem' }}>Used for inline/popup checkout integration (not required for redirect checkout).</small>
          </div>

          <div style={{ padding: '0.85rem', background: '#f9fafb', borderRadius: '6px', marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="testMode"
                checked={yocoConfig.testMode}
                onChange={handleYocoChange}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>Test Mode (Sandbox)</span>
            </label>
            <small style={{ display: 'block', marginTop: '0.3rem', marginLeft: '1.4rem', color: '#6b7280', fontSize: '0.72rem' }}>Use Yoco test keys for sandbox payments. Uncheck for live.</small>
          </div>

          <div style={{ display: 'flex', gap: '0.85rem', paddingTop: '1.25rem', borderTop: '2px solid #e5e7eb' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '0.7rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.2)';
              }}
            >
              💾 Save Yoco Configuration
            </button>
          </div>
        </form>

        {/* Yoco Webhook URL Info */}
        <div style={{
          background: 'white',
          borderRadius: '10px',
          padding: '1.25rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '2px solid #e0e7ff',
          marginBottom: '1.25rem'
        }}>
          <h3 style={{ margin: '0 0 0.65rem 0', fontSize: '1rem', fontWeight: '700', color: '#4f46e5' }}>📋 Yoco Webhook URL</h3>
          <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.8rem', color: '#6b7280' }}>Configure in Yoco Business Portal → Webhooks:</p>
          <div style={{ fontSize: '0.75rem', lineHeight: '1.7' }}>
            <div style={{ marginBottom: '0.45rem' }}>
              <strong style={{ color: '#374151' }}>Webhook URL:</strong>
              <div style={{ padding: '0.35rem', background: '#f9fafb', borderRadius: '4px', marginTop: '0.2rem', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                {siteOrigin}/api/yoco/webhook
              </div>
            </div>
            <div>
              <strong style={{ color: '#374151' }}>Events to Subscribe:</strong>
              <div style={{ padding: '0.35rem', background: '#f9fafb', borderRadius: '4px', marginTop: '0.2rem', fontSize: '0.75rem' }}>
                payment.succeeded, payment.failed
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
