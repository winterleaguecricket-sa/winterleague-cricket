import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../../styles/adminProducts.module.css'
import { products as initialProducts } from '../../data/products'
import { getCategories } from '../../data/categories'

export default function AdminProducts() {
  const [products, setProducts] = useState(initialProducts);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    category: 'premium',
    price: '',
    description: '',
    stock: '',
    featured: false,
    sizes: [],
    image: ''
  });

  useEffect(() => {
    setCategories(getCategories());
  }, []);

  const refreshCategories = () => {
    setCategories(getCategories());
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSizeChange = (e) => {
    const sizesText = e.target.value;
    const sizesArray = sizesText.split(',').map(s => s.trim()).filter(s => s.length > 0);
    setFormData(prev => ({ ...prev, sizes: sizesArray }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    const newProduct = {
      id: Math.max(...products.map(p => p.id)) + 1,
      ...formData,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      image: formData.image || '/images/placeholder.jpg'
    };
    setProducts([...products, newProduct]);
    setFormData({
      name: '',
      category: 'premium',
      price: '',
      description: '',
      stock: '',
      featured: false,
      sizes: [],
      image: ''
    });
    setShowAddForm(false);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product.id);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      description: product.description,
      stock: product.stock.toString(),
      featured: product.featured,
      sizes: product.sizes || [],
      image: product.image || ''
    });
  };

  const handleUpdateProduct = (e) => {
    e.preventDefault();
    setProducts(products.map(p => 
      p.id === editingProduct 
        ? {
            ...p,
            ...formData,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock)
          }
        : p
    ));
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'premium',
      price: '',
      description: '',
      stock: '',
      featured: false,
      sizes: []
    });
  };

  const handleDeleteProduct = (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditingName(null);
    setShowAddForm(false);
    setFormData({
      name: '',
      category: 'premium',
      price: '',
      description: '',
      stock: '',
      featured: false,
      sizes: [],
      image: ''
    });
  };

  const handleInlineNameUpdate = (categorySlug, newName) => {
    // This would update the category name - you'll need to implement category update logic
    // For now, just close the editing state
    setEditingName(null);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Product Management - Admin Panel</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>🏏 Product Management</h1>
          <nav className={styles.nav}>
            <Link href="/admin" className={styles.navLink}>← Back to Admin</Link>
            <Link href="/" className={styles.navLink}>View Store</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <h2>Manage Products</h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={refreshCategories}
              style={{
                padding: '0.75rem 1.25rem',
                background: 'white',
                color: '#374151',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#dc0000';
                e.target.style.color = '#dc0000';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.color = '#374151';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              Refresh Categories
            </button>
            <button 
              onClick={() => setShowAddForm(!showAddForm)} 
              className={styles.addButton}
            >
              {showAddForm ? 'Cancel' : '+ Add New Product'}
            </button>
          </div>
        </div>

        {(showAddForm || editingProduct) && (
          <>
            <div className={styles.modalOverlay} onClick={cancelEdit}></div>
            <div className={styles.modalContainer}>
              <form 
                onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}
                className={styles.modalForm}
              >
                <div className={styles.modalHeader}>
                  <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                  <button type="button" onClick={cancelEdit} className={styles.closeButton}>✕</button>
                </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Product Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={styles.input}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Price (R)</label>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Stock</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows="3"
                className={styles.textarea}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Product Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className={styles.fileInput}
              />
              {formData.image && (
                <div className={styles.imagePreview}>
                  <img src={formData.image} alt="Product preview" />
                  <button 
                    type="button" 
                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                    className={styles.removeImageButton}
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Sizes (comma-separated, e.g., Small, Medium, Large)</label>
              <input
                type="text"
                value={formData.sizes.join(', ')}
                onChange={handleSizeChange}
                placeholder="e.g., Small, Medium, Large, XL"
                className={styles.input}
              />
              {formData.sizes.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
                  Sizes: {formData.sizes.map((size, i) => (
                    <span key={i} style={{ 
                      display: 'inline-block', 
                      padding: '0.25rem 0.5rem', 
                      margin: '0.25rem', 
                      background: '#f3f4f6', 
                      borderRadius: '4px' 
                    }}>
                      {size}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleInputChange}
                />
                <span>Featured Product</span>
              </label>
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={cancelEdit} className={styles.cancelButton}>
                Cancel
              </button>
              <button type="submit" className={styles.submitButton}>
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </>
        )}

        {!(showAddForm || editingProduct) && (
          <div className={styles.productsTable}>
          {categories.map(category => {
            const categoryProducts = products.filter(p => p.category === category.slug);
            if (categoryProducts.length === 0) return null;
            
            return (
              <div key={category.id} style={{
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #f3f4f6'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>{category.icon}</span>
                  {editingName === category.slug ? (
                    <input
                      type="text"
                      defaultValue={category.name}
                      onBlur={(e) => handleInlineNameUpdate(category.slug, e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleInlineNameUpdate(category.slug, e.target.value);
                        }
                      }}
                      autoFocus
                      style={{
                        fontSize: '1.3rem',
                        fontWeight: '800',
                        padding: '0.25rem 0.5rem',
                        border: '2px solid #dc0000',
                        borderRadius: '6px',
                        outline: 'none'
                      }}
                    />
                  ) : (
                    <h3 style={{
                      margin: 0,
                      fontSize: '1.3rem',
                      fontWeight: '800',
                      color: '#111827',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onClick={() => setEditingName(category.slug)}
                    >
                      {category.name}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" style={{ opacity: 0.5 }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </h3>
                  )}
                  <span style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    fontWeight: '600',
                    padding: '0.25rem 0.75rem',
                    background: '#f3f4f6',
                    borderRadius: '12px'
                  }}>
                    {categoryProducts.length} product{categoryProducts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Compact Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem'
                  }}>
                    <thead>
                      <tr style={{ 
                        background: '#f9fafb',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '700', color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '700', color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '700', color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '700', color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '700', color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sizes</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '700', color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Featured</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryProducts.map(product => (
                        <tr key={product.id} style={{
                          borderBottom: '1px solid #f3f4f6',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '0.65rem', color: '#6b7280', fontWeight: '600', fontSize: '0.85rem' }}>#{product.id}</td>
                          <td style={{ padding: '0.65rem', color: '#111827', fontWeight: '600' }}>{product.name}</td>
                          <td style={{ padding: '0.65rem', color: '#111827', fontWeight: '700' }}>R{product.price.toFixed(2)}</td>
                          <td style={{ padding: '0.65rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: product.stock > 10 ? '#dcfce7' : product.stock > 0 ? '#fef3c7' : '#fee2e2',
                              color: product.stock > 10 ? '#166534' : product.stock > 0 ? '#92400e' : '#991b1b',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '600'
                            }}>
                              {product.stock}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem', fontSize: '0.85rem', color: '#6b7280' }}>
                            {product.sizes && product.sizes.length > 0 ? 
                              `${product.sizes.length} size${product.sizes.length !== 1 ? 's' : ''}` : 
                              '-'
                            }
                          </td>
                          <td style={{ padding: '0.65rem', textAlign: 'center' }}>
                            {product.featured ? 
                              <span style={{ fontSize: '1.2rem', color: '#eab308' }}>⭐</span> : 
                              <span style={{ color: '#d1d5db' }}>-</span>
                            }
                          </td>
                          <td style={{ padding: '0.65rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => handleEditProduct(product)}
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  background: 'linear-gradient(135deg, #000000 0%, #374151 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(product.id)}
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  background: 'linear-gradient(135deg, #dc0000 0%, #991b1b 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
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
    </div>
  );
}
