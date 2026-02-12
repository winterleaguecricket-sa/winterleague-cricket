import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminSettings.module.css';

export default function TeamRegistrationBanner() {
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadBanner = async () => {
      try {
        const res = await fetch('/api/team-registration-banner');
        const data = await res.json();
        if (data.success && data.banner) {
          setImageUrl(data.banner.imageUrl || '');
          setTitle(data.banner.title || '');
          setSubtitle(data.banner.subtitle || '');
        }
      } catch (error) {
        console.error('Error loading banner:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBanner();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload-site-asset?type=team-banner', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (!data.success) {
          alert('Upload failed: ' + (data.error || 'Unknown error'));
          return;
        }

        setImageUrl(data.url);
        setUploadedFile(file.name);
      } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload file. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/team-registration-banner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banner: {
            imageUrl,
            title,
            subtitle,
            showOnPage: 1
          }
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save banner');
      }
      alert('Team registration banner updated successfully!');
    } catch (error) {
      console.error('Error saving banner:', error);
      alert('Failed to save banner. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Team Registration Banner - Admin</title>
      </Head>

      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1>🎨 Team Registration Banner</h1>
            <p>Upload a banner image and update the welcome text</p>
          </div>
          <Link href="/admin/settings" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to Settings
          </Link>
        </div>
      </div>

      <div className={styles.content}>
        {/* Image Upload Section */}
        <div className={styles.section}>
          <h2>Banner Image</h2>
          
          <div className={styles.formGroup}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className={styles.input}
              disabled={uploading}
            />
            {uploadedFile && (
              <p style={{ marginTop: '10px', color: '#10b981', fontSize: '0.9rem' }}>
                ✓ Uploaded: {uploadedFile}
              </p>
            )}
          </div>

          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '15px',
            fontSize: '0.9rem',
            color: '#1e40af'
          }}>
            💡 <strong>Tip:</strong> Recommended Image Size: 1200px × 400px (3:1 ratio)
          </div>
        </div>

        {/* Text Content */}
        <div className={styles.section}>
          <h2>Banner Text</h2>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Welcome to Team Registration"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Register your team and prepare for the season"
              className={styles.input}
            />
          </div>
        </div>

        {/* Live Preview */}
        {imageUrl && (
          <div className={styles.section}>
            <h2>Live Preview</h2>
            <div style={{
              position: 'relative',
              width: '100%',
              height: '400px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
            }}>
              <img
                src={imageUrl}
                alt="Banner preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
                padding: '40px 50px 30px',
                color: 'white'
              }}>
                {title && (
                  <h1 style={{
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    margin: '0 0 10px 0',
                    textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                  }}>
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p style={{
                    fontSize: '1.2rem',
                    margin: 0,
                    opacity: 0.95,
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className={styles.actions}>
          <button onClick={handleSave} className={styles.saveButton} disabled={saving || loading}>
            {saving ? 'Saving...' : '💾 Save Banner'}
          </button>
        </div>
      </div>
    </div>
  );
}
