import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminManage.module.css';
import { getAllButtons, addCustomButton, updateCustomButton, deleteCustomButton } from '../../data/products';
import { getActiveFunnels } from '../../data/funnels';

export default function AdminButtons() {
  const [buttons, setButtons] = useState([]);
  const [funnels, setFunnels] = useState([]);
  const [editingButton, setEditingButton] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: 'hero-primary',
    href: '',
    funnelId: null,
    visible: true,
    order: 1,
    icon: '',
    description: ''
  });

  useEffect(() => {
    loadButtons();
    setFunnels(getActiveFunnels());
  }, []);

  const loadButtons = () => {
    setButtons(getAllButtons());
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
    
    const buttonData = {
      ...formData,
      funnelId: formData.funnelId ? Number(formData.funnelId) : null,
      order: Number(formData.order)
    };

    if (editingButton) {
      updateCustomButton(editingButton.id, buttonData);
    } else {
      addCustomButton(buttonData);
    }

    resetForm();
    loadButtons();
  };

  const handleEdit = (button) => {
    setEditingButton(button);
    setFormData({
      name: button.name,
      location: button.location,
      href: button.href,
      funnelId: button.funnelId || '',
      visible: button.visible,
      order: button.order,
      icon: button.icon || '',
      description: button.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this button?')) {
      deleteCustomButton(id);
      loadButtons();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: 'hero-primary',
      href: '',
      funnelId: null,
      visible: true,
      order: 1,
      icon: '',
      description: ''
    });
    setEditingButton(null);
    setShowForm(false);
  };

  const locationOptions = [
    { value: 'hero-primary', label: 'Hero Primary CTA' },
    { value: 'hero-secondary', label: 'Hero Secondary CTA' },
    { value: 'channel-premium', label: 'Premium Channel' },
    { value: 'channel-training', label: 'Training Channel' },
    { value: 'footer', label: 'Footer' },
    { value: 'header', label: 'Header Navigation' },
    { value: 'sidebar', label: 'Sidebar' },
    { value: 'custom', label: 'Custom Location' }
  ];

  const groupedButtons = buttons.reduce((acc, button) => {
    if (!acc[button.location]) {
      acc[button.location] = [];
    }
    acc[button.location].push(button);
    return acc;
  }, {});

  return (
    <div className={styles.container}>
      <Head>
        <title>Button Manager - Admin Panel</title>
      </Head>

      <header style={{
        background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
        padding: '0.85rem 1.5rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: 'white' }}>🔘 Button Manager</h1>
          <nav style={{ display: 'flex', gap: '1.25rem' }}>
            <Link href="/admin" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>← Back to Admin</Link>
            <Link href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>View Store</Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>Manage Buttons</h2>
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
            {showForm ? 'Cancel' : '+ Add New Button'}
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
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1rem' }}>{editingButton ? 'Edit Button' : 'Create New Button'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Button Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Shop Now"
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
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Location *</label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      background: 'white'
                    }}
                  >
                    {locationOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Destination URL</label>
                  <input
                    type="text"
                    name="href"
                    value={formData.href}
                    onChange={handleInputChange}
                    placeholder="/premium or https://example.com"
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  />
                  <small style={{ display: 'block', marginTop: '0.25rem', color: '#6b7280', fontSize: '0.72rem' }}>
                    Leave empty if using a funnel
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Attach Funnel (Optional)</label>
                  <select
                    name="funnelId"
                    value={formData.funnelId || ''}
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
                    <option value="">No Funnel</option>
                    {funnels.map(funnel => (
                      <option key={funnel.id} value={funnel.id}>
                        {funnel.name}
                      </option>
                    ))}
                  </select>
                  <small style={{ display: 'block', marginTop: '0.25rem', color: '#6b7280', fontSize: '0.72rem' }}>
                    Funnel takes priority over URL
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Icon (Emoji)</label>
                  <input
                    type="text"
                    name="icon"
                    value={formData.icon}
                    onChange={handleInputChange}
                    placeholder="⭐"
                    maxLength="2"
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

              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Button description or subtitle"
                  rows="2"
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
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
                  <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>Visible on website</span>
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
                  {editingButton ? 'Update Button' : 'Create Button'}
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
          {Object.keys(groupedButtons).map(location => (
            <div key={location} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.85rem', color: '#374151' }}>
                {locationOptions.find(opt => opt.value === location)?.label || location}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {groupedButtons[location]
                  .sort((a, b) => a.order - b.order)
                  .map(button => (
                    <div key={button.id} style={{
                      background: 'white',
                      borderRadius: '10px',
                      padding: '1rem',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                      border: '2px solid #f3f4f6'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {button.icon && <span style={{ fontSize: '1.15rem' }}>{button.icon}</span>}
                          <span style={{ fontSize: '0.95rem', fontWeight: '700' }}>{button.name}</span>
                        </div>
                        <span style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: button.visible ? '#d1fae5' : '#fee2e2',
                          color: button.visible ? '#065f46' : '#991b1b'
                        }}>
                          {button.visible ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                      
                      <div style={{ marginBottom: '0.75rem' }}>
                        {button.description && (
                          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>{button.description}</p>
                        )}
                        
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          <div style={{ marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: '600' }}>Order:</span> {button.order}
                          </div>
                          
                          {button.funnelId ? (
                            <div>
                              <span style={{ fontWeight: '600' }}>Funnel:</span> {funnels.find(f => f.id === button.funnelId)?.name || `ID: ${button.funnelId}`}
                            </div>
                          ) : button.href ? (
                            <div>
                              <span style={{ fontWeight: '600' }}>URL:</span> {button.href}
                            </div>
                          ) : (
                            <div>
                              <span style={{ fontWeight: '600' }}>Action:</span> Not configured
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleEdit(button)}
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
                          onClick={() => handleDelete(button.id)}
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
            </div>
          ))}

          {buttons.length === 0 && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
            }}>
              <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>No buttons created yet. Click "Add New Button" to get started!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
