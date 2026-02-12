import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminSettings.module.css';

export default function EntryFee() {
  const [baseFee, setBaseFee] = useState(500);
  const [includedItems, setIncludedItems] = useState([
    'Full season league participation',
    'Official league jersey',
    'League insurance coverage',
    'Access to league facilities'
  ]);
  const [newItem, setNewItem] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadEntryFeeSettings = async () => {
      try {
        const res = await fetch('/api/entry-fee-settings');
        const data = await res.json();
        if (data?.success) {
          if (data.baseFee !== undefined) {
            setBaseFee(parseFloat(data.baseFee) || 0);
          }
          if (Array.isArray(data.includedItems)) {
            setIncludedItems(data.includedItems);
          }
        }
      } catch (error) {
        console.error('Error loading entry fee settings:', error);
      }
    };

    loadEntryFeeSettings();
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/entry-fee-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseFee, includedItems })
      });
      const data = await res.json();
      if (data?.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving entry fee settings:', error);
    }
  };

  const addItem = () => {
    if (newItem.trim()) {
      setIncludedItems([...includedItems, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index) => {
    setIncludedItems(includedItems.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>League Entry Fee - Admin Panel</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>🏆 League Entry Fee</h1>
          <nav className={styles.nav}>
            <Link href="/admin" className={styles.navLink}>← Back to Admin</Link>
            <Link href="/" className={styles.navLink}>View Store</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <h2>Set Base League Entry Fee</h2>
          {saved && <span className={styles.savedIndicator}>✓ Fee updated!</span>}
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h3>League Entry Fee</h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              This is the base entry fee for teams joining the league. Teams can adjust this amount during registration.
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
                  Base Entry Fee (R)
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
                    value={baseFee}
                    onChange={(e) => setBaseFee(parseFloat(e.target.value) || 0)}
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
                  <li>Teams see this base fee when registering</li>
                  <li>Teams can adjust the amount (add or reduce)</li>
                  <li>Final fee: Base Fee + Team Adjustment</li>
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
                💾 Save Base Fee
              </button>
            </div>

            {/* Included Items Section */}
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              border: '2px solid #e5e7eb',
              marginTop: '2rem'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>
                What's Included in Entry Fee
              </h4>
              <div style={{ marginBottom: '1rem' }}>
                {includedItems.map((item, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>✓</span>
                    <span style={{ flex: 1, fontSize: '0.95rem', color: '#111827' }}>{item}</span>
                    <button
                      onClick={() => removeItem(index)}
                      style={{
                        padding: '0.25rem 0.75rem',
                        background: '#dc0000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addItem()}
                  placeholder="Add new item..."
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                />
                <button
                  onClick={addItem}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
              </div>
            </div>
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
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280' }}>Base Entry Fee</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>
                  R{baseFee.toFixed(2)}
                </p>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '2px solid #e5e7eb'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280' }}>💰 Team Adjustment (Example)</p>
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#111827' }}>+ R100.00</p>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                padding: '1rem',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>
                  Final League Entry Fee
                </p>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: '900', color: 'white' }}>
                  R{(baseFee + 100).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
