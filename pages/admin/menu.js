import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminSiteSettings.module.css';

export default function AdminMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    href: '',
    parentId: null,
    visible: true,
    order: 1
  });

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      // API returns { success: true, menuItems: [...] }
      if (data.success && data.menuItems) {
        setMenuItems(data.menuItems);
      } else if (Array.isArray(data)) {
        // Fallback for old API format
        setMenuItems(data);
      } else {
        console.error('Unexpected menu data format:', data);
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
      setMenuItems([]);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const itemData = {
      ...formData,
      parentId: formData.parentId ? Number(formData.parentId) : null,
      order: Number(formData.order)
    };

    try {
      if (editingItem) {
        const res = await fetch('/api/menu', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingItem.id, ...itemData })
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to update menu item');
        }
      } else {
        const res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData)
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to create menu item');
        }
      }

      resetForm();
      await loadMenuItems();
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Error saving menu item: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      label: item.label,
      href: item.href,
      parentId: item.parentId || '',
      visible: item.visible,
      order: item.order
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const item = menuItems.find(m => m.id === id);
    const hasChildren = menuItems.some(m => m.parentId === id);
    
    const message = hasChildren 
      ? 'This menu item has sub-items. Deleting it will also delete all sub-items. Continue?'
      : 'Are you sure you want to delete this menu item?';
    
    if (confirm(message)) {
      try {
        const res = await fetch('/api/menu', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to delete menu item');
        }
        await loadMenuItems();
      } catch (error) {
        console.error('Error deleting menu item:', error);
        alert('Error deleting menu item: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      href: '',
      parentId: null,
      visible: true,
      order: 1
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const topLevelItems = menuItems.filter(item => item.parentId === null);
  const getChildren = (parentId) => menuItems.filter(item => item.parentId === parentId);

  const quickLinks = [
    { label: '🏏 Team Portal', href: '/team-portal' },
    { label: '🛍️ Products', href: '/premium' },
    { label: '📋 Forms', href: '/forms' },
    { label: '🎓 Training', href: '/training' },
    { label: '🏠 Home', href: '/' },
    { label: '👤 Profile', href: '/profile' },
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Menu Manager - Admin Panel</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>📋 Menu Manager</h1>
          <nav className={styles.nav}>
            <Link href="/admin/settings" className={styles.navLink}>← Back to Settings</Link>
            <Link href="/admin" className={styles.navLink}>Admin Dashboard</Link>
            <Link href="/" className={styles.navLink}>View Store</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {/* Add/Edit Form Toggle */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showForm ? '1rem' : '0' }}>
            <div>
              <h3 className={styles.cardTitle} style={{ marginBottom: '0.25rem' }}>🗂️ Navigation Items</h3>
              <p className={styles.cardSubtitle} style={{ margin: 0 }}>
                {menuItems.length} menu item{menuItems.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            <button 
              onClick={() => setShowForm(!showForm)}
              className={showForm ? styles.secondaryButton : styles.primaryButton}
            >
              {showForm ? 'Cancel' : '+ Add Menu Item'}
            </button>
          </div>

          {showForm && (
            <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '1rem', marginTop: '1rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>
                {editingItem ? '✏️ Edit Menu Item' : '➕ Create New Menu Item'}
              </h4>
              
              {/* Quick Add Buttons */}
              {!editingItem && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f0f9ff', border: '2px solid #0ea5e9', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: '700', color: '#0c4a6e' }}>
                    Quick Add Common Links:
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {quickLinks.map((link, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, label: link.label.replace(/^[^\s]+\s/, ''), href: link.href })}
                        style={{
                          padding: '0.4rem 0.75rem',
                          background: 'white',
                          border: '2px solid #0ea5e9',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          color: '#0c4a6e'
                        }}
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Menu Label *</label>
                    <input
                      type="text"
                      name="label"
                      value={formData.label}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Products"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Link URL *</label>
                    <input
                      type="text"
                      name="href"
                      value={formData.href}
                      onChange={handleInputChange}
                      required
                      placeholder="/products or https://example.com"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Parent Menu (Optional)</label>
                    <select
                      name="parentId"
                      value={formData.parentId || ''}
                      onChange={handleInputChange}
                      className={styles.select}
                    >
                      <option value="">Top Level Menu</option>
                      {topLevelItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <small className={styles.helpText}>
                      Select a parent to create a submenu item
                    </small>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Display Order</label>
                    <input
                      type="number"
                      name="order"
                      value={formData.order}
                      onChange={handleInputChange}
                      min="1"
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.checkboxGroup} style={{ marginTop: '1rem' }}>
                  <input
                    type="checkbox"
                    name="visible"
                    id="visible"
                    checked={formData.visible}
                    onChange={handleInputChange}
                  />
                  <span>Visible in navigation</span>
                </div>

                <div className={styles.buttonRow} style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '2px solid #e5e7eb' }}>
                  <button type="submit" className={styles.primaryButton} disabled={saving}>
                    {saving ? 'Saving...' : editingItem ? 'Update Menu Item' : 'Create Menu Item'}
                  </button>
                  <button type="button" onClick={resetForm} className={styles.secondaryButton}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Menu Items List */}
        {loading ? (
          <div className={styles.card} style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Loading menu items...</p>
          </div>
        ) : menuItems.length === 0 ? (
          <div className={styles.card} style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>No Menu Items Yet</h3>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              Get started by adding your first navigation item.
            </p>
            <button onClick={() => setShowForm(true)} className={styles.primaryButton}>
              + Add Your First Menu Item
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topLevelItems
              .sort((a, b) => a.order - b.order)
              .map(item => (
                <div key={item.id} className={styles.card}>
                  {/* Top Level Item */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '700' }}>{item.label}</span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: '#6b7280', 
                          background: '#f3f4f6', 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '4px' 
                        }}>
                          Order: {item.order}
                        </span>
                        <span style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: item.visible ? '#d1fae5' : '#fee2e2',
                          color: item.visible ? '#065f46' : '#991b1b'
                        }}>
                          {item.visible ? '✓ Visible' : '✗ Hidden'}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        <div style={{ marginBottom: '0.15rem' }}>
                          <span style={{ fontWeight: '600' }}>URL:</span>{' '}
                          <code style={{ background: '#f3f4f6', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.8rem' }}>
                            {item.href}
                          </code>
                        </div>
                        <div>
                          <span style={{ fontWeight: '600' }}>Type:</span> Top Level Menu
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button onClick={() => handleEdit(item)} className={styles.primaryButton} style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleDelete(item.id)} className={styles.dangerButton} style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}>
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                  {/* Submenu Items */}
                  {getChildren(item.id).length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px dashed #e5e7eb' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.75rem' }}>
                        Sub-menu items:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem', borderLeft: '3px solid #dc0000' }}>
                        {getChildren(item.id)
                          .sort((a, b) => a.order - b.order)
                          .map(subItem => (
                            <div key={subItem.id} style={{ 
                              background: '#fafafa', 
                              borderRadius: '8px', 
                              padding: '0.75rem 1rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '0.75rem'
                            }}>
                              <div style={{ flex: '1', minWidth: '150px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>└─</span>
                                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{subItem.label}</span>
                                  <span style={{ 
                                    fontSize: '0.7rem', 
                                    color: '#6b7280', 
                                    background: '#e5e7eb', 
                                    padding: '0.1rem 0.4rem', 
                                    borderRadius: '3px' 
                                  }}>
                                    #{subItem.order}
                                  </span>
                                  <span style={{
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    background: subItem.visible ? '#d1fae5' : '#fee2e2',
                                    color: subItem.visible ? '#065f46' : '#991b1b'
                                  }}>
                                    {subItem.visible ? '✓' : '✗'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                  <code style={{ background: '#e5e7eb', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.75rem' }}>
                                    {subItem.href}
                                  </code>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                <button onClick={() => handleEdit(subItem)} className={styles.primaryButton} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
                                  ✏️
                                </button>
                                <button onClick={() => handleDelete(subItem.id)} className={styles.dangerButton} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Help Section */}
        <div className={styles.card} style={{ marginTop: '1.5rem', background: '#f0f9ff', border: '2px solid #0ea5e9' }}>
          <h3 className={styles.cardTitle} style={{ color: '#0c4a6e' }}>💡 Tips for Menu Management</h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#0c4a6e', fontSize: '0.9rem', lineHeight: '1.8' }}>
            <li><strong>Order numbers</strong> determine the sequence of menu items (lower numbers appear first)</li>
            <li><strong>Parent menus</strong> create dropdown submenus for better organization</li>
            <li><strong>Hidden items</strong> won't appear in navigation but can still be accessed via direct URL</li>
            <li><strong>External links</strong> should start with <code style={{ background: 'white', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>https://</code></li>
            <li><strong>Internal links</strong> should start with <code style={{ background: 'white', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>/</code> (e.g., /premium, /forms)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
