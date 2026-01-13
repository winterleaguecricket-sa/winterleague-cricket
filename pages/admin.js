import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/admin.module.css'

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Check if already authenticated in session
    if (typeof window !== 'undefined') {
      const authStatus = sessionStorage.getItem('adminAuth');
      if (authStatus === 'true') {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin123';
    if (password === adminPassword) {
      setIsAuthenticated(true);
      // Store in session
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('adminAuth', 'true');
      }
    } else {
      alert('Incorrect password');
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
            />
            <button type="submit" className={styles.loginButton}>
              Login
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
              onClick={() => setIsAuthenticated(false)} 
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
            <div className={styles.cardIcon}>🏠</div>
            <h3 className={styles.cardTitle}>Homepage Editor</h3>
            <p className={styles.cardDescription}>Customize hero section, banner, gallery, and TikTok widget</p>
          </Link>

          <Link href="/admin/products" className={styles.card}>
            <div className={styles.cardIcon}>📦</div>
            <h3 className={styles.cardTitle}>Products</h3>
            <p className={styles.cardDescription}>Add, edit, and manage your cricket equipment inventory</p>
          </Link>

          <Link href="/admin/forms" className={styles.card}>
            <div className={styles.cardIcon}>📋</div>
            <h3 className={styles.cardTitle}>Forms</h3>
            <p className={styles.cardDescription}>Create custom forms and view submissions</p>
          </Link>

          <Link href="/admin/funnels" className={styles.card}>
            <div className={styles.cardIcon}>🔄</div>
            <h3 className={styles.cardTitle}>Sales Funnels</h3>
            <p className={styles.cardDescription}>Create multi-step purchase journeys</p>
          </Link>

          <Link href="/admin/landing-pages" className={styles.card}>
            <div className={styles.cardIcon}>🎨</div>
            <h3 className={styles.cardTitle}>Landing Pages</h3>
            <p className={styles.cardDescription}>Design and manage custom landing pages</p>
          </Link>

          <Link href="/admin/orders" className={styles.card}>
            <div className={styles.cardIcon}>🛍️</div>
            <h3 className={styles.cardTitle}>Orders</h3>
            <p className={styles.cardDescription}>View and manage customer orders</p>
          </Link>

          <Link href="/admin/payouts" className={styles.card}>
            <div className={styles.cardIcon}>💰</div>
            <h3 className={styles.cardTitle}>Payouts</h3>
            <p className={styles.cardDescription}>Track and manage payment distributions</p>
          </Link>

          <Link href="/admin/profile" className={styles.card}>
            <div className={styles.cardIcon}>👤</div>
            <h3 className={styles.cardTitle}>Admin Profile</h3>
            <p className={styles.cardDescription}>Manage your admin account settings</p>
          </Link>

          <Link href="/admin/settings" className={styles.card}>
            <div className={styles.cardIcon}>⚙️</div>
            <h3 className={styles.cardTitle}>Site Settings</h3>
            <p className={styles.cardDescription}>Configure general site preferences</p>
          </Link>

          <Link href="/admin/menu" className={styles.card}>
            <div className={styles.cardIcon}>🧭</div>
            <h3 className={styles.cardTitle}>Menu Manager</h3>
            <p className={styles.cardDescription}>Create and manage navigation menus</p>
          </Link>

          <Link href="/admin/buttons" className={styles.card}>
            <div className={styles.cardIcon}>🔘</div>
            <h3 className={styles.cardTitle}>Button Manager</h3>
            <p className={styles.cardDescription}>Control buttons and their destinations</p>
          </Link>

          <Link href="/admin/categories" className={styles.card}>
            <div className={styles.cardIcon}>📂</div>
            <h3 className={styles.cardTitle}>Categories</h3>
            <p className={styles.cardDescription}>Manage product categories and subcategories</p>
          </Link>

          <Link href="/admin/pages" className={styles.card}>
            <div className={styles.cardIcon}>📄</div>
            <h3 className={styles.cardTitle}>Page Management</h3>
            <p className={styles.cardDescription}>Create custom pages like About Us, Contact, etc.</p>
          </Link>

          <Link href="/admin/shirt-designs" className={styles.card}>
            <div className={styles.cardIcon}>👔</div>
            <h3 className={styles.cardTitle}>Shirt Designs</h3>
            <p className={styles.cardDescription}>Manage shirt design library and colors</p>
          </Link>

          <Link href="/team-portal" className={styles.card}>
            <div className={styles.cardIcon}>🏏</div>
            <h3 className={styles.cardTitle}>Team Portal</h3>
            <p className={styles.cardDescription}>View team dashboard and management area</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
