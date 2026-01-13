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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}>
      <Head>
        <title>Button Manager - Admin Panel</title>
      </Head>

      <header style={{
        background: 'rgba(0,0,0,0.8)',
        borderBottom: '2px solid #dc0000',
        padding: '1rem 2rem'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'white' }}>🔘 Button Manager</h1>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/admin" style={{ color: '#dc0000', textDecoration: 'none', fontSize: '0.95rem', fontWeight: '600' }}>← Back to Admin</Link>
            <Link href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '0.95rem', fontWeight: '600', opacity: 0.8 }}>View Store</Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '1.5rem' }}>
        {/* Top Action Bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem',
          background: 'rgba(255,255,255,0.05)',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'white' }}>
              {buttons.length} Button{buttons.length !== 1 ? 's' : ''} Configured
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
              Manage call-to-action buttons across your site
            </p>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '0.6rem 1.25rem',
              background: showForm ? '#374151' : 'linear-gradient(135deg, #dc0000 0%, #ff0000 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: showForm ? 'none' : '0 4px 12px rgba(220, 0, 0, 0.3)'
            }}
          >
            {showForm ? '✕ Cancel' : '+ Add Button'}
          </button>
        </div>

        {showForm && (
          <div style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #252525 100%)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '2px solid #dc0000',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: 'white' }}>
              {editingButton ? '✏️ Edit Button' : '➕ Create New Button'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#dc0000' }}>Button Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Shop Now"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #333',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      background: '#000',
                      color: 'white',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#dc0000' }}>Location *</label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #333',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      background: '#000',
                      color: 'white',
                      boxSizing: 'border-box'
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
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#dc0000' }}>Icon (Emoji)</label>
                  <input
                    type="text"
                    name="icon"
                    value={formData.icon}
                    onChange={handleInputChange}
                    placeholder="⭐"
                    maxLength="2"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #333',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      background: '#000',
                      color: 'white',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#dc0000' }}>Destination URL</label>
                  <input
                    type="text"
                    name="href"
                    value={formData.href}
                    onChange={handleInputChange}
                    placeholder="/premium or https://..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #333',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      background: '#000',
                      color: 'white',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#dc0000' }}>Attach Funnel</label>
                  <select
                    name="funnelId"
                    value={formData.funnelId || ''}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #333',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      background: '#000',
                      color: 'white',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">No Funnel</option>
                    {funnels.map(funnel => (
                      <option key={funnel.id} value={funnel.id}>
                        {funnel.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#dc0000' }}>Order</label>
                  <input
                    type="number"
                    name="order"
                    value={formData.order}
                    onChange={handleInputChange}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #333',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      background: '#000',
                      color: 'white',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#dc0000' }}>Description</label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Button description or subtitle"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #333',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      background: '#000',
                      color: 'white',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', background: 'rgba(220,0,0,0.1)', borderRadius: '6px', border: '1px solid #333' }}>
                  <input
                    type="checkbox"
                    name="visible"
                    checked={formData.visible}
                    onChange={handleInputChange}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#dc0000' }}
                  />
                  <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'white' }}>Visible on site</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
                <button type="submit" style={{
                  flex: 1,
                  padding: '0.6rem',
                  background: 'linear-gradient(135deg, #dc0000 0%, #ff0000 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 0, 0, 0.3)'
                }}>
                  {editingButton ? 'Update Button' : 'Create Button'}
                </button>
                <button 
                  type="button" 
                  onClick={resetForm}
                  style={{
                    padding: '0.6rem 1.5rem',
                    background: '#374151',
                    color: 'white',
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

        {/* Buttons Grid - All buttons in a single compact grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
          gap: '1rem' 
        }}>
          {buttons
            .sort((a, b) => {
              // Sort by location first, then by order
              if (a.location !== b.location) return a.location.localeCompare(b.location);
              return a.order - b.order;
            })
            .map(button => (
              <div key={button.id} style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #252525 100%)',
                borderRadius: '10px',
                padding: '0.85rem',
                border: `2px solid ${button.visible ? '#dc0000' : '#333'}`,
                opacity: button.visible ? 1 : 0.7,
                transition: 'all 0.3s',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Location Badge */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: button.visible ? 'linear-gradient(135deg, #dc0000 0%, #ff0000 100%)' : '#374151',
                  padding: '0.2rem 0.5rem',
                  borderBottomLeftRadius: '8px',
                  fontSize: '0.6rem',
                  fontWeight: '700',
                  color: 'white',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {locationOptions.find(opt => opt.value === button.location)?.label.split(' ')[0] || button.location}
                </div>

                {/* Button Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', marginTop: '0.25rem' }}>
                  {button.icon && <span style={{ fontSize: '1.25rem' }}>{button.icon}</span>}
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'white' }}>{button.name}</span>
                </div>

                {button.description && (
                  <p style={{ 
                    fontSize: '0.7rem', 
                    color: 'rgba(255,255,255,0.5)', 
                    margin: '0 0 0.5rem 0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {button.description}
                  </p>
                )}
                
                {/* Destination Info */}
                <div style={{ 
                  fontSize: '0.7rem', 
                  color: 'rgba(255,255,255,0.6)', 
                  marginBottom: '0.65rem',
                  padding: '0.35rem 0.5rem',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {button.funnelId ? (
                    <span>🎯 {funnels.find(f => f.id === button.funnelId)?.name || `Funnel #${button.funnelId}`}</span>
                  ) : button.href ? (
                    <span>🔗 {button.href}</span>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>⚠️ No action</span>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button 
                    onClick={() => handleEdit(button)}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      background: 'rgba(220, 0, 0, 0.2)',
                      color: '#dc0000',
                      border: '1px solid #dc0000',
                      borderRadius: '5px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(button.id)}
                    style={{
                      padding: '0.4rem 0.6rem',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      borderRadius: '5px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
        </div>

        {buttons.length === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #252525 100%)',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            border: '2px dashed #333'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔘</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', margin: 0 }}>
              No buttons created yet. Click "+ Add Button" to get started!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
