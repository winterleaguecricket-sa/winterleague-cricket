import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

// SVG icons for dashboard cards (matching team-portal / parent-portal style)
const portalIcons = {
  orders: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h9l5 5v15H6Z" />
      <path d="M15 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  ),
  teams: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <path d="M2 20a6 6 0 0 1 12 0" />
      <path d="M10 20a6 6 0 0 1 12 0" />
    </svg>
  ),
  kit: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 5l4 3 4-3 3 2-2 4v10H7V11L5 7l3-2Z" />
    </svg>
  ),
  settings: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-0.2-.1a1.7 1.7 0 0 0-2 .3l-.2.2-3.6-2.1V17a1.7 1.7 0 0 0-1.4-1.7h-.2a1.7 1.7 0 0 0-1.7 1.4V17l-3.6 2.1-.2-.2a1.7 1.7 0 0 0-2-.3l-.2.1-1.8-3.1.1-.1a1.7 1.7 0 0 0 .3-1.9V15a1.7 1.7 0 0 0-1.4-1.7h-.2a1.7 1.7 0 0 0 0-3.4h.2A1.7 1.7 0 0 0 2.8 8V7a1.7 1.7 0 0 0-.3-1.9l-.1-.1L4.2 2l.2.1a1.7 1.7 0 0 0 2-.3l.2-.2 3.6 2.1V7a1.7 1.7 0 0 0 1.7 1.7h.2A1.7 1.7 0 0 0 13.4 7V5l3.6-2.1.2.2a1.7 1.7 0 0 0 2 .3l.2-.1 1.8 3.1-.1.1a1.7 1.7 0 0 0-.3 1.9V8a1.7 1.7 0 0 0 1.4 1.7h.2a1.7 1.7 0 0 0 0 3.4h-.2A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  ),
  production: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 6V4" />
      <path d="M18 6V4" />
      <path d="M7 14h3" />
      <path d="M14 14h3" />
    </svg>
  ),
  profile: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  )
};

// Shine effect component (matching parent-portal)
const ShineEffect = () => (
  <span data-card-shine="true" style={{
    position: 'absolute',
    top: 0,
    left: '-120%',
    width: '60%',
    height: '100%',
    background: 'linear-gradient(120deg, transparent, rgba(255,255,255,0.45), transparent)',
    transform: 'skewX(-20deg)',
    transition: 'left 0.5s ease',
    pointerEvents: 'none',
    zIndex: 1
  }} />
);

