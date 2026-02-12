import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/channel.module.css';

export default function CustomerProfile() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminViewTab, setAdminViewTab] = useState('directory');
  const [allCustomers, setAllCustomers] = useState([]);
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
  const [resetStep, setResetStep] = useState('email'); // email, verification, or newPassword
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [generatedCode, setGeneratedCode] = useState(''); // For demo purposes only

  const statusColors = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    shipped: '#8b5cf6',
    delivered: '#10b981',
    cancelled: '#ef4444'
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
        // Load orders via API
        const ordersRes = await fetch(`/api/orders?email=${encodeURIComponent(email)}`);
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    }
  };

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
          const res = await fetch('/api/customers');
          if (!res.ok) return;
          const data = await res.json();
          const list = Array.isArray(data.customers) ? data.customers : [];
          setAllCustomers(list);
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
    // Load orders via API
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
    } else if (tab === 'directory') {
      exitPreviewMode();
      setShowDirectory(true);
    } else {
      exitPreviewMode();
      setShowDirectory(false);
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

  if (!profile && !isAdminMode) {
    return (
      <div className={styles.container}>
        <Head>
          <title>My Profile - Winter League Cricket</title>
        </Head>

        <header className={styles.header}>
          <div className={styles.headerContent}>
            <Link href="/" className={styles.logoLink}>
              <h1 className={styles.logo}>Winter League Cricket</h1>
            </Link>
            <nav className={styles.nav}>
              <Link href="/" className={styles.navLink}>Home</Link>
              <Link href="/premium" className={styles.navLink}>Shop</Link>
            </nav>
          </div>
        </header>

        <main className={styles.main}>
          <div style={{ 
            maxWidth: '900px', 
            margin: '4rem auto', 
            padding: '0 1rem'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              alignItems: 'start'
            }}>
              {/* Customer Login */}
              <div style={{ 
                padding: '2rem',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
              }}>
                <h2 style={{ 
                  marginTop: 0, 
                  color: '#000', 
                  fontWeight: 900,
                  fontSize: '1.75rem',
                  marginBottom: '0.5rem'
                }}>
                  Customer Login
                </h2>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  View your orders and tracking information.
                </p>
                
                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem',
                      fontWeight: 700,
                      color: '#1f2937',
                      fontSize: '0.9rem'
                    }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your.email@example.com"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem',
                      fontWeight: 700,
                      color: '#1f2937',
                      fontSize: '0.9rem'
                    }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  {error && (
                    <div style={{
                      padding: '1rem',
                      background: '#fee',
                      color: '#dc0000',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      border: '2px solid #dc0000',
                      fontWeight: 600
                    }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Login
                  </button>
                </form>

                <button
                  onClick={() => setShowForgotPassword(true)}
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
                    cursor: 'pointer'
                  }}
                >
                  Forgot Password?
                </button>

                <p style={{ 
                  marginTop: '1.5rem', 
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '0.8rem'
                }}>
                  Your account is created automatically when you place your first order.
                </p>
              </div>

              {/* Team Portal */}
              <div style={{ 
                padding: '2rem',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                borderTop: '4px solid #059669'
              }}>
                <h2 style={{ 
                  marginTop: 0, 
                  color: '#000', 
                  fontWeight: 900,
                  fontSize: '1.75rem',
                  marginBottom: '0.5rem'
                }}>
                  Team Portal
                </h2>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  For registered teams only. Access your dashboard, fixtures, and squad management.
                </p>

                <Link 
                  href="/team-portal"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    textAlign: 'center',
                    textDecoration: 'none'
                  }}
                >
                  Go to Team Portal
                </Link>

                <p style={{ 
                  marginTop: '1.5rem', 
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '0.8rem'
                }}>
                  Login with your team name or email and password provided during registration.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isAdminMode && adminViewTab === 'directory') {
    return (
      <div className={styles.container}>
        <Head>
          <title>Customer Portal - Admin Preview</title>
        </Head>

        <header className={styles.header}>
          <div className={styles.headerContent}>
            <Link href="/" className={styles.logoLink}>
              <h1 className={styles.logo}>Winter League Cricket</h1>
            </Link>
            <nav className={styles.nav}>
              <Link href="/admin/profile" className={styles.navLink}>Back to Admin</Link>
            </nav>
          </div>
        </header>

        <main className={styles.main}>
          <div style={{ maxWidth: '1200px', margin: '2rem auto 1rem' }}>
            <div style={{
              background: '#0b0b0b',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              border: '1px solid rgba(220, 0, 0, 0.3)',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                padding: '1rem 1.75rem',
                background: '#0f0f0f',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
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
            </div>
          </div>
          <div style={{ maxWidth: '1200px', margin: '2rem auto' }}>
            <div style={{
              background: '#0b0b0b',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              border: '1px solid rgba(220, 0, 0, 0.3)'
            }}>
              <div style={{
                padding: '1.5rem 1.75rem',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '1.4rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                Customer Directory
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginLeft: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.4)',
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
                      {['Customer', 'Email', 'Phone', 'Member Since', 'Orders'].map((label) => (
                        <th key={label} style={{
                          background: '#111827',
                          padding: '1.25rem',
                          textAlign: 'left',
                          fontWeight: '800',
                          color: '#ffffff',
                          borderBottom: '1px solid rgba(220, 0, 0, 0.4)',
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
                        <td colSpan={5} style={{
                          padding: '1.5rem',
                          color: '#9ca3af',
                          textAlign: 'center'
                        }}>
                          No customers found.
                        </td>
                      </tr>
                    )}
                    {allCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220, 0, 0, 0.12)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#f3f4f6', fontWeight: '700' }}>
                          {customer.firstName || 'Customer'} {customer.lastName || ''}
                        </td>
                        <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9ca3af' }}>
                          {customer.email || '—'}
                        </td>
                        <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9ca3af' }}>
                          {customer.phone || '—'}
                        </td>
                        <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9ca3af' }}>
                          {customer.createdAt ? formatDate(customer.createdAt) : '—'}
                        </td>
                        <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9ca3af' }}>
                          {customer.orders ? customer.orders.length : 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>My Profile - Winter League Cricket</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logoLink}>
            <h1 className={styles.logo}>Winter League Cricket</h1>
          </Link>
          <nav className={styles.nav}>
            <Link href="/" className={styles.navLink}>Home</Link>
            <Link href="/premium" className={styles.navLink}>Shop</Link>
            <button 
              onClick={() => {
                if (isAdminMode) {
                  setShowDirectory(true);
                  setAdminViewTab('directory');
                  setProfile(null);
                  setOrders([]);
                  setSelectedCustomerId(null);
                  return;
                }
                setProfile(null);
                setOrders([]);
                setEmail('');
                setPassword('');
                setError('');
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {isAdminMode && (
          <div style={{ maxWidth: '1200px', margin: '2rem auto 1rem' }}>
            <div style={{
              background: '#0b0b0b',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              border: '1px solid rgba(220, 0, 0, 0.3)'
            }}>
              <div style={{
                padding: '1rem 1.75rem',
                background: '#0f0f0f',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
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
            </div>
          </div>
        )}
        {/* Profile Header */}
        <div style={{
          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
          color: 'white',
          padding: '2rem',
          borderRadius: '16px',
          marginBottom: '2rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>
            Welcome back, {profile.firstName}!
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
            {profile.email}
          </p>
          {isPreviewMode && (
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>
              Preview Mode
            </p>
          )}
        </div>

        {/* Profile Info */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '16px',
          marginBottom: '2rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: 900 }}>
            Profile Information
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                Full Name
              </strong>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                {profile.firstName} {profile.lastName}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                Phone Number
              </strong>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                {profile.phone}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                Member Since
              </strong>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                {formatDate(profile.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: 900 }}>
            My Orders ({orders.length})
          </h3>

          {orders.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem', 
              color: '#6b7280' 
            }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                You haven't placed any orders yet.
              </p>
              <Link href="/premium" style={{
                display: 'inline-block',
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Start Shopping
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {orders.map(order => (
                <div 
                  key={order.id}
                  style={{
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    transition: 'all 0.3s'
                  }}
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
                      <h4 style={{ 
                        margin: '0 0 0.5rem 0', 
                        fontSize: '1.2rem',
                        fontWeight: 900 
                      }}>
                        Order #{order.orderNumber}
                      </h4>
                      <p style={{ 
                        margin: 0, 
                        color: '#6b7280',
                        fontSize: '0.9rem'
                      }}>
                        Placed on {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '0.5rem 1rem',
                        background: statusColors[order.status] || '#gray',
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        marginBottom: '0.5rem'
                      }}>
                        {order.status}
                      </div>
                      <div style={{ 
                        fontSize: '1.3rem', 
                        fontWeight: 900,
                        color: '#000'
                      }}>
                        {formatCurrency(order.total)}
                      </div>
                    </div>
                  </div>

                  {/* Order Items Summary */}
                  <div style={{
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                      Items ({order.items.length})
                    </strong>
                    {order.items.map((item, idx) => (
                      <div key={idx} style={{ 
                        fontSize: '0.9rem',
                        color: '#374151',
                        marginBottom: '0.25rem'
                      }}>
                        {item.quantity}x {item.name} {item.size ? `(${item.size})` : ''}
                      </div>
                    ))}
                  </div>

                  {/* Tracking Information */}
                  {order.tracking ? (
                    <div style={{
                      padding: '1rem',
                      background: '#f0fdf4',
                      border: '2px solid #10b981',
                      borderRadius: '8px',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.75rem'
                      }}>
                        <span style={{ fontSize: '1.5rem' }}>📦</span>
                        <strong style={{ fontSize: '1.1rem' }}>Tracking Information</strong>
                      </div>
                      <div style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
                        <div>
                          <strong>Tracking Number:</strong>{' '}
                          <span style={{ 
                            background: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontWeight: 600
                          }}>
                            {order.tracking.number}
                          </span>
                        </div>
                        <div>
                          <strong>Courier:</strong> {order.tracking.courier}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#059669', marginTop: '0.5rem' }}>
                          Added on {formatDate(order.tracking.addedAt)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    order.status === 'pending' || order.status === 'processing' ? (
                      <div style={{
                        padding: '1rem',
                        background: '#fffbeb',
                        border: '2px solid #f59e0b',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        fontSize: '0.9rem',
                        color: '#92400e'
                      }}>
                        📋 Your order is being prepared. Tracking information will be available once shipped.
                      </div>
                    ) : null
                  )}

                  <button
                    onClick={() => setSelectedOrder(order)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    View Full Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Order Details Modal */}
      {selectedOrder && (
        <>
          <div 
            onClick={() => setSelectedOrder(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 999,
              backdropFilter: 'blur(5px)'
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.5rem 2rem',
                borderBottom: '2px solid #e5e7eb',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: 'white',
                borderRadius: '20px 20px 0 0'
              }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                  Order #{selectedOrder.orderNumber}
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '1.5rem',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '2rem' }}>
                {/* Order Items */}
                <section style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #f0f0f0' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900 }}>
                    Order Items
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700 }}>Product</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700 }}>Size</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700 }}>Qty</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>Price</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '0.75rem' }}>{item.name}</td>
                          <td style={{ padding: '0.75rem' }}>{item.size || '-'}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                        <td colSpan="4" style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Subtotal:</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(selectedOrder.subtotal)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="4" style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Shipping:</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(selectedOrder.shipping)}
                        </td>
                      </tr>
                      <tr style={{ background: '#f9fafb' }}>
                        <td colSpan="4" style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>
                          Total:
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 900, fontSize: '1.1rem', color: '#dc0000' }}>
                          {formatCurrency(selectedOrder.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </section>

                {/* Shipping Address */}
                <section style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #f0f0f0' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900 }}>
                    Shipping Address
                  </h3>
                  <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', lineHeight: '1.6' }}>
                    {selectedOrder.shippingAddress.street}<br />
                    {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.province}<br />
                    {selectedOrder.shippingAddress.postalCode}
                  </div>
                </section>

                {/* Tracking Info */}
                {selectedOrder.tracking && (
                  <section style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #f0f0f0' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900 }}>
                      📦 Tracking Information
                    </h3>
                    <div style={{
                      padding: '1.5rem',
                      background: '#f0fdf4',
                      border: '2px solid #10b981',
                      borderRadius: '8px'
                    }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <strong>Tracking Number:</strong>{' '}
                        <span style={{ 
                          background: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          display: 'inline-block',
                          marginTop: '0.5rem'
                        }}>
                          {selectedOrder.tracking.number}
                        </span>
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Courier:</strong> {selectedOrder.tracking.courier}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#059669' }}>
                        Tracking added on {formatDate(selectedOrder.tracking.addedAt)}
                      </div>
                    </div>
                  </section>
                )}

                {/* Status History */}
                {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                  <section>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900 }}>
                      Order Status History
                    </h3>
                    <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                      <div style={{
                        position: 'absolute',
                        left: '8px',
                        top: 0,
                        bottom: 0,
                        width: '2px',
                        background: '#e5e7eb'
                      }} />
                      {selectedOrder.statusHistory.map((history, idx) => (
                        <div key={idx} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                          <div style={{
                            position: 'absolute',
                            left: '-2rem',
                            top: '4px',
                            width: '20px',
                            height: '20px',
                            background: statusColors[history.status],
                            border: '3px solid white',
                            borderRadius: '50%',
                            boxShadow: '0 0 0 3px #e5e7eb'
                          }} />
                          <div style={{
                            background: '#f9fafb',
                            padding: '1rem',
                            borderRadius: '8px'
                          }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.3rem 0.75rem',
                                background: statusColors[history.status],
                                color: 'white',
                                borderRadius: '12px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}>
                                {history.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                              {formatDate(history.timestamp)}
                            </div>
                            {history.notes && (
                              <div style={{ fontSize: '0.9rem', color: '#374151', fontStyle: 'italic' }}>
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

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <>
          <div 
            onClick={cancelForgotPassword}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 999,
              backdropFilter: 'blur(5px)'
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '500px',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.5rem 2rem',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: 'white'
              }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                  Reset Password
                </h2>
                <button
                  onClick={cancelForgotPassword}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '1.5rem',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '2rem' }}>
                {resetMessage ? (
                  <div style={{
                    padding: '1.5rem',
                    background: '#f0fdf4',
                    border: '2px solid #10b981',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <p style={{ 
                      margin: 0, 
                      color: '#059669', 
                      fontWeight: 700,
                      fontSize: '1.1rem' 
                    }}>
                      {resetMessage}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPasswordSubmit}>
                    {resetStep === 'email' ? (
                      <>
                        <p style={{ 
                          marginTop: 0, 
                          marginBottom: '1.5rem',
                          color: '#6b7280' 
                        }}>
                          Enter your email address and we'll help you reset your password.
                        </p>

                        {resetError && (
                          <div style={{
                            padding: '1rem',
                            background: '#fee',
                            color: '#dc0000',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            border: '2px solid #dc0000',
                            fontWeight: 600
                          }}>
                            {resetError}
                          </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '0.5rem',
                            fontWeight: 700,
                            color: '#1f2937'
                          }}>
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            placeholder="your.email@example.com"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>

                        <button
                          type="submit"
                          style={{
                            width: '100%',
                            padding: '1rem',
                            background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}
                        >
                          Continue
                        </button>
                      </>
                    ) : resetStep === 'verification' ? (
                      <>
                        <p style={{ 
                          marginTop: 0, 
                          marginBottom: '1rem',
                          color: '#6b7280' 
                        }}>
                          Enter the verification code sent to <strong>{resetEmail}</strong>
                        </p>

                        {generatedCode && (
                          <div style={{
                            padding: '1rem',
                            background: '#f0f9ff',
                            border: '2px solid #3b82f6',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            textAlign: 'center'
                          }}>
                            <div style={{ 
                              fontSize: '0.85rem', 
                              color: '#1e40af',
                              fontWeight: 600,
                              marginBottom: '0.5rem'
                            }}>
                              🔐 DEMO MODE - Your verification code:
                            </div>
                            <div style={{ 
                              fontSize: '2rem', 
                              fontWeight: 700,
                              color: '#1e3a8a',
                              letterSpacing: '0.3rem'
                            }}>
                              {generatedCode}
                            </div>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: '#3b82f6',
                              marginTop: '0.5rem',
                              fontStyle: 'italic'
                            }}>
                              Valid for 15 minutes
                            </div>
                          </div>
                        )}

                        {resetError && (
                          <div style={{
                            padding: '1rem',
                            background: '#fee',
                            color: '#dc0000',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            border: '2px solid #dc0000',
                            fontWeight: 600
                          }}>
                            {resetError}
                          </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '0.5rem',
                            fontWeight: 700,
                            color: '#1f2937'
                          }}>
                            Verification Code
                          </label>
                          <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            required
                            placeholder="Enter 6-digit code"
                            maxLength="6"
                            pattern="[0-9]{6}"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1.5rem',
                              fontFamily: 'monospace',
                              textAlign: 'center',
                              letterSpacing: '0.5rem'
                            }}
                          />
                        </div>

                        <button
                          type="submit"
                          style={{
                            width: '100%',
                            padding: '1rem',
                            background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '0.75rem'
                          }}
                        >
                          Verify Code
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setResetStep('email');
                            setVerificationCode('');
                            setGeneratedCode('');
                            setResetError('');
                          }}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'transparent',
                            color: '#6b7280',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ← Back to Email
                        </button>
                      </>
                    ) : (
                      <>
                        <p style={{ 
                          marginTop: 0, 
                          marginBottom: '1.5rem',
                          color: '#6b7280' 
                        }}>
                          Create a new password for <strong>{resetEmail}</strong>
                        </p>

                        {resetError && (
                          <div style={{
                            padding: '1rem',
                            background: '#fee',
                            color: '#dc0000',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            border: '2px solid #dc0000',
                            fontWeight: 600
                          }}>
                            {resetError}
                          </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '0.5rem',
                            fontWeight: 700,
                            color: '#1f2937'
                          }}>
                            New Password
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            placeholder="Enter new password (min. 6 characters)"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '0.5rem',
                            fontWeight: 700,
                            color: '#1f2937'
                          }}>
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Re-enter new password"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>

                        <button
                          type="submit"
                          style={{
                            width: '100%',
                            padding: '1rem',
                            background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '0.75rem'
                          }}
                        >
                          Reset Password
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setResetStep('email');
                            setNewPassword('');
                            setConfirmPassword('');
                            setVerificationCode('');
                            setGeneratedCode('');
                            setResetError('');
                          }}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'transparent',
                            color: '#6b7280',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ← Back to Email
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={cancelForgotPassword}
                      style={{
                        width: '100%',
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: 'transparent',
                        color: '#6b7280',
                        border: 'none',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
