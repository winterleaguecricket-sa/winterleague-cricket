import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../../styles/adminManage.module.css'

export default function AdminPages() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    category: 'general',
    active: true
  });

  // Category options matching footer structure
  const categoryOptions = [
    { value: 'company', label: 'Company' },
    { value: 'customer-service', label: 'Customer Service' },
    { value: 'legal', label: 'Legal' },
    { value: 'resources', label: 'Resources' },
    { value: 'general', label: 'General' }
  ];

  // Load pages from API
  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pages');
      const data = await response.json();
      if (data.success) {
        setPages(data.pages);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Auto-generate slug from title for new pages
    if (name === 'title' && !editingPage) {
      setFormData(prev => ({
        ...prev,
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }));
    }
  };

  const handleAddPage = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setPages(data.pages);
        resetForm();
        alert('Page created successfully!');
      } else {
        alert(data.error || 'Failed to create page');
      }
    } catch (error) {
      console.error('Error creating page:', error);
      alert('Error creating page');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPage = (page) => {
    setEditingPage(page.id);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content || '',
      category: page.category || 'general',
      active: page.active !== false
    });
    setShowAddForm(false);
  };

  const handleUpdatePage = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch('/api/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingPage, ...formData })
      });
      
      const data = await response.json();
      if (data.success) {
        setPages(data.pages);
        resetForm();
        alert('Page updated successfully!');
      } else {
        alert(data.error || 'Failed to update page');
      }
    } catch (error) {
      console.error('Error updating page:', error);
      alert('Error updating page');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async (id) => {
    if (!confirm('Are you sure you want to delete this page? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/pages?id=${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        setPages(data.pages);
        alert('Page deleted successfully!');
      } else {
        alert(data.error || 'Failed to delete page');
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Error deleting page');
    }
  };

  const togglePageActive = async (page) => {
    try {
      const response = await fetch('/api/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: page.id, active: !page.active })
      });
      
      const data = await response.json();
      if (data.success) {
        setPages(data.pages);
      }
    } catch (error) {
      console.error('Error toggling page:', error);
    }
  };

  const resetForm = () => {
    setEditingPage(null);
    setShowAddForm(false);
    setFormData({
      title: '',
      slug: '',
      content: '',
      category: 'general',
      active: true
    });
  };

  // Group pages by category for display
  const groupedPages = pages.reduce((acc, page) => {
    const cat = page.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(page);
    return acc;
  }, {});

  return (
    <div className={styles.container}>
      <Head>
        <title>Page Management - Admin Panel</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>📄 Page Management</h1>
          <nav className={styles.nav}>
            <Link href="/admin" className={styles.navLink}>← Back to Admin</Link>
            <Link href="/" className={styles.navLink}>View Store</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <h2>Manage Pages ({pages.length} pages)</h2>
          <button 
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingPage(null);
              if (!showAddForm) {
                setFormData({
                  title: '',
                  slug: '',
                  content: '',
                  category: 'general',
                  active: true
                });
              }
            }} 
            className={styles.addButton}
          >
            {showAddForm ? 'Cancel' : '+ Add New Page'}
          </button>
        </div>

        {/* Info box */}
        <div style={{
          backgroundColor: '#1a3a1a',
          border: '1px solid #2d5a2d',
          borderRadius: '8px',
          padding: '15px 20px',
          marginBottom: '20px',
          color: '#90ee90'
        }}>
          <strong>ℹ️ Footer Pages:</strong> These pages are linked from the footer. Edit content using Markdown formatting. 
          Pages marked as inactive will show a 404 error.
        </div>

        {(showAddForm || editingPage) && (
          <form 
            onSubmit={editingPage ? handleUpdatePage : handleAddPage}
            className={styles.form}
            style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', marginBottom: '30px' }}
          >
            <h3 style={{ color: '#dc0000', marginBottom: '20px' }}>
              {editingPage ? '✏️ Edit Page' : '➕ Create New Page'}
            </h3>
            
            <div className={styles.formRow} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div className={styles.formGroup}>
                <label style={{ color: '#ccc', marginBottom: '5px', display: 'block' }}>Page Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., About Us"
                  className={styles.input}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    backgroundColor: '#222', 
                    border: '1px solid #444', 
                    borderRadius: '5px',
                    color: 'white'
                  }}
                />
              </div>

              <div className={styles.formGroup}>
                <label style={{ color: '#ccc', marginBottom: '5px', display: 'block' }}>URL Slug *</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., about-us"
                  className={styles.input}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    backgroundColor: '#222', 
                    border: '1px solid #444', 
                    borderRadius: '5px',
                    color: 'white'
                  }}
                />
                <small style={{ color: '#888', fontSize: '0.85rem' }}>URL: /{formData.slug}</small>
              </div>

              <div className={styles.formGroup}>
                <label style={{ color: '#ccc', marginBottom: '5px', display: 'block' }}>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    backgroundColor: '#222', 
                    border: '1px solid #444', 
                    borderRadius: '5px',
                    color: 'white'
                  }}
                >
                  {categoryOptions.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGroup} style={{ marginTop: '20px' }}>
              <label style={{ color: '#ccc', marginBottom: '5px', display: 'block' }}>
                Page Content (Markdown supported) *
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
                rows="15"
                placeholder="# Page Title