export default function ManufacturerPortal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [manufacturer, setManufacturer] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Dashboard card hover effect (matching team-portal / parent-portal)
  const applyDashboardCardHover = (e) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.7)';
    e.currentTarget.style.boxShadow = '0 14px 32px rgba(220,0,0,0.35), 0 0 22px rgba(255,255,255,0.25)';
    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(3,7,18,0.98) 55%, rgba(220,0,0,0.35) 100%)';
    e.currentTarget.style.filter = 'saturate(1.15) brightness(1.08)';
    const shine = e.currentTarget.querySelector('[data-card-shine]');
    if (shine) shine.style.left = '140%';
  };
  const removeDashboardCardHover = (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
    e.currentTarget.style.background = '#111827';
    e.currentTarget.style.filter = 'none';
    const shine = e.currentTarget.querySelector('[data-card-shine]');
    if (shine) shine.style.left = '-120%';
  };

  // Restore session on load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Admin bypass
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setIsAdminMode(true);
      setManufacturer({ id: 'admin', companyName: 'Admin View', email: 'admin@winterleaguecricket.co.za' });
      return;
    }

    // Restore from localStorage
    const savedId = localStorage.getItem('manufacturerId');
    if (savedId) {
      fetch(`/api/manufacturer-auth?id=${encodeURIComponent(savedId)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.manufacturer) {
            setManufacturer(data.manufacturer);
          } else {
            localStorage.removeItem('manufacturerId');
          }
        })
        .catch(() => localStorage.removeItem('manufacturerId'));
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/manufacturer-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });
      const data = await res.json();
      if (data.manufacturer) {
        setManufacturer(data.manufacturer);
        localStorage.setItem('manufacturerId', data.manufacturer.id);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  const handleLogout = () => {
    setManufacturer(null);
    setEmail('');
    setPassword('');
    setActiveTab('dashboard');
    localStorage.removeItem('manufacturerId');
    if (isAdminMode) {
      setIsAdminMode(false);
    }
  };

  // ─── Responsive styles ───
  const renderResponsiveStyles = () => (
    <style jsx global>{`
      body { margin: 0; }
      @media (max-width: 900px) {
        .mfgPortalHeader { padding: 1rem !important; }
      }
      @media (max-width: 768px) {
        .mfgPortalHeader { padding: 1rem !important; }
        .mfgPortalHeader > div { flex-direction: column !important; align-items: flex-start !important; }
        .mfgPortalHeader h1 { font-size: 1.25rem !important; }
        .mfgBanner { flex-direction: column !important; text-align: center !important; }
        .mfgBanner > div:first-child { width: 64px !important; height: 64px !important; font-size: 1.5rem !important; }
        .mfgBanner h2 { font-size: 1.4rem !important; }
        .mfgDashboardGrid { grid-template-columns: 1fr !important; }
        .mfgInfoGrid { grid-template-columns: 1fr !important; }
        .mfgContent { padding: 1rem !important; }
      }
      @media (max-width: 600px) {
        .mfgDashboardCard {
          background: linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(3,7,18,0.98) 60%, rgba(220,0,0,0.45) 100%) !important;
          border: 1px solid rgba(239,68,68,0.55) !important;
          box-shadow: 0 14px 34px rgba(220,0,0,0.35), 0 0 20px rgba(255,255,255,0.2) !important;
        }
        .mfgDashboardCard:active {
          transform: translateY(-2px) scale(0.99) !important;
        }
      }
      @keyframes mobileCardGlow {
        0%, 100% { opacity: 0.65; }
        50% { opacity: 1; }
      }
    `}</style>
  );

  // ─── LOGIN SCREEN ───
  if (!manufacturer) {
    return (
      <>
        <Head><title>Manufacturer Portal - Winter League Cricket</title></Head>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #dc0000 100%)',
          padding: '2rem'
        }}>
          <div style={{
            background: 'white',
            padding: '2.5rem',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            width: '100%',
            maxWidth: '450px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{
                fontSize: '2rem', fontWeight: '900',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.5rem'
              }}>🏭 WL Manufacturer Portal</h1>
              <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Access your manufacturing dashboard</p>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem', color: '#111827', background: 'white', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#dc0000'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem', color: '#111827', background: 'white', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#dc0000'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              {error && (
                <div style={{ padding: '0.75rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center', fontWeight: 600 }}>
                  {error}
                </div>
              )}
              <button type="submit" style={{
                width: '100%', padding: '0.875rem',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '1rem', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.2s'
              }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >Login to Portal</button>
            </form>

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px', fontSize: '0.8rem', color: '#6b7280' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>Need access?</strong>
              <p style={{ margin: 0 }}>Contact the Winter League Cricket admin team to get your manufacturer account set up.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── DASHBOARD ───
  return (
    <>
      <Head>
        <title>{isAdminMode ? 'Manufacturer Portal - Admin' : `${manufacturer.companyName} - Manufacturer Portal`} - Winter League Cricket</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#0b0b0b' }}>
        {/* ── HEADER BAR ── */}
        <div className="mfgPortalHeader" style={{
          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
          color: 'white', padding: '1rem 2rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)'
        }}>
          <div style={{
            maxWidth: '1400px', margin: '0 auto', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
          }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>
                WL Manufacturer Portal {manufacturer?.companyName ? `· ${manufacturer.companyName}` : ''}
              </h1>
              <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>
                {manufacturer?.email || ''}
                {isAdminMode && (
                  <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0.15rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, marginLeft: '0.75rem' }}>ADMIN</span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleLogout}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'background 0.2s' }}
              >Logout</button>
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="mfgContent" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>

          {/* ── WELCOME BANNER ── */}
          <div className="mfgBanner" style={{
            background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(3,7,18,0.95) 55%, rgba(220,0,0,0.25) 100%)',
            borderRadius: '16px', padding: '2rem',
            marginBottom: '1.5rem',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', gap: '1.5rem'
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #dc0000 0%, #b30000 100%)',
              border: '2px solid rgba(239,68,68,0.6)',
              boxShadow: '0 6px 18px rgba(239,68,68,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem', flexShrink: 0
            }}>🏭</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#f9fafb' }}>
                Welcome, {manufacturer.companyName}
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#9ca3af', fontSize: '0.95rem' }}>
                {manufacturer.email}
              </p>
            </div>
          </div>

          {/* ── BACK TO DASHBOARD BUTTON ── */}
          {activeTab !== 'dashboard' && (
            <button onClick={() => setActiveTab('dashboard')}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(220,0,0,0.5)'; e.currentTarget.style.background = 'rgba(220,0,0,0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'transparent'; }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 1.2rem', background: 'transparent',
                color: '#f9fafb', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem',
                cursor: 'pointer', marginBottom: '1.5rem', transition: 'all 0.2s'
              }}
            >← Back to Dashboard</button>
          )}

          {/* ── DASHBOARD GRID ── */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#f9fafb' }}>Manufacturer Dashboard</h2>
              <div className="mfgDashboardGrid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem', marginBottom: '2rem'
              }}>

                {/* Card: Kit Orders */}
                <div
                  className="mfgDashboardCard"
                  onClick={() => setActiveTab('orders')}
                  onMouseEnter={applyDashboardCardHover}
                  onMouseLeave={removeDashboardCardHover}
                  style={{
                    background: '#111827', padding: '1.5rem', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    position: 'relative', overflow: 'hidden'
                  }}
                >
                  <ShineEffect />
                  <div style={{
                    width: '48px', height: '48px', marginBottom: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '12px', color: '#f87171',
                    background: 'rgba(239, 68, 68, 0.14)',
                    border: '1px solid rgba(239, 68, 68, 0.35)'
                  }}>{portalIcons.orders}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f9fafb', marginBottom: '0.25rem' }}>
                    Kit Orders
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#9ca3af', fontWeight: '600' }}>
                    View and manage team kit orders
                  </div>
                </div>

                {/* Card: Teams Overview */}
                <div
                  className="mfgDashboardCard"
                  onClick={() => setActiveTab('teams')}
                  onMouseEnter={applyDashboardCardHover}
                  onMouseLeave={removeDashboardCardHover}
                  style={{
                    background: '#111827', padding: '1.5rem', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    position: 'relative', overflow: 'hidden'
                  }}
                >
                  <ShineEffect />
                  <div style={{
                    width: '48px', height: '48px', marginBottom: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '12px', color: '#60a5fa',
                    background: 'rgba(96, 165, 250, 0.14)',
                    border: '1px solid rgba(96, 165, 250, 0.35)'
                  }}>{portalIcons.teams}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f9fafb', marginBottom: '0.25rem' }}>
                    Teams Overview
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#9ca3af', fontWeight: '600' }}>
                    View registered teams and kit specs
                  </div>
                </div>

                {/* Card: Production Tracking */}
                <div
                  className="mfgDashboardCard"
                  onClick={() => setActiveTab('production')}
                  onMouseEnter={applyDashboardCardHover}
                  onMouseLeave={removeDashboardCardHover}
                  style={{
                    background: '#111827', padding: '1.5rem', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    position: 'relative', overflow: 'hidden'
                  }}
                >
                  <ShineEffect />
                  <div style={{
                    width: '48px', height: '48px', marginBottom: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '12px', color: '#34d399',
                    background: 'rgba(52, 211, 153, 0.14)',
                    border: '1px solid rgba(52, 211, 153, 0.35)'
                  }}>{portalIcons.production}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f9fafb', marginBottom: '0.25rem' }}>
                    Production Tracking
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#9ca3af', fontWeight: '600' }}>
                    Track manufacturing progress
                  </div>
                </div>

                {/* Card: Account Settings */}
                <div
                  className="mfgDashboardCard"
                  onClick={() => setActiveTab('settings')}
                  onMouseEnter={applyDashboardCardHover}
                  onMouseLeave={removeDashboardCardHover}
                  style={{
                    background: '#111827', padding: '1.5rem', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    position: 'relative', overflow: 'hidden'
                  }}
                >
                  <ShineEffect />
                  <div style={{
                    width: '48px', height: '48px', marginBottom: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '12px', color: '#fbbf24',
                    background: 'rgba(251, 191, 36, 0.14)',
                    border: '1px solid rgba(251, 191, 36, 0.35)'
                  }}>{portalIcons.settings}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f9fafb', marginBottom: '0.25rem' }}>
                    Account Settings
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#9ca3af', fontWeight: '600' }}>
                    Manage your account and password
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── KIT ORDERS TAB ── */}
          {activeTab === 'orders' && (
            <div style={{ background: '#111827', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', fontWeight: 900, color: '#f9fafb' }}>
                📦 Kit Orders
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
                Kit order data will be populated here. This section will display all team kit orders with sizes, quantities, and design specifications.
              </p>
              <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', marginTop: '1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📋</div>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Content coming soon</p>
              </div>
            </div>
          )}

          {/* ── TEAMS OVERVIEW TAB ── */}
          {activeTab === 'teams' && (
            <div style={{ background: '#111827', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', fontWeight: 900, color: '#f9fafb' }}>
                👥 Teams Overview
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
                This section will display all registered teams with their kit designs, colors, logos, and player counts.
              </p>
              <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', marginTop: '1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏏</div>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Content coming soon</p>
              </div>
            </div>
          )}

          {/* ── PRODUCTION TRACKING TAB ── */}
          {activeTab === 'production' && (
            <div style={{ background: '#111827', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', fontWeight: 900, color: '#f9fafb' }}>
                🏭 Production Tracking
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
                Track the manufacturing status of kit orders. Update progress and mark orders as complete.
              </p>
              <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', marginTop: '1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚙️</div>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Content coming soon</p>
              </div>
            </div>
          )}

          {/* ── ACCOUNT SETTINGS TAB ── */}
          {activeTab === 'settings' && (
            <div style={{ background: '#111827', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', fontWeight: 900, color: '#f9fafb' }}>
                ⚙️ Account Settings
              </h3>
              <div className="mfgInfoGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>Company Name</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f9fafb' }}>{manufacturer.companyName}</div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>Email</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f9fafb' }}>{manufacturer.email}</div>
                </div>
                {manufacturer.contactName && (
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>Contact Person</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f9fafb' }}>{manufacturer.contactName}</div>
                  </div>
                )}
                {manufacturer.phone && (
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>Phone</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f9fafb' }}>{manufacturer.phone}</div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {renderResponsiveStyles()}
    </>
  );
}
