import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminForms.module.css';
import {
  getFormTemplates,
  getFormTemplateById,
  addFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
  addFieldToForm,
  updateFormField,
  deleteFormField
} from '../../data/forms';
import { getCategories } from '../../data/categories';
// Note: adminSettings uses Node.js fs module, so we fetch via API instead

export default function AdminForms() {
  const [forms, setForms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shirtDesigns, setShirtDesigns] = useState([]);
  const [activeTab, setActiveTab] = useState('list'); // list, create, edit, submissions
  const [selectedForm, setSelectedForm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryIds: [],
    displayLocations: ['forms-page'],
    active: true
  });
  const [fieldData, setFieldData] = useState({
    type: 'text',
    label: '',
    placeholder: '',
    required: false,
    options: [],
    sourceFormId: null,
    displayFieldId: null,
    prefillFields: [],
    autofillFromSubmission: false,
    autofillSourceFormId: null,
    autofillSourceFieldId: null,
    autofillLinkedDropdownFieldId: null,
    includeColorPickers: false
  });
  const [optionInput, setOptionInput] = useState('');
  const [selectedPageId, setSelectedPageId] = useState(null); // For multi-page forms
  const [editingField, setEditingField] = useState(null); // For editing existing fields
  const [draggedField, setDraggedField] = useState(null); // For drag and drop
  const [submissions, setSubmissions] = useState([]);
  const [submissionCounts, setSubmissionCounts] = useState({}); // Track submission counts per form
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [submissionData, setSubmissionData] = useState({});
  const [selectedSubmissionForm, setSelectedSubmissionForm] = useState('all'); // Track which form's submissions to show
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [backgroundSaving, setBackgroundSaving] = useState(false);
  const [backgroundMessage, setBackgroundMessage] = useState('');
  const [backgroundDragActive, setBackgroundDragActive] = useState(false);
  const [backgroundTransparency, setBackgroundTransparency] = useState(false);


  useEffect(() => {
    setForms(getFormTemplates());
    setCategories(getCategories());
    // Load shirt designs from API (not local import which returns old defaults on client)
    const loadDesigns = async () => {
      try {
        const res = await fetch('/api/shirt-designs?activeOnly=true');
        if (res.ok) {
          const data = await res.json();
          setShirtDesigns(data.designs || []);
        }
      } catch (err) {
        console.error('Error loading shirt designs:', err);
      }
    };
    loadDesigns();
    
    // Load submission counts from database
    const loadSubmissionCounts = async () => {
      try {
        const response = await fetch('/api/submissions');
        if (response.ok) {
          const { submissions: dbSubmissions } = await response.json();
          const counts = {};
          (dbSubmissions || []).forEach(sub => {
            const formId = sub.formId;
            counts[formId] = (counts[formId] || 0) + 1;
          });
          setSubmissionCounts(counts);
        }
      } catch (error) {
        console.log('Could not load submission counts:', error.message);
      }
    };
    loadSubmissionCounts();
  }, []);

  // Load form background image from database when editing
  useEffect(() => {
    if (!selectedForm || activeTab !== 'edit') return;

    const loadBackground = async () => {
      try {
        const res = await fetch(`/api/form-background?formId=${selectedForm.id}`);
        const data = await res.json();
        if (data?.success && data?.background) {
          setBackgroundImage(data.background.imageUrl || '');
          setBackgroundTransparency(!!data.background.transparencyEnabled);
        } else {
          setBackgroundImage('');
          setBackgroundTransparency(false);
        }
      } catch (error) {
        console.error('Error loading form background:', error);
      }
    };

    loadBackground();
  }, [selectedForm, activeTab]);

  // Load all submissions when switching to submissions tab - fetch from database API only
  useEffect(() => {
    if (activeTab === 'submissions') {
      const loadSubmissions = async () => {
        setLoadingSubmissions(true);
        
        try {
          const response = await fetch('/api/submissions');
          if (response.ok) {
            const { submissions: dbSubmissions } = await response.json();
            
            // Map database submissions to expected format
            const mappedSubmissions = (dbSubmissions || []).map(sub => ({
              id: sub.id,
              shortId: formatSubmissionId(sub.id),
              formId: sub.formId,
              formName: sub.formName || forms.find(f => f.id === sub.formId)?.name || 'Unknown Form',
              data: sub.data,
              submittedAt: sub.submittedAt,
              status: sub.status || 'pending',
              approvalStatus: sub.approvalStatus || 'pending',
              source: 'database'
            }));
            
            setSubmissions(mappedSubmissions);
          } else {
            console.error('Failed to fetch submissions');
            setSubmissions([]);
          }
        } catch (error) {
          console.error('Error fetching submissions:', error.message);
          setSubmissions([]);
        }
        
        setLoadingSubmissions(false);
      };
      
      loadSubmissions();
    }
  }, [activeTab, forms]);

  // Helper function to get all fields from a form (handles both regular and multi-page forms)
  const getAllFormFields = (form) => {
    if (!form) return [];
    if (form.multiPage && form.pages) {
      return form.pages.flatMap(page => page.fields || []);
    }
    return form.fields || [];
  };

  const formatSubmissionId = (id) => {
    const raw = String(id || '');
    if (raw.length <= 4) return raw;
    return raw.slice(-4);
  };


  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCategoryToggle = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId]
    }));
  };

  const handleDisplayLocationToggle = (location) => {
    setFormData(prev => ({
      ...prev,
      displayLocations: prev.displayLocations.includes(location)
        ? prev.displayLocations.filter(loc => loc !== location)
        : [...prev.displayLocations, location]
    }));
  };

  const handleCreateForm = (e) => {
    e.preventDefault();
    const newForm = addFormTemplate({ ...formData, fields: [] });
    setForms(getFormTemplates());
    setSelectedForm(newForm);
    setActiveTab('edit');
    resetFormData();
  };

  const handleUpdateForm = (e) => {
    e.preventDefault();
    updateFormTemplate(selectedForm.id, formData);
    setForms(getFormTemplates());
    setActiveTab('list');
    resetFormData();
  };

  const handleDeleteForm = (id) => {
    if (confirm('Are you sure you want to delete this form? All submissions will remain but cannot be accessed.')) {
      deleteFormTemplate(id);
      setForms(getFormTemplates());
      if (selectedForm?.id === id) {
        setSelectedForm(null);
        setActiveTab('list');
      }
    }
  };

  const handleEditForm = (form) => {
    setSelectedForm(form);
    setFormData({
      name: form.name,
      description: form.description,
      categoryIds: form.categoryIds,
      displayLocations: form.displayLocations || ['forms-page'],
      active: form.active
    });
    // Set default page for multi-page forms
    if (form.multiPage && form.pages?.length > 0) {
      setSelectedPageId(form.pages[0].pageId);
    }
    setActiveTab('edit');
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      description: '',
      categoryIds: [],
      displayLocations: ['forms-page'],
      active: true
    });
  };

  const saveFormBackground = async (imageUrl, transparencyOverride) => {
    if (!selectedForm) return;
    try {
      setBackgroundSaving(true);
      const res = await fetch(`/api/form-background?formId=${selectedForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          background: {
            imageUrl,
            transparencyEnabled: typeof transparencyOverride === 'boolean'
              ? transparencyOverride
              : backgroundTransparency
          }
        })
      });
      const data = await res.json();
      if (data?.success) {
        setBackgroundMessage('Background saved successfully.');
      } else {
        setBackgroundMessage(data?.error || 'Failed to save background.');
      }
    } catch (error) {
      console.error('Error saving form background:', error);
      setBackgroundMessage('Failed to save background.');
    } finally {
      setBackgroundSaving(false);
      setTimeout(() => setBackgroundMessage(''), 3000);
    }
  };

  const handleBackgroundUpload = async (file) => {
    if (!file || !selectedForm) return;
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validImageTypes.includes(file.type)) {
      setBackgroundMessage('Please upload a valid image file (JPG, PNG, GIF, WebP, SVG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setBackgroundMessage('Image must be less than 5MB.');
      return;
    }

    try {
      setBackgroundUploading(true);
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      const response = await fetch('/api/upload-site-asset?type=form-background', {
        method: 'POST',
        body: formDataUpload,
      });
      const data = await response.json();
      if (!data.success) {
        setBackgroundMessage('Upload failed: ' + (data.error || 'Unknown error'));
        return;
      }
      setBackgroundImage(data.url);
      await saveFormBackground(data.url);
    } catch (error) {
      console.error('Upload error:', error);
      setBackgroundMessage('Failed to upload image. Please try again.');
    } finally {
      setBackgroundUploading(false);
    }
  };

  const handleBackgroundDrop = (e) => {
    e.preventDefault();
    setBackgroundDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleBackgroundUpload(file);
    }
  };

  // Field Management
  const handleFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFieldData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddOption = () => {
    if (optionInput.trim()) {
      setFieldData(prev => ({
        ...prev,
        options: [...prev.options, optionInput.trim()]
      }));
      setOptionInput('');
    }
  };

  const handleRemoveOption = (index) => {
    setFieldData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleAddField = (e) => {
    e.preventDefault();
    if (selectedForm) {
      // For multi-page forms, add to selected page
      if (selectedForm.multiPage && selectedPageId) {
        const formCopy = JSON.parse(JSON.stringify(selectedForm));
        const pageIndex = formCopy.pages.findIndex(p => p.pageId === selectedPageId);
        if (pageIndex !== -1) {
          const newField = {
            ...fieldData,
            id: Date.now() // Simple unique ID
          };
          formCopy.pages[pageIndex].fields.push(newField);
          updateFormTemplate(selectedForm.id, formCopy);
          setSelectedForm(getFormTemplateById(selectedForm.id));
          setForms(getFormTemplates());
          resetFieldData();
        }
      } else if (!selectedForm.multiPage) {
        // For regular forms, use existing function
        addFieldToForm(selectedForm.id, fieldData);
        setSelectedForm(getFormTemplateById(selectedForm.id));
        setForms(getFormTemplates());
        resetFieldData();
      }
    }
  };

  const handleDeleteField = (fieldId, pageId = null) => {
    if (selectedForm && confirm('Delete this field?')) {
      // For multi-page forms, find and delete from correct page
      if (selectedForm.multiPage && pageId) {
        const formCopy = JSON.parse(JSON.stringify(selectedForm));
        const pageIndex = formCopy.pages.findIndex(p => p.pageId === pageId);
        if (pageIndex !== -1) {
          formCopy.pages[pageIndex].fields = formCopy.pages[pageIndex].fields.filter(f => f.id !== fieldId);
          updateFormTemplate(selectedForm.id, formCopy);
          setSelectedForm(getFormTemplateById(selectedForm.id));
          setForms(getFormTemplates());
        }
      } else if (!selectedForm.multiPage) {
        // For regular forms, use existing function
        deleteFormField(selectedForm.id, fieldId);
        setSelectedForm(getFormTemplateById(selectedForm.id));
        setForms(getFormTemplates());
      }
    }
  };

  const handleEditFieldClick = (field, pageId = null) => {
    setEditingField({ ...field, pageId });
    setFieldData({
      type: field.type,
      label: field.label,
      placeholder: field.placeholder || '',
      required: field.required || false,
      options: field.options || [],
      sourceFormId: field.sourceFormId || null,
      displayFieldId: field.displayFieldId || null,
      prefillFields: field.prefillFields || [],
      autofillFromSubmission: field.autofillFromSubmission || false,
      autofillSourceFormId: field.autofillSourceFormId || null,
      autofillSourceFieldId: field.autofillSourceFieldId || null,
      autofillLinkedDropdownFieldId: field.autofillLinkedDropdownFieldId || null,
      includeColorPickers: field.includeColorPickers || false
    });
    if (pageId) {
      setSelectedPageId(pageId);
    }
  };

  const handleUpdateField = (e) => {
    e.preventDefault();
    if (selectedForm && editingField) {
      const formCopy = JSON.parse(JSON.stringify(selectedForm));
      
      if (selectedForm.multiPage && editingField.pageId) {
        const pageIndex = formCopy.pages.findIndex(p => p.pageId === editingField.pageId);
        if (pageIndex !== -1) {
          const fieldIndex = formCopy.pages[pageIndex].fields.findIndex(f => f.id === editingField.id);
          if (fieldIndex !== -1) {
            formCopy.pages[pageIndex].fields[fieldIndex] = {
              ...formCopy.pages[pageIndex].fields[fieldIndex],
              ...fieldData
            };
          }
        }
      } else if (!selectedForm.multiPage) {
        const fieldIndex = formCopy.fields.findIndex(f => f.id === editingField.id);
        if (fieldIndex !== -1) {
          formCopy.fields[fieldIndex] = {
            ...formCopy.fields[fieldIndex],
            ...fieldData
          };
        }
      }
      
      updateFormTemplate(selectedForm.id, formCopy);
      setSelectedForm(getFormTemplateById(selectedForm.id));
      setForms(getFormTemplates());
      setEditingField(null);
      resetFieldData();
    }
  };

  const handleMoveField = (fieldId, direction, pageId = null) => {
    if (!selectedForm) return;
    
    const formCopy = JSON.parse(JSON.stringify(selectedForm));
    
    if (selectedForm.multiPage && pageId) {
      const pageIndex = formCopy.pages.findIndex(p => p.pageId === pageId);
      if (pageIndex !== -1) {
        const fields = formCopy.pages[pageIndex].fields;
        const fieldIndex = fields.findIndex(f => f.id === fieldId);
        if (fieldIndex === -1) return;
        
        const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
        if (newIndex < 0 || newIndex >= fields.length) return;
        
        [fields[fieldIndex], fields[newIndex]] = [fields[newIndex], fields[fieldIndex]];
      }
    } else if (!selectedForm.multiPage) {
      const fields = formCopy.fields;
      const fieldIndex = fields.findIndex(f => f.id === fieldId);
      if (fieldIndex === -1) return;
      
      const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
      if (newIndex < 0 || newIndex >= fields.length) return;
      
      [fields[fieldIndex], fields[newIndex]] = [fields[newIndex], fields[fieldIndex]];
    }
    
    updateFormTemplate(selectedForm.id, formCopy);
    setSelectedForm(getFormTemplateById(selectedForm.id));
    setForms(getFormTemplates());
  };

  // Multi-Step Form Management
  const handleEnableMultiStep = () => {
    if (selectedForm && !selectedForm.multiPage) {
      const formCopy = JSON.parse(JSON.stringify(selectedForm));
      formCopy.multiPage = true;
      formCopy.pages = [
        {
          pageId: Date.now(),
          title: 'Step 1',
          description: '',
          fields: formCopy.fields || []
        }
      ];
      delete formCopy.fields; // Move fields to first page
      updateFormTemplate(selectedForm.id, formCopy);
      setSelectedForm(getFormTemplateById(selectedForm.id));
      setSelectedPageId(formCopy.pages[0].pageId);
      setForms(getFormTemplates());
    }
  };

  const handleDisableMultiStep = () => {
    if (selectedForm && selectedForm.multiPage && confirm('Convert to single-page form? All steps will be merged.')) {
      const formCopy = JSON.parse(JSON.stringify(selectedForm));
      // Merge all pages' fields into one
      const allFields = formCopy.pages.flatMap(page => page.fields || []);
      formCopy.fields = allFields;
      formCopy.multiPage = false;
      delete formCopy.pages;
      updateFormTemplate(selectedForm.id, formCopy);
      setSelectedForm(getFormTemplateById(selectedForm.id));
      setSelectedPageId(null);
      setForms(getFormTemplates());
    }
  };

  const handleAddStep = () => {
    if (selectedForm && selectedForm.multiPage) {
      const formCopy = JSON.parse(JSON.stringify(selectedForm));
      const newStep = {
        pageId: Date.now(),
        title: `Step ${formCopy.pages.length + 1}`,
        description: '',
        fields: []
      };
      formCopy.pages.push(newStep);
      updateFormTemplate(selectedForm.id, formCopy);
      setSelectedForm(getFormTemplateById(selectedForm.id));
      setSelectedPageId(newStep.pageId);
      setForms(getFormTemplates());
    }
  };

  const handleDeleteStep = (pageId) => {
    if (selectedForm && selectedForm.multiPage && selectedForm.pages.length > 1) {
      if (confirm('Delete this step? All fields in this step will be removed.')) {
        const formCopy = JSON.parse(JSON.stringify(selectedForm));
        formCopy.pages = formCopy.pages.filter(p => p.pageId !== pageId);
        updateFormTemplate(selectedForm.id, formCopy);
        const updatedForm = getFormTemplateById(selectedForm.id);
        setSelectedForm(updatedForm);
        if (selectedPageId === pageId && updatedForm.pages.length > 0) {
          setSelectedPageId(updatedForm.pages[0].pageId);
        }
        setForms(getFormTemplates());
      }
    } else {
      alert('Cannot delete the last step. Disable multi-step mode instead.');
    }
  };

  const handleUpdateStepTitle = (pageId, newTitle) => {
    if (selectedForm && selectedForm.multiPage) {
      const formCopy = JSON.parse(JSON.stringify(selectedForm));
      const pageIndex = formCopy.pages.findIndex(p => p.pageId === pageId);
      if (pageIndex !== -1) {
        formCopy.pages[pageIndex].title = newTitle;
        updateFormTemplate(selectedForm.id, formCopy);
        setSelectedForm(getFormTemplateById(selectedForm.id));
        setForms(getFormTemplates());
      }
    }
  };

  const handleUpdateStepDescription = (pageId, newDescription) => {
    if (selectedForm && selectedForm.multiPage) {
      const formCopy = JSON.parse(JSON.stringify(selectedForm));
      const pageIndex = formCopy.pages.findIndex(p => p.pageId === pageId);
      if (pageIndex !== -1) {
        formCopy.pages[pageIndex].description = newDescription;
        updateFormTemplate(selectedForm.id, formCopy);
        setSelectedForm(getFormTemplateById(selectedForm.id));
        setForms(getFormTemplates());
      }
    }
  };

  const resetFieldData = () => {
    setFieldData({
      type: 'text',
      label: '',
      placeholder: '',
      required: false,
      options: [],
      sourceFormId: null,
      displayFieldId: null,
      prefillFields: [],
      autofillFromSubmission: false,
      autofillSourceFormId: null,
      autofillSourceFieldId: null,
      autofillLinkedDropdownFieldId: null,
      includeColorPickers: false
    });
    setEditingField(null);
  };

  const handleViewSubmissions = async (form) => {
    setSelectedForm(form);
    setLoadingSubmissions(true);
    
    try {
      const response = await fetch(`/api/submissions?formId=${form.id}`);
      if (response.ok) {
        const { submissions: dbSubmissions } = await response.json();
        const mappedSubmissions = (dbSubmissions || []).map(sub => ({
          ...sub,
          shortId: formatSubmissionId(sub.id),
          formName: form.name
        }));
        setSubmissions(mappedSubmissions);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setSubmissions([]);
    }
    
    setLoadingSubmissions(false);
    setActiveTab('submissions');
  };

  const handleEditSubmission = (submission) => {
    setEditingSubmission(submission);
    setSubmissionData({ ...(submission.data || {}) });
  };

  const handleUpdateSubmission = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSubmission.id,
          data: submissionData
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to update submission');
      }

      setSubmissions(prev => prev.map(sub =>
        sub.id === editingSubmission.id
          ? { ...sub, data: result.submission?.data || submissionData }
          : sub
      ));
      setEditingSubmission(null);
      setSubmissionData({});
      alert('Submission updated successfully!');
    } catch (error) {
      console.error('Error updating submission:', error);
      alert('Failed to update submission');
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/submissions?id=${submissionId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Remove from local state
          setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
        } else {
          alert('Failed to delete submission');
        }
      } catch (error) {
        console.error('Error deleting submission:', error);
        alert('Failed to delete submission');
      }
    }
  };

  const handleStatusChange = async (submission, newStatus) => {
    try {
      const response = await fetch('/api/submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submission.id,
          status: newStatus
        })
      });
      
      if (response.ok) {
        // Update local state
        setSubmissions(prev => prev.map(sub => 
          sub.id === submission.id 
            ? { ...sub, status: newStatus }
            : sub
        ));
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleApprovalStatusChange = async (submission, newApprovalStatus) => {
    // Update in database
    try {
      const response = await fetch('/api/submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submission.id,
          approvalStatus: newApprovalStatus
        })
      });
      
      if (!response.ok) {
        alert('Failed to update approval status in database');
        return;
      }
    } catch (error) {
      console.error('Error updating database:', error);
      alert('Failed to update approval status');
      return;
    }
    
    // Update local state to reflect the change immediately
    setSubmissions(prev => prev.map(sub => 
      sub.id === submission.id 
        ? { ...sub, approvalStatus: newApprovalStatus }
        : sub
    ));
    
    // Also update the viewing submission if open
    if (viewingSubmission && viewingSubmission.id === submission.id) {
      setViewingSubmission(prev => ({ ...prev, approvalStatus: newApprovalStatus }));
    }

  };

  const getSubmissionFieldLabels = (filteredSubmissions) => {
    const allFieldLabels = new Set();
    filteredSubmissions.forEach(submission => {
      const submissionForm = forms.find(f => f.id === submission.formId);
      if (submissionForm) {
        const formFields = getAllFormFields(submissionForm);
        formFields.forEach(field => {
          if (field.type === 'kit-pricing') {
            allFieldLabels.add('Kit Markup - Base Price');
            allFieldLabels.add('Kit Markup - Markup');
            allFieldLabels.add('Kit Markup - Total');
          } else if (field.type === 'entry-fee-pricing') {
            allFieldLabels.add(field.label + ' - Base Fee');
            allFieldLabels.add(field.label + ' - Adjustment');
            allFieldLabels.add(field.label + ' - Total');
          } else if (field.type === 'image-select-library' && field.includeColorPickers) {
            allFieldLabels.add(field.label + ' - Design');
            allFieldLabels.add(field.label + ' - Primary Color');
            allFieldLabels.add(field.label + ' - Secondary Color');
          } else if (field.type === 'product-bundle') {
            allFieldLabels.add(field.label + ' - Shirt Size');
            allFieldLabels.add(field.label + ' - Pants Size');
          } else if (field.type === 'sub-team-selector') {
            allFieldLabels.add(field.label + ' - Team');
            allFieldLabels.add(field.label + ' - Age Group');
          } else {
            allFieldLabels.add(field.label);
          }
        });
      }
    });
    return Array.from(allFieldLabels);
  };

  const getSubmissionFieldValue = (submission, formFields, label) => {
    const field = formFields.find(f => {
      if (f.type === 'kit-pricing') return label.startsWith('Kit Markup');
      if (f.type === 'entry-fee-pricing') return label.startsWith(f.label);
      if (f.type === 'image-select-library') return label.startsWith(f.label);
      if (f.type === 'product-bundle') return label.startsWith(f.label);
      if (f.type === 'sub-team-selector') return label.startsWith(f.label);
      return f.label === label;
    });

    if (!field) return '';

    if (field.type === 'kit-pricing') {
      const basePrice = submission.data[`${field.id}_basePrice`] || 150;
      const markup = submission.data[`${field.id}_markup`] || 0;
      if (label.includes('Base Price')) return basePrice;
      if (label.includes('Markup') && !label.includes('Total')) return markup;
      if (label.includes('Total')) return parseFloat(basePrice) + parseFloat(markup);
      return '';
    }

    if (field.type === 'entry-fee-pricing') {
      const baseFee = submission.data[`${field.id}_baseFee`] || 0;
      const adjustment = submission.data[`${field.id}_adjustment`] || 0;
      if (label.includes('Base Fee')) return baseFee;
      if (label.includes('Adjustment')) return adjustment;
      if (label.includes('Total')) return parseFloat(baseFee) + parseFloat(adjustment);
      return '';
    }

    if (field.type === 'image-select-library' && field.includeColorPickers) {
      if (label.includes('Design')) {
        return submission.data[field.label] || submission.data[field.id] || '';
      }
      if (label.includes('Primary Color')) {
        return submission.data[`${field.id}_primaryColor`] || '';
      }
      if (label.includes('Secondary Color')) {
        return submission.data[`${field.id}_secondaryColor`] || '';
      }
      return '';
    }

    if (field.type === 'product-bundle') {
      if (label.includes('Shirt Size')) {
        return submission.data[`${field.id}_shirtSize`] || submission.data[`${field.id}_size`] || '';
      }
      if (label.includes('Pants Size')) {
        return submission.data[`${field.id}_pantsSize`] || '';
      }
      return submission.data[`${field.id}_shirtSize`] || submission.data[`${field.id}_size`] || '';
    }

    if (field.type === 'sub-team-selector') {
      const raw = submission.data[field.id] || submission.data[field.label] || '';
      let parsed = raw;
      if (typeof raw === 'string') {
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
      }
      if (parsed && typeof parsed === 'object') {
        if (label.includes('Team')) return parsed.teamName || '';
        if (label.includes('Age Group')) return parsed.ageGroup ? parsed.ageGroup + (parsed.gender ? ' (' + parsed.gender + ')' : '') : '';
      }
      return typeof parsed === 'string' ? parsed : '';
    }

    if (field.type === 'submission-dropdown') {
      const raw = submission.data[field.id] || submission.data[field.label] || '';
      // Object with teamName (e.g. Odis: {"teamName": "Royal Falcons"})
      if (raw && typeof raw === 'object') {
        return raw.teamName || raw.label || raw.name || '';
      }
      // UUID string — get team name from sub-team-selector in same submission
      if (typeof raw === 'string' && raw.length > 20) {
        const subTeamField = formFields.find(f => f.type === 'sub-team-selector');
        if (subTeamField) {
          const stv = submission.data[subTeamField.id] || submission.data[subTeamField.label] || '';
          let parsed = stv;
          if (typeof stv === 'string') { try { parsed = JSON.parse(stv); } catch { /* */ } }
          if (parsed && typeof parsed === 'object' && parsed.teamName) return parsed.teamName;
        }
      }
      return raw || '';
    }

    if (field.type === 'dynamic-team-entries') {
      const raw = submission.data[field.id] || submission.data[field.label] || '';
      const entries = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : raw;
      if (Array.isArray(entries) && entries.length > 0) {
        return entries.map(e => {
          const name = e.teamName || '';
          const age = e.ageGroup || '';
          const gender = e.gender || '';
          const parts = [name, age, gender].filter(Boolean);
          return parts.join(' - ');
        }).join(', ');
      }
      return '';
    }

    const value = submission.data[field.label] || submission.data[field.id] || '';
    if (Array.isArray(value)) return value.join(', ');
    if (value && typeof value === 'object') return JSON.stringify(value);
    return value;
  };

  const normalizeImageValue = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:image')) return trimmed;
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 100;
    if (isBase64) return `data:image/png;base64,${trimmed}`;
    return trimmed;
  };

  const isImageValue = (value) => {
    const normalized = normalizeImageValue(value);
    if (!normalized) return false;
    if (normalized.startsWith('data:image')) return true;
    if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(normalized)) return true;
    if (normalized.includes('/uploads/') || normalized.includes('/images/')) return true;
    return false;
  };

  const handleDownloadCSV = () => {
    // Get filtered submissions
    const filteredSubmissions = submissions.filter(s => 
      selectedSubmissionForm === 'all' || s.formId === selectedSubmissionForm
    );

    if (filteredSubmissions.length === 0) {
      alert('No submissions to download');
      return;
    }

    // Get the form for field definitions
    const form = selectedSubmissionForm === 'all' 
      ? null 
      : forms.find(f => f.id === selectedSubmissionForm);

    const fieldLabels = getSubmissionFieldLabels(filteredSubmissions);

    // Build CSV headers
    const headers = ['ID', 'Form Name', 'Submitted At', 'Status', 'Approval Status', ...fieldLabels];
    
    // Build CSV rows
    const rows = filteredSubmissions.map(submission => {
      const submissionForm = forms.find(f => f.id === submission.formId);
      const formFields = submissionForm ? getAllFormFields(submissionForm) : [];
      
      const row = [
        submission.id,
        submission.formName,
        new Date(submission.submittedAt).toLocaleString(),
        submission.status,
        submission.approvalStatus || 'pending'
      ];

      // Add field values in order
      fieldLabels.forEach(label => {
        row.push(getSubmissionFieldValue(submission, formFields, label));
      });

      return row;
    });

    // Convert to CSV format
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const filename = selectedSubmissionForm === 'all' 
      ? 'all_form_submissions.csv'
      : `${form?.name.replace(/\s+/g, '_').toLowerCase()}_submissions.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmissionDataChange = (fieldLabel, value) => {
    setSubmissionData(prev => ({
      ...prev,
      [fieldLabel]: value
    }));
  };

  const getEditableFieldKey = (field, data) => {
    if (data?.hasOwnProperty(field.id)) return field.id;
    if (data?.hasOwnProperty(String(field.id))) return String(field.id);
    if (data?.hasOwnProperty(field.label)) return field.label;
    return field.id;
  };

  const needsOptions = ['radio', 'checkbox', 'select', 'image-select'].includes(fieldData.type);
  const filteredSubmissions = submissions
    .filter(s => selectedSubmissionForm === 'all' || s.formId === selectedSubmissionForm)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const submissionFieldLabels = getSubmissionFieldLabels(filteredSubmissions);

  return (
    <div className={styles.container}>
      <Head>
        <title>Form Builder - Admin Panel</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>Form Builder</h1>
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
            All Forms
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'create' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('create');
              setSelectedForm(null);
              resetFormData();
            }}
          >
            Create New
          </button>
          {selectedForm && activeTab === 'edit' && (
            <button className={`${styles.tab} ${styles.activeTab}`}>
              Editing: {selectedForm.name}
            </button>
          )}
          {activeTab === 'submissions' && (
            <button className={`${styles.tab} ${styles.activeTab}`}>
              Submissions
            </button>
          )}
        </div>

        {activeTab === 'list' && (
          <div className={styles.formsList}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ margin: 0 }}>Form Templates ({forms.length})</h2>
              <button
                onClick={async () => {
                  setLoadingSubmissions(true);
                  try {
                    const response = await fetch('/api/submissions');
                    if (response.ok) {
                      const { submissions: dbSubmissions } = await response.json();
                      const mappedSubmissions = (dbSubmissions || []).map(sub => ({
                        ...sub,
                        shortId: formatSubmissionId(sub.id),
                        formName: forms.find(f => f.id === sub.formId)?.name || 'Unknown Form'
                      }));
                      setSubmissions(mappedSubmissions);
                    } else {
                      setSubmissions([]);
                    }
                  } catch (error) {
                    console.error('Error fetching submissions:', error);
                    setSubmissions([]);
                  }
                  setLoadingSubmissions(false);
                  setSelectedSubmissionForm('all');
                  setActiveTab('submissions');
                }}
                className={styles.primaryButton}
              >
                View All Submissions
              </button>
            </div>
            <div className={styles.formsGrid}>
              {forms.map(form => (
                <div key={form.id} className={styles.formCard}>
                  <div className={styles.formCardHeader}>
                    <h3>{form.name}</h3>
                    <span className={form.active ? styles.badgeActive : styles.badgeInactive}>
                      {form.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className={styles.formDescription}>{form.description}</p>
                  <div className={styles.formInfoBox}>
                    <strong>Form ID:</strong> {form.id} &nbsp;|&nbsp; 
                    <strong>Direct Link:</strong> <code className={styles.formInfoCode}>/forms?formId={form.id}</code>
                  </div>
                  <div className={styles.formMeta}>
                    <span>{getAllFormFields(form).length} fields</span>
                    <span>{form.categoryIds.length} categories</span>
                    <span>{submissionCounts[form.id] || 0} submissions</span>
                  </div>
                  <div className={styles.formCategories}>
                    {form.categoryIds.map(catId => {
                      const cat = categories.find(c => c.id === catId);
                      return cat ? (
                        <span key={catId} className={styles.categoryTag}>
                          {cat.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div className={styles.formActions}>
                    <button onClick={() => handleEditForm(form)} className={styles.editBtn}>
                      Edit
                    </button>
                    <button onClick={() => handleDeleteForm(form.id)} className={styles.deleteBtn}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className={styles.formBuilder}>
            <h2>Create New Form</h2>
            <form onSubmit={handleCreateForm} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Form Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g., Equipment Registration"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows="3"
                  placeholder="Brief description of this form"
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Link to Categories</label>
                <div className={styles.checkboxGroup}>
                  {categories.map(category => (
                    <label key={category.id} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.categoryIds.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                      />
                      <span>{category.icon} {category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Display Locations</label>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                  Choose where this form should be displayed on your website
                </p>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.displayLocations.includes('category')}
                      onChange={() => handleDisplayLocationToggle('category')}
                    />
                    <span>Category Pages (show on linked category pages)</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.displayLocations.includes('forms-page')}
                      onChange={() => handleDisplayLocationToggle('forms-page')}
                    />
                    <span>Forms Page (show on dedicated /forms page)</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.displayLocations.includes('homepage')}
                      onChange={() => handleDisplayLocationToggle('homepage')}
                    />
                    <span>Homepage (show on main homepage)</span>
                  </label>
                </div>
              </div>

              <button type="submit" className={styles.submitBtn}>
                Create Form & Add Fields
              </button>
            </form>
          </div>
        )}

        {activeTab === 'edit' && selectedForm && (
          <div className={styles.formEditor}>
            <div className={styles.editorLayout}>
              <div className={styles.editorSidebar}>
                <h3>Form Settings</h3>
                <form onSubmit={handleUpdateForm} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label>Form Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      rows="3"
                      className={styles.textarea}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Linked Categories</label>
                    <div className={styles.checkboxGroup}>
                      {categories.map(category => (
                        <label key={category.id} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={formData.categoryIds.includes(category.id)}
                            onChange={() => handleCategoryToggle(category.id)}
                          />
                          <span>{category.icon} {category.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Display Locations</label>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                      Control where this form appears
                    </p>
                    <div className={styles.checkboxGroup}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={formData.displayLocations.includes('category')}
                          onChange={() => handleDisplayLocationToggle('category')}
                        />
                        <span>Category Pages</span>
                      </label>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={formData.displayLocations.includes('forms-page')}
                          onChange={() => handleDisplayLocationToggle('forms-page')}
                        />
                        <span>Forms Page</span>
                      </label>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={formData.displayLocations.includes('homepage')}
                          onChange={() => handleDisplayLocationToggle('homepage')}
                        />
                        <span>Homepage</span>
                      </label>
                    </div>
                  </div>

                  <div className={styles.formGroup} style={{
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '2px solid #f59e0b',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginTop: '1rem'
                  }}>
                    <label style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: '700', 
                      color: '#92400e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      🖼️ Form Background Image
                    </label>
                    <p style={{ fontSize: '0.85rem', color: '#a16207', marginBottom: '0.75rem', marginTop: '0.5rem' }}>
                      Upload a background image for this form. This will appear behind the form content.
                    </p>
                    <div
                      className={`${styles.dropzone} ${backgroundDragActive ? styles.dropzoneActive : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setBackgroundDragActive(true);
                      }}
                      onDragLeave={() => setBackgroundDragActive(false)}
                      onDrop={handleBackgroundDrop}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleBackgroundUpload(file);
                          }
                        }}
                        disabled={backgroundUploading}
                      />
                      <div>
                        <strong>{backgroundUploading ? 'Uploading...' : 'Drag & drop an image here'}</strong>
                        <div style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>or click to browse</div>
                      </div>
                    </div>

                    {backgroundImage && (
                      <div className={styles.dropzonePreview}>
                        <img src={backgroundImage} alt="Form background preview" />
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => {
                            setBackgroundImage('');
                            saveFormBackground('');
                          }}
                          disabled={backgroundSaving}
                        >
                          Remove Background
                        </button>
                      </div>
                    )}

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      marginTop: '0.75rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#92400e'
                    }}>
                      <input
                        type="checkbox"
                        checked={backgroundTransparency}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setBackgroundTransparency(next);
                          saveFormBackground(backgroundImage, next);
                        }}
                      />
                      Enable transparent form container
                    </label>

                    {backgroundMessage && (
                      <div className={styles.helperText}>{backgroundMessage}</div>
                    )}
                  </div>

                  <button type="submit" className={styles.submitBtn}>
                    Save Changes
                  </button>
                </form>

                {/* Multi-Step Controls */}
                <div style={{
                  marginTop: '2rem',
                  padding: '1.25rem',
                  background: '#f9fafb',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px'
                }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: '#111827' }}>
                    📊 Multi-Step Form
                  </h3>
                  {!selectedForm.multiPage ? (
                    <div>
                      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
                        Convert this form into a multi-step form with progress tracking
                      </p>
                      <button
                        onClick={handleEnableMultiStep}
                        style={{
                          padding: '0.65rem 1.5rem',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        ✨ Enable Multi-Step
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
                        Multi-step mode active: {selectedForm.pages?.length || 0} steps
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={handleAddStep}
                          style={{
                            padding: '0.65rem 1.5rem',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          ➕ Add New Step
                        </button>
                        <button
                          onClick={handleDisableMultiStep}
                          style={{
                            padding: '0.65rem 1.5rem',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          🔄 Convert to Single-Step
                        </button>
                      </div>

                      {/* Step List */}
                      <div style={{ marginTop: '1rem' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#374151', fontWeight: '700' }}>
                          Manage Steps:
                        </h4>
                        {selectedForm.pages?.map((page, index) => (
                          <div
                            key={page.pageId}
                            style={{
                              padding: '0.75rem',
                              background: selectedPageId === page.pageId ? '#dbeafe' : 'white',
                              border: selectedPageId === page.pageId ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                              borderRadius: '6px',
                              marginBottom: '0.5rem',
                              cursor: 'pointer'
                            }}
                            onClick={() => setSelectedPageId(page.pageId)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <strong style={{ fontSize: '0.85rem', color: '#111827' }}>
                                {index + 1}. {page.title}
                              </strong>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteStep(page.pageId);
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: '#fecaca',
                                  color: '#991b1b',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {page.fields?.length || 0} fields
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.addFieldSection}>
                  <h3>Add New Field</h3>
                  {selectedForm.multiPage && (
                    <div className={styles.formGroup}>
                      <label>Select Page *</label>
                      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Choose which page to add this field to
                      </p>
                      <select
                        value={selectedPageId || ''}
                        onChange={(e) => setSelectedPageId(e.target.value)}
                        className={styles.input}
                        required
                      >
                        <option value="">Select a page...</option>
                        {selectedForm.pages.map((page) => (
                          <option key={page.pageId} value={page.pageId}>
                            {page.pageTitle}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <form onSubmit={handleAddField}>
                    <div className={styles.formGroup}>
                      <label>Field Type</label>
                      <select
                        name="type"
                        value={fieldData.type}
                        onChange={handleFieldChange}
                        className={styles.input}
                      >
                        <option value="text">Text Input</option>
                        <option value="email">Email</option>
                        <option value="tel">Phone Number</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="textarea">Text Area</option>
                        <option value="radio">Radio Buttons</option>
                        <option value="checkbox">Checkboxes</option>
                        <option value="select">Dropdown</option>
                        <option value="image-select">Image Selection (choose from images)</option>
                        <option value="image-select-library">Image Selection (from shirt library)</option>
                        <option value="submission-dropdown">Dynamic Dropdown (from submissions)</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Label *</label>
                      <input
                        type="text"
                        name="label"
                        value={fieldData.label}
                        onChange={handleFieldChange}
                        required
                        placeholder="e.g., Full Name"
                        className={styles.input}
                      />
                    </div>

                    {!needsOptions && fieldData.type !== 'submission-dropdown' && (
                      <div className={styles.formGroup}>
                        <label>Placeholder</label>
                        <input
                          type="text"
                          name="placeholder"
                          value={fieldData.placeholder}
                          onChange={handleFieldChange}
                          placeholder="e.g., Enter your name"
                          className={styles.input}
                        />
                      </div>
                    )}

                    {fieldData.type === 'submission-dropdown' && (
                      <>
                        <div className={styles.formGroup}>
                          <label>Source Form *</label>
                          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                            Select the form to pull submission data from
                          </p>
                          <select
                            name="sourceFormId"
                            value={fieldData.sourceFormId || ''}
                            onChange={handleFieldChange}
                            className={styles.input}
                            required
                          >
                            <option value="">Select a form...</option>
                            {forms.filter(f => f.id !== selectedForm?.id).map(form => (
                              <option key={form.id} value={form.id}>
                                {form.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {fieldData.sourceFormId && (() => {
                          const sourceForm = forms.find(f => f.id === parseInt(fieldData.sourceFormId));
                          return sourceForm ? (
                            <>
                              <div className={styles.formGroup}>
                                <label>Display Field *</label>
                                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                  This field will be shown in the dropdown options
                                </p>
                                <select
                                  name="displayFieldId"
                                  value={fieldData.displayFieldId || ''}
                                  onChange={handleFieldChange}
                                  className={styles.input}
                                  required
                                >
                                  <option value="">Select a field...</option>
                                  {getAllFormFields(sourceForm).map(field => (
                                    <option key={field.id} value={field.id}>
                                      {field.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className={styles.formGroup}>
                                <label style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', display: 'block' }}>
                                  📋 Auto-Fill Fields (Read-Only)
                                </label>
                                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
                                  ✓ Check the fields you want to automatically populate from the selected submission. 
                                  These will appear as read-only fields after the user selects an option.
                                </p>
                                <div style={{ 
                                  border: '2px solid #e5e7eb', 
                                  borderRadius: '8px', 
                                  padding: '1rem',
                                  background: '#f9fafb'
                                }}>
                                  {getAllFormFields(sourceForm).map(sourceField => (
                                    <label 
                                      key={sourceField.id} 
                                      className={styles.checkboxLabel} 
                                      style={{ 
                                        marginBottom: '0.75rem',
                                        padding: '0.5rem',
                                        background: fieldData.prefillFields.some(pf => pf.sourceFieldId === sourceField.id) ? '#dcfce7' : 'white',
                                        border: fieldData.prefillFields.some(pf => pf.sourceFieldId === sourceField.id) ? '2px solid #22c55e' : '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={fieldData.prefillFields.some(pf => pf.sourceFieldId === sourceField.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setFieldData(prev => ({
                                              ...prev,
                                              prefillFields: [...prev.prefillFields, {
                                                sourceFieldId: sourceField.id,
                                                sourceFieldLabel: sourceField.label
                                              }]
                                            }));
                                          } else {
                                            setFieldData(prev => ({
                                              ...prev,
                                              prefillFields: prev.prefillFields.filter(pf => pf.sourceFieldId !== sourceField.id)
                                            }));
                                          }
                                        }}
                                        style={{ width: '20px', height: '20px', accentColor: '#22c55e', marginRight: '0.75rem' }}
                                      />
                                      <div style={{ flex: 1 }}>
                                        <span style={{ fontWeight: '500', color: '#1f2937' }}>{sourceField.label}</span>
                                        <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                                          ({sourceField.type})
                                        </span>
                                      </div>
                                      {fieldData.prefillFields.some(pf => pf.sourceFieldId === sourceField.id) && (
                                        <span style={{ color: '#22c55e', fontSize: '1.2rem', marginLeft: '0.5rem' }}>✓</span>
                                      )}
                                    </label>
                                  ))}
                                  {getAllFormFields(sourceForm).length === 0 && (
                                    <p style={{ color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
                                      No fields available in source form
                                    </p>
                                  )}
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#22c55e', marginTop: '0.75rem', fontWeight: '500' }}>
                                  {fieldData.prefillFields.length} field(s) selected for auto-fill
                                </p>
                              </div>
                            </>
                          ) : null;
                        })()}
                      </>
                    )}

                    {needsOptions && fieldData.type !== 'image-select' && (
                      <div className={styles.formGroup}>
                        <label>Options *</label>
                        <div className={styles.optionsInput}>
                          <input
                            type="text"
                            value={optionInput}
                            onChange={(e) => setOptionInput(e.target.value)}
                            placeholder="Add an option"
                            className={styles.input}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                          />
                          <button type="button" onClick={handleAddOption} className={styles.addOptionBtn}>
                            Add
                          </button>
                        </div>
                        <div className={styles.optionsList}>
                          {fieldData.options.map((option, index) => (
                            <div key={index} className={styles.optionItem}>
                              <span>{option}</span>
                              <button type="button" onClick={() => handleRemoveOption(index)}>×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {fieldData.type === 'image-select' && (
                      <div className={styles.formGroup}>
                        <label>Image Options *</label>
                        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                          Add options with names and image URLs. Users will click on images to select.
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <input
                            type="text"
                            value={optionInput}
                            onChange={(e) => setOptionInput(e.target.value)}
                            placeholder="Option name (e.g., Red Stripe Design)"
                            className={styles.input}
                            style={{ flex: 2 }}
                          />
                          <input
                            type="text"
                            value={fieldData.imageUrlInput || ''}
                            onChange={(e) => setFieldData(prev => ({ ...prev, imageUrlInput: e.target.value }))}
                            placeholder="Image URL"
                            className={styles.input}
                            style={{ flex: 3 }}
                          />
                          <button 
                            type="button" 
                            onClick={() => {
                              if (optionInput.trim() && fieldData.imageUrlInput?.trim()) {
                                setFieldData(prev => ({
                                  ...prev,
                                  options: [...prev.options, {
                                    name: optionInput.trim(),
                                    imageUrl: prev.imageUrlInput.trim()
                                  }],
                                  imageUrlInput: ''
                                }));
                                setOptionInput('');
                              }
                            }}
                            className={styles.addOptionBtn}
                          >
                            Add
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                          {fieldData.options.map((option, index) => (
                            <div key={index} style={{ 
                              border: '2px solid #e5e7eb', 
                              borderRadius: '8px', 
                              padding: '0.5rem',
                              position: 'relative'
                            }}>
                              <img 
                                src={option.imageUrl} 
                                alt={option.name}
                                style={{ 
                                  width: '100%', 
                                  height: '120px', 
                                  objectFit: 'cover', 
                                  borderRadius: '4px',
                                  marginBottom: '0.5rem'
                                }}
                                onError={(e) => {
                                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                                }}
                              />
                              <p style={{ 
                                fontSize: '0.85rem', 
                                fontWeight: '500', 
                                margin: '0 0 0.5rem 0',
                                textAlign: 'center'
                              }}>
                                {option.name}
                              </p>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveOption(index)}
                                style={{
                                  position: 'absolute',
                                  top: '0.5rem',
                                  right: '0.5rem',
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '24px',
                                  height: '24px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {fieldData.type === 'image-select-library' && (
                      <>
                        <div className={styles.formGroup}>
                          <div style={{ 
                            padding: '1rem', 
                            background: '#f0f9ff', 
                            border: '2px solid #0ea5e9', 
                            borderRadius: '8px',
                            marginBottom: '1rem'
                          }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#0c4a6e' }}>
                              👕 Using Shirt Design Library
                            </p>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                              This field will automatically show all active shirt designs from your library. 
                              <Link href="/admin/shirt-designs" target="_blank" style={{ color: '#0ea5e9', marginLeft: '0.5rem' }}>
                                Manage Designs →
                              </Link>
                            </p>
                          </div>
                          
                          <p style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.75rem' }}>
                            Preview of available designs ({shirtDesigns.length}):
                          </p>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                            gap: '0.75rem',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            padding: '0.5rem',
                            background: '#f9fafb',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                          }}>
                            {shirtDesigns.length === 0 ? (
                              <p style={{ 
                                gridColumn: '1 / -1', 
                                textAlign: 'center', 
                                color: '#9ca3af',
                                padding: '2rem'
                              }}>
                                No active designs yet. 
                                <Link href="/admin/shirt-designs" target="_blank" style={{ color: '#0ea5e9', marginLeft: '0.5rem' }}>
                                  Add designs →
                                </Link>
                              </p>
                            ) : (
                              shirtDesigns.map(design => (
                                <div key={design.id} style={{ 
                                  border: '1px solid #e5e7eb', 
                                  borderRadius: '6px', 
                                  padding: '0.5rem',
                                  background: 'white'
                                }}>
                                  <img 
                                    src={design.imageUrl} 
                                    alt={design.name}
                                    style={{ 
                                      width: '100%', 
                                      height: '80px', 
                                      objectFit: 'cover', 
                                      borderRadius: '4px',
                                      marginBottom: '0.25rem'
                                    }}
                                  />
                                  <p style={{ fontSize: '0.75rem', margin: 0, textAlign: 'center' }}>
                                    {design.name}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={fieldData.includeColorPickers}
                              onChange={(e) => {
                                setFieldData(prev => ({
                                  ...prev,
                                  includeColorPickers: e.target.checked
                                }));
                              }}
                              style={{ width: '20px', height: '20px', accentColor: '#f59e0b', marginTop: '0.1rem', flexShrink: 0 }}
                            />
                            <div>
                              <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#92400e', display: 'block', marginBottom: '0.25rem' }}>
                                🎨 Include Color Pickers
                              </span>
                              <span style={{ fontSize: '0.85rem', color: '#78350f' }}>
                                Add Primary & Secondary color selectors below the shirt design. Coaches can customize their team colors.
                              </span>
                            </div>
                          </label>
                        </div>
                      </>
                    )}

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="required"
                        checked={fieldData.required}
                        onChange={handleFieldChange}
                      />
                      <span>Required field</span>
                    </label>

                    {fieldData.type !== 'submission-dropdown' && selectedForm && getAllFormFields(selectedForm).some(f => f.type === 'submission-dropdown') && (
                      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px' }}>
                        <label className={styles.checkboxLabel} style={{ marginBottom: '1rem', fontWeight: '600' }}>
                          <input
                            type="checkbox"
                            checked={fieldData.autofillFromSubmission}
                            onChange={(e) => {
                              setFieldData(prev => ({
                                ...prev,
                                autofillFromSubmission: e.target.checked,
                                autofillSourceFormId: e.target.checked ? prev.autofillSourceFormId : null,
                                autofillSourceFieldId: e.target.checked ? prev.autofillSourceFieldId : null,
                                autofillLinkedDropdownFieldId: e.target.checked ? prev.autofillLinkedDropdownFieldId : null
                              }));
                            }}
                            style={{ width: '20px', height: '20px', accentColor: '#f59e0b' }}
                          />
                          <span>🔗 Auto-fill this field from a submission dropdown</span>
                        </label>

                        {fieldData.autofillFromSubmission && (
                          <>
                            <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                              <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Link to Dropdown Field</label>
                              <p style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.5rem' }}>
                                Select which submission-dropdown field controls this auto-fill
                              </p>
                              <select
                                value={fieldData.autofillLinkedDropdownFieldId || ''}
                                onChange={(e) => {
                                  const dropdownFieldId = parseInt(e.target.value);
                                  const dropdownField = selectedForm.fields.find(f => f.id === dropdownFieldId);
                                  setFieldData(prev => ({
                                    ...prev,
                                    autofillLinkedDropdownFieldId: dropdownFieldId,
                                    autofillSourceFormId: dropdownField ? dropdownField.sourceFormId : null,
                                    autofillSourceFieldId: null
                                  }));
                                }}
                                className={styles.input}
                                style={{ background: 'white' }}
                              >
                                <option value="">Select dropdown field...</option>
                                {getAllFormFields(selectedForm).filter(f => f.type === 'submission-dropdown').map(field => (
                                  <option key={field.id} value={field.id}>
                                    {field.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {fieldData.autofillLinkedDropdownFieldId && fieldData.autofillSourceFormId && (() => {
                              const sourceForm = forms.find(f => f.id === fieldData.autofillSourceFormId);
                              return sourceForm ? (
                                <div className={styles.formGroup}>
                                  <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Pull Data From Field</label>
                                  <p style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.5rem' }}>
                                    Select which field from "{sourceForm.name}" to pull into this field
                                  </p>
                                  <select
                                    value={fieldData.autofillSourceFieldId || ''}
                                    onChange={(e) => {
                                      setFieldData(prev => ({
                                        ...prev,
                                        autofillSourceFieldId: parseInt(e.target.value)
                                      }));
                                    }}
                                    className={styles.input}
                                    style={{ background: 'white' }}
                                  >
                                    <option value="">Select source field...</option>
                                    {getAllFormFields(sourceForm).map(field => (
                                      <option key={field.id} value={field.id}>
                                        {field.label} ({field.type})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : null;
                            })()}

                            {fieldData.autofillSourceFieldId && (
                              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#dcfce7', border: '1px solid #22c55e', borderRadius: '4px' }}>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534' }}>
                                  ✓ This field will auto-fill when a selection is made in the linked dropdown
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <button type="submit" className={styles.submitBtn}>
                      Add Field
                    </button>
                  </form>
                </div>
              </div>

              <div className={styles.editorMain}>
                <h3>Form Preview</h3>
                <div className={styles.formPreview}>
                  <h2>{selectedForm.name}</h2>
                  <p>{selectedForm.description}</p>
                  
                  {selectedForm.multiPage ? (
                    // Multi-page form display
                    <div>
                      <div style={{
                        background: '#eff6ff',
                        border: '2px solid #3b82f6',
                        borderRadius: '10px',
                        padding: '1rem',
                        marginBottom: '1.5rem'
                      }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af', fontWeight: '600' }}>
                          📄 Multi-Page Form: This form has {selectedForm.pages?.length || 0} pages
                        </p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#1e40af' }}>
                          Note: Multi-page forms are manually configured in code. Edit fields in /data/forms.js
                        </p>
                      </div>
                      {selectedForm.pages?.map((page, pageIndex) => (
                        <div key={page.pageId} style={{
                          marginBottom: '2rem',
                          padding: '1.5rem',
                          background: selectedPageId === page.pageId ? '#dbeafe' : '#f9fafb',
                          border: selectedPageId === page.pageId ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                          borderRadius: '12px'
                        }}>
                          <div style={{ marginBottom: '1rem' }}>
                            <div style={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.75rem'
                            }}>
                              <span style={{
                                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                                color: 'white',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.9rem',
                                fontWeight: '900',
                                flexShrink: 0
                              }}>
                                {pageIndex + 1}
                              </span>
                              <input
                                type="text"
                                value={page.title}
                                onChange={(e) => handleUpdateStepTitle(page.pageId, e.target.value)}
                                placeholder="Step title..."
                                style={{
                                  flex: 1,
                                  padding: '0.5rem 0.75rem',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '1rem',
                                  fontWeight: '700',
                                  color: '#111827'
                                }}
                              />
                              <span style={{
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                color: '#6b7280',
                                background: 'white',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                border: '1px solid #e5e7eb',
                                flexShrink: 0
                              }}>
                                {page.fields?.length || 0} field{page.fields?.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <textarea
                              value={page.description || ''}
                              onChange={(e) => handleUpdateStepDescription(page.pageId, e.target.value)}
                              placeholder="Optional: Add a description for this step..."
                              rows={2}
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                color: '#6b7280',
                                resize: 'vertical'
                              }}
                            />
                          </div>
                          {page.fields?.length > 0 ? (
                            <div className={styles.previewFields}>
                              {page.fields.map((field, fieldIndex) => (
                                <div key={field.id} className={styles.previewField}>
                                  <div className={styles.previewFieldHeader}>
                                    <label>
                                      {field.label} {field.required && <span className={styles.required}>*</span>}
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>
                                        {field.type}
                                      </span>
                                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button 
                                          onClick={() => handleMoveField(field.id, 'up', page.pageId)}
                                          className={styles.fieldActionBtn}
                                          disabled={fieldIndex === 0}
                                          title="Move up"
                                        >
                                          ⬆️
                                        </button>
                                        <button 
                                          onClick={() => handleMoveField(field.id, 'down', page.pageId)}
                                          className={styles.fieldActionBtn}
                                          disabled={fieldIndex === page.fields.length - 1}
                                          title="Move down"
                                        >
                                          ⬇️
                                        </button>
                                        <button 
                                          onClick={() => handleEditFieldClick(field, page.pageId)}
                                          className={`${styles.fieldActionBtn} ${styles.editBtn}`}
                                          title="Edit field"
                                        >
                                          ✏️
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteField(field.id, page.pageId)}
                                          className={`${styles.fieldActionBtn} ${styles.deleteBtn}`}
                                          title="Delete field"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {field.type === 'textarea' && (
                                    <textarea placeholder={field.placeholder} disabled className={styles.previewInput} />
                                  )}
                                  {['text', 'email', 'tel', 'number', 'date', 'password'].includes(field.type) && (
                                    <input type={field.type} placeholder={field.placeholder} disabled className={styles.previewInput} />
                                  )}
                                  {field.type === 'select' && (
                                    <select disabled className={styles.previewInput}>
                                      <option>Select an option...</option>
                                      {field.options?.map((opt, i) => (
                                        <option key={i}>{opt}</option>
                                      ))}
                                    </select>
                                  )}
                                  {['kit-pricing', 'entry-fee-pricing', 'product-bundle', 'upsell-products', 'supporter-apparel', 'checkout-form', 'image-select-library'].includes(field.type) && (
                                    <div style={{
                                      padding: '1rem',
                                      background: 'white',
                                      border: '2px solid #e5e7eb',
                                      borderRadius: '8px',
                                      fontSize: '0.9rem',
                                      color: '#6b7280',
                                      fontStyle: 'italic'
                                    }}>
                                      Custom field type: {field.type}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic' }}>
                              No fields in this page
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : getAllFormFields(selectedForm).length === 0 ? (
                    <p className={styles.emptyState}>No fields added yet. Use the panel on the left to add fields.</p>
                  ) : (
                    <div className={styles.previewFields}>
                      {getAllFormFields(selectedForm).map((field, fieldIndex) => (
                        <div key={field.id} className={styles.previewField}>
                          <div className={styles.previewFieldHeader}>
                            <label>
                              {field.label} {field.required && <span className={styles.required}>*</span>}
                            </label>
                            {!selectedForm.multiPage && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button 
                                    onClick={() => handleMoveField(field.id, 'up')}
                                    className={styles.fieldActionBtn}
                                    disabled={fieldIndex === 0}
                                    title="Move up"
                                  >
                                    ⬆️
                                  </button>
                                  <button 
                                    onClick={() => handleMoveField(field.id, 'down')}
                                    className={styles.fieldActionBtn}
                                    disabled={fieldIndex === getAllFormFields(selectedForm).length - 1}
                                    title="Move down"
                                  >
                                    ⬇️
                                  </button>
                                  <button 
                                    onClick={() => handleEditFieldClick(field)}
                                    className={`${styles.fieldActionBtn} ${styles.editBtn}`}
                                    title="Edit field"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteField(field.id)}
                                    className={`${styles.fieldActionBtn} ${styles.deleteBtn}`}
                                    title="Delete field"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {field.type === 'textarea' && (
                            <textarea placeholder={field.placeholder} disabled className={styles.previewInput} />
                          )}
                          {['text', 'email', 'tel', 'number', 'date'].includes(field.type) && (
                            <input type={field.type} placeholder={field.placeholder} disabled className={styles.previewInput} />
                          )}
                          {field.type === 'select' && (
                            <select disabled className={styles.previewInput}>
                              <option>Select an option...</option>
                              {field.options?.map((opt, i) => (
                                <option key={i}>{opt}</option>
                              ))}
                            </select>
                          )}
                          {field.type === 'radio' && (
                            <div className={styles.previewOptions}>
                              {field.options?.map((opt, i) => (
                                <label key={i} className={styles.previewOptionLabel}>
                                  <input type="radio" name={`field-${field.id}`} disabled />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          {field.type === 'checkbox' && (
                            <div className={styles.previewOptions}>
                              {field.options?.map((opt, i) => (
                                <label key={i} className={styles.previewOptionLabel}>
                                  <input type="checkbox" disabled />
                                  <span>{typeof opt === 'string' ? opt : opt.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          {field.type === 'image-select' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                              {field.options?.map((opt, i) => (
                                <div key={i} style={{ 
                                  border: '2px solid #e5e7eb', 
                                  borderRadius: '6px', 
                                  padding: '0.5rem',
                                  textAlign: 'center',
                                  cursor: 'not-allowed',
                                  opacity: 0.7
                                }}>
                                  <img 
                                    src={opt.imageUrl} 
                                    alt={opt.name}
                                    style={{ 
                                      width: '100%', 
                                      height: '80px', 
                                      objectFit: 'cover', 
                                      borderRadius: '4px',
                                      marginBottom: '0.25rem'
                                    }}
                                    onError={(e) => {
                                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                                    }}
                                  />
                                  <p style={{ fontSize: '0.75rem', margin: 0 }}>{opt.name}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          {field.type === 'image-select-library' && (
                            <div style={{ 
                              padding: '1rem', 
                              background: '#f0f9ff', 
                              border: '2px solid #0ea5e9', 
                              borderRadius: '6px',
                              textAlign: 'center'
                            }}>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#0c4a6e' }}>
                                👕 <strong>Shirt designs from library will appear here</strong>
                              </p>
                            </div>
                          )}
                          {field.type === 'submission-dropdown' && (
                            <div>
                              <select disabled className={styles.previewInput}>
                                <option>Select from submissions...</option>
                              </select>
                              {field.prefillFields && field.prefillFields.length > 0 && (
                                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '4px' }}>
                                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: '600', color: '#0c4a6e' }}>
                                    📋 Auto-filled fields (read-only):
                                  </p>
                                  {field.prefillFields.map((pf, idx) => (
                                    <div key={idx} style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.25rem' }}>
                                      • {pf.sourceFieldLabel}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className={styles.submissionsView}>
            <div className={styles.submissionsHeader}>
              <h2>All Form Submissions</h2>
              <button
                onClick={handleDownloadCSV}
                className={styles.downloadButton}
              >
                Download CSV
              </button>
            </div>
            
            {/* Form Filter Tabs */}
            <div className={styles.submissionTabs}>
              <button
                onClick={() => setSelectedSubmissionForm('all')}
                className={`${styles.submissionTab} ${selectedSubmissionForm === 'all' ? styles.submissionTabActive : ''}`}
              >
                All Forms ({submissions.length})
              </button>
              {forms.map(form => {
                const formSubmissions = submissions.filter(s => s.formId === form.id);
                return (
                  <button
                    key={form.id}
                    onClick={() => setSelectedSubmissionForm(form.id)}
                    className={`${styles.submissionTab} ${selectedSubmissionForm === form.id ? styles.submissionTabActive : ''}`}
                  >
                    {form.name} ({formSubmissions.length})
                  </button>
                );
              })}
            </div>

            {loadingSubmissions ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingIcon}>⏳</div>
                <p>Loading submissions...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <p className={styles.emptyState}>No submissions for this form yet.</p>
            ) : (
              <div className={styles.submissionsTableWrapper}>
                <table className={styles.submissionsTable}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Form</th>
                      <th>Submitted At</th>
                      <th>Status</th>
                      <th>Approval</th>
                      {submissionFieldLabels.map(label => (
                        <th key={label}>{label}</th>
                      ))}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map(submission => {
                      const submissionForm = forms.find(f => f.id === submission.formId);
                      const formFields = submissionForm ? getAllFormFields(submissionForm) : [];

                      return (
                        <tr
                          key={submission.id}
                          className={styles.submissionRow}
                          onClick={(e) => {
                            if (window.innerWidth > 768) return;
                            const tag = e.target.tagName;
                            if (['BUTTON', 'SELECT', 'OPTION', 'A', 'INPUT', 'TEXTAREA', 'LABEL', 'IMG', 'SVG', 'PATH'].includes(tag)) return;
                            setViewingSubmission(submission);
                          }}
                        >
                          <td className={styles.idCell}>#{submission.shortId || formatSubmissionId(submission.id)}</td>
                          <td>
                            <span className={styles.formNameTag}>{submission.formName}</span>
                          </td>
                          <td className={styles.submittedAtCell}>
                            {new Date(submission.submittedAt).toLocaleString()}
                          </td>
                          <td>
                            <select
                              value={submission.status}
                              onChange={(e) => handleStatusChange(submission, e.target.value)}
                              className={styles.statusSelect}
                            >
                              <option value="pending">Pending</option>
                              <option value="reviewed">Reviewed</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>
                          <td>
                            <span className={styles.approvalTag}>{submission.approvalStatus || 'pending'}</span>
                          </td>
                          {submissionFieldLabels.map(label => {
                            const cellValue = getSubmissionFieldValue(submission, formFields, label);
                            const imageSrc = normalizeImageValue(cellValue);
                            return (
                              <td key={`${submission.id}-${label}`} className={styles.submissionFieldCell}>
                                {isImageValue(cellValue) ? (
                                  <div className={styles.submissionImageCell}>
                                    <img src={imageSrc} alt={label} className={styles.submissionImagePreview} />
                                  </div>
                                ) : (
                                  cellValue || '-'
                                )}
                              </td>
                            );
                          })}
                          <td>
                            <div className={styles.submissionActions}>
                              <button 
                                onClick={() => setViewingSubmission(submission)}
                                className={styles.viewBtn}
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleEditSubmission(submission)}
                                className={styles.editBtn}
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteSubmission(submission.id)}
                                className={styles.deleteBtn}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {editingSubmission && (() => {
                  const submissionForm = forms.find(f => f.id === editingSubmission.formId);
                  if (!submissionForm) return null;
                  const formFields = getAllFormFields(submissionForm);
                  
                  return (
                  <div className={styles.editSubmissionModal}>
                    <div className={styles.modalContent}>
                      <div className={styles.modalHeader}>
                        <h3>Edit Submission #{editingSubmission.shortId || formatSubmissionId(editingSubmission.id)}</h3>
                        <button 
                          onClick={() => {
                            setEditingSubmission(null);
                            setSubmissionData({});
                          }}
                          className={styles.closeButton}
                        >
                          ×
                        </button>
                      </div>
                      <form className={styles.submissionForm} onSubmit={handleUpdateSubmission}>
                        <div style={{
                          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                          color: 'white',
                          padding: '1rem',
                          borderRadius: '10px',
                          marginBottom: '1.5rem',
                          fontSize: '1.1rem',
                          fontWeight: '700'
                        }}>
                          Form: {submissionForm.name}
                        </div>

                        {formFields.map((field) => {
                          const key = getEditableFieldKey(field, submissionData);
                          const value = submissionData[key] ?? '';

                          if (field.type === 'kit-pricing') {
                            const baseKey = `${field.id}_basePrice`;
                            const markupKey = `${field.id}_markup`;
                            const baseValue = submissionData[baseKey] ?? '';
                            const markupValue = submissionData[markupKey] ?? '';

                            return (
                              <div key={field.id} className={styles.formGroup}>
                                <label style={{ fontWeight: '600', color: '#111827' }}>{field.label}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>Base Price</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={baseValue}
                                      onChange={(e) => handleSubmissionDataChange(baseKey, parseFloat(e.target.value) || 0)}
                                      className={styles.input}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>Team Markup</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={markupValue}
                                      onChange={(e) => handleSubmissionDataChange(markupKey, parseFloat(e.target.value) || 0)}
                                      className={styles.input}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          if (field.type === 'image-select-library' && !field.autofillFromSubmission) {
                            // Editable kit design picker for team registration (field 23)
                            const currentDesignName = value || '';
                            const currentDesign = shirtDesigns.find(d => d.name === currentDesignName);
                            const currentPrimary = submissionData[`${field.id}_primaryColor`] || submissionData[`${String(field.id)}_primaryColor`] || '';
                            const currentSecondary = submissionData[`${field.id}_secondaryColor`] || submissionData[`${String(field.id)}_secondaryColor`] || '';
                            return (
                              <div key={field.id} className={styles.formGroup}>
                                <label style={{ fontWeight: '600', color: '#111827' }}>{field.label}</label>
                                {currentDesign && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '0.75rem',
                                    background: '#f0fdf4',
                                    border: '2px solid #22c55e',
                                    borderRadius: '8px',
                                    marginBottom: '0.75rem'
                                  }}>
                                    <img
                                      src={currentDesign.images?.[0] || ''}
                                      alt={currentDesign.name}
                                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    />
                                    <div>
                                      <div style={{ fontWeight: '700', color: '#15803d' }}>Currently Selected: {currentDesign.name}</div>
                                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>
                                        {currentPrimary && <span>Primary: <span style={{ display: 'inline-block', width: '12px', height: '12px', background: currentPrimary, borderRadius: '2px', verticalAlign: 'middle', marginRight: '4px', border: '1px solid #d1d5db' }}></span>{currentPrimary} </span>}
                                        {currentSecondary && <span>Secondary: <span style={{ display: 'inline-block', width: '12px', height: '12px', background: currentSecondary, borderRadius: '2px', verticalAlign: 'middle', marginRight: '4px', border: '1px solid #d1d5db' }}></span>{currentSecondary}</span>}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                  Select a new kit design to change the team&apos;s selection:
                                </div>
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                  gap: '0.75rem',
                                  maxHeight: '320px',
                                  overflowY: 'auto',
                                  padding: '0.5rem',
                                  background: '#f9fafb',
                                  border: '2px solid #e5e7eb',
                                  borderRadius: '8px'
                                }}>
                                  {shirtDesigns.map((design) => {
                                    const isSelected = currentDesignName === design.name;
                                    return (
                                      <button
                                        type="button"
                                        key={design.id}
                                        onClick={() => {
                                          handleSubmissionDataChange(key, design.name);
                                        }}
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          padding: '0.5rem',
                                          background: isSelected ? '#dcfce7' : '#ffffff',
                                          border: isSelected ? '2px solid #22c55e' : '2px solid #e5e7eb',
                                          borderRadius: '8px',
                                          cursor: 'pointer',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        <img
                                          src={design.images?.[0] || ''}
                                          alt={design.name}
                                          style={{
                                            width: '100%',
                                            height: '100px',
                                            objectFit: 'cover',
                                            borderRadius: '4px',
                                            marginBottom: '0.4rem'
                                          }}
                                        />
                                        <span style={{
                                          fontSize: '0.78rem',
                                          fontWeight: isSelected ? '700' : '500',
                                          color: isSelected ? '#15803d' : '#374151',
                                          textAlign: 'center'
                                        }}>
                                          {design.name}
                                        </span>
                                        {isSelected && (
                                          <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '700', marginTop: '2px' }}>✓ Selected</span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }

                          if (['entry-fee-pricing', 'product-bundle', 'upsell-products', 'supporter-apparel', 'checkout-form', 'image-select-library', 'submission-dropdown', 'sub-team-selector', 'dynamic-team-entries'].includes(field.type)) {
                            let displayValue = value;
                            if (field.type === 'dynamic-team-entries' && Array.isArray(value) && value.length > 0) {
                              displayValue = value.map(e => {
                                const parts = [e.teamName, e.ageGroup, e.gender].filter(Boolean);
                                return parts.join(' - ');
                              }).join(', ');
                            } else if (typeof value === 'object' && value !== null) {
                              displayValue = JSON.stringify(value);
                            }
                            return (
                              <div key={field.id} className={styles.formGroup}>
                                <label style={{ fontWeight: '600', color: '#111827' }}>{field.label}</label>
                                <div style={{
                                  padding: '0.75rem',
                                  background: '#f9fafb',
                                  border: '2px solid #e5e7eb',
                                  borderRadius: '8px'
                                }}>
                                  {String(displayValue || 'Editing not available for this field type.')}
                                </div>
                              </div>
                            );
                          }

                          if (field.type === 'textarea') {
                            return (
                              <div key={field.id} className={styles.formGroup}>
                                <label style={{ fontWeight: '600', color: '#111827' }}>{field.label}</label>
                                <textarea
                                  rows={3}
                                  value={value}
                                  onChange={(e) => handleSubmissionDataChange(key, e.target.value)}
                                  className={styles.textarea}
                                />
                              </div>
                            );
                          }

                          if (field.type === 'select') {
                            return (
                              <div key={field.id} className={styles.formGroup}>
                                <label style={{ fontWeight: '600', color: '#111827' }}>{field.label}</label>
                                <select
                                  value={value}
                                  onChange={(e) => handleSubmissionDataChange(key, e.target.value)}
                                  className={styles.input}
                                >
                                  <option value="">Select an option...</option>
                                  {field.options?.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          }

                          return (
                            <div key={field.id} className={styles.formGroup}>
                              <label style={{ fontWeight: '600', color: '#111827' }}>{field.label}</label>
                              <input
                                type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                value={value}
                                onChange={(e) => handleSubmissionDataChange(key, e.target.value)}
                                className={styles.input}
                              />
                            </div>
                          );
                        })}

                        <div style={{
                          display: 'flex',
                          gap: '1rem',
                          marginTop: '2rem',
                          paddingTop: '2rem',
                          borderTop: '2px solid #e5e7eb'
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubmission(null);
                              setSubmissionData({});
                            }}
                            style={{
                              flex: 1,
                              padding: '1rem',
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              fontSize: '1rem'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            style={{
                              flex: 1,
                              padding: '1rem',
                              background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              fontSize: '1rem'
                            }}
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                  );
                })()}

                {viewingSubmission && (() => {
                  const submissionForm = forms.find(f => f.id === viewingSubmission.formId);
                  
                  // Safety check - ensure we have valid data
                  if (!viewingSubmission.data || typeof viewingSubmission.data !== 'object') {
                    return (
                      <div className={styles.editSubmissionModal}>
                        <div className={styles.modalContent}>
                          <div className={styles.modalHeader}>
                            <h3>View Submission #{viewingSubmission.shortId || formatSubmissionId(viewingSubmission.id)}</h3>
                            <button onClick={() => setViewingSubmission(null)} className={styles.closeButton}>×</button>
                          </div>
                          <div style={{ padding: '2rem', textAlign: 'center' }}>
                            <p>Submission data is not available or corrupted.</p>
                            <pre style={{ textAlign: 'left', background: '#f3f4f6', padding: '1rem', borderRadius: '8px', overflow: 'auto' }}>
                              {JSON.stringify(viewingSubmission, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  if (!submissionForm) {
                    // Show raw data if form template not found
                    return (
                      <div className={styles.editSubmissionModal}>
                        <div className={styles.modalContent}>
                          <div className={styles.modalHeader}>
                            <h3>View Submission #{viewingSubmission.shortId || formatSubmissionId(viewingSubmission.id)}</h3>
                            <button onClick={() => setViewingSubmission(null)} className={styles.closeButton}>×</button>
                          </div>
                          <div style={{ padding: '1rem' }}>
                            <p style={{ marginBottom: '1rem', color: '#f59e0b' }}>Form template not found. Showing raw data:</p>
                            <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                              {Object.entries(viewingSubmission.data).map(([key, value]) => (
                                <div key={key} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'white', borderRadius: '4px' }}>
                                  <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Get all form fields in order (handles multi-page forms)
                  const formFields = getAllFormFields(submissionForm);
                  
                  // Create a comprehensive map of all submission data
                  const orderedData = [];
                  const processedKeys = new Set();
                  
                  // First, add fields in the order they appear in the form
                  formFields.forEach(field => {
                    // For regular fields, use the label as key
                    const value = viewingSubmission.data[field.label];
                    
                    // Handle special field types that save data differently
                    if (field.type === 'kit-pricing') {
                      // Kit pricing saves as fieldId_basePrice, fieldId_markup
                      const basePrice = viewingSubmission.data[`${field.id}_basePrice`];
                      const markup = viewingSubmission.data[`${field.id}_markup`];
                      if (basePrice !== undefined || markup !== undefined) {
                        orderedData.push({ 
                          label: 'Kit Markup', 
                          value: `Base Price: R${basePrice || 150} | Markup: R${markup || 0} | Total: R${(parseFloat(basePrice) || 150) + (parseFloat(markup) || 0)}`,
                          fromForm: true 
                        });
                        processedKeys.add(`${field.id}_basePrice`);
                        processedKeys.add(`${field.id}_markup`);
                      } else {
                        orderedData.push({ label: field.label, value: undefined, fromForm: true });
                      }
                    } else if (field.type === 'entry-fee-pricing') {
                      // Entry fee saves as fieldId_baseFee, fieldId_adjustment
                      const baseFee = viewingSubmission.data[`${field.id}_baseFee`];
                      const adjustment = viewingSubmission.data[`${field.id}_adjustment`];
                      if (baseFee !== undefined || adjustment !== undefined) {
                        orderedData.push({ 
                          label: field.label, 
                          value: `Base Fee: R${baseFee || 0} | Adjustment: R${adjustment || 0} | Total: R${(parseFloat(baseFee) || 0) + (parseFloat(adjustment) || 0)}`,
                          fromForm: true 
                        });
                        processedKeys.add(`${field.id}_baseFee`);
                        processedKeys.add(`${field.id}_adjustment`);
                      } else {
                        orderedData.push({ label: field.label, value: undefined, fromForm: true });
                      }
                    } else if (field.type === 'image-select-library' && field.includeColorPickers) {
                      // Image select with color pickers saves design, primaryColor, secondaryColor
                      const design = viewingSubmission.data[field.label] || viewingSubmission.data[field.id];
                      const primaryColor = viewingSubmission.data[`${field.id}_primaryColor`];
                      const secondaryColor = viewingSubmission.data[`${field.id}_secondaryColor`];
                      if (design || primaryColor || secondaryColor) {
                        orderedData.push({ 
                          label: field.label, 
                          value: `Design: ${design || 'Not selected'} | Primary: ${primaryColor || 'N/A'} | Secondary: ${secondaryColor || 'N/A'}`,
                          fromForm: true 
                        });
                        processedKeys.add(field.label);
                        processedKeys.add(field.id);
                        processedKeys.add(`${field.id}_primaryColor`);
                        processedKeys.add(`${field.id}_secondaryColor`);
                      } else {
                        orderedData.push({ label: field.label, value: undefined, fromForm: true });
                      }
                    } else if (field.type === 'product-bundle') {
                      // Product bundle saves size selection
                      const size = viewingSubmission.data[`${field.id}_size`];
                      orderedData.push({ 
                        label: field.label, 
                        value: size ? `Size: ${size}` : undefined,
                        fromForm: true 
                      });
                      processedKeys.add(`${field.id}_size`);
                    } else {
                      // Regular field - use label or field id
                      const fieldValue = value !== undefined ? value : viewingSubmission.data[field.id];
                      orderedData.push({ label: field.label, value: fieldValue, fromForm: true });
                      processedKeys.add(field.label);
                      processedKeys.add(field.id);
                    }
                  });
                  
                  // Then add any extra fields in submission data that weren't processed
                  Object.entries(viewingSubmission.data).forEach(([key, value]) => {
                    if (!processedKeys.has(key) && !formFields.some(field => field.label === key || field.id === key)) {
                      orderedData.push({ label: key, value, fromForm: false });
                    }
                  });
                  
                  return (
                  <div className={styles.editSubmissionModal}>
                    <div className={`${styles.modalContent} ${styles.submissionModalContent}`}>
                      <div className={`${styles.modalHeader} ${styles.submissionModalHeader}`}>
                        <h3>View Submission #{viewingSubmission.shortId || formatSubmissionId(viewingSubmission.id)}</h3>
                        <button 
                          onClick={() => setViewingSubmission(null)}
                          className={styles.closeButton}
                        >
                          ×
                        </button>
                      </div>
                      <div className={styles.submissionForm}>
                        <div className={styles.submissionSummary}>
                          <div className={styles.submissionSummaryTitle}>
                            {submissionForm.name}
                          </div>
                          <div className={styles.submissionSummaryMeta}>
                            Submitted: {new Date(viewingSubmission.submittedAt).toLocaleString()}
                          </div>
                          <div className={styles.submissionSummaryBadges}>
                            <div>
                              Status: <span className={styles.submissionSummaryBadge}>{viewingSubmission.status}</span>
                            </div>
                            <div>
                              Approval: <span className={styles.submissionSummaryBadge}>{viewingSubmission.approvalStatus || 'pending'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Approval Status Selector */}
                        <div className={styles.approvalBox}>
                          <label className={styles.approvalLabel}>
                            Update Approval Status & Send Email
                          </label>
                          <select
                            value={viewingSubmission.approvalStatus || 'pending'}
                            onChange={(e) => handleApprovalStatusChange(viewingSubmission, e.target.value)}
                            className={styles.approvalSelect}
                          >
                            <option value="pending">Pending</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="complete">Complete</option>
                          </select>
                          <p className={styles.approvalNote}>
                            Changing status will automatically send an email notification to the team
                          </p>
                        </div>
                        
                        <div className={styles.submissionDetailsGrid}>
                          {orderedData.map((item, idx) => {
                            const detailImageSrc = normalizeImageValue(item.value);
                            return (
                            <div key={idx} className={styles.submissionDetailCard}>
                              <div className={styles.submissionDetailTitle}>
                                <span>{item.label}</span>
                                {!item.fromForm && (
                                  <span className={styles.extraFieldBadge}>
                                    Extra Field
                                  </span>
                                )}
                              </div>
                              <div className={styles.submissionDetailValue}>
                                {/* Check if value is a base64 image or image URL */}
                                {isImageValue(item.value) ? (
                                  <div style={{ textAlign: 'center' }}>
                                    <img 
                                      src={detailImageSrc} 
                                      alt={item.label}
                                      className={styles.submissionImagePreview}
                                    />
                                    <div>
                                      <a
                                        href={detailImageSrc}
                                        download={`${item.label.replace(/\s+/g, '_')}_${viewingSubmission.id}.png`}
                                        className={styles.submissionImageButton}
                                      >
                                        Download Image
                                      </a>
                                    </div>
                                  </div>
                                ) : Array.isArray(item.value) ? (
                                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                                    {item.value.map((val, valIdx) => (
                                      <li key={valIdx}>
                                        {typeof val === 'object' && val !== null ? (
                                          <div style={{ background: '#f3f4f6', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.25rem' }}>
                                            {Object.entries(val).map(([k, v]) => (
                                              <div key={k} style={{ fontSize: '0.75rem' }}>
                                                <strong>{k}:</strong> {String(v || '')}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          String(val || '')
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                ) : typeof item.value === 'object' && item.value !== null ? (
                                  <div style={{ background: '#f3f4f6', padding: '0.5rem', borderRadius: '4px' }}>
                                    {Object.entries(item.value).map(([k, v]) => (
                                      <div key={k} style={{ fontSize: '0.75rem' }}>
                                        <strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v || '')}
                                      </div>
                                    ))}
                                  </div>
                                ) : item.value !== undefined && item.value !== null && item.value !== '' ? (
                                  String(item.value)
                                ) : (
                                  <span className={styles.submissionEmpty}>(not provided)</span>
                                )}
                              </div>
                            </div>
                          );
                          })}
                        </div>
                        
                        <div className={styles.modalActions}>
                          <button 
                            type="button" 
                            onClick={() => setViewingSubmission(null)}
                            className={styles.modalPrimaryButton}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Field Editor Modal */}
      {editingField && (
        <div className={styles.fieldEditorModal} onClick={() => {
          setEditingField(null);
          resetFieldData();
        }}>
          <div className={styles.fieldEditorContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.fieldEditorHeader}>
              <h3>Edit Field: {editingField.label}</h3>
              <button
                className={styles.closeButton}
                onClick={() => {
                  setEditingField(null);
                  resetFieldData();
                }}
                style={{ width: '35px', height: '35px', fontSize: '1.5rem' }}
              >
                ×
              </button>
            </div>
            
            <div className={styles.fieldEditorBody}>
              <form onSubmit={handleUpdateField} id="editFieldForm">
                <div className={styles.formGroup}>
                  <label>Field Type</label>
                  <select
                    name="type"
                    value={fieldData.type}
                    onChange={handleFieldChange}
                    className={styles.input}
                  >
                    <option value="text">Text Input</option>
                    <option value="email">Email</option>
                    <option value="tel">Phone Number</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="textarea">Text Area</option>
                    <option value="radio">Radio Buttons</option>
                    <option value="checkbox">Checkboxes</option>
                    <option value="select">Dropdown</option>
                    <option value="image-select">Image Selection (choose from images)</option>
                    <option value="image-select-library">Image Selection (from shirt library)</option>
                    <option value="submission-dropdown">Dynamic Dropdown (from submissions)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Label *</label>
                  <input
                    type="text"
                    name="label"
                    value={fieldData.label}
                    onChange={handleFieldChange}
                    required
                    placeholder="e.g., Full Name"
                    className={styles.input}
                  />
                </div>

                {!needsOptions && fieldData.type !== 'submission-dropdown' && (
                  <div className={styles.formGroup}>
                    <label>Placeholder</label>
                    <input
                      type="text"
                      name="placeholder"
                      value={fieldData.placeholder}
                      onChange={handleFieldChange}
                      placeholder="e.g., Enter your name"
                      className={styles.input}
                    />
                  </div>
                )}

                {needsOptions && (
                  <div className={styles.formGroup}>
                    <label>Options</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <input
                        type="text"
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        placeholder="Enter option"
                        className={styles.input}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className={styles.submitBtn}
                        style={{ padding: '0.5rem 1.5rem', whiteSpace: 'nowrap' }}
                      >
                        Add
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {fieldData.options.map((option, index) => (
                        <div key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          padding: '0.5rem',
                          background: '#f9fafb',
                          borderRadius: '6px'
                        }}>
                          <span style={{ flex: 1 }}>{typeof option === 'string' ? option : option.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '600'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="required"
                      checked={fieldData.required}
                      onChange={handleFieldChange}
                    />
                    <span>Required Field</span>
                  </label>
                </div>
              </form>
            </div>

            <div className={styles.fieldEditorActions}>
              <button
                type="button"
                onClick={() => {
                  setEditingField(null);
                  resetFieldData();
                }}
                className={styles.cancelFieldBtn}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="editFieldForm"
                className={styles.saveFieldBtn}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Force SSR to prevent prerender errors during build
export async function getServerSideProps() {
  return { props: {} };
}
