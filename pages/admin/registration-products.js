import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminProducts.module.css';
import {
  getRegistrationProducts,
  addRegistrationProduct,
  updateRegistrationProduct,
  deleteRegistrationProduct,
  toggleRegistrationProductStatus
} from '../../data/registrationProducts';

export default function AdminRegistrationProducts() {
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    sizeOptions: '',
    required: false,
    active: true,
    colorInheritFromTeam: false,
    imageUrl: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    setProducts(getRegistrationProducts());
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData(prev => ({
        ...prev,
        imageUrl: url
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const productData = {
      ...formData,
      sizeOptions: formData.sizeOptions
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
    };

    if (editingProduct) {
      updateRegistrationProduct(editingProduct.id, productData);
    } else {
      addRegistrationProduct(productData);
    }

    resetForm();
    loadProducts();
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      sizeOptions: product.sizeOptions.join(', '),
      required: product.required,
      active: product.active,
      colorInheritFromTeam: product.colorInheritFromTeam || false,
      imageUrl: product.imageUrl || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteRegistrationProduct(id);
      loadProducts();
    }
  };

  const handleToggleStatus = (id) => {
    toggleRegistrationProductStatus(id);
    loadProducts();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      sizeOptions: '',
      required: false,
      active: true,
      colorInheritFromTeam: false,
      imageUrl: ''
    });
    setEditingProduct(null);
    setShowModal(false);
  };

  const requiredProducts = products.filter(p => p.required);
  const optionalProducts = products.filter(p => !p.required);

  return (
    <div className={styles.container}>
      <Head>
        <title>Registration Products - Admin Panel</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>🛍️ Registration Products</h1>
          <nav className={styles.nav}>
            <Link href="/admin/settings" className={styles.navLink}>← Back to Settings</Link>
            <Link href="/admin" className={styles.navLink}>Admin Panel</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <div>
            <h2>Manage Player Registration Products</h2>
            <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.95rem' }}>
              Configure products available during player registration
            </p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className={styles.addButton}
          >
            + Add Product
          </button>
        </div>

        {showModal && (
          <>
            <div className={styles.modalOverlay} onClick={resetForm}></div>
            <div className={styles.modalContainer}>
              <form onSubmit={handleSubmit} className={styles.modalForm}>
                <div className={styles.modalHeader}>
                  <h3>{editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}</h3>
                  <button type="button" onClick={resetForm} className={styles.closeButton}>
                    ✕
                  </button>
                </div>

                <div className={styles.formRow} style={{ paddingTop: '1.5rem' }}>
                  <div className={styles.formGroup}>
                    <label>Product Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Training Shirt"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Price (R) *</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    placeholder="Brief description of the product"
                    rows={3}
                    className={styles.textarea}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Product Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className={styles.fileInput}
                  />
                  {formData.imageUrl && (
                    <div className={styles.imagePreview}>
                      <img src={formData.imageUrl} alt="Product preview" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({...prev, imageUrl: ''}))}
                        className={styles.removeImageButton}
                      >
                        Remove Image
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Size Options</label>
                  <input
                    type="text"
                    name="sizeOptions"
                    value={formData.sizeOptions}
                    onChange={handleInputChange}
                    placeholder="Small, Medium, Large, X-Large"
                    className={styles.input}
                  />
                  <small style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                    Comma-separated. Leave empty for products without sizes.
                  </small>
                </div>

                <div className={styles.checkboxGroup}>
                  <label>
                    <input
                      type="checkbox"
                      name="required"
                      checked={formData.required}
                      onChange={handleInputChange}
                    />
                    <span>Required Product (Basic Kit)</span>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label>
                    <input
                      type="checkbox"
                      name="colorInheritFromTeam"
                      checked={formData.colorInheritFromTeam}
                      onChange={handleInputChange}
                    />
                    <span>Inherit Team Colors</span>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label>
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                    />
                    <span>Active (Visible to Customers)</span>
                  </label>
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.saveButton}>
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                  <button type="button" onClick={resetForm} className={styles.cancelButton}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        <div className={styles.productsTable}>
          {requiredProducts.length > 0 && (
            <div className={styles.categorySection}>
              <h3 className={styles.categoryTitle}>
                ✓ Required Products
                <span className={styles.productCount}>({requiredProducts.length})</span>
              </h3>
              <table style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '25%', padding: '0.65rem', fontSize: '0.85rem' }}>Product</th>
                    <th style={{ width: '30%', padding: '0.65rem', fontSize: '0.85rem' }}>Description</th>
                    <th style={{ width: '15%', padding: '0.65rem', fontSize: '0.85rem' }}>Price</th>
                    <th style={{ width: '15%', padding: '0.65rem', fontSize: '0.85rem' }}>Status</th>
                    <th style={{ width: '15%', padding: '0.65rem', fontSize: '0.85rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requiredProducts.map(product => (
                    <tr key={product.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              style={{
                                width: '40px',
                                height: '40px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '2px solid #e5e7eb'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '40px',
                              height: '40px',
                              background: '#f3f4f6',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.2rem',
                              border: '2px solid #e5e7eb'
                            }}>
                              📦
                            </div>
                          )}
                          <div>
                            <strong style={{ fontSize: '0.9rem' }}>{product.name}</strong>
                            {product.sizeOptions?.length > 0 && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                                {product.sizeOptions.join(', ')}
                              </div>
                            )}
                            {product.colorInheritFromTeam && (
                              <div style={{ marginTop: '0.15rem' }}>
                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  padding: '0.1rem 0.4rem', 
                                  background: '#e0e7ff', 
                                  color: '#3730a3',
                                  borderRadius: '3px',
                                  fontWeight: 600
                                }}>
                                  🎨 Colors
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{product.description}</td>
                      <td>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669' }}>
                          R{product.price.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        {product.active ? (
                          <span className={styles.badge} style={{ background: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' }}>
                            ✓ Active
                          </span>
                        ) : (
                          <span className={styles.badge} style={{ background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }}>
                            ✕ Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleEdit(product)}
                            style={{
                              background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '0.4rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              transition: 'all 0.3s',
                              fontWeight: '600',
                              minWidth: '32px',
                              height: '32px'
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggleStatus(product.id)}
                            style={{
                              background: product.active ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '0.4rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              transition: 'all 0.3s',
                              fontWeight: '600',
                              minWidth: '32px',
                              height: '32px'
                            }}
                          >
                            {product.active ? '🚫' : '✓'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {optionalProducts.length > 0 && (
            <div className={styles.categorySection}>
              <h3 className={styles.categoryTitle}>
                ➕ Optional Products (Upsells)
                <span className={styles.productCount}>({optionalProducts.length})</span>
              </h3>
              <table style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '25%', padding: '0.65rem', fontSize: '0.85rem' }}>Product</th>
                    <th style={{ width: '30%', padding: '0.65rem', fontSize: '0.85rem' }}>Description</th>
                    <th style={{ width: '15%', padding: '0.65rem', fontSize: '0.85rem' }}>Price</th>
                    <th style={{ width: '15%', padding: '0.65rem', fontSize: '0.85rem' }}>Status</th>
                    <th style={{ width: '15%', padding: '0.65rem', fontSize: '0.85rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {optionalProducts.map(product => (
                    <tr key={product.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              style={{
                                width: '40px',
                                height: '40px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '2px solid #e5e7eb'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '40px',
                              height: '40px',
                              background: '#f3f4f6',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.2rem',
                              border: '2px solid #e5e7eb'
                            }}>
                              📦
                            </div>
                          )}
                          <div>
                            <strong style={{ fontSize: '0.9rem' }}>{product.name}</strong>
                            {product.sizeOptions?.length > 0 && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                                {product.sizeOptions.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{product.description}</td>
                      <td>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669' }}>
                          R{product.price.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        {product.active ? (
                          <span className={styles.badge} style={{ background: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' }}>
                            ✓ Active
                          </span>
                        ) : (
                          <span className={styles.badge} style={{ background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }}>
                            ✕ Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleEdit(product)}
                            style={{
                              background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '0.4rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              transition: 'all 0.3s',
                              fontWeight: '600',
                              minWidth: '32px',
                              height: '32px'
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggleStatus(product.id)}
                            style={{
                              background: product.active ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '0.4rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              transition: 'all 0.3s',
                              fontWeight: '600',
                              minWidth: '32px',
                              height: '32px'
                            }}
                          >
                            {product.active ? '🚫' : '✓'}
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={product.id === 'basic-kit'}
                            title={product.id === 'basic-kit' ? 'Cannot delete Basic Kit' : 'Delete product'}
                            style={{
                              background: product.id === 'basic-kit' ? '#d1d5db' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '0.4rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              cursor: product.id === 'basic-kit' ? 'not-allowed' : 'pointer',
                              transition: 'all 0.3s',
                              fontWeight: '600',
                              minWidth: '32px',
                              height: '32px',
                              opacity: product.id === 'basic-kit' ? 0.5 : 1
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {products.length === 0 && (
            <div style={{
              background: 'white',
              padding: '4rem 2rem',
              borderRadius: '16px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>No Products Yet</h3>
              <p style={{ color: '#6b7280', margin: 0 }}>Click "Add Product" to create your first registration product</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
