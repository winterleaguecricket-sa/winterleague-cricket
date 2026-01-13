import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminManage.module.css';
import { getAllMenuItems, addMenuItem, updateMenuItem, deleteMenuItem } from '../../data/products';

export default function AdminMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
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

  const loadMenuItems = () => {
    setMenuItems(getAllMenuItems());
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const itemData = {
      ...formData,
      parentId: formData.parentId ? Number(formData.parentId) : null,
      order: Number(formData.order)
    };

    if (editingItem) {
      updateMenuItem(editingItem.id, itemData);
    } else {
      addMenuItem(itemData);
    }

    resetForm();
    loadMenuItems();
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

  const handleDelete = (id) => {
    const item = menuItems.find(m => m.id === id);
    const hasChildren = menuItems.some(m => m.parentId === id);
    
    const message = hasChildren 
      ? 'This menu item has sub-items. Deleting it will also delete all sub-items. Continue?'
      : 'Are you sure you want to delete this menu item?';
    
    if (confirm(message)) {
      deleteMenuItem(id);
      loadMenuItems();
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

  return (
    <div className={styles.container}>
      <Head>
        <title>Menu Manager - Admin Panel</title>
      </Head>

      <header style={{
        background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
        padding: '0.85rem 1.5rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: 'white' }}>📋 Menu Manager</h1>
          <nav style={{ display: 'flex', gap: '1.25rem' }}>
            <Link href="/admin" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>← Back to Admin</Link>
            <Link href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>View Store</Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>Manage Navigation Menu</h2>
          <button 
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '0.6rem 1rem',
              background: showForm ? '#e5e7eb' : 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
              color: showForm ? '#374151' : 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: showForm ? 'none' : '0 4px 12px rgba(220, 0, 0, 0.2)'
            }}
          >
            {showForm ? 'Cancel' : '+ Add Menu Item'}
          </button>
        </div>

        {showForm && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            marginBottom: '1.25rem'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1rem' }}>{editingItem ? 'Edit Menu Item' : 'Create New Menu Item'}</h3>
            
            {!editingItem && (
              <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f0f9ff', border: '2px solid #0ea5e9', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: '700', color: '#0c4a6e' }}>Quick Add Common Links:</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, label: 'Team Portal', href: '/team-portal' })}
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
                    🏏 Team Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, label: 'Products', href: '/premium' })}
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
                    🛍️ Products
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, label: 'Forms', href: '/forms' })}
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
                    📋 Forms
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, label: 'Training', href: '/training' })}
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
                    🎓 Training
                  </button>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Menu Label *</label>
                  <input
                    type="text"
                    name="label"
                    value={formData.label}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Products"
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Link URL *</label>
                  <input
                    type="text"
                    name="href"
                    value={formData.href}
                    onChange={handleInputChange}
                    required
                    placeholder="/products or https://example.com"
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Parent Menu (Optional)</label>
                  <select
                    name="parentId"
                    value={formData.parentId || ''}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      background: 'white'
                    }}
                  >
                    <option value="">Top Level Menu</option>
                    {topLevelItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <small style={{ display: 'block', marginTop: '0.25rem', color: '#6b7280', fontSize: '0.72rem' }}>
                    Select a parent to create a submenu item
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Display Order</label>
                  <input
                    type="number"
                    name="order"
                    value={formData.order}
                    onChange={handleInputChange}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="visible"
                    checked={formData.visible}
                    onChange={handleInputChange}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>Visible in navigation</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '2px solid #e5e7eb' }}>
                <button type="submit" style={{
                  flex: 1,
                  padding: '0.65rem',
                  background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 0, 0, 0.2)'
                }}>
                  {editingItem ? 'Update Menu Item' : 'Create Menu Item'}
                </button>
                <button 
                  type="button" 
                  onClick={resetForm}
                  style={{
                    padding: '0.65rem 1.25rem',
                    background: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topLevelItems
              .sort((a, b) => a.order - b.order)
              .map(item => (
                <div key={item.id}>
                  <div style={{
                    background: 'white',
                    borderRadius: '10px',
                    padding: '1rem',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '2px solid #f3f4f6'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: '700' }}>{item.label}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', background: '#f3f4f6', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>Order: {item.order}</span>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: item.visible ? '#d1fae5' : '#fee2e2',
                        color: item.visible ? '#065f46' : '#991b1b'
                      }}>
                        {item.visible ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '600' }}>URL:</span> {item.href}
                      </div>
                      <div>
                        <span style={{ fontWeight: '600' }}>Type:</span> Top Level Menu
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleEdit(item)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(220, 0, 0, 0.2)'
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Submenu Items */}
                  {getChildren(item.id).length > 0 && (
                    <div style={{ marginLeft: '2rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {getChildren(item.id)
                        .sort((a, b) => a.order - b.order)
                        .map(subItem => (
                          <div key={subItem.id} style={{
                            background: 'white',
                            borderRadius: '10px',
                            padding: '1rem',
                            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
                            border: '2px solid #e5e7eb',
                            borderLeft: '4px solid #dc0000'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>└─</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{subItem.label}</span>
                                <span style={{ fontSize: '0.75rem', color: '#6b7280', background: '#f3f4f6', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>Order: {subItem.order}</span>
                              </div>
                              <span style={{
                                padding: '0.25rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                background: subItem.visible ? '#d1fae5' : '#fee2e2',
                                color: subItem.visible ? '#065f46' : '#991b1b'
                              }}>
                                {subItem.visible ? 'Visible' : 'Hidden'}
                              </span>
                            </div>
                            
                            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                              <div style={{ marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: '600' }}>URL:</span> {subItem.href}
                              </div>
                              <div>
                                <span style={{ fontWeight: '600' }}>Parent:</span> {item.label}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                onClick={() => handleEdit(subItem)}
                                style={{
                                  padding: '0.45rem 0.85rem',
                                  background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px rgba(220, 0, 0, 0.2)'
                                }}
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(subItem.id)}
                                style={{
                                  padding: '0.45rem 0.85rem',
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
          </div>

          {menuItems.length === 0 && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
            }}>
              <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>No menu items created yet. Click "Add Menu Item" to get started!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
