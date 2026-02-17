import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminSettings.module.css';
import { siteConfig } from '../../data/products';

export default function RegistrationBanner() {
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load player registration banner from DB via API
    const loadBanner = async () => {
      try {
        const res = await fetch('/api/player-registration-banner');
        const data = await res.json();
        if (data.success && data.banner) {
          setImageUrl(data.banner.imageUrl || '');
          setTitle(data.banner.title || '');
          setSubtitle(data.banner.subtitle || '');
        }
      } catch (error) {
        console.error('Error loading player banner:', error);
      }
      setLoading(false);
    };
    loadBanner();
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/player-registration-banner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banner: {
            imageUrl: imageUrl,
            title: title,
            subtitle: subtitle,
            showOnPage: 1
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving player banner:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Upload the file to server
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'site-settings');
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      // Fallback to object URL for preview only
      setImageUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Head>
        <title>Registration Banner - Admin</title>
      </Head>

      <header style={{
        background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
        color: 'white',
        padding: '1.5rem 2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem', fontWeight: '800' }}>🎨 Registration Banner</h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem' }}>Customize the welcome banner for player registration</p>
          </div>
          <Link href="/admin/settings" style={{
            padding: '0.75rem 1.5rem',
            background: 'white',
            color: '#dc0000',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '700',
            fontSize: '0.95rem'
          }}>
            ← Back to Settings
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {saved && (
          <div style={{
            padding: '1rem 1.5rem',
            background: '#dcfce7',
            color: '#166534',
            borderRadius: '12px',
            marginBottom: '2rem',
            fontWeight: '600',
            border: '2px solid #86efac'
          }}>
            ✓ Banner settings saved successfully!
          </div>
        )}

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: '#eff6ff',
            border: '2px solid #93c5fd',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: '1.5rem' }}>💡</div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#1e40af' }}>Recommended Image Size</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af', lineHeight: '1.5' }}>
                For best results, use an image with dimensions <strong>1200px × 400px</strong> (3:1 ratio).<br/>
                Wider images work best. The image will be darkened automatically for text readability.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              Banner Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Welcome to Player Registration"
              style={{
                width: '100%',
                padding: '0.875rem',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              Banner Subtitle
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Join your team and get equipped for the season ahead"
              style={{
                width: '100%',
                padding: '0.875rem',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              Banner Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{
                width: '100%',
                padding: '0.875rem',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '1rem'
              }}
            />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
              Or enter an image URL:
            </p>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="/images/player-welcome.jpg"
              style={{
                width: '100%',
                padding: '0.875rem',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '1rem',
                marginTop: '0.5rem'
              }}
            />
          </div>

          <button
            onClick={handleSave}
            style={{
              width: '100%',
              padding: '1.25rem',
              background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1.1rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Save Banner Settings
          </button>
        </div>

        {/* Preview Section */}
        {(imageUrl || title || subtitle) && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '700' }}>Banner Preview</h3>
            
            <div style={{
              width: '100%',
              height: '400px',
              borderRadius: '20px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: imageUrl 
                  ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url(${imageUrl})`
                  : 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem',
                textAlign: 'center'
              }}>
                <h2 style={{
                  fontSize: '3rem',
                  fontWeight: '900',
                  color: 'white',
                  margin: '0 0 1rem 0',
                  textShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  letterSpacing: '-1px'
                }}>
                  {title || 'Welcome to Player Registration'}
                </h2>
                <p style={{
                  fontSize: '1.25rem',
                  color: 'rgba(255,255,255,0.95)',
                  margin: 0,
                  maxWidth: '600px',
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  fontWeight: '500'
                }}>
                  {subtitle || 'Join your team and get equipped for the season ahead'}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Force SSR to prevent prerender errors during build
export async function getServerSideProps() {
  return { props: {} };
}
