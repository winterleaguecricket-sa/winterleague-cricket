import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../../styles/adminSettings.module.css';

export default function HomepageEditor() {
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('hero');
  const [message, setMessage] = useState('');
  const [editingImage, setEditingImage] = useState(null);
  const [newImage, setNewImage] = useState({ url: '', alt: '' });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Fetch config from API
  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/homepage');
      const data = await response.json();
      if (data.success) {
        // Ensure all TikTok properties exist
        if (!data.config.channels.hasOwnProperty('showTikTok')) {
          data.config.channels.showTikTok = false;
        }
        if (!data.config.channels.hasOwnProperty('tiktokUsername')) {
          data.config.channels.tiktokUsername = '';
        }
        if (!data.config.channels.hasOwnProperty('tiktokEmbedCode')) {
          data.config.channels.tiktokEmbedCode = '';
        }
        if (!data.config.channels.hasOwnProperty('tiktokAutoLatest')) {
          data.config.channels.tiktokAutoLatest = false;
        }
        if (!data.config.channels.hasOwnProperty('tiktokVideoUrl')) {
          data.config.channels.tiktokVideoUrl = '';
        }
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const uploadGalleryImage = async (file) => {
    if (!file) return null;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload-homepage-gallery', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      showMessage('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleHeroUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'hero', updates: config.hero })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('Hero section updated successfully!');
      } else {
        showMessage('Failed to update hero section');
      }
    } catch (error) {
      console.error('Error updating hero:', error);
      showMessage('Failed to update hero section');
    }
  };

  const handleBannerUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'banner', updates: config.banner })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('Banner updated successfully!');
      } else {
        showMessage('Failed to update banner');
      }
    } catch (error) {
      console.error('Error updating banner:', error);
      showMessage('Failed to update banner');
    }
  };

  const handleGalleryUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          section: 'gallery', 
          updates: {
            enabled: config.gallery.enabled,
            title: config.gallery.title,
            subtitle: config.gallery.subtitle,
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('Gallery settings updated successfully!');
      } else {
        showMessage('Failed to update gallery settings');
      }
    } catch (error) {
      console.error('Error updating gallery:', error);
      showMessage('Failed to update gallery settings');
    }
  };

  const handleAddImage = async (e) => {
    e.preventDefault();
    if (!newImage.url) {
      showMessage('Please upload an image or enter an image URL');
      return;
    }
    if (!newImage.alt) {
      showMessage('Please enter alt text for the image');
      return;
    }
    try {
      const response = await fetch('/api/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newImage)
      });
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
        setNewImage({ url: '', alt: '' });
        showMessage('Image added successfully!');
      } else {
        showMessage('Failed to add image: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding image:', error);
      showMessage('Failed to add image: ' + error.message);
    }
  };

  const handleUpdateImage = async (e) => {
    e.preventDefault();
    if (editingImage) {
      try {
        const response = await fetch('/api/homepage', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingImage.id, url: editingImage.url, alt: editingImage.alt })
        });
        const data = await response.json();
        if (data.success) {
          setConfig(data.config);
          setEditingImage(null);
          showMessage('Image updated successfully!');
        } else {
          showMessage('Failed to update image');
        }
      } catch (error) {
        console.error('Error updating image:', error);
        showMessage('Failed to update image');
      }
    }
  };

  const handleDeleteImage = async (id) => {
    if (confirm('Are you sure you want to delete this image?')) {
      try {
        const response = await fetch(`/api/homepage?id=${id}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
          setConfig(data.config);
          showMessage('Image deleted successfully!');
        } else {
          showMessage('Failed to delete image');
        }
      } catch (error) {
        console.error('Error deleting image:', error);
        showMessage('Failed to delete image');
      }
    }
  };

  const handleChannelsUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          section: 'channels', 
          updates: {
            enabled: config.channels.enabled,
            title: config.channels.title,
            subtitle: config.channels.subtitle,
            showTikTok: config.channels.showTikTok,
            tiktokUsername: config.channels.tiktokUsername,
            tiktokVideoUrl: config.channels.tiktokVideoUrl,
            tiktokEmbedCode: config.channels.tiktokEmbedCode,
            tiktokAutoLatest: config.channels.tiktokAutoLatest,
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
        showMessage('Channels section updated successfully!');
      } else {
        showMessage('Failed to update channels section');
      }
    } catch (error) {
      console.error('Error updating channels:', error);
      showMessage('Failed to update channels section');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!config) return <div>Failed to load configuration</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>🏠 Homepage Editor</h1>
          <Link href="/admin" className={styles.backButton}>
            ← Back to Admin
          </Link>
        </div>
      </header>

      {message && (
        <div className={styles.successMessage}>
          {message}
        </div>
      )}

      <div className={styles.tabContainer}>
        <button
          className={`${styles.tab} ${activeTab === 'hero' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('hero')}
        >
          Hero Section
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'banner' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('banner')}
        >
          Banner
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'gallery' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('gallery')}
        >
          Gallery
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'channels' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('channels')}
        >
          Channels
        </button>
      </div>

      <main className={styles.main}>
        {activeTab === 'hero' && (
          <div className={styles.section}>
            <h2>Hero Section</h2>
            <form onSubmit={handleHeroUpdate}>
              <div className={styles.formGroup}>
                <label>Hero Title</label>
                <input
                  type="text"
                  value={config.hero.title}
                  onChange={(e) => setConfig({
                    ...config,
                    hero: { ...config.hero, title: e.target.value }
                  })}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Hero Subtitle</label>
                <textarea
                  value={config.hero.subtitle}
                  onChange={(e) => setConfig({
                    ...config,
                    hero: { ...config.hero, subtitle: e.target.value }
                  })}
                  className={styles.textarea}
                  rows="3"
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={config.hero.showAnimation}
                    onChange={(e) => setConfig({
                      ...config,
                      hero: { ...config.hero, showAnimation: e.target.checked }
                    })}
                  />
                  <span style={{ marginLeft: '0.5rem' }}>Show Animation Effects</span>
                </label>
              </div>

              <div className={styles.formGroup}>
                <label>Background Image URL (optional)</label>
                <input
                  type="text"
                  value={config.hero.backgroundImage}
                  onChange={(e) => setConfig({
                    ...config,
                    hero: { ...config.hero, backgroundImage: e.target.value }
                  })}
                  className={styles.input}
                  placeholder="https://..."
                />
              </div>

              <button type="submit" className={styles.saveButton}>
                Save Hero Settings
              </button>
            </form>
          </div>
        )}

        {activeTab === 'banner' && (
          <div className={styles.section}>
            <h2>Top Banner</h2>
            <form onSubmit={handleBannerUpdate}>
              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={config.banner.enabled}
                    onChange={(e) => setConfig({
                      ...config,
                      banner: { ...config.banner, enabled: e.target.checked }
                    })}
                  />
                  <span style={{ marginLeft: '0.5rem' }}>Show Banner</span>
                </label>
              </div>

              <div className={styles.formGroup}>
                <label>Banner Text</label>
                <input
                  type="text"
                  value={config.banner.text}
                  onChange={(e) => setConfig({
                    ...config,
                    banner: { ...config.banner, text: e.target.value }
                  })}
                  className={styles.input}
                />
              </div>

              <button type="submit" className={styles.saveButton}>
                Save Banner Settings
              </button>
            </form>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className={styles.section}>
            <h2>Photo Gallery</h2>
            <form onSubmit={handleGalleryUpdate}>
              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={config.gallery.enabled}
                    onChange={(e) => setConfig({
                      ...config,
                      gallery: { ...config.gallery, enabled: e.target.checked }
                    })}
                  />
                  <span style={{ marginLeft: '0.5rem' }}>Show Gallery Section</span>
                </label>
              </div>

              <div className={styles.formGroup}>
                <label>Gallery Title</label>
                <input
                  type="text"
                  value={config.gallery.title}
                  onChange={(e) => setConfig({
                    ...config,
                    gallery: { ...config.gallery, title: e.target.value }
                  })}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Gallery Subtitle</label>
                <input
                  type="text"
                  value={config.gallery.subtitle}
                  onChange={(e) => setConfig({
                    ...config,
                    gallery: { ...config.gallery, subtitle: e.target.value }
                  })}
                  className={styles.input}
                />
              </div>

              <button type="submit" className={styles.saveButton}>
                Save Gallery Settings
              </button>
            </form>

            <hr style={{ margin: '3rem 0', border: 'none', borderTop: '2px solid #e5e7eb' }} />

            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem', fontWeight: '700' }}>Gallery Images</h3>
            
            {/* Image Size Tip */}
            <div style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '2px solid #3b82f6',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>💡</span>
                <div>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '700', color: '#1e40af', fontSize: '0.95rem' }}>
                    Recommended Image Specifications
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#1e40af', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    <li><strong>Aspect Ratio:</strong> 16:9 or 4:3 for best results</li>
                    <li><strong>Resolution:</strong> 1200x800px or larger (landscape)</li>
                    <li><strong>File Size:</strong> Under 2MB for fast loading</li>
                    <li><strong>Format:</strong> JPG or PNG</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Add New Image */}
            <div style={{
              background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
              border: '2px solid #e5e7eb',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>
                ➕ Add New Image
              </h4>
              <form onSubmit={handleAddImage}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className={styles.formGroup} style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                      Image URL
                    </label>
                    <input
                      type="text"
                      value={newImage.url}
                      onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
                      className={styles.input}
                      placeholder="https://images.unsplash.com/..."
                      style={{ fontSize: '0.9rem' }}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                      Alt Text
                    </label>
                    <input
                      type="text"
                      value={newImage.alt}
                      onChange={(e) => setNewImage({ ...newImage, alt: e.target.value })}
                      className={styles.input}
                      placeholder="Cricket Stadium"
                      style={{ fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* File Upload Option */}
                <div style={{
                  background: 'white',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '2px dashed #d1d5db',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  <label style={{
                    display: 'block',
                    cursor: 'pointer',
                    padding: '1rem'
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const url = await uploadGalleryImage(file);
                          if (url) {
                            setNewImage({ ...newImage, url });
                          }
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                        Upload from Computer
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        or paste URL above
                      </span>
                    </div>
                  </label>
                </div>

                {/* Preview */}
                {newImage.url && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '10px',
                    border: '2px solid #e5e7eb'
                  }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: '600', color: '#6b7280' }}>
                      Preview:
                    </p>
                    <img 
                      src={newImage.url} 
                      alt="Preview" 
                      style={{ 
                        width: '100%', 
                        maxHeight: '200px', 
                        objectFit: 'cover', 
                        borderRadius: '8px',
                        border: '2px solid #e5e7eb'
                      }} 
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={uploading}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: uploading ? '#9ca3af' : 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 24px rgba(220, 0, 0, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {uploading ? '⏳ Uploading...' : '➕ Add Image to Gallery'}
                </button>
              </form>
            </div>

            {/* Existing Images Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
              gap: '1.5rem',
              marginTop: '2rem'
            }}>
              {config.gallery.images.map(image => (
                <div key={image.id} style={{
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
                >
                  {editingImage?.id === image.id ? (
                    <form onSubmit={handleUpdateImage} style={{ padding: '1.5rem' }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                          Image URL
                        </label>
                        <input
                          type="text"
                          value={editingImage.url}
                          onChange={(e) => setEditingImage({ ...editingImage, url: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.625rem',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                      
                      {/* File Upload for Edit */}
                      <div style={{
                        marginBottom: '1rem',
                        padding: '1rem',
                        border: '2px dashed #d1d5db',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <label style={{ cursor: 'pointer' }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const url = await uploadGalleryImage(file);
                                if (url) {
                                  setEditingImage({ ...editingImage, url });
                                }
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                          <div style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>
                            📁 Upload New Image
                          </div>
                        </label>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                          Alt Text
                        </label>
                        <input
                          type="text"
                          value={editingImage.alt}
                          onChange={(e) => setEditingImage({ ...editingImage, alt: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.625rem',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>

                      {/* Image Preview in Edit Mode */}
                      {editingImage.url && (
                        <div style={{ marginBottom: '1rem' }}>
                          <img 
                            src={editingImage.url} 
                            alt="Preview" 
                            style={{ 
                              width: '100%', 
                              height: '150px', 
                              objectFit: 'cover', 
                              borderRadius: '8px',
                              border: '2px solid #e5e7eb'
                            }} 
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          type="submit" 
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                          onMouseLeave={(e) => e.target.style.opacity = '1'}
                        >
                          ✓ Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingImage(null)}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                          onMouseLeave={(e) => e.target.style.opacity = '1'}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {/* Image Display */}
                      <div style={{ 
                        position: 'relative',
                        width: '100%',
                        height: '240px',
                        overflow: 'hidden',
                        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
                      }}>
                        <img 
                          src={image.url} 
                          alt={image.alt} 
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        {/* Overlay on hover */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
                          opacity: 0,
                          transition: 'opacity 0.3s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                        />
                      </div>

                      {/* Image Info */}
                      <div style={{ padding: '1.25rem' }}>
                        <div style={{
                          marginBottom: '1rem',
                          paddingBottom: '1rem',
                          borderBottom: '2px solid #f3f4f6'
                        }}>
                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '0.25rem'
                          }}>
                            Alt Text
                          </div>
                          <div style={{
                            fontSize: '0.95rem',
                            fontWeight: '700',
                            color: '#111827',
                            wordBreak: 'break-word'
                          }}>
                            {image.alt}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setEditingImage({ ...image })}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              background: 'linear-gradient(135deg, #000000 0%, #374151 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.02)';
                              e.target.style.background = 'linear-gradient(135deg, #111827 0%, #4b5563 100%)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1)';
                              e.target.style.background = 'linear-gradient(135deg, #000000 0%, #374151 100%)';
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteImage(image.id)}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              background: 'linear-gradient(135deg, #dc0000 0%, #991b1b 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.02)';
                              e.target.style.background = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1)';
                              e.target.style.background = 'linear-gradient(135deg, #dc0000 0%, #991b1b 100%)';
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <div className={styles.section}>
            <h2>Channels Section</h2>

            <form onSubmit={handleChannelsUpdate}>
              <div className={styles.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.channels.enabled}
                    onChange={(e) => setConfig({
                      ...config,
                      channels: { ...config.channels, enabled: e.target.checked }
                    })}
                    style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: '#dc0000' }}
                  />
                  <span style={{ fontWeight: 600 }}>Show Channels Section</span>
                </label>
              </div>

              <div className={styles.formGroup}>
                <label>Section Title</label>
                <input
                  type="text"
                  value={config.channels.title}
                  onChange={(e) => setConfig({
                    ...config,
                    channels: { ...config.channels, title: e.target.value }
                  })}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Section Subtitle</label>
                <input
                  type="text"
                  value={config.channels.subtitle}
                  onChange={(e) => setConfig({
                    ...config,
                    channels: { ...config.channels, subtitle: e.target.value }
                  })}
                  className={styles.input}
                />
              </div>

              <hr style={{ margin: '2rem 0', border: 'none', borderTop: '2px solid #e5e7eb' }} />

              <h3 style={{ marginBottom: '1.5rem' }}>TikTok Widget</h3>

              <div className={styles.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.channels.showTikTok}
                    onChange={(e) => setConfig({
                      ...config,
                      channels: { ...config.channels, showTikTok: e.target.checked }
                    })}
                    style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: '#dc0000' }}
                  />
                  <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>Show TikTok Feed</span>
                </label>
              </div>

              <div className={styles.formGroup}>
                <label>TikTok Username</label>
                <input
                  type="text"
                  value={config.channels.tiktokUsername}
                  onChange={(e) => setConfig({
                    ...config,
                    channels: { ...config.channels, tiktokUsername: e.target.value }
                  })}
                  className={styles.input}
                  placeholder="@yourhandle"
                />
                <div className={styles.helpText}>
                  Enter your TikTok username (e.g., @winterleaguecricket)
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>TikTok Video URL</label>
                <input
                  type="text"
                  value={config.channels.tiktokVideoUrl}
                  onChange={(e) => setConfig({
                    ...config,
                    channels: { ...config.channels, tiktokVideoUrl: e.target.value }
                  })}
                  className={styles.input}
                  placeholder="https://www.tiktok.com/@username/video/1234567890"
                />
                <div className={styles.helpText}>
                  Paste the URL of the TikTok video you want to display (e.g., from your latest post)
                </div>
              </div>

              <div className={styles.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.channels.tiktokAutoLatest}
                    onChange={(e) => setConfig({
                      ...config,
                      channels: { ...config.channels, tiktokAutoLatest: e.target.checked }
                    })}
                    style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: '#dc0000' }}
                  />
                  <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>Use video URL (recommended)</span>
                </label>
                <div className={styles.helpText}>
                  When enabled, displays the video from the URL above. If disabled, uses the embed code below.
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>TikTok Embed Code (Manual)</label>
                <textarea
                  value={config.channels.tiktokEmbedCode}
                  onChange={(e) => setConfig({
                    ...config,
                    channels: { ...config.channels, tiktokEmbedCode: e.target.value }
                  })}
                  className={styles.textarea}
                  rows="4"
                  placeholder='<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@username/video/1234567890" ...'
                  disabled={config.channels.tiktokAutoLatest}
                />
                <div className={styles.helpText}>
                  {config.channels.tiktokAutoLatest 
                    ? 'Disabled while auto-display is enabled'
                    : 'Optional: Paste TikTok embed code from a specific video. If empty, will show a profile link.'
                  }
                </div>
              </div>

              <button type="submit" className={styles.saveButton}>
                Save Channels Settings
              </button>
            </form>

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#e0f2fe', borderRadius: '8px', border: '2px solid #0ea5e9' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#0c4a6e' }}>
                📊 Current Settings:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#0c4a6e' }}>
                <li>TikTok Enabled: <strong>{config.channels.showTikTok ? 'Yes ✅' : 'No ❌'}</strong></li>
                <li>Use Video URL: <strong>{config.channels.tiktokAutoLatest ? 'Yes ✅' : 'No ❌'}</strong></li>
                <li>Username: <strong>{config.channels.tiktokUsername || '(not set)'}</strong></li>
                <li>Video URL: <strong>{config.channels.tiktokVideoUrl ? 'Set ✅' : 'Not set'}</strong></li>
                <li>Has Embed Code: <strong>{config.channels.tiktokEmbedCode ? 'Yes' : 'No'}</strong></li>
              </ul>
            </div>
            
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ margin: 0, color: '#6b7280' }}>
                💡 <strong>Tip:</strong> To manage channel buttons, go to <Link href="/admin/buttons" style={{ color: '#dc0000', fontWeight: 600 }}>Button Management</Link>.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
