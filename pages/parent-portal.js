import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function ParentPortal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminViewTab, setAdminViewTab] = useState('directory');
  const [allCustomers, setAllCustomers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showDirectory, setShowDirectory] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previousProfile, setPreviousProfile] = useState(null);
  const [previousOrders, setPreviousOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState('email');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [team, setTeam] = useState(null);
  const [ageGroupTab, setAgeGroupTab] = useState(null);
  const [parentPlayers, setParentPlayers] = useState([]);
  const [parentTeams, setParentTeams] = useState({});

  const statusColors = {
    pending: '#f59e0b',
    confirmed: '#3b82f6',
    in_production: '#8b5cf6',
    delivered_to_manager: '#10b981',
    cancelled: '#ef4444',
    // Legacy fallbacks
    processing: '#3b82f6',
    shipped: '#8b5cf6',
    delivered: '#10b981'
  };

  const statusColorsOnDark = {
    pending: { bg: 'rgba(245,158,11,0.18)', text: '#fcd34d' },
    confirmed: { bg: 'rgba(59,130,246,0.15)', text: '#93c5fd' },
    in_production: { bg: 'rgba(139,92,246,0.15)', text: '#c4b5fd' },
    delivered_to_manager: { bg: 'rgba(16,185,129,0.15)', text: '#6ee7b7' },
    cancelled: { bg: 'rgba(239,68,68,0.2)', text: '#fca5a5' },
    // Legacy fallbacks
    processing: { bg: 'rgba(59,130,246,0.15)', text: '#93c5fd' },
    shipped: { bg: 'rgba(139,92,246,0.15)', text: '#c4b5fd' },
    delivered: { bg: 'rgba(16,185,129,0.15)', text: '#6ee7b7' }
  };

  const formatStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      in_production: 'In Production',
      delivered_to_manager: 'Delivered to Team Manager',
      cancelled: 'Cancelled',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered'
    };
    return labels[status] || status;
  };

  // Portal icons (matching team-portal SVG style)
  const portalIcons = {
    profile: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    ),
    orders: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    ),
    tracking: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
        <rect x="1" y="6" width="22" height="12" rx="2" />
        <path d="M1 10h22M8 6v12" />
      </svg>
    ),
    players: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0" />
        <circle cx="19" cy="7" r="3" />
        <path d="M22 21a5 5 0 0 0-6-4.9" />
      </svg>
    )
  };

  // Dashboard card hover effect (matching team-portal)
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });
      const result = await res.json();
      if (result.authenticated) {
        setProfile(result.profile);
        const ordersRes = await fetch(`/api/orders?email=${encodeURIComponent(email)}`);
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
        setActiveTab('dashboard');
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    }
  };

  // Fetch team data when profile.teamId is available
  useEffect(() => {
    if (!profile?.teamId) {
      setTeam(null);
      return;
    }
    const fetchTeam = async () => {
      try {
        const res = await fetch(`/api/teams?id=${profile.teamId}`);
        if (res.ok) {
          const data = await res.json();
          setTeam(data.team || null);
        }
      } catch (err) {
        console.error('Failed to fetch team:', err);
      }
    };
    fetchTeam();
  }, [profile?.teamId]);

  // Fetch parent's players by email (across all teams)
  useEffect(() => {
    if (!profile?.email) {
      setParentPlayers([]);
      setParentTeams({});
      return;
    }
    const fetchParentPlayers = async () => {
      try {
        const res = await fetch(`/api/team-players?email=${encodeURIComponent(profile.email)}`);
        if (res.ok) {
          const data = await res.json();
          const players = data.players || [];
          setParentPlayers(players);

          // For each unique teamId, fetch the full team (so we get all players in those teams)
          const uniqueTeamIds = [...new Set(players.map(p => p.teamId).filter(Boolean))];
          const teamsMap = {};
          await Promise.all(uniqueTeamIds.map(async (tid) => {
            try {
              const tRes = await fetch(`/api/teams?id=${tid}`);
              if (tRes.ok) {
                const tData = await tRes.json();
                teamsMap[tid] = tData.team || null;
              }
            } catch (e) { /* skip */ }
          }));
          setParentTeams(teamsMap);
        }
      } catch (err) {
        console.error('Failed to fetch parent players:', err);
      }
    };
    fetchParentPlayers();
  }, [profile?.email]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const adminBypass = urlParams.get('admin') === 'true';

    if (adminBypass) {
      setIsAdminMode(true);
      setShowDirectory(true);
      setAdminViewTab('directory');
      const loadCustomers = async () => {
        try {
          const [custRes, teamsRes] = await Promise.all([
            fetch('/api/customers'),
            fetch('/api/teams?linkedOnly=true')
          ]);
          if (custRes.ok) {
            const data = await custRes.json();
            const list = Array.isArray(data.customers) ? data.customers : [];
            setAllCustomers(list);
          }
          if (teamsRes.ok) {
            const teamsData = await teamsRes.json();
            const list = Array.isArray(teamsData) ? teamsData : (teamsData.teams || []);
            setAllTeams(list);
          }
        } catch (err) {
          console.error('Failed to load customers:', err);
        }
      };
      loadCustomers();
    }
  }, []);

  const handleCustomerSelect = async (customer) => {
    setIsPreviewMode(false);
    setSelectedCustomerId(customer.id);
    setProfile(customer);
    try {
      const ordersRes = await fetch(`/api/orders?email=${encodeURIComponent(customer.email)}`);
      const ordersData = await ordersRes.json();
      setOrders(ordersData.orders || []);
    } catch (err) {
      console.error('Error loading orders:', err);
      setOrders([]);
    }
    setShowDirectory(false);
    setAdminViewTab('profile');
    setActiveTab('dashboard');
  };

  const previewProfile = {
    id: null,
    firstName: 'Preview',
    lastName: 'Customer',
    email: 'preview@winterleaguecricket.co.za',
    phone: '0800000000',
    createdAt: new Date().toISOString()
  };

  const enterPreviewMode = () => {
    if (!isPreviewMode) {
      setPreviousProfile(profile);
      setPreviousOrders(orders);
    }
    setIsPreviewMode(true);
    setProfile(previewProfile);
    setOrders([]);
    setSelectedCustomerId(null);
  };

  const exitPreviewMode = () => {
    if (isPreviewMode) {
      setIsPreviewMode(false);
      setProfile(previousProfile);
      setOrders(previousOrders);
      if (previousProfile?.id) {
        setSelectedCustomerId(previousProfile.id);
      }
    }
  };

  const handleAdminTabChange = (tab) => {
    if (tab === 'profile' && !selectedCustomerId && !previousProfile) return;
    setAdminViewTab(tab);
    if (tab === 'preview') {
      enterPreviewMode();
      setShowDirectory(false);
      setActiveTab('dashboard');
    } else if (tab === 'directory') {
      exitPreviewMode();
      setShowDirectory(true);
    } else {
      exitPreviewMode();
      setShowDirectory(false);
      setActiveTab('dashboard');
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    
    if (resetStep === 'email') {
      try {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate-reset-code', email: resetEmail })
        });
        const result = await res.json();
        if (!result.success) {
          setResetError(result.error);
          return;
        }
        setGeneratedCode(result.code);
        setResetMessage(`A 6-digit verification code has been sent to ${resetEmail}. Please check your email.`);
        setResetStep('verification');
      } catch (err) {
        setResetError('An error occurred. Please try again.');
      }
    } else if (resetStep === 'verification') {
      if (verificationCode.length !== 6) {
        setResetError('Please enter the 6-digit verification code.');
        return;
      }
      setResetMessage('');
      setResetStep('newPassword');
    } else if (resetStep === 'newPassword') {
      if (newPassword !== confirmPassword) {
        setResetError('Passwords do not match.');
        return;
      }
      if (newPassword.length < 6) {
        setResetError('Password must be at least 6 characters long.');
        return;
      }
      try {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset-password', email: resetEmail, newPassword, verificationCode })
        });
        const result = await res.json();
        if (result.success) {
          setResetMessage('Password reset successful! You can now login with your new password.');
          setTimeout(() => {
            setShowForgotPassword(false);
            setResetStep('email');
            setResetEmail('');
            setVerificationCode('');
            setNewPassword('');
            setConfirmPassword('');
            setResetMessage('');
            setResetError('');
            setGeneratedCode('');
          }, 3000);
        } else {
          setResetError(result.error);
        }
      } catch (err) {
        setResetError('An error occurred. Please try again.');
      }
    }
  };

  const cancelForgotPassword = () => {
    setShowForgotPassword(false);
    setResetStep('email');
    setResetEmail('');
    setVerificationCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetMessage('');
    setResetError('');
    setGeneratedCode('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `R ${amount.toFixed(2)}`;
  };

  // Shine Effect Component (matching team-portal)
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

  // ========================================
  // LOGIN SCREEN (not logged in, not admin)
  // ========================================
  if (!profile && !isAdminMode) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #dc0000 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <Head>
          <title>Parent Portal - Winter League Cricket</title>
        </Head>

        <div style={{
          background: 'white',
          padding: '2.5rem',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          maxWidth: '450px',
          width: '100%'
        }}>
          <h2 style={{
            marginTop: 0,
            fontSize: '2rem',
            fontWeight: 900,
            marginBottom: '0.25rem',
            background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            WL Parent Portal
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Access your profile and order history
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#374151', fontSize: '0.9rem' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your.email@example.com"
                onFocus={(e) => e.target.style.borderColor = '#dc0000'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#374151', fontSize: '0.9rem' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                onFocus={(e) => e.target.style.borderColor = '#dc0000'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '1rem',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '6px',
                marginBottom: '1rem',
                border: '1px solid #fca5a5',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
            >
              Login
            </button>
          </form>

          <button
            onClick={() => setShowForgotPassword(true)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            style={{
              width: '100%',
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'transparent',
              color: '#dc0000',
              border: '2px solid #dc0000',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
          >
            Forgot Password?
          </button>

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f3f4f6',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.8rem' }}>
              Your account is created automatically when you register a player.
            </p>
            <a
              href="/team-portal"
              style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                color: '#059669',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none'
              }}
            >
              Looking for the Team Portal? →
            </a>
          </div>
        </div>

        {showForgotPassword && renderForgotPasswordModal()}

        <style jsx global>{`
          body { margin: 0; }
        `}</style>
      </div>
    );
  }

  // ========================================
  // ADMIN DIRECTORY VIEW
  // ========================================
  if (isAdminMode && adminViewTab === 'directory') {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0b0b' }}>
        <Head>
          <title>Parent Portal - Admin Preview</title>
        </Head>

        <div className="parentPortalHeader" style={{
          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
          color: 'white',
          padding: '1rem 2rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>WL Parent Portal</h1>
              <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>
                Admin Mode
                <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0.15rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, marginLeft: '0.75rem' }}>ADMIN</span>
              </p>
            </div>
            <a
              href="/admin/profile"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '0.9rem'
              }}
            >
              ← Back to Admin
            </a>
          </div>
        </div>

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
          <div style={{
            background: '#0f0f0f',
            borderRadius: '16px',
            padding: '1rem 1.75rem',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[
                { key: 'directory', label: 'Directory' },
                { key: 'preview', label: 'Preview' },
                { key: 'profile', label: 'Selected Customer' }
              ].map((tab) => {
                const isDisabled = tab.key === 'profile' && !selectedCustomerId;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleAdminTabChange(tab.key)}
                    disabled={isDisabled}
                    style={{
                      padding: '0.55rem 1.2rem',
                      background: adminViewTab === tab.key ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' : 'rgba(255,255,255,0.08)',
                      color: adminViewTab === tab.key ? '#ffffff' : '#e5e7eb',
                      border: 'none',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.5 : 1
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{
            background: '#0b0b0b',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            overflow: 'hidden',
            border: '1px solid rgba(220,0,0,0.3)'
          }}>
            <div style={{
              padding: '1.5rem 1.75rem',
              background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
              color: '#ffffff',
              fontWeight: '900',
              fontSize: '1.4rem',
              borderBottom: '1px solid rgba(255,255,255,0.2)'
            }}>
              Customer Directory
              <span style={{
                fontSize: '0.85rem',
                fontWeight: '700',
                color: '#ffffff',
                marginLeft: '0.75rem',
                background: 'rgba(0,0,0,0.4)',
                padding: '0.3rem 0.85rem',
                borderRadius: '999px'
              }}>
                {allCustomers.length} customers
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Customer', 'Email', 'Phone', 'Team', 'Member Since', 'Orders'].map((label) => (
                      <th key={label} style={{
                        background: '#111827',
                        padding: '1.25rem',
                        textAlign: 'left',
                        fontWeight: '800',
                        color: '#ffffff',
                        borderBottom: '1px solid rgba(220,0,0,0.4)',
                        textTransform: 'uppercase',
                        fontSize: '0.85rem',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allCustomers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '1.5rem', color: '#9ca3af', textAlign: 'center' }}>
                        No customers found.
                      </td>
                    </tr>
                  )}
                  {allCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220,0,0,0.12)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#f3f4f6', fontWeight: '700' }}>
                        {customer.firstName || 'Customer'} {customer.lastName || ''}
                      </td>
                      <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                        {customer.email || '\u2014'}
                      </td>
                      <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                        {customer.phone || '\u2014'}
                      </td>
                      <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {(() => {
                          if (!customer.teamId) return <span style={{ color: '#6b7280' }}>\u2014</span>;
                          const t = allTeams.find(t => t.id === customer.teamId);
                          return t ? (
                            <span style={{
                              display: 'inline-block',
                              background: 'rgba(239,68,68,0.12)',
                              color: '#f87171',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              border: '1px solid rgba(239,68,68,0.25)',
                              whiteSpace: 'nowrap'
                            }}>
                              {t.teamName || t.team_name || 'Team #' + customer.teamId}
                            </span>
                          ) : <span style={{ color: '#6b7280' }}>Team #{customer.teamId}</span>;
                        })()}
                      </td>
                      <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                        {customer.createdAt ? formatDate(customer.createdAt) : '\u2014'}
                      </td>
                      <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                        {customer.orders ? customer.orders.length : 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {renderResponsiveStyles()}
      </div>
    );
  }

  // ========================================
  // MAIN PORTAL (logged in OR admin profile)
  // ========================================
  return (
    <div style={{ minHeight: '100vh', background: '#0b0b0b' }}>
      <Head>
        <title>{isAdminMode ? 'Parent Portal - Admin' : 'My Profile'} - Winter League Cricket</title>
      </Head>

      <div className="parentPortalHeader" style={{
        background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
        color: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>
              WL Parent Portal {profile ? ('\u00B7 ' + profile.firstName) : ''}
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>
              {profile ? profile.email : ''}
              {isAdminMode && (
                <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0.15rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, marginLeft: '0.75rem' }}>ADMIN</span>
              )}
              {isPreviewMode && (
                <span style={{ background: 'rgba(255,255,255,0.25)', padding: '0.25rem 0.85rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, marginLeft: '0.5rem' }}>PREVIEW</span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {isAdminMode && (
              <select
                value={selectedCustomerId || ''}
                onChange={(e) => {
                  const cust = allCustomers.find(c => c.id == e.target.value);
                  if (cust) handleCustomerSelect(cust);
                }}
                style={{
                  background: '#111827',
                  color: '#f9fafb',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  minWidth: '220px'
                }}
              >
                <option value="">Select Customer...</option>
                {allCustomers.map(c => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.email}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => {
                if (isAdminMode) {
                  setShowDirectory(true);
                  setAdminViewTab('directory');
                  setProfile(null);
                  setOrders([]);
                  setSelectedCustomerId(null);
                  setActiveTab('dashboard');
                  return;
                }
                setProfile(null);
                setOrders([]);
                setEmail('');
                setPassword('');
                setError('');
                setActiveTab('dashboard');
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              {isAdminMode ? '\u2190 Directory' : 'Logout'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {isAdminMode && (
          <div style={{
            background: '#0f0f0f',
            borderRadius: '16px',
            padding: '1rem 1.75rem',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[
                { key: 'directory', label: 'Directory' },
                { key: 'preview', label: 'Preview' },
                { key: 'profile', label: 'Selected Customer' }
              ].map((tab) => {
                const isDisabled = tab.key === 'profile' && !selectedCustomerId && !previousProfile;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleAdminTabChange(tab.key)}
                    disabled={isDisabled}
                    style={{
                      padding: '0.55rem 1.2rem',
                      background: adminViewTab === tab.key ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' : 'rgba(255,255,255,0.08)',
                      color: adminViewTab === tab.key ? '#ffffff' : '#e5e7eb',
                      border: 'none',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.5 : 1
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="parentBanner" style={{
          background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(3,7,18,0.95) 55%, rgba(220,0,0,0.25) 100%)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '1.5rem',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          {(() => {
            const logoUrl = team?.teamLogo || team?.submissionData?.teamLogo || team?.submissionData?.['22'] || team?.submissionData?.[22] || '';
            return logoUrl ? (
              <img
                src={logoUrl}
                alt={team?.teamName || 'Team logo'}
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(239,68,68,0.6)',
                  boxShadow: '0 6px 18px rgba(239,68,68,0.35)',
                  flexShrink: 0,
                  background: '#111827'
                }}
              />
            ) : (
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #dc0000 0%, #b30000 100%)',
                border: '2px solid rgba(239,68,68,0.6)',
                boxShadow: '0 6px 18px rgba(239,68,68,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                flexShrink: 0
              }}>
                👤
              </div>
            );
          })()}
          <div>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#f9fafb' }}>
              Welcome back, {profile.firstName}!
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#9ca3af', fontSize: '0.95rem' }}>
              {team?.teamName ? `${team.teamName} · ${profile.email}` : profile.email}
            </p>
            {isPreviewMode && (
              <span style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                padding: '0.3rem 0.85rem',
                background: 'rgba(245,158,11,0.18)',
                color: '#fcd34d',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'uppercase'
              }}>
                Preview Mode
              </span>
            )}
          </div>
        </div>

        {/* Back to Dashboard */}
        {activeTab !== 'dashboard' && (
          <button
            onClick={() => setActiveTab('dashboard')}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(220,0,0,0.5)'; e.currentTarget.style.background = 'rgba(220,0,0,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'transparent'; }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.2rem',
              background: 'transparent',
              color: '#f9fafb',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              marginBottom: '1.5rem',
              transition: 'all 0.2s'
            }}
          >
            ← Back to Dashboard
          </button>
        )}

        {/* DASHBOARD (card navigation) */}
        {activeTab === 'dashboard' && (
          <div className="parentDashboardGrid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* My Profile Card */}
            <div
              className="parentDashboardCard"
              onClick={() => setActiveTab('profile')}
              onMouseEnter={applyDashboardCardHover}
              onMouseLeave={removeDashboardCardHover}
              style={{
                background: '#111827',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <ShineEffect />
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(96,165,250,0.14)',
                border: '1px solid rgba(96,165,250,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                color: '#60a5fa'
              }}>
                {portalIcons.profile}
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#f9fafb' }}>
                My Profile
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', fontWeight: 600 }}>
                View your personal details and account info
              </p>
            </div>

            {/* My Orders Card */}
            <div
              className="parentDashboardCard"
              onClick={() => setActiveTab('orders')}
              onMouseEnter={applyDashboardCardHover}
              onMouseLeave={removeDashboardCardHover}
              style={{
                background: '#111827',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <ShineEffect />
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(248,113,113,0.14)',
                border: '1px solid rgba(248,113,113,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                color: '#f87171'
              }}>
                {portalIcons.orders}
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#f9fafb' }}>
                My Orders
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', fontWeight: 600 }}>
                View order history & kit status
              </p>
              {orders.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(248,113,113,0.2)',
                  color: '#f87171',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  {orders.length}
                </span>
              )}
            </div>

            {/* Team Portal Card */}
            {(() => {
              const myPlayers = parentPlayers.filter(p => p.teamId && p.subTeam);
              const mySubTeams = [...new Set(myPlayers.map(p => p.subTeam).filter(Boolean))];
              return (
                <div
                  className="parentDashboardCard"
                  onClick={() => {
                    setAgeGroupTab(mySubTeams[0] || null);
                    setActiveTab('teamView');
                  }}
                  onMouseEnter={applyDashboardCardHover}
                  onMouseLeave={removeDashboardCardHover}
                  style={{
                    background: '#111827',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <ShineEffect />
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(52,211,153,0.14)',
                    border: '1px solid rgba(52,211,153,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    color: '#34d399'
                  }}>
                    {portalIcons.players}
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#f9fafb' }}>
                    Team Portal
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', fontWeight: 600 }}>
                    View your players & their team rosters
                  </p>
                  {mySubTeams.length > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      background: 'rgba(52,211,153,0.2)',
                      color: '#34d399',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '999px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      {mySubTeams.length} {mySubTeams.length === 1 ? 'team' : 'teams'}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* TEAM PORTAL VIEW */}
        {activeTab === 'teamView' && (() => {
          const myPlayers = parentPlayers.filter(p => p.teamId && p.subTeam);
          const mySubTeams = [...new Set(myPlayers.map(p => p.subTeam).filter(Boolean))];

          // Build grouped data for ALL sub-teams the parent's children are in
          const groups = mySubTeams.map(stName => {
            const playerInSt = myPlayers.find(p => p.subTeam === stName);
            const teamData = playerInSt ? parentTeams[playerInSt.teamId] : null;
            const ageGroupTeams = teamData?.ageGroupTeams || teamData?.subTeams || playerInSt?.ageGroupTeams || [];
            const info = ageGroupTeams.find(ag => ag.teamName === stName) || {};
            const allTeamPlayers = teamData?.players || teamData?.teamPlayers || [];
            const players = allTeamPlayers.filter(p => p.subTeam === stName);
            return { name: stName, info, players, teamName: teamData?.teamName || playerInSt?.teamName || '' };
          });

          if (myPlayers.length === 0) {
            return (
              <div style={{
                background: '#111827',
                borderRadius: '12px',
                padding: '3rem',
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#f9fafb' }}>
                  No Players Registered Yet
                </p>
                <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                  Once your players are registered and assigned to a team, their roster will appear here.
                </p>
              </div>
            );
          }

          return (
            <div>
              {/* Player sub-tabs - one per child */}
              {myPlayers.length > 1 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  {myPlayers.map((player, idx) => {
                    const isActive = ageGroupTab === player.subTeam;
                    const teamData = player.teamId ? parentTeams[player.teamId] : null;
                    const logoUrl = teamData?.teamLogo || teamData?.submissionData?.teamLogo || teamData?.submissionData?.['22'] || teamData?.submissionData?.[22] || '';
                    return (
                      <button
                        key={player.id || idx}
                        type="button"
                        onClick={() => setAgeGroupTab(player.subTeam)}
                        style={{
                          background: '#111827',
                          padding: '1.5rem',
                          borderRadius: '12px',
                          border: isActive
                            ? '1px solid rgba(248, 113, 113, 0.7)'
                            : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: isActive
                            ? '0 12px 24px rgba(220, 0, 0, 0.25)'
                            : '0 1px 3px rgba(0,0,0,0.4)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                          overflow: 'hidden',
                          color: '#ffffff'
                        }}
                        onMouseEnter={applyDashboardCardHover}
                        onMouseLeave={removeDashboardCardHover}
                      >
                        <span
                          data-card-shine="true"
                          style={{
                            position: 'absolute',
                            top: '-50%',
                            left: '-120%',
                            width: '60%',
                            height: '200%',
                            background: 'linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
                            transform: 'skewX(-20deg)',
                            transition: 'left 0.5s ease',
                            pointerEvents: 'none'
                          }}
                        />
                        <div style={{
                          width: '48px',
                          height: '48px',
                          marginBottom: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '2px solid rgba(239,68,68,0.5)',
                          background: '#1f2937',
                          flexShrink: 0
                        }}>
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt="Team logo"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '1.4rem' }}>🏏</span>
                          )}
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f9fafb', marginBottom: '0.25rem' }}>
                          {player.playerName || player.name || 'Player'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: '600' }}>
                          {player.subTeam}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Stacked sub-team sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {groups
                  .filter(g => !ageGroupTab || g.name === ageGroupTab)
                  .map(group => (
                  <div key={group.name} style={{
                    background: '#111827',
                    borderRadius: '12px',
                    border: '2px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden'
                  }}>
                    {/* Red gradient header */}
                    <div style={{
                      background: 'linear-gradient(135deg, #dc0000 0%, #b30000 100%)',
                      padding: '1rem 1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h3 style={{
                          fontSize: '1.15rem',
                          fontWeight: '700',
                          color: 'white',
                          margin: 0,
                          marginBottom: '0.25rem'
                        }}>
                          {group.name}
                        </h3>
                        {(group.info.gender || group.info.ageGroup) && (
                          <div style={{
                            fontSize: '0.85rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            display: 'flex',
                            gap: '1rem'
                          }}>
                            {group.info.gender && <span>👤 {group.info.gender}</span>}
                            {group.info.ageGroup && <span>📋 {group.info.ageGroup}</span>}
                          </div>
                        )}
                        {group.teamName && (
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.25rem' }}>
                            🏏 {group.teamName}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          color: 'white'
                        }}>
                          {group.players.length} {group.players.length === 1 ? 'Player' : 'Players'}
                        </div>
                        {group.players.length < 15 && (
                          <div style={{
                            background: '#fbbf24',
                            padding: '0.4rem 0.85rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            color: '#78350f',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            ⚠️ {15 - group.players.length} more needed
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Warning alert if less than 15 */}
                    {group.players.length < 15 && (
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.45) 0%, rgba(76, 5, 25, 0.55) 100%)',
                        borderLeft: '4px solid #f87171',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <div style={{ fontSize: '1.25rem', lineHeight: 1 }}>⚠️</div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fee2e2' }}>
                            Minimum 15 players required •
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#fecaca', marginLeft: '0.5rem' }}>
                            Currently <strong>{group.players.length}</strong> registered • <strong>{15 - group.players.length} more</strong> needed
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Players table (read-only) */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#0f172a' }}>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>#</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>Name</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>Roles</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>Shirt No.</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.players.length === 0 ? (
                            <tr>
                              <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.95rem' }}>
                                No players registered yet
                              </td>
                            </tr>
                          ) : (
                            group.players.map((player, index) => {
                              const isMyPlayer = (player.playerEmail || '').toLowerCase() === (profile?.email || '').toLowerCase();
                              return (
                                <tr key={player.id || index} style={{
                                  borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                                  background: isMyPlayer ? 'rgba(220, 0, 0, 0.08)' : 'transparent',
                                  borderLeft: isMyPlayer ? '3px solid rgba(220, 0, 0, 0.6)' : '3px solid transparent'
                                }}>
                                  <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                                    {index + 1}
                                  </td>
                                  <td style={{ padding: '0.75rem', fontSize: '0.95rem', color: isMyPlayer ? '#fca5a5' : '#f9fafb', fontWeight: '600' }}>
                                    {player.name || player.playerName || '-'}
                                  </td>
                                  <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#e2e8f0' }}>
                                    {(player.roles || player.registrationData?.roles) ? (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {(Array.isArray(player.roles || player.registrationData?.roles)
                                          ? (player.roles || player.registrationData?.roles)
                                          : [player.roles || player.registrationData?.roles]
                                        ).map((role, idx) => (
                                          <span key={idx} style={{
                                            display: 'inline-block',
                                            background: 'rgba(59, 130, 246, 0.2)',
                                            color: '#bfdbfe',
                                            border: '1px solid rgba(59, 130, 246, 0.35)',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                          }}>
                                            {role}
                                          </span>
                                        ))}
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      background: '#1f2937',
                                      padding: '0.25rem 0.75rem',
                                      borderRadius: '6px',
                                      fontWeight: '700',
                                      color: '#f9fafb',
                                      border: '1px solid rgba(255,255,255,0.08)'
                                    }}>
                                      #{player.shirtNumber || player.jerseyNumber || '-'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                                    {player.addedAt || player.createdAt ? new Date(player.addedAt || player.createdAt).toLocaleDateString() : '-'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* PROFILE VIEW */}
        {activeTab === 'profile' && (
          <div style={{
            background: '#111827',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.4rem', fontWeight: 900, color: '#f9fafb' }}>
              Profile Information
            </h3>
            <div className="parentInfoGrid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              {[
                { label: 'Full Name', value: (profile.firstName || '') + ' ' + (profile.lastName || '') },
                { label: 'Email Address', value: profile.email },
                { label: 'Phone Number', value: profile.phone || '\u2014' },
                { label: 'Member Since', value: profile.createdAt ? formatDate(profile.createdAt) : '\u2014' }
              ].map((item, idx) => (
                <div key={idx} style={{
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700 }}>
                    {item.label}
                  </strong>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f9fafb' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDERS VIEW */}
        {activeTab === 'orders' && (
          <div style={{
            background: '#111827',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.4rem', fontWeight: 900, color: '#f9fafb' }}>
              My Orders ({orders.length})
            </h3>

            {/* Kit Production Info Banner */}
            <div style={{
              padding: '1rem 1.25rem',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              lineHeight: '1.6',
              color: '#a5b4fc'
            }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#c7d2fe', fontSize: '1rem' }}>
                ℹ️ How Kit Production Works
              </strong>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                Kits will only go into production once a <strong style={{ color: '#e0e7ff' }}>minimum of 12 players</strong> have registered and paid for your team.
                Once production begins, kits will be delivered directly to your <strong style={{ color: '#e0e7ff' }}>team manager</strong> for distribution — there is no individual shipping.
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#818cf8' }}>
                You will be notified when your kit goes into production and again when it has been delivered to your team manager.
              </p>
            </div>

            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                  You haven't placed any orders yet.
                </p>
                <a href="/premium" style={{
                  display: 'inline-block',
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  transition: 'transform 0.2s'
                }}>
                  Start Shopping
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {orders.map(order => (
                  <div
                    key={order.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(220,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 900, color: '#f9fafb' }}>
                          Order #{order.orderNumber}
                        </h4>
                        <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>
                          Placed on {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '0.4rem 0.85rem',
                          background: (statusColorsOnDark[order.status] || { bg: 'rgba(255,255,255,0.1)' }).bg,
                          color: (statusColorsOnDark[order.status] || { text: '#e5e7eb' }).text,
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          marginBottom: '0.5rem'
                        }}>
                          {formatStatusLabel(order.status)}
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f87171' }}>
                          {formatCurrency(order.total)}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      padding: '1rem',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e7eb' }}>
                        Items ({order.items.length})
                      </strong>
                      {order.items.map((item, idx) => (
                        <div key={idx} style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                          {item.quantity}x {item.name} {item.size ? '(' + item.size + ')' : ''}
                        </div>
                      ))}
                    </div>

                    {/* Kit Status Progress */}
                    {(() => {
                      const steps = [
                        { key: 'confirmed', label: 'Payment Confirmed', icon: '✅' },
                        { key: 'in_production', label: 'In Production', icon: '🏭' },
                        { key: 'delivered_to_manager', label: 'Delivered to Team Manager', icon: '🤝' }
                      ];
                      const statusOrder = ['pending', 'confirmed', 'in_production', 'delivered_to_manager'];
                      const currentIdx = statusOrder.indexOf(order.status);
                      
                      if (order.status === 'cancelled') {
                        return (
                          <div style={{
                            padding: '1rem',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            fontSize: '0.9rem',
                            color: '#fca5a5'
                          }}>
                            This order has been cancelled.
                          </div>
                        );
                      }
                      
                      return (
                        <div style={{
                          padding: '1rem',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          marginBottom: '1rem'
                        }}>
                          <strong style={{ display: 'block', marginBottom: '0.75rem', color: '#e5e7eb', fontSize: '0.9rem' }}>
                            Kit Progress
                          </strong>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {steps.map((step, idx) => {
                              const stepIdx = statusOrder.indexOf(step.key);
                              const isComplete = currentIdx >= stepIdx;
                              const isCurrent = order.status === step.key;
                              return (
                                <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {idx > 0 && (
                                    <div style={{
                                      width: '24px', height: '2px',
                                      background: isComplete ? '#6ee7b7' : 'rgba(255,255,255,0.1)'
                                    }} />
                                  )}
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.35rem 0.7rem',
                                    borderRadius: '6px',
                                    background: isCurrent ? (statusColorsOnDark[step.key] || {bg:'rgba(255,255,255,0.1)'}).bg : isComplete ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isCurrent ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
                                    opacity: isComplete ? 1 : 0.4
                                  }}>
                                    <span style={{ fontSize: '0.85rem' }}>{step.icon}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isComplete ? '#e5e7eb' : '#6b7280' }}>
                                      {step.label}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {order.status === 'pending' && (
                            <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#fcd34d' }}>
                              ⏳ Your payment is being verified. Once confirmed, your kit order will be queued for production.
                            </p>
                          )}
                          {order.status === 'confirmed' && (
                            <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#93c5fd' }}>
                              Your payment has been confirmed. Kits go into production once a minimum of 12 players have registered and paid for your team.
                            </p>
                          )}
                          {order.status === 'in_production' && (
                            <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#c4b5fd' }}>
                              🏭 Your team's kits are now being manufactured! They will be delivered to your team manager once ready.
                            </p>
                          )}
                          {order.status === 'delivered_to_manager' && (
                            <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#6ee7b7' }}>
                              🤝 Your kit has been delivered to your team manager for collection. Please contact them to arrange pick-up.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    <button
                      onClick={() => setSelectedOrder(order)}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        transition: 'transform 0.2s'
                      }}
                    >
                      View Full Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <>
          <div
            onClick={() => setSelectedOrder(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)', zIndex: 999, backdropFilter: 'blur(5px)'
            }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%', maxWidth: '800px', maxHeight: '90vh',
            overflowY: 'auto', zIndex: 1000
          }}>
            <div style={{
              background: '#111827',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.5rem 2rem',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: 'white',
                borderRadius: '16px 16px 0 0'
              }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                  Order #{selectedOrder.orderNumber}
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                    fontSize: '1.5rem', width: '36px', height: '36px', borderRadius: '8px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '2rem' }}>
                <section style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900, color: '#f9fafb' }}>
                    Order Items
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Product', 'Size', 'Qty', 'Price', 'Total'].map((h, i) => (
                            <th key={h} style={{
                              padding: '0.75rem',
                              textAlign: i >= 2 ? (i === 2 ? 'center' : 'right') : 'left',
                              fontWeight: 700,
                              color: '#94a3b8',
                              borderBottom: '1px solid rgba(255,255,255,0.1)',
                              fontSize: '0.85rem',
                              textTransform: 'uppercase'
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.75rem', color: '#f9fafb' }}>{item.name}</td>
                            <td style={{ padding: '0.75rem', color: '#9ca3af' }}>{item.size || '-'}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: '#9ca3af' }}>{item.quantity}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#9ca3af' }}>{formatCurrency(item.price)}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#f9fafb' }}>
                              {formatCurrency(item.price * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          <td colSpan="4" style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#94a3b8' }}>Subtotal:</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#f9fafb' }}>{formatCurrency(selectedOrder.subtotal)}</td>
                        </tr>

                        <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <td colSpan="4" style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: '#f9fafb' }}>Total:</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 900, fontSize: '1.1rem', color: '#f87171' }}>{formatCurrency(selectedOrder.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>



                {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                  <section>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900, color: '#f9fafb' }}>
                      Order Status History
                    </h3>
                    <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                      <div style={{
                        position: 'absolute', left: '8px', top: 0, bottom: 0,
                        width: '2px', background: 'rgba(255,255,255,0.1)'
                      }} />
                      {selectedOrder.statusHistory.map((history, idx) => (
                        <div key={idx} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                          <div style={{
                            position: 'absolute', left: '-2rem', top: '4px',
                            width: '20px', height: '20px',
                            background: statusColors[history.status],
                            border: '3px solid #111827',
                            borderRadius: '50%',
                            boxShadow: '0 0 0 3px rgba(255,255,255,0.1)'
                          }} />
                          <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.06)'
                          }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.3rem 0.75rem',
                                background: (statusColorsOnDark[history.status] || { bg: 'rgba(255,255,255,0.1)' }).bg,
                                color: (statusColorsOnDark[history.status] || { text: '#e5e7eb' }).text,
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}>
                                {formatStatusLabel(history.status)}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                              {formatDate(history.timestamp)}
                            </div>
                            {history.notes && (
                              <div style={{ fontSize: '0.9rem', color: '#d1d5db', fontStyle: 'italic' }}>
                                {history.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showForgotPassword && renderForgotPasswordModal()}

      {renderResponsiveStyles()}
    </div>
  );

  // ========================================
  // FORGOT PASSWORD MODAL (dark themed)
  // ========================================
  function renderForgotPasswordModal() {
    return (
      <>
        <div
          onClick={cancelForgotPassword}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 999, backdropFilter: 'blur(5px)'
          }}
        />
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%', maxWidth: '500px', zIndex: 1000
        }}>
          <div style={{
            background: '#111827',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.5rem 2rem',
              background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
              color: 'white'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Reset Password</h2>
              <button
                onClick={cancelForgotPassword}
                style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                  fontSize: '1.5rem', width: '36px', height: '36px', borderRadius: '8px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '2rem' }}>
              {resetMessage ? (
                <div style={{
                  padding: '1.5rem',
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                  <p style={{ margin: 0, color: '#6ee7b7', fontWeight: 700, fontSize: '1.1rem' }}>
                    {resetMessage}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit}>
                  {resetStep === 'email' ? (
                    <>
                      <p style={{ marginTop: 0, marginBottom: '1.5rem', color: '#9ca3af' }}>
                        Enter your email address and we'll help you reset your password.
                      </p>
                      {resetError && (
                        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600 }}>
                          {resetError}
                        </div>
                      )}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.85rem' }}>Email Address</label>
                        <input
                          type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required
                          placeholder="your.email@example.com"
                          style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontSize: '1rem', fontFamily: 'inherit', color: '#f9fafb', boxSizing: 'border-box' }}
                        />
                      </div>
                      <button type="submit" style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
                        Continue
                      </button>
                    </>
                  ) : resetStep === 'verification' ? (
                    <>
                      <p style={{ marginTop: 0, marginBottom: '1rem', color: '#9ca3af' }}>
                        Enter the verification code sent to <strong style={{ color: '#f9fafb' }}>{resetEmail}</strong>
                      </p>
                      {generatedCode && (
                        <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.85rem', color: '#93c5fd', fontWeight: 600, marginBottom: '0.5rem' }}>DEMO MODE - Your verification code:</div>
                          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#60a5fa', letterSpacing: '0.3rem' }}>{generatedCode}</div>
                          <div style={{ fontSize: '0.75rem', color: '#93c5fd', marginTop: '0.5rem', fontStyle: 'italic' }}>Valid for 15 minutes</div>
                        </div>
                      )}
                      {resetError && (
                        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600 }}>
                          {resetError}
                        </div>
                      )}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.85rem' }}>Verification Code</label>
                        <input
                          type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} required
                          placeholder="Enter 6-digit code" maxLength="6" pattern="[0-9]{6}"
                          style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontSize: '1.5rem', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.5rem', color: '#f9fafb', boxSizing: 'border-box' }}
                        />
                      </div>
                      <button type="submit" style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginBottom: '0.75rem' }}>
                        Verify Code
                      </button>
                      <button type="button" onClick={() => { setResetStep('email'); setVerificationCode(''); setGeneratedCode(''); setResetError(''); }}
                        style={{ width: '100%', padding: '0.75rem', background: 'transparent', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                        ← Back to Email
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={{ marginTop: 0, marginBottom: '1.5rem', color: '#9ca3af' }}>
                        Create a new password for <strong style={{ color: '#f9fafb' }}>{resetEmail}</strong>
                      </p>
                      {resetError && (
                        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600 }}>
                          {resetError}
                        </div>
                      )}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.85rem' }}>New Password</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Enter new password (min. 6 characters)"
                          style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontSize: '1rem', fontFamily: 'inherit', color: '#f9fafb', boxSizing: 'border-box' }} />
                      </div>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.85rem' }}>Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Re-enter new password"
                          style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontSize: '1rem', fontFamily: 'inherit', color: '#f9fafb', boxSizing: 'border-box' }} />
                      </div>
                      <button type="submit" style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginBottom: '0.75rem' }}>
                        Reset Password
                      </button>
                      <button type="button" onClick={() => { setResetStep('email'); setNewPassword(''); setConfirmPassword(''); setVerificationCode(''); setGeneratedCode(''); setResetError(''); }}
                        style={{ width: '100%', padding: '0.75rem', background: 'transparent', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                        ← Back to Email
                      </button>
                    </>
                  )}
                  <button type="button" onClick={cancelForgotPassword}
                    style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: 'transparent', color: '#6b7280', border: 'none', fontSize: '0.9rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ========================================
  // RESPONSIVE STYLES (matching team-portal)
  // ========================================
  function renderResponsiveStyles() {
    return (
      <style jsx global>{`
        body { margin: 0; }

        @media (max-width: 900px) {
          .parentPortalHeader { padding: 1rem !important; }
        }

        @media (max-width: 768px) {
          .parentPortalHeader {
            padding: 1rem !important;
          }
          .parentPortalHeader > div {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .parentPortalHeader h1 {
            font-size: 1.25rem !important;
          }
          .parentBanner {
            flex-direction: column !important;
            text-align: center !important;
          }
          .parentBanner > div:first-child {
            width: 64px !important;
            height: 64px !important;
            font-size: 1.5rem !important;
          }
          .parentBanner h2 {
            font-size: 1.4rem !important;
          }
          .parentDashboardGrid {
            grid-template-columns: 1fr !important;
          }
          .parentInfoGrid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 600px) {
          .parentDashboardCard {
            background: linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(3,7,18,0.98) 60%, rgba(220,0,0,0.45) 100%) !important;
            border: 1px solid rgba(239,68,68,0.55) !important;
            box-shadow: 0 14px 34px rgba(220,0,0,0.35), 0 0 20px rgba(255,255,255,0.2) !important;
          }
          .parentDashboardCard:active {
            transform: translateY(-2px) scale(0.99) !important;
          }
        }

        @keyframes mobileCardGlow {
          0% { opacity: 0.65; }
          100% { opacity: 1; }
        }
      `}</style>
    );
  }
}
