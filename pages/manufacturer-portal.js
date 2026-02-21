import { useState, useEffect, useCallback, Fragment } from 'react';
import Head from 'next/head';

// ─── SVG ICONS ─────────────────────────────────────────────
const icons = {
  teams: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" />
      <path d="M2 20a6 6 0 0 1 12 0" /><path d="M10 20a6 6 0 0 1 12 0" />
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
      <path d="M12 1v2m0 18v2m-9-11h2m18 0h2m-3.3-6.7-1.4 1.4M6.7 17.3l-1.4 1.4m0-13.4 1.4 1.4m10.6 10.6 1.4 1.4" />
    </svg>
  ),
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  player: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  ),
  back: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
  ),
  shirt: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 5l4 3 4-3 3 2-2 4v10H7V11L5 7l3-2Z" />
    </svg>
  ),
  package: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
};

// Shine effect for dashboard cards
const ShineEffect = () => (
  <span data-card-shine="true" style={{
    position: 'absolute', top: 0, left: '-120%', width: '60%', height: '100%',
    background: 'linear-gradient(120deg, transparent, rgba(255,255,255,0.45), transparent)',
    transform: 'skewX(-20deg)', transition: 'left 0.5s ease', pointerEvents: 'none', zIndex: 1
  }} />
);

export default function ManufacturerPortal() {
  // ─── AUTH STATE ──────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [manufacturer, setManufacturer] = useState(null);
  const [error, setError] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);

  // ─── APP STATE ───────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('dashboard');
  const [teamsData, setTeamsData] = useState([]);
  const [totalTeams, setTotalTeams] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  // ─── FETCH DATA ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/manufacturer-data');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTeamsData(data.teams || []);
      setTotalTeams(data.totalTeams || 0);
      setTotalPlayers(data.totalPlayers || 0);
    } catch (err) {
      console.error('Failed to load manufacturer data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── AUTH LOGIC ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setIsAdminMode(true);
      setManufacturer({ id: 'admin', companyName: 'Admin View', email: 'admin@winterleaguecricket.co.za' });
      return;
    }
    const savedId = localStorage.getItem('manufacturerId');
    if (savedId) {
      fetch(`/api/manufacturer-auth?id=${encodeURIComponent(savedId)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.manufacturer) setManufacturer(data.manufacturer);
          else localStorage.removeItem('manufacturerId');
        })
        .catch(() => localStorage.removeItem('manufacturerId'));
    }
  }, []);

  // Fetch data once authenticated
  useEffect(() => {
    if (manufacturer) fetchData();
  }, [manufacturer, fetchData]);

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
    setSelectedTeamId(null);
    localStorage.removeItem('manufacturerId');
    if (isAdminMode) setIsAdminMode(false);
  };

  // ─── HELPERS ─────────────────────────────────────────────
  const filteredTeams = teamsData.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.teamName.toLowerCase().includes(q) || t.kitDesignName.toLowerCase().includes(q);
  });

  const selectedTeam = selectedTeamId ? teamsData.find(t => t.id === selectedTeamId) : null;

  const sizeOrder = ['7/8 years', '9/10 years', '11/12 years', '13/14 years', 'Extra Small', 'Small', 'Medium', 'Large', 'Extra Large'];

  const sortSizes = (entries) => entries.sort(([a], [b]) => {
    const iA = sizeOrder.indexOf(a);
    const iB = sizeOrder.indexOf(b);
    return (iA === -1 ? 99 : iA) - (iB === -1 ? 99 : iB);
  });

  const navigateToTeam = (teamId) => {
    setSelectedTeamId(teamId);
    setActiveTab('teamDetail');
    window.scrollTo(0, 0);
  };

  const backToTeamList = () => {
    setSelectedTeamId(null);
    setActiveTab('teams');
  };

  // Dashboard card hover effects
  const applyHover = (e) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.7)';
    e.currentTarget.style.boxShadow = '0 14px 32px rgba(220,0,0,0.35), 0 0 22px rgba(255,255,255,0.25)';
    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(3,7,18,0.98) 55%, rgba(220,0,0,0.35) 100%)';
    const shine = e.currentTarget.querySelector('[data-card-shine]');
    if (shine) shine.style.left = '140%';
  };
  const removeHover = (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
    e.currentTarget.style.background = '#111827';
    const shine = e.currentTarget.querySelector('[data-card-shine]');
    if (shine) shine.style.left = '-120%';
  };

  // Team card hover
  const applyTeamHover = (e) => {
    e.currentTarget.style.transform = 'translateY(-3px)';
    e.currentTarget.style.borderColor = 'rgba(220,0,0,0.4)';
    e.currentTarget.style.boxShadow = '0 12px 28px rgba(220,0,0,0.15)';
  };
  const removeTeamHover = (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
  };

  // ─── LOGIN SCREEN ────────────────────────────────────────
  if (!manufacturer) {
    return (
      <>
        <Head><title>Manufacturer Portal - Winter League Cricket</title></Head>
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #dc0000 100%)', padding: '2rem'
        }}>
          <div style={{
            background: 'white', padding: '2.5rem', borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)', width: '100%', maxWidth: '450px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{
                fontSize: '2rem', fontWeight: '900',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem'
              }}>🏭 WL Manufacturer Portal</h1>
              <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Access your manufacturing dashboard</p>
            </div>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" required
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem', color: '#111827', background: 'white', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#dc0000'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem', color: '#111827', background: 'white', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#dc0000'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
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

  // ─── RENDER: TEAM LIST CARD (clickable → navigates to detail page) ───
  const renderTeamListCard = (team) => (
    <div key={team.id}
      onClick={() => navigateToTeam(team.id)}
      onMouseEnter={applyTeamHover}
      onMouseLeave={removeTeamHover}
      style={{
        background: '#111827', borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden', cursor: 'pointer',
        transition: 'all 0.25s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }}
    >
      {/* Kit image preview */}
      <div style={{
        height: '160px', background: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative'
      }}>
        {team.kitDesignImage ? (
          <img src={team.kitDesignImage} alt={`${team.teamName} kit`}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '0.75rem' }} />
        ) : (
          <div style={{ color: '#374151', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>👕</div>
            <div style={{ fontSize: '0.75rem' }}>No kit image</div>
          </div>
        )}
        {/* Player count badge */}
        <div style={{
          position: 'absolute', top: '0.6rem', right: '0.6rem',
          background: 'rgba(220,0,0,0.85)', color: 'white',
          padding: '0.2rem 0.55rem', borderRadius: '20px',
          fontSize: '0.72rem', fontWeight: '800', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', gap: '0.25rem'
        }}>
          {icons.player} {team.playerCount}
        </div>
        {/* Additional items badge */}
        {team.additionalItems && team.additionalItems.length > 0 && (
          <div style={{
            position: 'absolute', top: '0.6rem', left: '0.6rem',
            background: 'rgba(59,130,246,0.85)', color: 'white',
            padding: '0.2rem 0.55rem', borderRadius: '20px',
            fontSize: '0.72rem', fontWeight: '800', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', gap: '0.25rem'
          }}>
            {icons.package} +{team.additionalItems.length} item{team.additionalItems.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          {/* Team logo thumbnail */}
          <div style={{
            width: '38px', height: '38px', borderRadius: '8px', flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden',
            background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {team.teamLogo ? (
              <img src={team.teamLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1rem' }}>🏏</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#f9fafb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {team.teamName}
            </div>
            {team.kitDesignName && (
              <span style={{
                fontSize: '0.73rem', fontWeight: '700', color: '#f87171',
                background: 'rgba(239,68,68,0.12)', padding: '0.12rem 0.45rem', borderRadius: '4px'
              }}>
                {team.kitDesignName}
              </span>
            )}
          </div>
        </div>

        {/* Quick size summary (top 3) */}
        {team.shirtSizeSummary && Object.keys(team.shirtSizeSummary).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
            {sortSizes(Object.entries(team.shirtSizeSummary)).slice(0, 4).map(([size, count]) => (
              <span key={size} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                padding: '0.15rem 0.45rem', background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px',
                fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600'
              }}>
                {size} <span style={{ color: '#f87171', fontWeight: '800' }}>×{count}</span>
              </span>
            ))}
            {Object.keys(team.shirtSizeSummary).length > 4 && (
              <span style={{ fontSize: '0.72rem', color: '#6b7280', alignSelf: 'center' }}>
                +{Object.keys(team.shirtSizeSummary).length - 4} more
              </span>
            )}
          </div>
        )}

        {/* View details arrow */}
        <div style={{
          marginTop: '0.75rem', paddingTop: '0.65rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '600' }}>
            {team.playerCount} player{team.playerCount !== 1 ? 's' : ''}{team.sponsorLogo ? ' · Sponsor' : ''}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: '700' }}>
            View Details →
          </span>
        </div>
      </div>
    </div>
  );

  // ─── RENDER: TEAM DETAIL PAGE ────────────────────────────
  const renderTeamDetail = () => {
    if (!selectedTeam) return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
        Team not found. <button onClick={backToTeamList} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Go back</button>
      </div>
    );

    const team = selectedTeam;
    const hasPlayers = team.players.length > 0;
    const hasAdditionalItems = team.additionalItems && team.additionalItems.length > 0;

    return (
      <div>
        {/* ── BACK BUTTON ── */}
        <button onClick={backToTeamList}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
            color: '#d1d5db', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s', marginBottom: '1.25rem'
          }}
        >
          {icons.back} Back to All Teams
        </button>

        {/* ── TEAM HEADER BANNER ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(3,7,18,0.95) 55%, rgba(220,0,0,0.2) 100%)',
          borderRadius: '16px', padding: '1.75rem', marginBottom: '1.5rem',
          border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', gap: '1.25rem'
        }} className="mfgTeamBanner">
          <div style={{
            width: '64px', height: '64px', borderRadius: '14px', flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.15)', overflow: 'hidden',
            background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {team.teamLogo ? (
              <img src={team.teamLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1.6rem' }}>🏏</span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#f9fafb' }}>
              {team.teamName}
            </h2>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.3rem' }}>
              {team.kitDesignName && (
                <span style={{
                  fontSize: '0.8rem', fontWeight: '700', color: '#f87171',
                  background: 'rgba(239,68,68,0.12)', padding: '0.2rem 0.6rem', borderRadius: '5px'
                }}>
                  {team.kitDesignName}
                </span>
              )}
              <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                {icons.player} {team.playerCount} paid player{team.playerCount !== 1 ? 's' : ''}
              </span>
              {team.sponsorLogo && (
                <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: '600' }}>+ Sponsor</span>
              )}
              {hasAdditionalItems && (
                <span style={{
                  fontSize: '0.78rem', fontWeight: '700', color: '#60a5fa',
                  background: 'rgba(59,130,246,0.12)', padding: '0.2rem 0.6rem', borderRadius: '5px'
                }}>
                  +{team.additionalItems.length} additional item{team.additionalItems.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── KIT DESIGN + BRANDING ROW ── */}
        <div className="mfgKitRow" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem'
        }}>
          {/* Kit Design Image */}
          <div style={{
            background: '#0f172a', borderRadius: '12px', padding: '1.25rem',
            border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center'
          }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.75rem',
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              Kit Design {team.kitDesignName ? `— ${team.kitDesignName}` : ''}
            </div>
            {team.kitDesignImage ? (
              <img
                src={team.kitDesignImage}
                alt={`${team.teamName} kit design`}
                style={{
                  width: '100%', maxHeight: '400px', objectFit: 'contain',
                  borderRadius: '8px', background: '#1e293b'
                }}
              />
            ) : (
              <div style={{
                padding: '3rem 1rem', background: '#1e293b', borderRadius: '8px',
                color: '#475569', textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👕</div>
                <div style={{ fontSize: '0.85rem' }}>No kit image uploaded yet</div>
              </div>
            )}
          </div>

          {/* Branding — Team Logo + Sponsor Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: '#0f172a', borderRadius: '12px', padding: '1.25rem',
              border: '1px solid rgba(255,255,255,0.06)', flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center'
            }}>
              <div style={{
                fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.75rem',
                textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>Team Logo</div>
              {team.teamLogo ? (
                <img src={team.teamLogo} alt={`${team.teamName} logo`}
                  style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '6px' }} />
              ) : (
                <div style={{ color: '#475569', fontSize: '0.85rem', padding: '1rem' }}>No logo uploaded</div>
              )}
            </div>
            <div style={{
              background: '#0f172a', borderRadius: '12px', padding: '1.25rem',
              border: '1px solid rgba(255,255,255,0.06)', flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center'
            }}>
              <div style={{
                fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.75rem',
                textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>Sponsor Logo</div>
              {team.sponsorLogo ? (
                <img src={team.sponsorLogo} alt={`${team.teamName} sponsor`}
                  style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '6px' }} />
              ) : (
                <div style={{ color: '#475569', fontSize: '0.85rem', padding: '1rem' }}>No sponsor logo</div>
              )}
              {team.sponsorLogo && (
                <div style={{
                  marginTop: '0.6rem', padding: '0.45rem 0.7rem',
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: '6px', fontSize: '0.75rem', color: '#fbbf24', fontWeight: '600',
                  lineHeight: 1.4, textAlign: 'left'
                }}>
                  ⚠️ Sponsor logo should be printed on the <strong>sleeve</strong> of the shirt.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SHIRT SIZE SUMMARY ── */}
        {hasPlayers && team.shirtSizeSummary && Object.keys(team.shirtSizeSummary).length > 0 && (
          <div style={{
            background: 'rgba(220,0,0,0.05)', border: '1px solid rgba(220,0,0,0.15)',
            borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1rem'
          }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: '700', color: '#f87171', marginBottom: '0.6rem',
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              Shirt Size Summary — {team.playerCount} kit{team.playerCount !== 1 ? 's' : ''} required
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {sortSizes(Object.entries(team.shirtSizeSummary)).map(([size, count]) => (
                <span key={size} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.3rem 0.65rem', background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
                  fontSize: '0.8rem', color: '#e2e8f0', fontWeight: '600'
                }}>
                  {size} <span style={{ color: '#f87171', fontWeight: '800' }}>×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── PANTS SIZE SUMMARY ── */}
        {hasPlayers && team.pantsSizeSummary && Object.keys(team.pantsSizeSummary).length > 0 && (
          <div style={{
            background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem'
          }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: '700', color: '#60a5fa', marginBottom: '0.6rem',
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              Pants Size Summary
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {sortSizes(Object.entries(team.pantsSizeSummary)).map(([size, count]) => (
                <span key={size} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.3rem 0.65rem', background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
                  fontSize: '0.8rem', color: '#e2e8f0', fontWeight: '600'
                }}>
                  {size} <span style={{ color: '#60a5fa', fontWeight: '800' }}>×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── PLAYER ROSTER TABLE ── */}
        <div style={{
          fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.6rem',
          textTransform: 'uppercase', letterSpacing: '0.08em'
        }}>
          Player Roster — {team.playerCount} paid player{team.playerCount !== 1 ? 's' : ''}
        </div>

        {hasPlayers ? (
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: '640px' }}>
                <thead>
                  <tr style={{ background: '#1e293b' }}>
                    <th style={thStyle}>#</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Player Name</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>DOB</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Shirt Size</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Pants Size</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Shirt No.</th>
                  </tr>
                </thead>
                <tbody>
                  {team.players.map((player, idx) => (
                    <Fragment key={idx}>
                      <tr style={{
                        background: idx % 2 === 0 ? '#111827' : '#0f172a',
                        borderBottom: (player.additionalItems && player.additionalItems.length > 0) ? 'none' : '1px solid rgba(255,255,255,0.04)'
                      }}>
                        <td style={{ ...tdStyle, color: '#6b7280', fontWeight: '600', fontSize: '0.82rem', width: '40px' }}>
                          {idx + 1}
                        </td>
                        <td style={{ ...tdStyle, color: '#f1f5f9', fontWeight: '700' }}>
                          {player.name}
                        </td>
                        <td style={tdStyle}>
                          {player.dateOfBirth ? (
                            <span style={{
                              padding: '0.2rem 0.5rem', background: 'rgba(251,191,36,0.1)',
                              border: '1px solid rgba(251,191,36,0.2)', borderRadius: '4px',
                              fontSize: '0.78rem', fontWeight: '600', color: '#fcd34d', whiteSpace: 'nowrap'
                            }}>{new Date(player.dateOfBirth + 'T00:00:00').toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          ) : (
                            <span style={{ color: '#475569', fontStyle: 'italic', fontSize: '0.82rem' }}>—</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {player.shirtSize ? (
                            <span style={{
                              padding: '0.2rem 0.5rem', background: 'rgba(96,165,250,0.1)',
                              border: '1px solid rgba(96,165,250,0.2)', borderRadius: '4px',
                              fontSize: '0.82rem', fontWeight: '600', color: '#93c5fd'
                            }}>{player.shirtSize}</span>
                          ) : (
                            <span style={{ color: '#475569', fontStyle: 'italic', fontSize: '0.82rem' }}>—</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {player.pantsSize ? (
                            <span style={{
                              padding: '0.2rem 0.5rem', background: 'rgba(34,197,94,0.1)',
                              border: '1px solid rgba(34,197,94,0.2)', borderRadius: '4px',
                              fontSize: '0.82rem', fontWeight: '600', color: '#86efac'
                            }}>{player.pantsSize}</span>
                          ) : (
                            <span style={{ color: '#475569', fontStyle: 'italic', fontSize: '0.82rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {player.shirtNumber != null ? (
                            <span style={{
                              display: 'inline-block', minWidth: '32px',
                              padding: '0.2rem 0.5rem', background: 'rgba(239,68,68,0.1)',
                              border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px',
                              fontSize: '0.9rem', fontWeight: '800', color: '#fca5a5', textAlign: 'center'
                            }}>{player.shirtNumber}</span>
                          ) : (
                            <span style={{ color: '#475569', fontStyle: 'italic', fontSize: '0.82rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                      {player.additionalItems && player.additionalItems.length > 0 && (
                        <tr style={{
                          background: idx % 2 === 0 ? '#111827' : '#0f172a',
                          borderBottom: '1px solid rgba(255,255,255,0.04)'
                        }}>
                          <td colSpan={6} style={{ padding: '0.15rem 1rem 0.65rem 3.2rem' }}>
                            <div style={{
                              display: 'flex', flexDirection: 'column', gap: '0.35rem'
                            }}>
                              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Additional Items
                              </span>
                              {player.additionalItems.map((ai, aiIdx) => (
                                <div key={aiIdx} style={{
                                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                                  padding: '0.35rem 0.7rem',
                                  background: ai.isSupporter ? 'rgba(168,85,247,0.06)' : 'rgba(59,130,246,0.06)',
                                  border: `1px solid ${ai.isSupporter ? 'rgba(168,85,247,0.18)' : 'rgba(59,130,246,0.18)'}`,
                                  borderRadius: '6px', fontSize: '0.82rem'
                                }}>
                                  {ai.image && (
                                    <img src={ai.image} alt="" style={{
                                      width: '24px', height: '24px', objectFit: 'cover',
                                      borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0
                                    }} />
                                  )}
                                  <span style={{ fontWeight: '700', color: ai.isSupporter ? '#c4b5fd' : '#93c5fd', minWidth: '120px' }}>
                                    {ai.name}
                                  </span>
                                  {ai.size && ai.size !== 'One Size' && (
                                    <span style={{
                                      padding: '0.1rem 0.4rem',
                                      background: ai.isSupporter ? 'rgba(168,85,247,0.15)' : 'rgba(59,130,246,0.15)',
                                      borderRadius: '4px', fontSize: '0.78rem', fontWeight: '600',
                                      color: ai.isSupporter ? '#a78bfa' : '#60a5fa'
                                    }}>Size: {ai.size}</span>
                                  )}
                                  {ai.quantity > 1 && (
                                    <span style={{ fontWeight: '800', color: '#94a3b8', fontSize: '0.78rem' }}>×{ai.quantity}</span>
                                  )}
                                  {ai.isSupporter && (
                                    <span style={{
                                      fontSize: '0.65rem', background: 'rgba(168,85,247,0.25)',
                                      padding: '0.12rem 0.4rem', borderRadius: '3px',
                                      color: '#d8b4fe', fontWeight: '700', marginLeft: 'auto'
                                    }}>SUPPORTER</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '2rem', textAlign: 'center', background: '#0f172a',
            borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📋</div>
            <div style={{ color: '#475569', fontSize: '0.9rem' }}>No paid players registered for this team yet</div>
          </div>
        )}

        {/* ── ADDITIONAL MANUFACTURED ITEMS (PER-PLAYER) ── */}
        {hasAdditionalItems && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.6rem',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}>
              {icons.package} Additional Items — {team.totalAdditionalQty || team.additionalItems.reduce((s, i) => s + i.quantity, 0)} item{(team.totalAdditionalQty || team.additionalItems.reduce((s, i) => s + i.quantity, 0)) !== 1 ? 's' : ''} ordered
            </div>

            {/* ── Manufacturing Notes ── */}
            {team.additionalItems.some(i => !i.isSupporter) && (
              <div style={{
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem',
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>⚠️</span>
                <span style={{ fontSize: '0.82rem', color: '#fbbf24', fontWeight: '600', lineHeight: 1.4 }}>
                  <strong>Team Kit Items:</strong> All additional apparel items for this team must be manufactured in the same colours as the team&apos;s chosen kit design shown above.
                </span>
              </div>
            )}
            {team.additionalItems.some(i => i.isSupporter) && (
              <div style={{
                background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)',
                borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem',
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>⚠️</span>
                <span style={{ fontSize: '0.82rem', color: '#c4b5fd', fontWeight: '600', lineHeight: 1.4 }}>
                  <strong>Supporter Items:</strong> All supporter items must have &quot;SUPPORTER&quot; printed on the back of the tops.
                </span>
              </div>
            )}

            {/* ── Per-player items table ── */}
            <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: '500px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(59,130,246,0.08)' }}>
                      <th style={{ ...thStyle, color: '#60a5fa', textAlign: 'left' }}>Player</th>
                      <th style={{ ...thStyle, color: '#60a5fa', textAlign: 'left' }}>Item</th>
                      <th style={{ ...thStyle, color: '#60a5fa', textAlign: 'left' }}>Size</th>
                      <th style={{ ...thStyle, color: '#60a5fa', textAlign: 'center' }}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let rowIdx = 0;
                      return team.players.filter(p => p.additionalItems && p.additionalItems.length > 0).flatMap((player) =>
                        player.additionalItems.map((item, iIdx) => {
                          const ri = rowIdx++;
                          return (
                            <tr key={`${player.name}-${iIdx}`} style={{
                              background: ri % 2 === 0 ? '#111827' : '#0f172a',
                              borderBottom: '1px solid rgba(255,255,255,0.04)'
                            }}>
                              <td style={{ ...tdStyle, color: '#f1f5f9', fontWeight: '700' }}>
                                {iIdx === 0 ? player.name : ''}
                              </td>
                              <td style={{ ...tdStyle, color: '#f1f5f9', fontWeight: '600' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {item.image && (
                                    <img src={item.image} alt="" style={{
                                      width: '28px', height: '28px', objectFit: 'cover',
                                      borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0
                                    }} />
                                  )}
                                  {item.name}
                                  {item.isSupporter && (
                                    <span style={{
                                      fontSize: '0.65rem', background: 'rgba(168,85,247,0.3)',
                                      padding: '0.1rem 0.35rem', borderRadius: '3px',
                                      color: '#d8b4fe', fontWeight: '700'
                                    }}>SUPPORTER</span>
                                  )}
                                </div>
                              </td>
                              <td style={tdStyle}>
                                {item.size && item.size !== 'One Size' ? (
                                  <span style={{
                                    padding: '0.2rem 0.5rem',
                                    background: item.isSupporter ? 'rgba(168,85,247,0.1)' : 'rgba(59,130,246,0.1)',
                                    border: `1px solid ${item.isSupporter ? 'rgba(168,85,247,0.2)' : 'rgba(59,130,246,0.2)'}`,
                                    borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600',
                                    color: item.isSupporter ? '#c4b5fd' : '#93c5fd'
                                  }}>{item.size}</span>
                                ) : (
                                  <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>One Size</span>
                                )}
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block', minWidth: '28px',
                                  padding: '0.2rem 0.5rem',
                                  background: item.isSupporter ? 'rgba(168,85,247,0.1)' : 'rgba(59,130,246,0.1)',
                                  border: `1px solid ${item.isSupporter ? 'rgba(168,85,247,0.25)' : 'rgba(59,130,246,0.25)'}`,
                                  borderRadius: '6px', fontSize: '0.9rem', fontWeight: '800',
                                  color: item.isSupporter ? '#c4b5fd' : '#93c5fd', textAlign: 'center'
                                }}>×{item.quantity}</span>
                              </td>
                            </tr>
                          );
                        })
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── MAIN AUTHENTICATED VIEW ─────────────────────────────
  return (
    <>
      <Head>
        <title>{isAdminMode ? 'Manufacturer Portal - Admin' : `${manufacturer.companyName} - Manufacturer Portal`} - Winter League Cricket</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#0b0b0b' }}>

        {/* ── HEADER ── */}
        <div className="mfgPortalHeader" style={{
          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
          color: 'white', padding: '1rem 2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.4)'
        }}>
          <div style={{
            maxWidth: '1400px', margin: '0 auto', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
          }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>
                🏭 WL Manufacturer Portal
              </h1>
              <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>
                {manufacturer?.companyName || ''}
                {isAdminMode && (
                  <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0.15rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, marginLeft: '0.75rem' }}>ADMIN</span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {activeTab !== 'dashboard' && (
                <button onClick={() => { setActiveTab('dashboard'); setSelectedTeamId(null); }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'background 0.2s' }}
                >← Dashboard</button>
              )}
              <button onClick={handleLogout}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'background 0.2s' }}
              >Logout</button>
            </div>
          </div>
        </div>

        {/* ── CONTENT AREA ── */}
        <div className="mfgContent" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>

          {/* ════════════════ DASHBOARD ════════════════ */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="mfgBanner" style={{
                background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(3,7,18,0.95) 55%, rgba(220,0,0,0.25) 100%)',
                borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem',
                border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', gap: '1.5rem'
              }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #dc0000 0%, #b30000 100%)',
                  border: '2px solid rgba(239,68,68,0.6)', boxShadow: '0 6px 18px rgba(239,68,68,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0
                }}>🏭</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#f9fafb' }}>
                    Welcome, {manufacturer.companyName}
                  </h2>
                  <p style={{ margin: '0.5rem 0 0 0', color: '#9ca3af', fontSize: '0.95rem' }}>
                    {loading ? 'Loading data...' : `${totalTeams} teams · ${totalPlayers} paid players`}
                  </p>
                </div>
              </div>

              <div className="mfgDashboardGrid" style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.5rem', marginBottom: '2rem'
              }}>
                <div className="mfgDashboardCard" onClick={() => setActiveTab('teams')}
                  onMouseEnter={applyHover} onMouseLeave={removeHover}
                  style={{
                    background: '#111827', padding: '1.5rem', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                  }}>
                  <ShineEffect />
                  <div style={{
                    width: '48px', height: '48px', marginBottom: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '12px', color: '#f87171', background: 'rgba(239, 68, 68, 0.14)', border: '1px solid rgba(239, 68, 68, 0.35)'
                  }}>{icons.kit}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f9fafb', marginBottom: '0.25rem' }}>
                    Teams & Kits
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#9ca3af', fontWeight: '600' }}>
                    {loading ? 'Loading...' : `${totalTeams} teams · ${totalPlayers} players`}
                  </div>
                </div>

                <div className="mfgDashboardCard" onClick={() => setActiveTab('settings')}
                  onMouseEnter={applyHover} onMouseLeave={removeHover}
                  style={{
                    background: '#111827', padding: '1.5rem', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                  }}>
                  <ShineEffect />
                  <div style={{
                    width: '48px', height: '48px', marginBottom: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '12px', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.14)', border: '1px solid rgba(251, 191, 36, 0.35)'
                  }}>{icons.settings}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f9fafb', marginBottom: '0.25rem' }}>
                    Account Settings
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#9ca3af', fontWeight: '600' }}>
                    Manage your account
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ TEAMS LIST ════════════════ */}
          {activeTab === 'teams' && (
            <div>
              <div className="mfgTeamsHeaderRow" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem'
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#f9fafb' }}>
                    Teams & Kit Specifications
                  </h2>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.85rem' }}>
                    {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''}
                    {searchQuery ? ` matching "${searchQuery}"` : ''} · {totalPlayers} paid players total
                  </p>
                </div>
              </div>

              {/* Search bar */}
              <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <div style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>
                  {icons.search}
                </div>
                <input
                  type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search teams or kit designs..."
                  style={{
                    width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem',
                    background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: '#f1f5f9', fontSize: '0.9rem',
                    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(220,0,0,0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              {loading && (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                  Loading team data...
                </div>
              )}

              {/* Team cards grid */}
              {!loading && filteredTeams.length > 0 && (
                <div className="mfgTeamGrid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '1.25rem'
                }}>
                  {filteredTeams.map(team => renderTeamListCard(team))}
                </div>
              )}

              {!loading && filteredTeams.length === 0 && (
                <div style={{
                  padding: '3rem', textAlign: 'center', background: '#111827',
                  borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    {searchQuery ? `No teams matching "${searchQuery}"` : 'No teams found'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════ TEAM DETAIL PAGE ════════════════ */}
          {activeTab === 'teamDetail' && renderTeamDetail()}

          {/* ════════════════ ACCOUNT SETTINGS ════════════════ */}
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
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ─── RESPONSIVE STYLES ─── */}
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
          .mfgKitRow { grid-template-columns: 1fr !important; }
          .mfgTeamsHeaderRow { flex-direction: column !important; align-items: flex-start !important; }
          .mfgTeamBanner { flex-direction: column !important; text-align: center !important; }
          .mfgTeamGrid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .mfgDashboardCard {
            background: linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(3,7,18,0.98) 60%, rgba(220,0,0,0.45) 100%) !important;
            border: 1px solid rgba(239,68,68,0.55) !important;
            box-shadow: 0 14px 34px rgba(220,0,0,0.35), 0 0 20px rgba(255,255,255,0.2) !important;
          }
        }
        @media (max-width: 480px) {
          table { font-size: 0.78rem !important; }
          table th, table td { padding: 0.45rem 0.5rem !important; }
        }
      `}</style>
    </>
  );
}

// ── Shared table styles ──
const thStyle = {
  padding: '0.7rem 1rem', textAlign: 'left',
  color: '#94a3b8', fontWeight: '700', fontSize: '0.76rem',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid rgba(255,255,255,0.08)'
};

const tdStyle = {
  padding: '0.6rem 1rem', color: '#e2e8f0'
};
