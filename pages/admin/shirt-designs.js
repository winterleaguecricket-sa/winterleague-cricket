import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminProducts.module.css';

export default function AdminShirtDesigns() {
  const [designs, setDesigns] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDesign, setEditingDesign] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    images: [],
    active: true
  });

  // Fetch designs from API
  const fetchDesigns = async () => {
    try {
      const response = await fetch('/api/shirt-designs');
      const data = await response.json();
      if (data.success) {
        setDesigns(data.designs);
      }
    } catch (error) {
      console.error('Error fetching designs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesigns();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate all files
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        alert('Please upload only valid image files (JPG, PNG, GIF, or WebP)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Each file must be less than 5MB');
        return;
      }
    }

    setUploading(true);
    const uploadedUrls = [];

    try {
      // Upload each file sequentially
      for (const file of files) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const response = await fetch('/api/upload-shirt-design', {
          method: 'POST',
          body: formDataUpload,
        });

        const data = await response.json();
        
        if (data.success) {
          uploadedUrls.push(data.url);
        } else {
          alert('Upload failed for ' + file.name + ': ' + (data.error || 'Unknown error'));
          break;
        }
      }

      // Add new URLs to existing images
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleReorderImage = (fromIndex, direction) => {
    const newImages = [...formData.images];
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    
    if (toIndex < 0 || toIndex >= newImages.length) return;
    
    [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
    
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDesign) {
        // Update existing design
        const response = await fetch('/api/shirt-designs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingDesign.id, ...formData })
        });
        const data = await response.json();
        if (!data.success) {
          alert('Failed to update design: ' + (data.error || 'Unknown error'));
          return;
        }
      } else {
        // Add new design
        const response = await fetch('/api/shirt-designs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await response.json();
        if (!data.success) {
          alert('Failed to add design: ' + (data.error || 'Unknown error'));
          return;
        }
      }
      await fetchDesigns();
      resetForm();
    } catch (error) {
      console.error('Error saving design:', error);
      alert('Failed to save design. Please try again.');
    }
  };

  const handleEdit = (design) => {
    setEditingDesign(design);
    setFormData({
      name: design.name,
      images: design.images || (design.imageUrl ? [design.imageUrl] : []),
      active: design.active
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this shirt design?')) {
      try {
        const response = await fetch(`/api/shirt-designs?id=${id}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
          await fetchDesigns();
        } else {
          alert('Failed to delete design: ' + (data.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error deleting design:', error);
        alert('Failed to delete design. Please try again.');
      }
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const response = await fetch('/api/shirt-designs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await response.json();
      if (data.success) {
        await fetchDesigns();
      } else {
        alert('Failed to toggle status: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to toggle status. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      images: [],
      active: true
    });
    setEditingDesign(null);
    setShowAddForm(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)' }}>
      <Head>
        <title>Kit Design Manager - Admin Panel</title>
      </Head>

      <header style={{ background: 'rgba(0,0,0,0.8)', borderBottom: '2px solid #dc0000', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ color: 'white', fontSize: '1.5rem', margin: 0 }}>👕 Kit Designs</h1>
          <Link href="/admin" style={{ color: '#dc0000', textDecoration: 'none', fontWeight: '600', fontSize: '0.95rem' }}>
            ← Back to Admin
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: 'white', fontSize: '1.3rem', margin: 0 }}>Manage Designs</h2>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              background: showAddForm ? '#6b7280' : 'linear-gradient(135deg, #dc0000 0%, #ff0000 100%)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(220, 0, 0, 0.3)',
              transition: 'all 0.3s'
            }}
          >
            {showAddForm ? '✕ Cancel' : '+ Add New Design'}
          </button>
        </div>

        {showAddForm && (
          <div style={{ 
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)', 
            border: '2px solid #dc0000', 
            borderRadius: '12px', 
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
              {editingDesign ? '✏️ Edit Design' : '➕ Add New Design'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ color: '#dc0000', fontWeight: '600', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                  Design Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Classic Red Stripe"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#000',
                    border: '2px solid #333',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
                
                <label style={{ color: '#dc0000', fontWeight: '600', fontSize: '0.9rem', display: 'block', marginTop: '1rem', marginBottom: '0.5rem' }}>
                  Upload Images * {formData.images.length > 0 && `(${formData.images.length} uploaded)`}
                </label>
                
                <label 
                  htmlFor="fileUpload" 
                  style={{
                    display: 'block',
                    padding: '1.5rem 1rem',
                    background: uploading ? '#1a1a1a' : 'rgba(220, 0, 0, 0.1)',
                    border: '2px dashed #dc0000',
                    borderRadius: '8px',
                    textAlign: 'center',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {uploading ? '⏳' : '📁'}
                  </div>
                  <div style={{ color: '#dc0000', fontWeight: '600', fontSize: '0.95rem' }}>
                    {uploading ? 'Uploading...' : 'Click to Upload Multiple Images'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>
                    JPG, PNG, GIF, WebP (Max 5MB each)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#dc0000', marginTop: '0.5rem', fontWeight: '600' }}>
                    First image will be the main display image
                  </div>
                </label>
                <input
                  id="fileUpload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1rem' }}>
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    style={{ width: '18px', height: '18px', accentColor: '#dc0000' }}
                  />
                  <span style={{ fontSize: '0.9rem', color: 'white' }}>Active (visible in forms)</span>
                </label>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button 
                    type="submit" 
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #dc0000 0%, #ff0000 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                  >
                    {editingDesign ? 'Update' : 'Add Design'}
                  </button>
                  <button 
                    type="button" 
                    onClick={resetForm}
                    style={{
                      flex: 1,
                      background: '#333',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div>
                {formData.images && formData.images.length > 0 ? (
                  <div>
                    <label style={{ color: '#10b981', fontWeight: '600', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                      ✓ Uploaded Images ({formData.images.length})
                    </label>
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.75rem',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      padding: '0.5rem'
                    }}>
                      {formData.images.map((imageUrl, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                          {index === 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '0.25rem',
                              left: '0.25rem',
                              background: '#dc0000',
                              color: 'white',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 'bold',
                              zIndex: 10
                            }}>
                              MAIN
                            </div>
                          )}
                          <img 
                            src={imageUrl} 
                            alt={`Image ${index + 1}`}
                            style={{ 
                              width: '100%',
                              height: '120px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: index === 0 ? '2px solid #dc0000' : '2px solid #333'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => handleReorderImage(index, 'left')}
                                style={{
                                  flex: 1,
                                  padding: '0.25rem',
                                  background: '#333',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem'
                                }}
                              >
                                ←
                              </button>
                            )}
                            {index < formData.images.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleReorderImage(index, 'right')}
                                style={{
                                  flex: 1,
                                  padding: '0.25rem',
                                  background: '#333',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem'
                                }}
                              >
                                →
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              style={{
                                flex: 1,
                                padding: '0.25rem',
                                background: '#dc0000',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.7rem'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: '#1a1a1a',
                    border: '2px dashed #333',
                    borderRadius: '8px',
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#666',
                    minHeight: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📷</div>
                    <div>Upload images to preview</div>
                  </div>
                )}
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#dc0000' }}>
              Loading kit designs...
            </div>
          ) : designs.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#666' }}>
              No kit designs yet. Click "Add New Design" to create one.
            </div>
          ) : (
            designs.map(design => (
              <div 
                key={design.id} 
                style={{ 
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
                  border: `2px solid ${design.active ? '#dc0000' : '#333'}`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  opacity: design.active ? 1 : 0.6,
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                }}
              >
                <div style={{ position: 'relative', width: '100%', height: '200px', overflow: 'hidden', background: '#000' }}>
                  <img 
                    src={design.images && design.images[0] || design.imageUrl || ''} 
                    alt={design.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23333" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23666"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  {design.images && design.images.length > 1 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '0.5rem',
                      left: '0.5rem',
                      background: 'rgba(0,0,0,0.8)',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}>
                      📷 {design.images.length}
                    </div>
                  )}
                  {!design.active && (
                    <div style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: '#666',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      INACTIVE
                    </div>
                  )}
                </div>
                
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'white', fontWeight: '600' }}>
                    {design.name}
                  </h3>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => handleToggleStatus(design.id)}
                      style={{
                        flex: '1',
                        minWidth: '80px',
                        padding: '0.5rem 0.75rem',
                        background: design.active ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: design.active ? '#fbbf24' : '#10b981',
                        border: `1px solid ${design.active ? '#fbbf24' : '#10b981'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        transition: 'all 0.3s'
                      }}
                    >
                      {design.active ? 'Hide' : 'Show'}
                    </button>
                    <button 
                      onClick={() => handleEdit(design)}
                      style={{
                        flex: '1',
                        minWidth: '60px',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(220, 0, 0, 0.2)',
                        color: '#dc0000',
                        border: '1px solid #dc0000',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        transition: 'all 0.3s'
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(design.id)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        border: '1px solid #ef4444',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        transition: 'all 0.3s'
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
