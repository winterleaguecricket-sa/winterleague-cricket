import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../../styles/adminProducts.module.css'

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [categories, setCategories] = useState([]);
  const [shirtDesigns, setShirtDesigns] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    category: 'premium',
    price: '',
    cost: '',
    description: '',
    stock: '',
    featured: false,
    sizes: [],
    image: '',
    images: [],
    designId: ''
  });

  const compressImageFile = (file, options = {}) => new Promise((resolve) => {
    if (!file || !file.type?.startsWith('image/')) {
      resolve(null);
      return;
    }

    const {
      maxWidth = 1400,
      maxHeight = 1400,
      quality = 0.72,
      mimeType = 'image/jpeg'
    } = options;

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      } catch (error) {
        console.error('Image compression failed:', error);
        resolve(null);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?lite=true&noImages=true');
      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const slugify = (value) => (
    (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  );

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (response.ok && data?.success) {
        const normalized = (data.categories || []).map(category => ({
          ...category,
          slug: category.slug || slugify(category.name)
        }));
        setCategories(normalized);
        setFormData(prev => {
          if (!normalized.length) {
            return prev;
          }
          const existing = normalized.find(cat => cat.slug === prev.category);
          return existing ? prev : { ...prev, category: normalized[0].slug };
        });
        return;
      }
      console.error('Error loading categories:', data?.error || 'Unknown error');
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    loadCategories();
    loadShirtDesigns();
  }, []);

  const refreshCategories = () => {
    loadCategories();
  };

  const loadShirtDesigns = async () => {
    try {
      const response = await fetch('/api/shirt-designs?activeOnly=true');
      const data = await response.json();
      if (response.ok && data?.success && Array.isArray(data.designs)) {
        setShirtDesigns(data.designs);
        return;
      }
      console.error('Error loading shirt designs:', data?.error || 'Unknown error');
    } catch (error) {
      console.error('Error loading shirt designs:', error);
    }
  };

  const safeParseJson = (text) => {
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (error) {
      return { error: text };
    }
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

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageData = await Promise.all(
      files.map(async (file) => {
        const compressed = await compressImageFile(file);
        if (compressed) return compressed;
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      })
    );

    setFormData(prev => {
      const updatedImages = [...prev.images, ...imageData].filter(Boolean);
      return {
        ...prev,
        images: updatedImages,
        image: updatedImages[0] || prev.image
      };
    });

    e.target.value = '';
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => {
      const updatedImages = prev.images.filter((_, index) => index !== indexToRemove);
      return {
        ...prev,
        images: updatedImages,
        image: updatedImages[0] || ''
      };
    });
  };

  const handleSetCoverImage = (indexToSet) => {
    setFormData(prev => {
      const updatedImages = [...prev.images];
      const [selected] = updatedImages.splice(indexToSet, 1);
      updatedImages.unshift(selected);
      return {
        ...prev,
        images: updatedImages,
        image: updatedImages[0] || ''
      };
    });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const normalizedImages = formData.images.length > 0 ? formData.images : (formData.image ? [formData.image] : []);
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
            designId: formData.designId || null,
          price: parseFloat(formData.price),
          cost: formData.cost !== '' ? parseFloat(formData.cost) : null,
          stock: parseInt(formData.stock),
          images: normalizedImages,
          image: normalizedImages[0] || '/images/placeholder.svg'
        })
      });
      const responseText = await response.text();
      const data = safeParseJson(responseText);
      if (data.success) {
        setProducts(data.products);
        setFormData({
          name: '',
          category: 'premium',
          price: '',
          cost: '',
          description: '',
          stock: '',
          featured: false,
          sizes: [],
          image: '',
            images: [],
            designId: ''
        });
        setShowAddForm(false);
      } else {
        alert('Failed to add product: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    }
  };

  const handleEditProduct = async (product) => {
    setEditingProduct(product.id);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      cost: product.cost !== undefined && product.cost !== null ? product.cost.toString() : '',
      description: product.description,
      stock: product.stock.toString(),
      featured: product.featured,
      sizes: product.sizes || [],
      image: (product.images && product.images.length > 0 ? product.images[0] : product.image) || '',
      images: product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []),
      designId: product.designId || ''
    });

    try {
      const response = await fetch(`/api/products?id=${product.id}`);
      const data = await response.json();
      if (response.ok && data?.success && data.product) {
        const full = data.product;
        setFormData({
          name: full.name,
          category: full.category,
          price: full.price.toString(),
          cost: full.cost !== undefined && full.cost !== null ? full.cost.toString() : '',
          description: full.description,
          stock: full.stock.toString(),
          featured: full.featured,
          sizes: full.sizes || [],
          image: (full.images && full.images.length > 0 ? full.images[0] : full.image) || '',
          images: full.images && full.images.length > 0 ? full.images : (full.image ? [full.image] : []),
          designId: full.designId || ''
        });
      }
    } catch (error) {
      console.error('Error loading full product details:', error);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const normalizedImages = formData.images.length > 0 ? formData.images : (formData.image ? [formData.image] : []);
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct,
          ...formData,
            designId: formData.designId || null,
          price: parseFloat(formData.price),
          cost: formData.cost !== '' ? parseFloat(formData.cost) : null,
          stock: parseInt(formData.stock),
          images: normalizedImages,
          image: normalizedImages[0] || formData.image || '/images/placeholder.svg'
        })
      });
      const responseText = await response.text();
      const data = safeParseJson(responseText);
      if (data.success) {
        setProducts(data.products);
        setEditingProduct(null);
        setFormData({
          name: '',
          category: 'premium',
          price: '',
          cost: '',
          description: '',
          stock: '',
          featured: false,
          sizes: [],
          image: '',
            images: [],
            designId: ''
        });
      } else {
        alert('Failed to update product: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await fetch(`/api/products?id=${id}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
          setProducts(data.products);
        } else {
          alert('Failed to delete product: ' + (data.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  const handleDuplicateProduct = async (product) => {
    try {
      const normalizedImages = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : (product.image ? [product.image] : []);
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${product.name} (Copy)`,
          category: product.category,
          price: product.price,
          cost: product.cost ?? 0,
          description: product.description || '',
          stock: product.stock ?? 0,
          featured: product.featured || false,
          sizes: product.sizes || [],
          images: normalizedImages,
          image: normalizedImages[0] || product.image || '/images/placeholder.svg',
          designId: product.designId || null
        })
      });
      const responseText = await response.text();
      const data = safeParseJson(responseText);
      if (response.ok && data?.success) {
        setProducts(data.products || []);
        return;
      }
      alert('Failed to duplicate product: ' + (data.error || 'Unknown error'));
    } catch (error) {
      console.error('Error duplicating product:', error);
      alert('Failed to duplicate product. Please try again.');
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
      cost: '',
      description: '',
      stock: '',
      featured: false,
      sizes: [],
      image: '',
      images: [],
      designId: ''
    });
  };

  const handleInlineNameUpdate = (categorySlug, newName) => {
    // This would update the category name - you'll need to implement category update logic
    // For now, just close the editing state
    setEditingName(null);
  };

  const priceValue = parseFloat(formData.price);
  const costValue = parseFloat(formData.cost);
  const hasProfitValues = !Number.isNaN(priceValue) && !Number.isNaN(costValue) && priceValue > 0;
  const profitValue = hasProfitValues ? priceValue - costValue : 0;
  const profitPercentage = hasProfitValues ? (profitValue / priceValue) * 100 : 0;

  return (
    <div className={styles.container}>
      <Head>
        <title>Product Management - Admin Panel</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>Product Management</h1>
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
                <div className={styles.modalBody}>
            
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
                <label>Kit Design (Additional Apparel)</label>
                <select
                  name="designId"
                  value={formData.designId || ''}
                  onChange={handleInputChange}
                  className={styles.input}
                >
                  <option value="">No design link</option>
                  {shirtDesigns.map(design => (
                    <option key={design.id} value={design.id}>{design.name}</option>
                  ))}
                </select>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.35rem' }}>
                  Only required for Additional Apparel products.
                </div>
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
                <label>Cost (R)</label>
                <input
                  type="number"
                  name="cost"
                  step="0.01"
                  value={formData.cost}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formRow}>
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

              <div className={styles.formGroup}>
                <label>Profit (R)</label>
                <input
                  type="text"
                  value={hasProfitValues ? `R${profitValue.toFixed(2)}` : ''}
                  readOnly
                  className={`${styles.input} ${styles.readOnlyInput}`}
                  placeholder="R0.00"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Profit %</label>
                <input
                  type="text"
                  value={hasProfitValues ? `${profitPercentage.toFixed(1)}%` : ''}
                  readOnly
                  className={`${styles.input} ${styles.readOnlyInput}`}
                  placeholder="0%"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Pricing Note</label>
                <input
                  type="text"
                  value={hasProfitValues ? (profitValue >= 0 ? 'Healthy margin' : 'Below cost') : ''}
                  readOnly
                  className={`${styles.input} ${styles.readOnlyInput}`}
                  placeholder="Add price and cost"
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
              <label>Product Images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className={styles.fileInput}
              />
              {formData.images.length > 0 && (
                <div className={styles.imageGrid}>
                  {formData.images.map((img, index) => (
                    <div key={`${img}-${index}`} className={styles.imageCard}>
                      <img src={img} alt={`Product preview ${index + 1}`} />
                      {index === 0 && (
                        <span className={styles.coverBadge}>Cover</span>
                      )}
                      <div className={styles.imageActions}>
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetCoverImage(index)}
                            className={styles.secondaryButton}
                          >
                            Set as Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className={styles.removeImageButton}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
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
                      background: '#111827', 
                      color: '#9ca3af',
                      border: '1px solid rgba(220, 0, 0, 0.35)',
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
                </div>
          </form>
        </div>
      </>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#dc0000' }}>
            Loading products...
          </div>
        ) : !(showAddForm || editingProduct) && (
          <div className={styles.productsTable}>
          {categories.map(category => {
            const categoryProducts = products.filter(p => p.category === category.slug);
            if (categoryProducts.length === 0) return null;
            
            return (
              <div key={category.id} className={styles.categorySection}>
                <div className={styles.categoryTitle}>
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
                    <h3
                    onClick={() => setEditingName(category.slug)}
                    >
                      {category.name}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ opacity: 0.6 }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </h3>
                  )}
                  <span className={styles.productCount}>
                    {categoryProducts.length} product{categoryProducts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Compact Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Sizes</th>
                        <th style={{ textAlign: 'center' }}>Featured</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryProducts.map(product => (
                        <tr key={product.id} 
                          className={styles.mobileClickableRow}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 0, 0, 0.08)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          onClick={(e) => {
                            // On mobile, clicking the row opens edit (unless clicking a button)
                            if (window.innerWidth <= 768 && e.target.tagName !== 'BUTTON') {
                              handleEditProduct(product);
                            }
                          }}
                        >
                          <td style={{ padding: '0.65rem', color: '#9ca3af', fontWeight: '600', fontSize: '0.85rem' }}>#{product.id}</td>
                          <td style={{ padding: '0.65rem', color: '#9ca3af', fontWeight: '600' }}>{product.name}</td>
                          <td style={{ padding: '0.65rem', color: '#9ca3af', fontWeight: '700' }}>R{product.price.toFixed(2)}</td>
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
                          <td style={{ padding: '0.65rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                            {product.sizes && product.sizes.length > 0 ? 
                              `${product.sizes.length} size${product.sizes.length !== 1 ? 's' : ''}` : 
                              '-'
                            }
                          </td>
                          <td style={{ padding: '0.65rem', textAlign: 'center' }}>
                            {product.featured ? 
                              <span className={styles.featuredBadge}>✓</span> : 
                              <span className={styles.featuredBadgeOff}>—</span>
                            }
                          </td>
                          <td style={{ padding: '0.65rem', textAlign: 'right' }}>
                            <div className={styles.mobileActionButtons} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button 
                                className={styles.mobileActionButton}
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
                                className={styles.mobileActionButton}
                                onClick={() => handleDuplicateProduct(product)}
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
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
                                Duplicate
                              </button>
                              <button 
                                className={styles.mobileActionButton}
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