## Section Heading

Write your content here using **Markdown** formatting.

- Bullet points
- Are supported

[Links](https://example.com) work too!"
                style={{ 
                  width: '100%', 
                  padding: '15px', 
                  backgroundColor: '#222', 
                  border: '1px solid #444', 
                  borderRadius: '5px',
                  color: 'white',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  resize: 'vertical'
                }}
              />
              <small style={{ color: '#888', fontSize: '0.85rem' }}>
                Supports Markdown: # headings, **bold**, *italic*, - lists, [links](url), | tables |
              </small>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                name="active"
                id="active"
                checked={formData.active}
                onChange={handleInputChange}
                style={{ width: '18px', height: '18px' }}
              />
              <label htmlFor="active" style={{ color: '#ccc' }}>Page is active (visible on website)</label>
            </div>

            <div className={styles.formActions} style={{ marginTop: '25px', display: 'flex', gap: '15px' }}>
              <button 
                type="submit" 
                disabled={saving}
                style={{
                  padding: '12px 30px',
                  backgroundColor: '#dc0000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : editingPage ? 'Update Page' : 'Create Page'}
              </button>
              <button 
                type="button" 
                onClick={resetForm}
                style={{
                  padding: '12px 30px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: '1px solid #555',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
            Loading pages...
          </div>
        ) : (
          <div>
            {categoryOptions.map(cat => {
              const categoryPages = groupedPages[cat.value] || [];
              if (categoryPages.length === 0) return null;
              
              return (
                <div key={cat.value} style={{ marginBottom: '30px' }}>
                  <h3 style={{ 
                    color: '#dc0000', 
                    borderBottom: '1px solid #333', 
                    paddingBottom: '10px',
                    marginBottom: '15px'
                  }}>
                    {cat.label} ({categoryPages.length})
                  </h3>
                  
                  <div className={styles.tableContainer}>
                    <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#1a1a1a' }}>
                          <th style={{ padding: '12px', textAlign: 'left', color: '#888', borderBottom: '1px solid #333' }}>Title</th>
                          <th style={{ padding: '12px', textAlign: 'left', color: '#888', borderBottom: '1px solid #333' }}>URL</th>
                          <th style={{ padding: '12px', textAlign: 'center', color: '#888', borderBottom: '1px solid #333' }}>Status</th>
                          <th style={{ padding: '12px', textAlign: 'right', color: '#888', borderBottom: '1px solid #333' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryPages.map(page => (
                          <tr key={page.id} style={{ borderBottom: '1px solid #222' }}>
                            <td style={{ padding: '12px', color: 'white' }}>
                              {page.title}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <code style={{ 
                                backgroundColor: '#222', 
                                padding: '3px 8px', 
                                borderRadius: '4px',
                                color: '#dc0000',
                                fontSize: '0.9rem'
                              }}>
                                /{page.slug}
                              </code>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <button
                                onClick={() => togglePageActive(page)}
                                style={{
                                  padding: '4px 12px',
                                  backgroundColor: page.active ? '#1a3a1a' : '#3a1a1a',
                                  color: page.active ? '#90ee90' : '#ff6b6b',
                                  border: `1px solid ${page.active ? '#2d5a2d' : '#5a2d2d'}`,
                                  borderRadius: '12px',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem'
                                }}
                              >
                                {page.active ? '✓ Active' : '✗ Inactive'}
                              </button>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <a 
                                  href={`/${page.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#222',
                                    color: '#888',
                                    textDecoration: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  View
                                </a>
                                <button 
                                  onClick={() => handleEditPage(page)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#2a4a2a',
                                    color: '#90ee90',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDeletePage(page.id)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#4a2a2a',
                                    color: '#ff6b6b',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #0d0d0d;
        }
      `}</style>
    </div>
  );
}
