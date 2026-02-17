import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminFunnels.module.css';
import {
  getFunnels,
  getFunnelById,
  addFunnel,
  updateFunnel,
  deleteFunnel,
  addStepToFunnel,
  updateFunnelStep,
  deleteFunnelStep
} from '../../data/funnels';
import { getCategories } from '../../data/categories';
import { getFormTemplates } from '../../data/forms';
import { getPages } from '../../data/categories';

export default function AdminFunnels() {
  const [funnels, setFunnels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [forms, setForms] = useState([]);
  const [pages, setPages] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [selectedFunnel, setSelectedFunnel] = useState(null);
  const [funnelData, setFunnelData] = useState({
    name: '',
    description: '',
    active: true
  });
  const [stepData, setStepData] = useState({
    type: 'category',
    targetId: null,
    title: '',
    description: ''
  });

  useEffect(() => {
    setFunnels(getFunnels());
    setCategories(getCategories());
    setForms(getFormTemplates());
    setPages(getPages());
  }, []);

  const handleFunnelChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFunnelData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleStepChange = (e) => {
    const { name, value } = e.target;
    setStepData(prev => ({
      ...prev,
      [name]: name === 'targetId' ? (value ? Number(value) : null) : value,
      targetId: name === 'type' && value === 'checkout' ? null : (name === 'targetId' ? (value ? Number(value) : null) : prev.targetId)
    }));
  };

  const handleCreateFunnel = (e) => {
    e.preventDefault();
    const newFunnel = addFunnel({ ...funnelData, steps: [] });
    setFunnels(getFunnels());
    setSelectedFunnel(newFunnel);
    setActiveTab('edit');
    resetFunnelData();
  };

  const handleUpdateFunnel = (e) => {
    e.preventDefault();
    updateFunnel(selectedFunnel.id, funnelData);
    setFunnels(getFunnels());
    setActiveTab('list');
    resetFunnelData();
  };

  const handleDeleteFunnel = (id) => {
    if (confirm('Are you sure you want to delete this funnel?')) {
      deleteFunnel(id);
      setFunnels(getFunnels());
      if (selectedFunnel?.id === id) {
        setSelectedFunnel(null);
        setActiveTab('list');
      }
    }
  };

  const handleEditFunnel = (funnel) => {
    setSelectedFunnel(funnel);
    setFunnelData({
      name: funnel.name,
      description: funnel.description,
      active: funnel.active
    });
    setActiveTab('edit');
  };

  const handleAddStep = (e) => {
    e.preventDefault();
    if (!selectedFunnel) return;
    
    // Validate step data
    if (stepData.type !== 'checkout' && !stepData.targetId) {
      alert('Please select a target for this step');
      return;
    }
    
    addStepToFunnel(selectedFunnel.id, stepData);
    setSelectedFunnel(getFunnelById(selectedFunnel.id));
    setFunnels(getFunnels());
    resetStepData();
  };

  const handleDeleteStep = (stepId) => {
    if (confirm('Are you sure you want to delete this step?')) {
      deleteFunnelStep(selectedFunnel.id, stepId);
      setSelectedFunnel(getFunnelById(selectedFunnel.id));
      setFunnels(getFunnels());
    }
  };

  const handleMoveStepUp = (stepId) => {
    const stepIndex = selectedFunnel.steps.findIndex(s => s.id === stepId);
    if (stepIndex > 0) {
      const newSteps = [...selectedFunnel.steps];
      [newSteps[stepIndex - 1], newSteps[stepIndex]] = [newSteps[stepIndex], newSteps[stepIndex - 1]];
      newSteps.forEach((step, index) => {
        step.order = index + 1;
      });
      updateFunnel(selectedFunnel.id, { steps: newSteps });
      setSelectedFunnel(getFunnelById(selectedFunnel.id));
      setFunnels(getFunnels());
    }
  };

  const handleMoveStepDown = (stepId) => {
    const stepIndex = selectedFunnel.steps.findIndex(s => s.id === stepId);
    if (stepIndex < selectedFunnel.steps.length - 1) {
      const newSteps = [...selectedFunnel.steps];
      [newSteps[stepIndex], newSteps[stepIndex + 1]] = [newSteps[stepIndex + 1], newSteps[stepIndex]];
      newSteps.forEach((step, index) => {
        step.order = index + 1;
      });
      updateFunnel(selectedFunnel.id, { steps: newSteps });
      setSelectedFunnel(getFunnelById(selectedFunnel.id));
      setFunnels(getFunnels());
    }
  };

  const resetFunnelData = () => {
    setFunnelData({
      name: '',
      description: '',
      active: true
    });
  };

  const resetStepData = () => {
    setStepData({
      type: 'category',
      targetId: null,
      title: '',
      description: ''
    });
  };

  const getTargetOptions = () => {
    switch (stepData.type) {
      case 'category':
        return categories;
      case 'form':
        return forms;
      case 'page':
        return pages;
      default:
        return [];
    }
  };

  const getStepTypeName = (type) => {
    const types = {
      category: '📂 Category',
      form: '📋 Form',
      page: '📄 Page',
      checkout: '💳 Checkout'
    };
    return types[type] || type;
  };

  const getTargetName = (step) => {
    if (step.type === 'checkout') return 'Checkout Page';
    
    let target = null;
    const targetId = Number(step.targetId);
    switch (step.type) {
      case 'category':
        target = categories.find(c => c.id === targetId);
        return target ? `${target.icon} ${target.name}` : 'Unknown';
      case 'form':
        target = forms.find(f => f.id === targetId);
        return target ? target.name : 'Unknown';
      case 'page':
        target = pages.find(p => p.id === targetId);
        return target ? target.title : 'Unknown';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Sales Funnels - Admin Panel</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>🔄 Sales Funnels</h1>
          <nav className={styles.nav}>
            <Link href="/admin" className={styles.navLink}>← Back to Admin</Link>
            <Link href="/" className={styles.navLink}>View Store</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'list' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('list')}
          >
            📝 All Funnels
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'create' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('create');
              setSelectedFunnel(null);
              resetFunnelData();
            }}
          >
            ➕ Create New
          </button>
          {selectedFunnel && activeTab === 'edit' && (
            <button className={`${styles.tab} ${styles.activeTab}`}>
              ✏️ Editing: {selectedFunnel.name}
            </button>
          )}
        </div>

        {activeTab === 'list' && (
          <div className={styles.funnelsList}>
            <h2>Sales Funnels ({funnels.length})</h2>
            <div className={styles.funnelsGrid}>
              {funnels.map(funnel => (
                <div key={funnel.id} className={styles.funnelCard}>
                  <div className={styles.funnelCardHeader}>
                    <h3>{funnel.name}</h3>
                    <span className={funnel.active ? styles.badgeActive : styles.badgeInactive}>
                      {funnel.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className={styles.funnelDescription}>{funnel.description}</p>
                  <div className={styles.funnelMeta}>
                    <span>🔗 {funnel.steps.length} steps</span>
                  </div>
                  <div className={styles.stepsList}>
                    {funnel.steps.sort((a, b) => a.order - b.order).map((step, index) => (
                      <div key={step.id} className={styles.stepPreview}>
                        <span className={styles.stepNumber}>{index + 1}</span>
                        <span className={styles.stepType}>{getStepTypeName(step.type)}</span>
                        <span className={styles.stepTarget}>{getTargetName(step)}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.funnelActions}>
                    <button onClick={() => handleEditFunnel(funnel)} className={styles.editBtn}>
                      Edit
                    </button>
                    <button onClick={() => handleDeleteFunnel(funnel.id)} className={styles.deleteBtn}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className={styles.funnelBuilder}>
            <h2>Create New Funnel</h2>
            <form onSubmit={handleCreateFunnel} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Funnel Name *</label>
                <input
                  type="text"
                  name="name"
                  value={funnelData.name}
                  onChange={handleFunnelChange}
                  required
                  placeholder="e.g., Premium Equipment Purchase Flow"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  name="description"
                  value={funnelData.description}
                  onChange={handleFunnelChange}
                  rows="3"
                  placeholder="Brief description of this funnel"
                  className={styles.textarea}
                />
              </div>

              <button type="submit" className={styles.submitBtn}>
                Create Funnel & Add Steps
              </button>
            </form>
          </div>
        )}

        {activeTab === 'edit' && selectedFunnel && (
          <div className={styles.funnelEditor}>
            <div className={styles.editorLayout}>
              <div className={styles.editorSidebar}>
                <h3>Funnel Settings</h3>
                <form onSubmit={handleUpdateFunnel} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label>Funnel Name</label>
                    <input
                      type="text"
                      name="name"
                      value={funnelData.name}
                      onChange={handleFunnelChange}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={funnelData.description}
                      onChange={handleFunnelChange}
                      rows="3"
                      className={styles.textarea}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="active"
                        checked={funnelData.active}
                        onChange={handleFunnelChange}
                      />
                      <span>Active Funnel</span>
                    </label>
                  </div>

                  <button type="submit" className={styles.submitBtn}>
                    Save Changes
                  </button>
                </form>

                <div className={styles.addStepSection}>
                  <h3>Add New Step</h3>
                  <form onSubmit={handleAddStep}>
                    <div className={styles.formGroup}>
                      <label>Step Type</label>
                      <select
                        name="type"
                        value={stepData.type}
                        onChange={handleStepChange}
                        className={styles.input}
                      >
                        <option value="category">Category Page</option>
                        <option value="form">Form</option>
                        <option value="page">Custom Page</option>
                        <option value="checkout">Checkout</option>
                      </select>
                    </div>

                    {stepData.type !== 'checkout' && (
                      <div className={styles.formGroup}>
                        <label>Select {stepData.type === 'category' ? 'Category' : stepData.type === 'form' ? 'Form' : 'Page'}</label>
                        <select
                          name="targetId"
                          value={stepData.targetId || ''}
                          onChange={handleStepChange}
                          required
                          className={styles.input}
                        >
                          <option value="">Select...</option>
                          {getTargetOptions().map(option => (
                            <option key={option.id} value={option.id}>
                              {stepData.type === 'category' ? `${option.icon} ${option.name}` :
                               stepData.type === 'form' ? option.name :
                               option.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className={styles.formGroup}>
                      <label>Step Title</label>
                      <input
                        type="text"
                        name="title"
                        value={stepData.title}
                        onChange={handleStepChange}
                        placeholder="e.g., Browse Products"
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Step Description</label>
                      <input
                        type="text"
                        name="description"
                        value={stepData.description}
                        onChange={handleStepChange}
                        placeholder="Brief description"
                        className={styles.input}
                      />
                    </div>

                    <button type="submit" className={styles.addBtn}>
                      Add Step
                    </button>
                  </form>
                </div>
              </div>

              <div className={styles.editorMain}>
                <h3>Funnel Steps ({selectedFunnel.steps.length})</h3>
                {selectedFunnel.steps.length === 0 ? (
                  <p className={styles.emptyMessage}>No steps yet. Add steps to build your funnel.</p>
                ) : (
                  <div className={styles.stepsFlow}>
                    {selectedFunnel.steps
                      .sort((a, b) => a.order - b.order)
                      .map((step, index) => (
                        <div key={step.id} className={styles.stepCard}>
                          <div className={styles.stepHeader}>
                            <div className={styles.stepHeaderLeft}>
                              <span className={styles.stepOrderBadge}>Step {step.order}</span>
                              <div className={styles.moveButtons}>
                                <button 
                                  onClick={() => handleMoveStepUp(step.id)}
                                  disabled={index === 0}
                                  className={styles.moveBtn}
                                  title="Move up"
                                >
                                  ↑
                                </button>
                                <button 
                                  onClick={() => handleMoveStepDown(step.id)}
                                  disabled={index === selectedFunnel.steps.length - 1}
                                  className={styles.moveBtn}
                                  title="Move down"
                                >
                                  ↓
                                </button>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteStep(step.id)}
                              className={styles.deleteStepBtn}
                            >
                              ✕
                            </button>
                          </div>
                          <div className={styles.stepContent}>
                            <div className={styles.stepType}>{getStepTypeName(step.type)}</div>
                            <h4>{step.title || getTargetName(step)}</h4>
                            {step.description && (
                              <p className={styles.stepDescription}>{step.description}</p>
                            )}
                            <div className={styles.stepTarget}>
                              Target: {getTargetName(step)}
                            </div>
                          </div>
                          {index < selectedFunnel.steps.length - 1 && (
                            <div className={styles.stepArrow}>↓</div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
