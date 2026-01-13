import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminManage.module.css';
import { 
  getCategories, 
  addCategory, 
  updateCategory, 
  deleteCategory,
  getSubcategories,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory
} from '../../data/categories';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [activeTab, setActiveTab] = useState('categories');
  const [editingCategory, setEditingCategory] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '📦'
  });
  const [subFormData, setSubFormData] = useState({
    categoryId: '',
    name: '',
    slug: '',
    description: '',
    icon: '📂'
  });
  const [editingSubId, setEditingSubId] = useState(null);
  const [showAddSubForm, setShowAddSubForm] = useState(false);

  useEffect(() => {
    setCategories(getCategories());
    setSubcategories(getSubcategories());
  }, []);

  // Category handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'name' && !editingCategory) {
      setFormData(prev => ({
        ...prev,
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }));
    }
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    addCategory(formData);
    setCategories(getCategories());
    resetForm();
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category.id);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon
    });
    setShowAddForm(false);
  };

  const handleUpdateCategory = (e) => {
    e.preventDefault();
    updateCategory(editingCategory, formData);
    setCategories(getCategories());
    resetForm();
  };

  const handleDeleteCategory = (id) => {
    if (confirm('Are you sure you want to delete this category? This will also delete all its subcategories.')) {
      deleteCategory(id);
      setCategories(getCategories());
      setSubcategories(getSubcategories());
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: '📦'
    });
    setEditingCategory(null);
    setShowAddForm(false);
  };

  // Subcategory handlers
  const handleSubChange = (e) => {
    const { name, value } = e.target;
    setSubFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'name' && !editingSubId) {
      setSubFormData(prev => ({
        ...prev,
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }));
    }
  };

  const handleAddSubcategory = (e) => {
    e.preventDefault();
    if (!subFormData.categoryId) {
      alert('Please select a category');
      return;
    }
    addSubcategory(subFormData);
    setSubcategories(getSubcategories());
    resetSubForm();
  };

  const handleEditSubcategory = (subcategory) => {
    setEditingSubId(subcategory.id);
    setSubFormData({
      categoryId: subcategory.categoryId,
      name: subcategory.name,
      slug: subcategory.slug,
      description: subcategory.description,
      icon: subcategory.icon
    });
    setShowAddSubForm(false);
  };

  const handleUpdateSubcategory = (e) => {
    e.preventDefault();
    updateSubcategory(editingSubId, subFormData);
    setSubcategories(getSubcategories());
    resetSubForm();
  };

  const handleDeleteSubcategory = (id) => {
    if (confirm('Are you sure you want to delete this subcategory?')) {
      deleteSubcategory(id);
      setSubcategories(getSubcategories());
    }
  };

  const resetSubForm = () => {
    setSubFormData({
      categoryId: '',
      name: '',
      slug: '',
      description: '',
      icon: '📂'
    });
    setEditingSubId(null);
    setShowAddSubForm(false);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Category Management - Admin Panel</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>📂 Category Management</h1>
          <nav className={styles.nav}>
            <Link href="/admin" className={styles.navLink}>← Back to Admin</Link>
            <Link href="/" className={styles.navLink}>View Store</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'categories' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            📁 Categories
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'subcategories' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('subcategories')}
          >
            📂 Subcategories
          </button>
        </div>

        {activeTab === 'categories' && (
          <>
            <div className={styles.toolbar}>
              <h2>Manage Categories</h2>
              <button 
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingCategory(null);
                }} 
                className={styles.addButton}
              >
                {showAddForm ? 'Cancel' : '+ Add New Category'}
              </button>
            </div>

            {(showAddForm || editingCategory) && (
              <form 
                onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}
                className={styles.form}
              >
                <h3>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Category Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Premium Equipment"
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
                      placeholder="e.g., premium-equipment"
                      className={styles.input}
                    />
                    <small className={styles.helpText}>Used in URLs: /category/{formData.slug}</small>
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
                    placeholder="Brief description of this category"
                    className={styles.textarea}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Icon (Emoji)</label>
                  <input
                    type="text"
                    name="icon"
                    value={formData.icon}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., ⭐ 🏏 🎯"
                    className={styles.input}
                    maxLength="2"
                  />
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.saveButton}>
                    {editingCategory ? 'Update Category' : 'Add Category'}
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
                    <th>Icon</th>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(category => (
                    <tr key={category.id}>
                      <td className={styles.iconCell}>{category.icon}</td>
                      <td className={styles.nameCell}>{category.name}</td>
                      <td><code className={styles.code}>{category.slug}</code></td>
                      <td>{category.description}</td>
                      <td>
                        <div className={styles.actions}>
                          <button 
                            onClick={() => handleEditCategory(category)}
                            className={styles.editButton}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(category.id)}
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
          </>
        )}

        {activeTab === 'subcategories' && (
          <>
            <div className={styles.toolbar}>
              <h2>Manage Subcategories</h2>
              <button 
                onClick={() => {
                  setShowAddSubForm(!showAddSubForm);
                  setEditingSubId(null);
                }} 
                className={styles.addButton}
              >
                {showAddSubForm ? 'Cancel' : '+ Add New Subcategory'}
              </button>
            </div>

            {(showAddSubForm || editingSubId) && (
              <form 
                onSubmit={editingSubId ? handleUpdateSubcategory : handleAddSubcategory}
                className={styles.form}
              >
                <h3>{editingSubId ? 'Edit Subcategory' : 'Add New Subcategory'}</h3>
                
                <div className={styles.formGroup}>
                  <label>Parent Category *</label>
                  <select
                    name="categoryId"
                    value={subFormData.categoryId}
                    onChange={handleSubChange}
                    required
                    className={styles.input}
                  >
                    <option value="">Select a category...</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Subcategory Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={subFormData.name}
                      onChange={handleSubChange}
                      required
                      className={styles.input}
                      placeholder="e.g., Bats"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>URL Slug *</label>
                    <input
                      type="text"
                      name="slug"
                      value={subFormData.slug}
                      onChange={handleSubChange}
                      required
                      className={styles.input}
                      placeholder="e.g., bats"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={subFormData.description}
                    onChange={handleSubChange}
                    rows="3"
                    placeholder="Brief description"
                    className={styles.textarea}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Icon (Emoji)</label>
                  <input
                    type="text"
                    name="icon"
                    value={subFormData.icon}
                    onChange={handleSubChange}
                    className={styles.input}
                    placeholder="📂"
                    maxLength="2"
                  />
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.saveButton}>
                    {editingSubId ? 'Update Subcategory' : 'Add Subcategory'}
                  </button>
                  <button type="button" onClick={resetSubForm} className={styles.cancelButton}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Icon</th>
                    <th>Name</th>
                    <th>Parent Category</th>
                    <th>Slug</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subcategories.map(subcategory => (
                    <tr key={subcategory.id}>
                      <td className={styles.iconCell}>{subcategory.icon}</td>
                      <td><strong>{subcategory.name}</strong></td>
                      <td>
                        <span className={styles.categoryBadge}>
                          {categories.find(c => c.id === subcategory.categoryId)?.icon}{' '}
                          {getCategoryName(subcategory.categoryId)}
                        </span>
                      </td>
                      <td><code className={styles.code}>{subcategory.slug}</code></td>
                      <td>{subcategory.description}</td>
                      <td>
                        <div className={styles.actions}>
                          <button 
                            onClick={() => handleEditSubcategory(subcategory)}
                            className={styles.editButton}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteSubcategory(subcategory.id)}
                            className={styles.deleteButton}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {subcategories.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                        No subcategories yet. Create your first one above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
