import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../../styles/adminManage.module.css'
import { customPages as initialPages, addPage, updatePage, deletePage } from '../../data/categories'

export default function AdminPages() {
  const [pages, setPages] = useState(initialPages);
  const [editingPage, setEditingPage] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Auto-generate slug from title
    if (name === 'title' && !editingPage) {
      setFormData(prev => ({
        ...prev,
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }));
    }
  };

  const handleAddPage = (e) => {
    e.preventDefault();
    const newPage = addPage(formData);
    setPages([...pages]);
    resetForm();
  };

  const handleEditPage = (page) => {
    setEditingPage(page.id);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content
    });
    setShowAddForm(false);
  };

  const handleUpdatePage = (e) => {
    e.preventDefault();
    updatePage(editingPage, formData);
    setPages([...pages]);
    resetForm();
  };

  const handleDeletePage = (id) => {
    if (confirm('Are you sure you want to delete this page?')) {
      deletePage(id);
      setPages([...pages]);
    }
  };

  const resetForm = () => {
    setEditingPage(null);
    setShowAddForm(false);
    setFormData({
      title: '',
      slug: '',
      content: ''
    });
  };

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
          <h2>Manage Pages</h2>
          <button 
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingPage(null);
            }} 
            className={styles.addButton}
          >
            {showAddForm ? 'Cancel' : '+ Add New Page'}
          </button>
        </div>

        {(showAddForm || editingPage) && (
          <form 
            onSubmit={editingPage ? handleUpdatePage : handleAddPage}
            className={styles.form}
          >
            <h3>{editingPage ? 'Edit Page' : 'Create New Page'}</h3>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Page Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., About Us"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>URL Slug</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., about-us"
                  className={styles.input}
                />
                <small className={styles.helpText}>Page URL: /{formData.slug}</small>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Page Content</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
                rows="10"
                placeholder="Enter your page content here. You can use HTML formatting."
                className={styles.textarea}
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveButton}>
                {editingPage ? 'Update Page' : 'Create Page'}
              </button>
              <button type="button" onClick={resetForm} className={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map(page => (
                <tr key={page.id}>
                  <td className={styles.nameCell}>{page.title}</td>
                  <td><code className={styles.code}>/{page.slug}</code></td>
                  <td>{new Date(page.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className={styles.actions}>
                      <a 
                        href={`/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.viewButton}
                      >
                        View
                      </a>
                      <button 
                        onClick={() => handleEditPage(page)}
                        className={styles.editButton}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeletePage(page.id)}
                        className={styles.deleteButton}
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
      </main>
    </div>
  );
}
