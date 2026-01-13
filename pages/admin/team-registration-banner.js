import { useState, useEffect } from 'react';
import styles from '../../styles/adminSettings.module.css';
import { getFormTemplates, updateFormTemplate } from '../../data/forms';

export default function TeamRegistrationBanner() {
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [uploadType, setUploadType] = useState('url');
  const [uploadedFile, setUploadedFile] = useState(null);

  useEffect(() => {
    const forms = getFormTemplates();
    const teamRegForm = forms.find(f => f.id === 1);
    if (teamRegForm?.welcomeBanner) {
      setImageUrl(teamRegForm.welcomeBanner.imageUrl || '');
      setTitle(teamRegForm.welcomeBanner.title || '');
      setSubtitle(teamRegForm.welcomeBanner.subtitle || '');
    }
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
        setUploadedFile(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const forms = getFormTemplates();
    const teamRegForm = forms.find(f => f.id === 1);
    
    if (teamRegForm) {
      teamRegForm.welcomeBanner = {
        imageUrl,
        title,
        subtitle,
        showOnPage: 1
      };
      
      updateFormTemplate(1, teamRegForm);
      alert('Team registration banner updated successfully!');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🎨 Team Registration Banner</h1>
        <p>Customize the welcome banner for the team registration form</p>
      </div>

      <div className={styles.content}>
        {/* Image Upload Section */}
        <div className={styles.section}>
          <h2>Banner Image</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ marginRight: '20px' }}>
              <input
                type="radio"
                value="url"
                checked={uploadType === 'url'}
                onChange={(e) => setUploadType(e.target.value)}
              />
              <span style={{ marginLeft: '8px' }}>Image URL</span>
            </label>
            <label>
              <input
                type="radio"
                value="file"
                checked={uploadType === 'file'}
                onChange={(e) => setUploadType(e.target.value)}
              />
              <span style={{ marginLeft: '8px' }}>Upload File</span>
            </label>
          </div>

          {uploadType === 'url' ? (
            <div className={styles.formGroup}>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/banner-image.jpg"
                className={styles.input}
              />
            </div>
          ) : (
            <div className={styles.formGroup}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className={styles.input}
              />
              {uploadedFile && (
                <p style={{ marginTop: '10px', color: '#10b981', fontSize: '0.9rem' }}>
                  ✓ Uploaded: {uploadedFile}
                </p>
              )}
            </div>
          )}

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
          <button onClick={handleSave} className={styles.saveButton}>
            💾 Save Banner
          </button>
        </div>
      </div>
    </div>
  );
}
