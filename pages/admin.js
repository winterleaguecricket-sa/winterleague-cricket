import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/admin.module.css'

const dashboardIcons = {
  homepage: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l9-4 9 4-9 4-9-4Z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  ),
  forms: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6l4 4v14H5V3h4Z" />
      <path d="M9 3v4h6V3" />
      <path d="M8 12h8" />
      <path d="M8 16h8" />
    </svg>
  ),
  funnels: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16l-6 7v6l-4 3v-9L4 4Z" />
    </svg>
  ),
  landing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M7 13h6" />
      <path d="M7 17h4" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 7h12l-1 12H7L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  ),
  payouts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h18v10H3Z" />
      <path d="M7 7V5h10v2" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-0.2-.1a1.7 1.7 0 0 0-2 .3l-.2.2-3.6-2.1V17a1.7 1.7 0 0 0-1.4-1.7h-.2a1.7 1.7 0 0 0-1.7 1.4V17l-3.6 2.1-.2-.2a1.7 1.7 0 0 0-2-.3l-.2.1-1.8-3.1.1-.1a1.7 1.7 0 0 0 .3-1.9V15a1.7 1.7 0 0 0-1.4-1.7h-.2a1.7 1.7 0 0 0 0-3.4h.2A1.7 1.7 0 0 0 2.8 8V7a1.7 1.7 0 0 0-.3-1.9l-.1-.1L4.2 2l.2.1a1.7 1.7 0 0 0 2-.3l.2-.2 3.6 2.1V7a1.7 1.7 0 0 0 1.7 1.7h.2A1.7 1.7 0 0 0 13.4 7V5l3.6-2.1.2.2a1.7 1.7 0 0 0 2 .3l.2-.1 1.8 3.1-.1.1a1.7 1.7 0 0 0-.3 1.9V8a1.7 1.7 0 0 0 1.4 1.7h.2a1.7 1.7 0 0 0 0 3.4h-.2A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 5l-3 3" />
      <path d="M5 19l3-3" />
      <path d="M19 19l-3-3" />
      <path d="M5 5l3 3" />
    </svg>
  ),
  buttons: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="7" width="16" height="10" rx="5" />
      <circle cx="9" cy="12" r="2" />
    </svg>
  ),
  categories: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  pages: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h9l5 5v15H6Z" />
      <path d="M15 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  ),
  shirts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 5l4 3 4-3 3 2-2 4v10H7V11L5 7l3-2Z" />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <path d="M2 20a6 6 0 0 1 12 0" />
      <path d="M10 20a6 6 0 0 1 12 0" />
    </svg>
  ),
  removals: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
};

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if already authenticated in session
    if (typeof window !== 'undefined') {
      const authStatus = sessionStorage.getItem('adminAuth');
      if (authStatus === 'true') {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      if (data.authenticated) {
        setIsAuthenticated(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('adminAuth', 'true');
          sessionStorage.setItem('adminPassword', password);
        }
      } else {
        alert('Incorrect password');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.loginContainer}>
        <Head>
          <title>Admin Login - Winter League Cricket</title>
        </Head>
        <div className={styles.loginBox}>
          <h1>🏏 Admin Panel</h1>
          <p>Winter League Cricket</p>
          <form onSubmit={handleLogin} className={styles.loginForm}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.loginInput}
              disabled={isLoading}
            />
            <button type="submit" className={styles.loginButton} disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Admin Panel - Winter League Cricket</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>🏏 Admin Panel</h1>
          <nav className={styles.nav}>
            <Link href="/" className={styles.navLink}>View Store</Link>
            <button 
              onClick={() => {
                setIsAuthenticated(false);
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('adminAuth');
                }
              }} 
              className={styles.logoutButton}
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.cardGrid}>
          <Link href="/admin/homepage" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.homepage}</div>
            <h3 className={styles.cardTitle}>Homepage Editor</h3>
            <p className={styles.cardDescription}>Customize hero section, banner, gallery, and TikTok widget</p>
          </Link>

          <Link href="/admin/products" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.products}</div>
            <h3 className={styles.cardTitle}>Products</h3>
            <p className={styles.cardDescription}>Add, edit, and manage your cricket equipment inventory</p>
          </Link>

          <Link href="/admin/forms" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.forms}</div>
            <h3 className={styles.cardTitle}>Forms</h3>
            <p className={styles.cardDescription}>Create custom forms and view submissions</p>
          </Link>

          <Link href="/admin/funnels" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.funnels}</div>
            <h3 className={styles.cardTitle}>Sales Funnels</h3>
            <p className={styles.cardDescription}>Create multi-step purchase journeys</p>
          </Link>

          <Link href="/admin/landing-pages" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.landing}</div>
            <h3 className={styles.cardTitle}>Landing Pages</h3>
            <p className={styles.cardDescription}>Design and manage custom landing pages</p>
          </Link>

          <Link href="/admin/orders" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.orders}</div>
            <h3 className={styles.cardTitle}>Orders</h3>
            <p className={styles.cardDescription}>View and manage customer orders</p>
          </Link>

          <Link href="/admin/payouts" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.payouts}</div>
            <h3 className={styles.cardTitle}>Payouts</h3>
            <p className={styles.cardDescription}>Track and manage payment distributions</p>
          </Link>

          <Link href="/admin/profile" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.profile}</div>
            <h3 className={styles.cardTitle}>Admin Profile</h3>
            <p className={styles.cardDescription}>Manage your admin account settings</p>
          </Link>

          <Link href="/admin/settings" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.settings}</div>
            <h3 className={styles.cardTitle}>Site Settings</h3>
            <p className={styles.cardDescription}>Configure general site preferences</p>
          </Link>

          <Link href="/admin/menu" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.menu}</div>
            <h3 className={styles.cardTitle}>Menu Manager</h3>
            <p className={styles.cardDescription}>Create and manage navigation menus</p>
          </Link>

          <Link href="/admin/buttons" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.buttons}</div>
            <h3 className={styles.cardTitle}>Button Manager</h3>
            <p className={styles.cardDescription}>Control buttons and their destinations</p>
          </Link>

          <Link href="/admin/categories" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.categories}</div>
            <h3 className={styles.cardTitle}>Categories</h3>
            <p className={styles.cardDescription}>Manage product categories and subcategories</p>
          </Link>

          <Link href="/admin/pages" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.pages}</div>
            <h3 className={styles.cardTitle}>Page Management</h3>
            <p className={styles.cardDescription}>Create custom pages like About Us, Contact, etc.</p>
          </Link>

          <Link href="/admin/shirt-designs" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.shirts}</div>
            <h3 className={styles.cardTitle}>Kit Designs</h3>
            <p className={styles.cardDescription}>Manage kit design library and colors</p>
          </Link>

          <Link href="/team-portal" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.team}</div>
            <h3 className={styles.cardTitle}>Team Portal</h3>
            <p className={styles.cardDescription}>View team dashboard and management area</p>
          </Link>
          <Link href="/admin/player-removals" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.removals}</div>
            <h3 className={styles.cardTitle}>Player Removals</h3>
            <p className={styles.cardDescription}>Review and approve player removal requests</p>
          </Link>
          <Link href="/admin/player-management" className={styles.card}>
            <div className={styles.cardIcon}>{dashboardIcons.team}</div>
            <h3 className={styles.cardTitle}>Player Management</h3>
            <p className={styles.cardDescription}>New players to upload to CricClubs</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
