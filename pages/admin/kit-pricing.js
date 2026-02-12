import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminSettings.module.css';

export default function KitPricing() {
  const [basePrice, setBasePrice] = useState(150);
  const [saved, setSaved] = useState(false);
  const [shirtChartUrl, setShirtChartUrl] = useState('');
  const [pantsChartUrl, setPantsChartUrl] = useState('');
  const [chartsSaved, setChartsSaved] = useState(false);
  const [uploadingChart, setUploadingChart] = useState({ shirt: false, pants: false });

  useEffect(() => {
    const loadBasePrice = async () => {
      try {
        const res = await fetch('/api/kit-pricing');
        const data = await res.json();
        if (data?.success && data.basePrice !== undefined) {
          setBasePrice(parseFloat(data.basePrice));
        }
      } catch (error) {
        console.error('Error loading kit base price:', error);
      }
    };

    const loadSizeCharts = async () => {
      try {
        const res = await fetch('/api/kit-size-charts');
        const data = await res.json();
        if (data?.success) {
          setShirtChartUrl(data.shirtChartUrl || '');
          setPantsChartUrl(data.pantsChartUrl || '');
        }
      } catch (error) {
        console.error('Error loading kit size charts:', error);
      }
    };

    loadBasePrice();
    loadSizeCharts();
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/kit-pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basePrice })
      });
      const data = await res.json();
      if (data?.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        return;
      }
    } catch (error) {
      console.error('Error saving kit base price:', error);
    }
  };

  const saveCharts = async (nextShirtUrl, nextPantsUrl) => {
    try {
      const res = await fetch('/api/kit-size-charts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shirtChartUrl: nextShirtUrl,
          pantsChartUrl: nextPantsUrl
        })
      });
      const data = await res.json();
      if (data?.success) {
        setChartsSaved(true);
        setTimeout(() => setChartsSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving kit size charts:', error);
    }
  };

  const uploadChart = async (file, type) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image (JPG, PNG, GIF, WebP, SVG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingChart((prev) => ({ ...prev, [type]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/upload-site-asset?type=kit-size-${type}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data?.success && data.url) {
        if (type === 'shirt') {
          setShirtChartUrl(data.url);
          await saveCharts(data.url, pantsChartUrl);
        } else {
          setPantsChartUrl(data.url);
          await saveCharts(shirtChartUrl, data.url);
        }
      }
    } catch (error) {
      console.error('Error uploading size chart:', error);
    } finally {
      setUploadingChart((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleSaveCharts = async () => {
    await saveCharts(shirtChartUrl, pantsChartUrl);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Kit Pricing - Admin Panel</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>💰 Kit Pricing</h1>
          <nav className={styles.nav}>
            <Link href="/admin" className={styles.navLink}>← Back to Admin</Link>
            <Link href="/" className={styles.navLink}>View Store</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <h2>Set Base Kit Price</h2>
          {saved && <span className={styles.savedIndicator}>✓ Price updated!</span>}
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h3>Basic Kit Base Price</h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              This is the base price for the Basic Kit package (Playing Top, Pants, and Cap). Teams can add their own markup on top of this price.
            </p>

            <div style={{
              background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
              border: '2px solid #e5e7eb',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px'
            }}>
              <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                marginBottom: '1.5rem'
              }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#6b7280', marginBottom: '1rem' }}>
                  Base Price (R)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: '#6b7280'
                  }}>
                    R
                  </span>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '1rem 1rem 1rem 3rem',
                      border: '3px solid #dc0000',
                      borderRadius: '12px',
                      fontSize: '2.5rem',
                      fontWeight: '800',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      background: '#fafafa'
                    }}
                  />
                </div>
              </div>

              <div style={{
                background: '#eff6ff',
                padding: '1.25rem',
                borderRadius: '10px',
                border: '2px solid #3b82f6',
                marginBottom: '1.5rem'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: '600', color: '#1e40af' }}>
                  💡 How it works:
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#1e40af', lineHeight: '1.6' }}>
                  <li>Teams see this base price when registering</li>
                  <li>Teams can add their own markup to earn funds</li>
                  <li>Players pay: Base Price + Team Markup</li>
                </ul>
              </div>

              <button
                onClick={handleSave}
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 24px rgba(220, 0, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                💾 Save Base Price
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Kit Size Charts</h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Upload sizing charts for player registration. Each chart is shown when a player selects a shirt or pants size.
            </p>

            <div style={{
              display: 'grid',
              gap: '1.5rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'
            }}>
              <div style={{
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.25rem'
              }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '700' }}>Shirt Size Chart</h4>
                {shirtChartUrl ? (
                  <img
                    src={shirtChartUrl}
                    alt="Shirt size chart"
                    style={{ width: '100%', borderRadius: '10px', border: '1px solid #e5e7eb', marginBottom: '0.75rem' }}
                  />
                ) : (
                  <div style={{
                    border: '2px dashed #e5e7eb',
                    borderRadius: '10px',
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#6b7280',
                    marginBottom: '0.75rem'
                  }}>
                    No chart uploaded yet
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadChart(e.target.files?.[0], 'shirt')}
                  disabled={uploadingChart.shirt}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.25rem'
              }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '700' }}>Pants Size Chart</h4>
                {pantsChartUrl ? (
                  <img
                    src={pantsChartUrl}
                    alt="Pants size chart"
                    style={{ width: '100%', borderRadius: '10px', border: '1px solid #e5e7eb', marginBottom: '0.75rem' }}
                  />
                ) : (
                  <div style={{
                    border: '2px dashed #e5e7eb',
                    borderRadius: '10px',
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#6b7280',
                    marginBottom: '0.75rem'
                  }}>
                    No chart uploaded yet
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadChart(e.target.files?.[0], 'pants')}
                  disabled={uploadingChart.pants}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button
              onClick={handleSaveCharts}
              style={{
                width: '100%',
                padding: '1rem 1.25rem',
                marginTop: '1.25rem',
                background: 'linear-gradient(135deg, #111827 0%, #dc0000 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              💾 Save Size Charts
            </button>
            {chartsSaved && (
              <p style={{ marginTop: '0.75rem', color: '#16a34a', fontWeight: '600' }}>
                ✓ Size charts updated
              </p>
            )}
          </div>

          {/* Example Preview */}
          <div className={styles.section}>
            <h3>Preview Example</h3>
            <div style={{
              background: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '500px'
            }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#6b7280' }}>
                Team Registration View:
              </p>
              <div style={{
                background: '#f9fafb',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '2px solid #e5e7eb'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280' }}>Base Kit Price</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>
                  R{basePrice.toFixed(2)}
                </p>
              </div>
              <div style={{
                background: '#fef3c7',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '2px solid #fbbf24'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#92400e' }}>💰 Team Markup (Example)</p>
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#92400e' }}>+ R50.00</p>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                padding: '1rem',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>
                  Player Basic Kit Price
                </p>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: '900', color: 'white' }}>
                  R{(basePrice + 50).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
