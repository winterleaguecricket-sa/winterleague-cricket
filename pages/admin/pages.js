import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

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
    <div className="container">
      <Head>
        <title>Page Management - Admin Panel</title>
      </Head>

      <header className="header">
        <div className="headerContent">
          <h1 className="logo">📄 Page Management</h1>
          <nav className="nav">
            <Link href="/admin" className="navLink">← Back to Admin</Link>
            <Link href="/" className="navLink">View Store</Link>
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="toolbar">
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
            className="addButton"
          >
            {showAddForm ? 'Cancel' : '+ Add New Page'}
          </button>
        </div>

        {/* Info box */}
        <div className="infoBox">
          <strong>ℹ️ Footer Pages:</strong> These pages are linked from the footer. Edit content using Markdown formatting. 
          Pages marked as inactive will show a 404 error.
        </div>

        {(showAddForm || editingPage) && (
          <form 
            onSubmit={editingPage ? handleUpdatePage : handleAddPage}
            className="form"
          >
            <h3 className="formTitle">
              {editingPage ? '✏️ Edit Page' : '➕ Create New Page'}
            </h3>
            
            <div className="formRow">
              <div className="formGroup">
                <label>Page Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., About Us"
                />
              </div>

              <div className="formGroup">
                <label>URL Slug *</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., about-us"
                />
                <small>URL: /{formData.slug}</small>
              </div>

              <div className="formGroup">
                <label>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  {categoryOptions.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="formGroup contentGroup">
              <label>
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
              />
              <small>
                Supports Markdown: # headings, **bold**, *italic*, - lists, [links](url), | tables |
              </small>
            </div>

            <div className="checkboxGroup">
              <input
                type="checkbox"
                name="active"
                id="active"
                checked={formData.active}
                onChange={handleInputChange}
              />
              <label htmlFor="active">Page is active (visible on website)</label>
            </div>

            <div className="formActions">
              <button type="submit" disabled={saving} className="submitBtn">
                {saving ? 'Saving...' : editingPage ? 'Update Page' : 'Create Page'}
              </button>
              <button type="button" onClick={resetForm} className="cancelBtn">
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="loadingState">
            Loading pages...
          </div>
        ) : (
          <div className="pagesList">
            {categoryOptions.map(cat => {
              const categoryPages = groupedPages[cat.value] || [];
              if (categoryPages.length === 0) return null;
              
              return (
                <div key={cat.value} className="categorySection">
                  <h3 className="categoryTitle">
                    {cat.label} ({categoryPages.length})
                  </h3>
                  
                  <div className="tableWrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>URL</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryPages.map(page => (
                          <tr key={page.id}>
                            <td className="titleCell">
                              <span className="pageTitle">{page.title}</span>
                            </td>
                            <td>
                              <code className="slugCode">/{page.slug}</code>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => togglePageActive(page)}
                                className={`statusBtn ${page.active ? 'active' : 'inactive'}`}
                              >
                                {page.active ? '✓ Active' : '✗ Inactive'}
                              </button>
                            </td>
                            <td>
                              <div className="actions">
                                <a 
                                  href={`/${page.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="viewBtn"
                                >
                                  View
                                </a>
                                <button 
                                  onClick={() => handleEditPage(page)}
                                  className="editBtn"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDeletePage(page.id)}
                                  className="deleteBtn"
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
        
        .header {
          background: linear-gradient(135deg, #000000 0%, #dc0000 100%);
          color: white;
          padding: 1.25rem 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        
        .headerContent {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .logo {
          margin: 0;
          font-size: 1.8rem;
          font-weight: 800;
        }
        
        .nav {
          display: flex;
          gap: 2rem;
        }
        
        .navLink {
          color: white;
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.3s;
        }
        
        .navLink:hover {
          opacity: 0.8;
        }
        
        .main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .toolbar h2 {
          margin: 0;
          color: white;
          font-weight: 800;
          font-size: 1.8rem;
        }
        
        .addButton {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #dc0000 0%, #a00000 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .addButton:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(220, 0, 0, 0.4);
        }
        
        .infoBox {
          background-color: #1a3a1a;
          border: 1px solid #2d5a2d;
          border-radius: 8px;
          padding: 15px 20px;
          margin-bottom: 25px;
          color: #90ee90;
        }
        
        .form {
          background-color: #1a1a1a;
          padding: 25px;
          border-radius: 12px;
          margin-bottom: 30px;
          border: 1px solid #333;
        }
        
        .formTitle {
          color: #dc0000;
          margin: 0 0 20px 0;
          font-size: 1.3rem;
        }
        
        .formRow {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
        }
        
        @media (max-width: 768px) {
          .formRow {
            grid-template-columns: 1fr;
          }
        }
        
        .formGroup {
          display: flex;
          flex-direction: column;
        }
        
        .formGroup label {
          color: #ccc;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        .formGroup input,
        .formGroup select {
          padding: 12px;
          background-color: #222;
          border: 1px solid #444;
          border-radius: 6px;
          color: white;
          font-size: 1rem;
        }
        
        .formGroup input:focus,
        .formGroup select:focus,
        .formGroup textarea:focus {
          outline: none;
          border-color: #dc0000;
        }
        
        .formGroup small {
          color: #888;
          font-size: 0.85rem;
          margin-top: 5px;
        }
        
        .contentGroup {
          margin-top: 20px;
        }
        
        .contentGroup textarea {
          padding: 15px;
          background-color: #222;
          border: 1px solid #444;
          border-radius: 6px;
          color: white;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          width: 100%;
        }
        
        .checkboxGroup {
          margin-top: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .checkboxGroup input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        
        .checkboxGroup label {
          color: #ccc;
          cursor: pointer;
        }
        
        .formActions {
          margin-top: 25px;
          display: flex;
          gap: 15px;
        }
        
        .submitBtn {
          padding: 12px 30px;
          background: linear-gradient(135deg, #dc0000 0%, #a00000 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .submitBtn:hover:not(:disabled) {
          transform: translateY(-2px);
        }
        
        .submitBtn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .cancelBtn {
          padding: 12px 30px;
          background-color: #333;
          color: white;
          border: 1px solid #555;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .cancelBtn:hover {
          background-color: #444;
        }
        
        .loadingState {
          text-align: center;
          padding: 60px;
          color: #888;
          font-size: 1.1rem;
        }
        
        .pagesList {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        
        .categorySection {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #333;
        }
        
        .categoryTitle {
          color: #dc0000;
          margin: 0 0 15px 0;
          padding-bottom: 10px;
          border-bottom: 1px solid #333;
          font-size: 1.2rem;
        }
        
        .tableWrapper {
          overflow-x: auto;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .table thead tr {
          background: #222;
        }
        
        .table th {
          padding: 12px 15px;
          text-align: left;
          color: #888;
          font-weight: 600;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #333;
        }
        
        .table tbody tr {
          border-bottom: 1px solid #2a2a2a;
          transition: background-color 0.2s;
        }
        
        .table tbody tr:hover {
          background-color: #222;
        }
        
        .table td {
          padding: 15px;
        }
        
        .titleCell {
          min-width: 200px;
        }
        
        .pageTitle {
          color: white;
          font-weight: 600;
          font-size: 1rem;
        }
        
        .slugCode {
          background-color: #2a2a2a;
          padding: 4px 10px;
          border-radius: 4px;
          color: #dc0000;
          font-size: 0.9rem;
          font-family: 'Monaco', 'Menlo', monospace;
        }
        
        .statusBtn {
          padding: 5px 14px;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          transition: transform 0.2s;
        }
        
        .statusBtn:hover {
          transform: scale(1.05);
        }
        
        .statusBtn.active {
          background-color: #1a3a1a;
          color: #90ee90;
          border: 1px solid #2d5a2d;
        }
        
        .statusBtn.inactive {
          background-color: #3a1a1a;
          color: #ff6b6b;
          border: 1px solid #5a2d2d;
        }
        
        .actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        
        .viewBtn,
        .editBtn,
        .deleteBtn {
          padding: 6px 14px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          transition: transform 0.2s, opacity 0.2s;
        }
        
        .viewBtn:hover,
        .editBtn:hover,
        .deleteBtn:hover {
          transform: translateY(-1px);
        }
        
        .viewBtn {
          background-color: #2a2a2a;
          color: #888;
          text-decoration: none;
        }
        
        .viewBtn:hover {
          background-color: #333;
          color: #ccc;
        }
        
        .editBtn {
          background-color: #2a4a2a;
          color: #90ee90;
        }
        
        .editBtn:hover {
          background-color: #3a5a3a;
        }
        
        .deleteBtn {
          background-color: #4a2a2a;
          color: #ff6b6b;
        }
        
        .deleteBtn:hover {
          background-color: #5a3a3a;
        }
      `}</style>
    </div>
  );
}
