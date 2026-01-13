import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../../styles/adminSettings.module.css'
import { siteConfig as initialConfig } from '../../data/products'
import { getActiveFunnels } from '../../data/funnels'

export default function AdminSettings() {
  const [config, setConfig] = useState(initialConfig);
  const [saved, setSaved] = useState(false);
  const activeFunnels = getActiveFunnels();

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

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, you would upload this to a server
      // For now, we'll create a local URL
      const url = URL.createObjectURL(file);
      setConfig(prev => ({
        ...prev,
        [fieldName]: url
      }));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    // In a real app, this would save to a database
    // For now, we'll update the siteConfig object directly
    Object.assign(initialConfig, config);
    console.log('Saving configuration:', config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

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
        <div className={styles.toolbar}>
          <h2>Customize Your Website</h2>
          {saved && <span className={styles.savedIndicator}>✓ Changes saved!</span>}
        </div>

        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '1rem' }}>⚙️ Quick Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <Link href="/admin/buttons" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textDecoration: 'none', color: '#000', fontWeight: 600, textAlign: 'center' }}>
              🔘 Manage Buttons
            </Link>
            <Link href="/admin/menu" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textDecoration: 'none', color: '#000', fontWeight: 600, textAlign: 'center' }}>
              📋 Manage Menu
            </Link>
            <Link href="/admin/payment" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textDecoration: 'none', color: '#000', fontWeight: 600, textAlign: 'center' }}>
              💳 Payment Settings
            </Link>
            <Link href="/admin/kit-pricing" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textDecoration: 'none', color: '#000', fontWeight: 600, textAlign: 'center' }}>
              💰 Kit Base Price
            </Link>
            <Link href="/admin/entry-fee" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textDecoration: 'none', color: '#000', fontWeight: 600, textAlign: 'center' }}>
              🏆 Entry Fee
            </Link>
            <Link href="/admin/registration-products" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textDecoration: 'none', color: '#000', fontWeight: 600, textAlign: 'center' }}>
              🛍️ Registration Products
            </Link>
            <Link href="/admin/supporter-products" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textDecoration: 'none', color: '#000', fontWeight: 600, textAlign: 'center' }}>
              👕 Supporter Apparel
            </Link>
            <Link href="/admin/registration-banner" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textDecoration: 'none', color: '#000', fontWeight: 600, textAlign: 'center' }}>
              🎨 Player Reg Banner
            </Link>
            <Link href="/admin/team-registration-banner" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textDecoration: 'none', color: '#000', fontWeight: 600, textAlign: 'center' }}>
              🏆 Team Reg Banner
            </Link>
          </div>
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <section className={styles.section}>
            <h3>Store Information</h3>
            
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
          </section>

          <section className={styles.section}>
            <h3>Logo Upload</h3>
            
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
                    onClick={() => setConfig(prev => ({...prev, logoUrl: ''}))}
                    className={styles.removeButton}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className={styles.section}>
            <h3>Hero Section</h3>
            
            <div className={styles.formGroup}>
              <label>Hero Media Type</label>
              <select
                name="heroMediaType"
                value={config.heroMediaType}
                onChange={handleInputChange}
                className={styles.input}
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
                    onClick={() => setConfig(prev => ({...prev, heroMediaUrl: ''}))}
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
          </section>

          <section className={styles.section}>
            <h3>Banner Settings</h3>
            
            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  name="showBanner"
                  checked={config.showBanner}
                  onChange={handleInputChange}
                />
                <span>Show promotional banner</span>
              </label>
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
          </section>

          <section className={styles.section}>
            <h3>Display Settings</h3>
            
            <div className={styles.formGroup}>
              <label>Featured Category on Homepage</label>
              <select
                name="featuredCategory"
                value={config.featuredCategory}
                onChange={handleInputChange}
                className={styles.input}
              >
                <option value="premium">Premium Equipment</option>
                <option value="training">Training Gear</option>
                <option value="all">All Products</option>
              </select>
            </div>
          </section>

          <section className={styles.section}>
            <h3>Typography</h3>
            
            <div className={styles.formGroup}>
              <label>Font Family</label>
              <select
                name="fontFamily"
                value={config.fontFamily}
                onChange={handleInputChange}
                className={styles.input}
              >
                <option value="Inter">Inter (Modern Sans-Serif)</option>
                <option value="Poppins">Poppins (Geometric Sans-Serif)</option>
                <option value="Montserrat">Montserrat (Clean Sans-Serif)</option>
                <option value="Playfair Display">Playfair Display (Elegant Serif)</option>
              </select>
              <p className={styles.helpText}>Preview: <span style={{fontFamily: config.fontFamily}}>The quick brown fox jumps over the lazy dog</span></p>
            </div>
          </section>

          <section className={styles.section}>
            <h3>Button Funnels</h3>
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
          </section>

          <section className={styles.section}>
            <h3>Color Theme</h3>
            
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
          </section>

          <div className={styles.formActions}>
            <button type="submit" className={styles.saveButton}>
              Save Changes
            </button>
            <button 
              type="button" 
              onClick={() => setConfig(initialConfig)}
              className={styles.resetButton}
            >
              Reset to Defaults
            </button>
          </div>
        </form>

        <div className={styles.preview}>
          <h3>Live Preview</h3>
          <p className={styles.previewNote}>Changes update in real-time below. Click "Save Changes" to apply to your store.</p>
          <div className={styles.previewBox} style={{fontFamily: config.fontFamily}}>
            <div 
              className={styles.previewHeader}
              style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)` }}
            >
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" style={{maxHeight: '40px', maxWidth: '150px', objectFit: 'contain'}} />
              ) : (
                <h4 style={{margin: 0}}>🏏 {config.storeName}</h4>
              )}
            </div>
            {config.showBanner && (
              <div className={styles.previewBanner} style={{background: config.accentColor, color: 'white'}}>
                {config.bannerText}
              </div>
            )}
            <div className={styles.previewContent}>
              <h5 style={{fontFamily: config.fontFamily}}>{config.tagline}</h5>
              <p style={{fontFamily: config.fontFamily}}>Font: {config.fontFamily}</p>
              <div style={{marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                <div style={{padding: '0.5rem 1rem', background: config.primaryColor, color: 'white', borderRadius: '6px', fontSize: '0.85rem'}}>
                  Primary
                </div>
                <div style={{padding: '0.5rem 1rem', background: config.secondaryColor, color: 'white', borderRadius: '6px', fontSize: '0.85rem'}}>
                  Secondary
                </div>
                <div style={{padding: '0.5rem 1rem', background: config.accentColor, color: 'white', borderRadius: '6px', fontSize: '0.85rem'}}>
                  Accent
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
