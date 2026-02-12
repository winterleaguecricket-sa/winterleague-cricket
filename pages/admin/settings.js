import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../../styles/adminSiteSettings.module.css'
import { siteConfig as initialConfig } from '../../data/products'
import { getActiveFunnels } from '../../data/funnels'

const SECTION_OPTIONS = [
  { key: 'quick-settings', label: '⚙️ Quick Settings', icon: 'settings' },
  { key: 'site-access', label: '🛡️ Site Access', icon: 'shield' },
  { key: 'store-info', label: '🏪 Store Information', icon: 'store' },
  { key: 'hero-section', label: '🎬 Hero Section', icon: 'hero' },
  { key: 'banner', label: '📢 Banner Settings', icon: 'banner' },
  { key: 'display', label: '📺 Display Settings', icon: 'display' },
  { key: 'typography', label: '🔤 Typography', icon: 'typography' },
  { key: 'colors', label: '🎨 Color Theme', icon: 'palette' },
  { key: 'funnels', label: '🔗 Button Funnels', icon: 'link' },
];

export default function AdminSettings() {
  const [config, setConfig] = useState(initialConfig);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('quick-settings');
  const [comingSoonEnabled, setComingSoonEnabled] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState('');
  const [comingSoonSubtitle, setComingSoonSubtitle] = useState('');
  const [comingSoonLogoUrl, setComingSoonLogoUrl] = useState('');
  const [comingSoonMediaType, setComingSoonMediaType] = useState('none');
  const [comingSoonMediaUrl, setComingSoonMediaUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [kitBasePrice, setKitBasePrice] = useState(150);
  const [kitIncludedText, setKitIncludedText] = useState('');
  const [kitSaved, setKitSaved] = useState(false);
  const activeFunnels = getActiveFunnels();

  useEffect(() => {
    const fetchHomepageConfig = async () => {
      try {
        const response = await fetch('/api/homepage');
        const data = await response.json();
        if (data.success) {
          const siteAccess = data.config?.siteAccess || {};
          setComingSoonEnabled(!!siteAccess.comingSoonEnabled);
          setComingSoonTitle(siteAccess.title || '');
          setComingSoonSubtitle(siteAccess.subtitle || '');
          setComingSoonLogoUrl(siteAccess.logoUrl || '');
          setComingSoonMediaType(siteAccess.mediaType || 'none');
          setComingSoonMediaUrl(siteAccess.mediaUrl || '');
        }
      } catch (error) {
        console.error('Error fetching homepage config:', error);
      }
    };

    const fetchSiteConfig = async () => {
      try {
        const response = await fetch('/api/site-config');
        const data = await response.json();
        if (data.success && data.config) {
          setConfig(data.config);
        }
      } catch (error) {
        console.error('Error fetching site config:', error);
      }
    };

    const fetchKitPricing = async () => {
      try {
        const response = await fetch('/api/entry-fee-settings');
        const data = await response.json();
        if (data?.success) {
          if (data.baseFee !== undefined) {
            setKitBasePrice(parseFloat(data.baseFee) || 0);
          }
          if (Array.isArray(data.includedItems)) {
            setKitIncludedText(data.includedItems.join('\n'));
          }
        }
      } catch (error) {
        console.error('Error fetching kit pricing:', error);
      }
    };

    fetchHomepageConfig();
    fetchSiteConfig();
    fetchKitPricing();
  }, []);

  const handleSaveKitPricing = async () => {
    const includedItems = kitIncludedText
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean);
    try {
      const res = await fetch('/api/entry-fee-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseFee: kitBasePrice,
          includedItems
        })
      });
      const data = await res.json();
      if (data?.success) {
        setKitSaved(true);
        setTimeout(() => setKitSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving kit pricing:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFunnelChange = (buttonKey, funnelId) => {
    setConfig(prev => ({
      ...prev,
      buttonFunnels: {
        ...prev.buttonFunnels,
        [buttonKey]: funnelId ? Number(funnelId) : null
      }
    }));
  };

  const uploadSiteAsset = async (file, fieldName) => {
    if (!file) return;

    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    const isHeroMedia = fieldName === 'heroMediaUrl';

    if (isHeroMedia) {
      if (![...validImageTypes, ...validVideoTypes].includes(file.type)) {
        alert('Please upload a valid image or video file (JPG, PNG, GIF, WebP, SVG, MP4, WebM, OGG)');
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        alert('Media file must be less than 25MB');
        return;
      }
    } else {
      if (!validImageTypes.includes(file.type)) {
        alert('Please upload a valid image file (JPG, PNG, GIF, WebP, SVG)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Logo file must be less than 5MB');
        return;
      }
    }

    try {
      setUploadingAsset(true);
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(`/api/upload-site-asset?type=${isHeroMedia ? 'hero' : 'logo'}` , {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();
      if (!data.success) {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
        return;
      }

      setConfig(prev => ({
        ...prev,
        [fieldName]: data.url
      }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingAsset(false);
    }
  };

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      uploadSiteAsset(file, fieldName);
    }
  };

  const uploadComingSoonAsset = async (file, type) => {
    if (!file) return;

    const isMedia = type === 'media';
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];

    if (isMedia) {
      if (![...validImageTypes, ...validVideoTypes].includes(file.type)) {
        alert('Please upload a valid image or video file (JPG, PNG, GIF, WebP, SVG, MP4, WebM, OGG)');
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        alert('Media file must be less than 25MB');
        return;
      }
    } else {
      if (!validImageTypes.includes(file.type)) {
        alert('Please upload a valid image file (JPG, PNG, GIF, WebP, SVG)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Logo file must be less than 5MB');
        return;
      }
    }

    try {
      if (isMedia) {
        setUploadingMedia(true);
      } else {
        setUploadingLogo(true);
      }

      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(`/api/upload-coming-soon?type=${type}`, {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();
      if (!data.success) {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
        return;
      }

      if (isMedia) {
        setComingSoonMediaUrl(data.url);
        if (validVideoTypes.includes(data.mimeType)) {
          setComingSoonMediaType('video');
        } else {
          setComingSoonMediaType('image');
        }
      } else {
        setComingSoonLogoUrl(data.url);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      if (isMedia) {
        setUploadingMedia(false);
      } else {
        setUploadingLogo(false);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (activeSection === 'site-access') {
        await fetch('/api/homepage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: 'siteAccess',
            updates: {
              comingSoonEnabled,
              title: comingSoonTitle,
              subtitle: comingSoonSubtitle,
              logoUrl: comingSoonLogoUrl,
              mediaType: comingSoonMediaType,
              mediaUrl: comingSoonMediaUrl,
            },
          }),
        });
      } else {
        const response = await fetch('/api/site-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config }),
        });
        const data = await response.json();
        if (data.success && data.config) {
          setConfig(data.config);
        } else {
          throw new Error(data.error || 'Failed to save site settings');
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const renderSectionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  return (
    <div className={styles.container}>
      <Head>
        <title>Site Settings - Admin Panel</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>⚙️ Site Settings</h1>
          <nav className={styles.nav}>
            <Link href="/admin" className={styles.navLink}>← Back to Admin</Link>
            <Link href="/" className={styles.navLink}>View Store</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {saved && <div className={styles.savedIndicator}>✓ Changes saved!</div>}

        {/* Section Selector Dropdown */}
        <div className={styles.sectionSelector}>
          <div className={styles.sectionIcon}>
            {renderSectionIcon()}
          </div>
          <span className={styles.sectionLabel}>Section</span>
          <select
            className={styles.sectionSelect}
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
          >
            {SECTION_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Quick Settings */}
        {activeSection === 'quick-settings' && (
          <>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>⚙️ Quick Settings</h3>
              <p className={styles.cardSubtitle}>Quick access to commonly used settings pages</p>
              <div className={styles.quickLinksWrapper}>
                <div className={styles.quickLinks}>
                <Link href="/admin/buttons" className={styles.quickLink}>
                  <span className={styles.quickLinkIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="7" width="16" height="10" rx="5" />
                      <circle cx="9" cy="12" r="2" />
                    </svg>
                  </span>
                  Manage Buttons
                </Link>
                <Link href="/admin/menu" className={styles.quickLink}>
                  <span className={styles.quickLinkIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19 5l-3 3" />
                      <path d="M5 19l3-3" />
                      <path d="M19 19l-3-3" />
                      <path d="M5 5l3 3" />
                    </svg>
                  </span>
                  Manage Menu
                </Link>
                <Link href="/admin/payment" className={styles.quickLink}>
                  <span className={styles.quickLinkIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7h18v10H3Z" />
                      <path d="M7 7V5h10v2" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </span>
                  Payment Settings
                </Link>
                <Link href="/admin/kit-pricing" className={styles.quickLink}>
                  <span className={styles.quickLinkIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v18" />
                      <path d="M16 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H8" />
                    </svg>
                  </span>
                  Kit Base Price
                </Link>
                <Link href="/admin/entry-fee" className={styles.quickLink}>
                  <span className={styles.quickLinkIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 7h12l-1 12H7L6 7Z" />
                      <path d="M9 7a3 3 0 0 1 6 0" />
                    </svg>
                  </span>
                  Entry Fee
                </Link>
                <Link href="/admin/registration-products" className={styles.quickLink}>
                  <span className={styles.quickLinkIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7l9-4 9 4-9 4-9-4Z" />
                      <path d="M3 7v10l9 4 9-4V7" />
                      <path d="M12 11v10" />
                    </svg>
                  </span>
                  Registration Products
                </Link>
                <Link href="/admin/supporter-products" className={styles.quickLink}>
                  <span className={styles.quickLinkIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 5l4 3 4-3 3 2-2 4v10H7V11L5 7l3-2Z" />
                    </svg>
                  </span>
                  Supporter Apparel
                </Link>
                <Link href="/admin/registration-banner" className={styles.quickLink}>
                  <span className={styles.quickLinkIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="M3 9h18" />
                      <path d="M7 13h6" />
                      <path d="M7 17h4" />
                    </svg>
                  </span>
                  Player Reg Banner
                </Link>
                <Link href="/admin/team-registration-banner" className={styles.quickLink}>
                  <span className={styles.quickLinkIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="8" r="3" />
                      <circle cx="16" cy="8" r="3" />
                      <path d="M2 20a6 6 0 0 1 12 0" />
                      <path d="M10 20a6 6 0 0 1 12 0" />
                    </svg>
                  </span>
                  Team Reg Banner
                </Link>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>🏆 League Entry Fee</h3>
              <p className={styles.cardSubtitle}>Update the league entry fee and the “What’s Included” list shown on the Team Registration form.</p>
              <div className={styles.formGroup}>
                <label>Base Entry Fee (R)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={kitBasePrice}
                  onChange={(e) => setKitBasePrice(parseFloat(e.target.value) || 0)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>What’s Included (one item per line)</label>
                <textarea
                  rows={6}
                  value={kitIncludedText}
                  onChange={(e) => setKitIncludedText(e.target.value)}
                  className={styles.textarea}
                />
              </div>
              <button
                type="button"
                onClick={handleSaveKitPricing}
                className={styles.primaryButton}
              >
                Save Entry Fee
              </button>
              {kitSaved && <p className={styles.cardSubtitle}>✓ Entry fee updated</p>}
            </div>
          </>
        )}

        {/* Site Access */}
        {activeSection === 'site-access' && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>🛡️ Site Access</h3>
            <p className={styles.cardSubtitle}>Control access to your website</p>

            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="comingSoonEnabled"
                checked={comingSoonEnabled}
                onChange={(e) => setComingSoonEnabled(e.target.checked)}
              />
              <span>Enable Coming Soon splash on homepage</span>
            </div>

            <div className={styles.formGroup}>
              <label>Coming Soon Title</label>
              <input
                type="text"
                value={comingSoonTitle}
                onChange={(e) => setComingSoonTitle(e.target.value)}
                className={styles.input}
                placeholder="We're getting things ready"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Coming Soon Subtitle</label>
              <textarea
                value={comingSoonSubtitle}
                onChange={(e) => setComingSoonSubtitle(e.target.value)}
                className={styles.textarea}
                rows={3}
                placeholder="Thanks for your patience..."
              />
            </div>

            <div className={styles.formGroup}>
              <label>Logo Upload (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadComingSoonAsset(e.target.files[0], 'logo')}
                className={styles.fileInput}
                disabled={uploadingLogo}
              />
              {comingSoonLogoUrl && (
                <div className={styles.imagePreview}>
                  <img src={comingSoonLogoUrl} alt="Logo preview" />
                  <button
                    type="button"
                    onClick={() => setComingSoonLogoUrl('')}
                    className={styles.removeButton}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Media Type</label>
              <select
                value={comingSoonMediaType}
                onChange={(e) => setComingSoonMediaType(e.target.value)}
                className={styles.select}
              >
                <option value="none">None</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>

            {comingSoonMediaType !== 'none' && (
              <div className={styles.formGroup}>
                <label>{comingSoonMediaType === 'image' ? 'Image' : 'Video'} Upload</label>
                <input
                  type="file"
                  accept={comingSoonMediaType === 'image' ? 'image/*' : 'video/*'}
                  onChange={(e) => uploadComingSoonAsset(e.target.files[0], 'media')}
                  className={styles.fileInput}
                  disabled={uploadingMedia}
                />
                {comingSoonMediaUrl && (
                  <div className={styles.mediaPreview}>
                    {comingSoonMediaType === 'image' ? (
                      <img src={comingSoonMediaUrl} alt="Media preview" />
                    ) : (
                      <video src={comingSoonMediaUrl} controls />
                    )}
                    <button
                      type="button"
                      onClick={() => setComingSoonMediaUrl('')}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className={styles.helpText}>
              Public users will see the splash screen on the homepage. You can still preview the homepage using the link below.
            </p>
            <Link href="/?preview=1" className={styles.navLink} style={{ color: '#dc0000' }}>
              Preview homepage (bypass splash) →
            </Link>

            <div className={styles.buttonRow}>
              <button type="button" onClick={handleSave} className={styles.primaryButton}>
                Save Site Access Settings
              </button>
            </div>
          </div>
        )}

        {/* Store Information */}
        {activeSection === 'store-info' && (
          <form onSubmit={handleSave}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>🏪 Store Information</h3>

              <div className={styles.formGroup}>
                <label>Store Name</label>
                <input
                  type="text"
                  name="storeName"
                  value={config.storeName}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Tagline</label>
                <input
                  type="text"
                  name="tagline"
                  value={config.tagline}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Upload Logo Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'logoUrl')}
                  className={styles.fileInput}
                />
                {config.logoUrl && (
                  <div className={styles.imagePreview}>
                    <img src={config.logoUrl} alt="Logo preview" />
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, logoUrl: '' }))}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.buttonRow}>
                <button type="submit" className={styles.primaryButton}>
                  Save Changes
                </button>
              </div>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>✨ Favicon</h3>
              <p className={styles.cardSubtitle}>Upload a round-friendly favicon to match your logo.</p>

              <div className={styles.formGroup}>
                <label>Upload Favicon Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'faviconUrl')}
                  className={styles.fileInput}
                />
                {config.faviconUrl && (
                  <div className={styles.faviconPreview}>
                    <img src={config.faviconUrl} alt="Favicon preview" />
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, faviconUrl: '' }))}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <p className={styles.helpText}>Recommended: square PNG, 512×512. Preview is rounded.</p>
              </div>

              <div className={styles.buttonRow}>
                <button type="submit" className={styles.primaryButton}>
                  Save Favicon
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Hero Section */}
        {activeSection === 'hero-section' && (
          <form onSubmit={handleSave}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>🎬 Hero Section</h3>

              <div className={styles.formGroup}>
                <label>Hero Media Type</label>
                <select
                  name="heroMediaType"
                  value={config.heroMediaType}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Upload Hero {config.heroMediaType === 'image' ? 'Image' : 'Video'}</label>
                <input
                  type="file"
                  accept={config.heroMediaType === 'image' ? 'image/*' : 'video/*'}
                  onChange={(e) => handleFileUpload(e, 'heroMediaUrl')}
                  className={styles.fileInput}
                />
                {config.heroMediaUrl && (
                  <div className={styles.mediaPreview}>
                    {config.heroMediaType === 'image' ? (
                      <img src={config.heroMediaUrl} alt="Hero preview" />
                    ) : (
                      <video src={config.heroMediaUrl} controls />
                    )}
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, heroMediaUrl: '' }))}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Hero Title</label>
                <input
                  type="text"
                  name="heroTitle"
                  value={config.heroTitle}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Hero Subtitle</label>
                <input
                  type="text"
                  name="heroSubtitle"
                  value={config.heroSubtitle}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.buttonRow}>
                <button type="submit" className={styles.primaryButton}>
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Banner Settings */}
        {activeSection === 'banner' && (
          <form onSubmit={handleSave}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>📢 Banner Settings</h3>

              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  name="showBanner"
                  id="showBanner"
                  checked={config.showBanner}
                  onChange={handleInputChange}
                />
                <span>Show promotional banner</span>
              </div>

              {config.showBanner && (
                <div className={styles.formGroup}>
                  <label>Banner Text</label>
                  <input
                    type="text"
                    name="bannerText"
                    value={config.bannerText}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>
              )}

              <div className={styles.buttonRow}>
                <button type="submit" className={styles.primaryButton}>
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Display Settings */}
        {activeSection === 'display' && (
          <form onSubmit={handleSave}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>📺 Display Settings</h3>

              <div className={styles.formGroup}>
                <label>Featured Category on Homepage</label>
                <select
                  name="featuredCategory"
                  value={config.featuredCategory}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value="premium">Premium Equipment</option>
                  <option value="training">Training Gear</option>
                  <option value="all">All Products</option>
                </select>
              </div>

              <div className={styles.buttonRow}>
                <button type="submit" className={styles.primaryButton}>
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Typography */}
        {activeSection === 'typography' && (
          <form onSubmit={handleSave}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>🔤 Typography</h3>

              <div className={styles.formGroup}>
                <label>Font Family</label>
                <select
                  name="fontFamily"
                  value={config.fontFamily}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value="Inter">Inter (Modern Sans-Serif)</option>
                  <option value="Poppins">Poppins (Geometric Sans-Serif)</option>
                  <option value="Montserrat">Montserrat (Clean Sans-Serif)</option>
                  <option value="Playfair Display">Playfair Display (Elegant Serif)</option>
                </select>
                <p className={styles.helpText}>
                  Preview: <span style={{ fontFamily: config.fontFamily }}>The quick brown fox jumps over the lazy dog</span>
                </p>
              </div>

              <div className={styles.buttonRow}>
                <button type="submit" className={styles.primaryButton}>
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Color Theme */}
        {activeSection === 'colors' && (
          <form onSubmit={handleSave}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>🎨 Color Theme</h3>

              <div className={styles.colorGrid}>
                <div className={styles.formGroup}>
                  <label>Primary Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      name="primaryColor"
                      value={config.primaryColor}
                      onChange={handleInputChange}
                      className={styles.colorPicker}
                    />
                    <input
                      type="text"
                      value={config.primaryColor}
                      onChange={handleInputChange}
                      name="primaryColor"
                      className={styles.colorText}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Secondary Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      name="secondaryColor"
                      value={config.secondaryColor}
                      onChange={handleInputChange}
                      className={styles.colorPicker}
                    />
                    <input
                      type="text"
                      value={config.secondaryColor}
                      onChange={handleInputChange}
                      name="secondaryColor"
                      className={styles.colorText}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Accent Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      name="accentColor"
                      value={config.accentColor}
                      onChange={handleInputChange}
                      className={styles.colorPicker}
                    />
                    <input
                      type="text"
                      value={config.accentColor}
                      onChange={handleInputChange}
                      name="accentColor"
                      className={styles.colorText}
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className={styles.preview}>
                <h4>Live Preview</h4>
                <p className={styles.previewNote}>Changes update in real-time below.</p>
                <div className={styles.previewBox} style={{ fontFamily: config.fontFamily }}>
                  <div
                    className={styles.previewHeader}
                    style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)` }}
                  >
                    {config.logoUrl ? (
                      <img src={config.logoUrl} alt="Logo" style={{ maxHeight: '40px', maxWidth: '150px', objectFit: 'contain' }} />
                    ) : (
                      <h4 style={{ margin: 0 }}>🏏 {config.storeName}</h4>
                    )}
                  </div>
                  {config.showBanner && (
                    <div className={styles.previewBanner} style={{ background: config.accentColor, color: 'white' }}>
                      {config.bannerText}
                    </div>
                  )}
                  <div className={styles.previewContent}>
                    <h5 style={{ fontFamily: config.fontFamily }}>{config.tagline}</h5>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ padding: '0.5rem 1rem', background: config.primaryColor, color: 'white', borderRadius: '6px', fontSize: '0.85rem' }}>
                        Primary
                      </div>
                      <div style={{ padding: '0.5rem 1rem', background: config.secondaryColor, color: 'white', borderRadius: '6px', fontSize: '0.85rem' }}>
                        Secondary
                      </div>
                      <div style={{ padding: '0.5rem 1rem', background: config.accentColor, color: 'white', borderRadius: '6px', fontSize: '0.85rem' }}>
                        Accent
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.buttonRow}>
                <button type="submit" className={styles.primaryButton}>
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setConfig(initialConfig)}
                  className={styles.secondaryButton}
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Button Funnels */}
        {activeSection === 'funnels' && (
          <form onSubmit={handleSave}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>🔗 Button Funnels</h3>
              <p className={styles.sectionDescription}>
                Attach sales funnels to buttons throughout your website. When a funnel is attached,
                clicking the button will start the funnel flow instead of navigating to a regular page.
              </p>

              <div className={styles.formGroup}>
                <label>Hero Primary Button (Shop Premium)</label>
                <select
                  value={config.buttonFunnels?.heroPrimary || ''}
                  onChange={(e) => handleFunnelChange('heroPrimary', e.target.value)}
                  className={styles.select}
                >
                  <option value="">No Funnel (Regular Link)</option>
                  {activeFunnels.map(funnel => (
                    <option key={funnel.id} value={funnel.id}>
                      {funnel.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Hero Secondary Button (Training Gear)</label>
                <select
                  value={config.buttonFunnels?.heroSecondary || ''}
                  onChange={(e) => handleFunnelChange('heroSecondary', e.target.value)}
                  className={styles.select}
                >
                  <option value="">No Funnel (Regular Link)</option>
                  {activeFunnels.map(funnel => (
                    <option key={funnel.id} value={funnel.id}>
                      {funnel.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Premium Equipment Channel Button</label>
                <select
                  value={config.buttonFunnels?.premiumChannel || ''}
                  onChange={(e) => handleFunnelChange('premiumChannel', e.target.value)}
                  className={styles.select}
                >
                  <option value="">No Funnel (Regular Link)</option>
                  {activeFunnels.map(funnel => (
                    <option key={funnel.id} value={funnel.id}>
                      {funnel.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Training Gear Channel Button</label>
                <select
                  value={config.buttonFunnels?.trainingChannel || ''}
                  onChange={(e) => handleFunnelChange('trainingChannel', e.target.value)}
                  className={styles.select}
                >
                  <option value="">No Funnel (Regular Link)</option>
                  {activeFunnels.map(funnel => (
                    <option key={funnel.id} value={funnel.id}>
                      {funnel.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.buttonRow}>
                <button type="submit" className={styles.primaryButton}>
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
