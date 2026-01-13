import { useState, useEffect } from 'react';
import styles from './FormDisplay.module.css';
import { submitForm, getFormSubmissionsByFormId, getFormTemplateById, getFormWithProducts, setTeamKitPricing, getTeamKitPricing } from '../data/forms';
import { getShirtDesigns, availableColors, getMainImage } from '../data/shirtDesigns';
import { useCart } from '../context/CartContext';
import { getLandingPageByFormId } from '../data/landingPages';
import FormLandingPage from './FormLandingPage';
import ImageGalleryModal from './ImageGalleryModal';

export default function FormDisplay({ form: initialForm, onSubmitSuccess }) {
  const [form, setForm] = useState(initialForm);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionDropdownData, setSubmissionDropdownData] = useState({});
  const [prefilledData, setPrefilledData] = useState({});
  const [shirtDesigns, setShirtDesigns] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [landingPage, setLandingPage] = useState(null);
  const [modalDesign, setModalDesign] = useState(null);

  const { cart, addToCart, openCart, getCartTotal, getCartCount } = useCart();
  const [entryFeeIncludedItems, setEntryFeeIncludedItems] = useState([]);

  // Determine if form is multi-page
  const isMultiPage = form.multiPage && form.pages && form.pages.length > 0;
  const totalPages = isMultiPage ? form.pages.length : 1;
  const currentFields = isMultiPage ? form.pages.find(p => p.pageId === currentPage)?.fields || [] : form.fields;

  // Load landing page
  useEffect(() => {
    const page = getLandingPageByFormId(form.id);
    if (page && page.enabled) {
      setLandingPage(page);
      setShowLandingPage(true);
    } else {
      setLandingPage(null);
      setShowLandingPage(false);
    }
  }, [form.id]);

  // Load base kit price and entry fee from localStorage for team registration
  useEffect(() => {
    if (form.id === 1 && typeof window !== 'undefined') {
      const savedBasePrice = localStorage.getItem('kitBasePrice');
      if (savedBasePrice && !formData['29_basePrice']) {
        handleInputChange('29_basePrice', parseFloat(savedBasePrice));
        // Initialize markup to 0 if not set
        if (formData['29_markup'] === undefined) {
          handleInputChange('29_markup', 0);
        }
      }
      const savedEntryFee = localStorage.getItem('leagueEntryBaseFee');
      if (savedEntryFee && !formData['31_baseFee']) {
        handleInputChange('31_baseFee', parseFloat(savedEntryFee));
        // Initialize adjustment to 0 if not set
        if (formData['31_adjustment'] === undefined) {
          handleInputChange('31_adjustment', 0);
        }
      }
      const savedIncludedItems = localStorage.getItem('leagueEntryIncludedItems');
      if (savedIncludedItems) {
        setEntryFeeIncludedItems(JSON.parse(savedIncludedItems));
      } else {
        // Set default items if none saved
        setEntryFeeIncludedItems([
          'Full season league participation',
          'Official league jersey',
          'League insurance coverage',
          'Access to league facilities'
        ]);
      }
    }
  }, [form.id, currentPage]);

  // Initialize default values for fields
  useEffect(() => {
    const allFields = isMultiPage 
      ? form.pages.flatMap(p => p.fields)
      : form.fields;
    
    const defaultValues = {};
    allFields.forEach(field => {
      if (field.defaultValue !== undefined && formData[field.id] === undefined) {
        defaultValues[field.id] = field.defaultValue;
      }
    });
    
    if (Object.keys(defaultValues).length > 0) {
      setFormData(prev => ({ ...prev, ...defaultValues }));
    }
  }, [form, isMultiPage]);

  // Load submissions for any submission-dropdown fields
  useEffect(() => {
    // Load form with dynamic products
    const formWithProducts = getFormWithProducts(initialForm.id);
    setForm(formWithProducts || initialForm);

    const allFields = isMultiPage 
      ? (formWithProducts || initialForm).pages.flatMap(p => p.fields)
      : (formWithProducts || initialForm).fields;
    
    const submissionFields = allFields.filter(f => f.type === 'submission-dropdown');
    if (submissionFields.length > 0) {
      const dropdownData = {};
      submissionFields.forEach(field => {
        if (field.sourceFormId) {
          const sourceForm = getFormTemplateById(field.sourceFormId);
          const submissions = getFormSubmissionsByFormId(field.sourceFormId);
          dropdownData[field.id] = {
            sourceForm,
            submissions,
            displayFieldId: field.displayFieldId,
            prefillFields: field.prefillFields || []
          };
        }
      });
      setSubmissionDropdownData(dropdownData);
    }

    // Load shirt designs for any image-select-library fields
    const hasShirtLibraryField = allFields.some(f => f.type === 'image-select-library');
    if (hasShirtLibraryField) {
      setShirtDesigns(getShirtDesigns(true)); // Only active designs
    }
  }, [initialForm, isMultiPage]);

  // Auto-add basic kit to cart when reaching page 2
  useEffect(() => {
    if (currentPage === 2 && form.id === 2) { // Only for Player Registration
      const allFields = isMultiPage 
        ? form.pages.flatMap(p => p.fields)
        : form.fields;
      
      const basicKitField = allFields.find(f => f.type === 'product-bundle');
      if (basicKitField && !cart.some(item => item.id === 'basic-kit')) {
        // Get selected team submission ID to fetch custom pricing
        const teamDropdownField = allFields.find(f => f.type === 'submission-dropdown' && f.sourceFormId === 1);
        const selectedTeamId = teamDropdownField ? formData[teamDropdownField.id] : null;
        
        // Get team pricing or use default
        const teamPricing = selectedTeamId ? getTeamKitPricing(parseInt(selectedTeamId)) : { finalPrice: basicKitField.basePrice };
        
        addToCart({
          id: 'basic-kit',
          name: basicKitField.label,
          price: teamPricing.finalPrice,
          description: basicKitField.description
        }, null);
      }
    }
  }, [currentPage, form, isMultiPage, cart, addToCart, formData]);

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmissionDropdownChange = (fieldId, submissionId) => {
    // Update the dropdown value
    handleInputChange(fieldId, submissionId);

    // Get the selected submission data and prefill fields
    const dropdownInfo = submissionDropdownData[fieldId];
    if (dropdownInfo && submissionId) {
      const selectedSubmission = dropdownInfo.submissions.find(s => s.id === parseInt(submissionId));
      if (selectedSubmission) {
        const newPrefilledData = { ...prefilledData };
        const newFormData = { ...formData, [fieldId]: submissionId };
        
        // Handle prefillFields (old method - fields defined in dropdown config)
        dropdownInfo.prefillFields.forEach(prefillField => {
          const sourceFieldId = prefillField.sourceFieldId;
          const value = selectedSubmission.data[sourceFieldId];
          newPrefilledData[`${fieldId}_${sourceFieldId}`] = value;
        });

        // Handle autofillFromSubmission (new method - individual fields linked to dropdown)
        form.fields.forEach(field => {
          if (field.autofillFromSubmission && field.autofillLinkedDropdownFieldId === fieldId && field.autofillSourceFieldId) {
            const value = selectedSubmission.data[field.autofillSourceFieldId];
            newFormData[field.id] = value;
            
            // If it's an image-select-library field with colors, also prefill the color fields
            if (field.type === 'image-select-library') {
              const primaryColorKey = `${field.autofillSourceFieldId}_primaryColor`;
              const secondaryColorKey = `${field.autofillSourceFieldId}_secondaryColor`;
              
              if (selectedSubmission.data[primaryColorKey]) {
                newFormData[`${field.id}_primaryColor`] = selectedSubmission.data[primaryColorKey];
              }
              if (selectedSubmission.data[secondaryColorKey]) {
                newFormData[`${field.id}_secondaryColor`] = selectedSubmission.data[secondaryColorKey];
              }
            }
          }
        });

        setPrefilledData(newPrefilledData);
        setFormData(newFormData);
      }
    } else {
      // Clear prefilled data if nothing selected
      const newPrefilledData = { ...prefilledData };
      const newFormData = { ...formData, [fieldId]: '' };
      
      const dropdownInfo = submissionDropdownData[fieldId];
      if (dropdownInfo) {
        dropdownInfo.prefillFields.forEach(prefillField => {
          delete newPrefilledData[`${fieldId}_${prefillField.sourceFieldId}`];
        });
      }

      // Clear autofilled fields
      form.fields.forEach(field => {
        if (field.autofillFromSubmission && field.autofillLinkedDropdownFieldId === fieldId) {
          newFormData[field.id] = '';
        }
      });

      setPrefilledData(newPrefilledData);
      setFormData(newFormData);
    }
  };

  const handleCheckboxChange = (fieldId, option, checked) => {
    setFormData(prev => {
      const currentValues = prev[fieldId] || [];
      if (checked) {
        return { ...prev, [fieldId]: [...currentValues, option] };
      } else {
        return { ...prev, [fieldId]: currentValues.filter(v => v !== option) };
      }
    });
  };

  const handleNextPage = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    // Validate current page fields
    const missingFields = currentFields
      .filter(field => field.required)
      .filter(field => {
        // Product bundle only needs size selection
        if (field.type === 'product-bundle') {
          return !formData[`${field.id}_size`];
        }
        
        // Checkout form requires all checkout fields
        if (field.type === 'checkout-form') {
          const requiredCheckoutFields = ['checkout_email', 'checkout_password', 'checkout_firstName', 'checkout_lastName', 'checkout_phone', 'checkout_address', 'checkout_city', 'checkout_province', 'checkout_postalCode', 'checkout_country'];
          return requiredCheckoutFields.some(fieldName => !formData[fieldName]);
        }
        
        // Kit pricing requires base price and markup
        if (field.type === 'kit-pricing') {
          return !formData[`${field.id}_basePrice`];
        }
        
        // Entry fee pricing requires base fee (adjustment is optional)
        if (field.type === 'entry-fee-pricing') {
          return !formData[`${field.id}_baseFee`];
        }
        
        // Check main field value for other types
        if (!formData[field.id] || (Array.isArray(formData[field.id]) && formData[field.id].length === 0)) {
          return true;
        }
        
        // Check color pickers if applicable
        if (field.type === 'image-select-library' && field.includeColorPickers && !field.autofillFromSubmission) {
          if (!formData[`${field.id}_primaryColor`] || !formData[`${field.id}_secondaryColor`]) {
            return true;
          }
        }
        
        return false;
      });
    
    if (missingFields.length > 0) {
      alert('Please fill in all required fields on this page');
      return;
    }

    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Validate all required fields across all pages
    const allFields = isMultiPage 
      ? form.pages.flatMap(p => p.fields)
      : form.fields;

    const missingFields = allFields
      .filter(field => field.required)
      .filter(field => {
        // Product bundle only needs size selection
        if (field.type === 'product-bundle') {
          return !formData[`${field.id}_size`];
        }
        
        // Checkout form requires all checkout fields
        if (field.type === 'checkout-form') {
          const requiredCheckoutFields = ['checkout_email', 'checkout_password', 'checkout_firstName', 'checkout_lastName', 'checkout_phone', 'checkout_address', 'checkout_city', 'checkout_province', 'checkout_postalCode', 'checkout_country'];
          return requiredCheckoutFields.some(fieldName => !formData[fieldName]);
        }
        
        // Dynamic team entries validation
        if (field.type === 'dynamic-team-entries') {
          const numberOfTeams = parseInt(formData[field.dependsOn] || 0);
          const teamEntries = formData[field.id] || [];
          
          if (numberOfTeams === 0 || teamEntries.length === 0) return true;
          
          // Check all teams have name, gender, age group, coach name, and coach contact
          for (let i = 0; i < numberOfTeams; i++) {
            const entry = teamEntries[i];
            if (!entry || !entry.teamName || !entry.gender || !entry.ageGroup || !entry.coachName || !entry.coachContact) {
              return true;
            }
          }
          return false;
        }
        
        // Check if the main field has a value
        if (!formData[field.id] || (Array.isArray(formData[field.id]) && formData[field.id].length === 0)) {
          return true;
        }
        
        // If it's an image-select-library field with color pickers and not auto-filled, check colors
        if (field.type === 'image-select-library' && field.includeColorPickers && !field.autofillFromSubmission) {
          if (!formData[`${field.id}_primaryColor`] || !formData[`${field.id}_secondaryColor`]) {
            return true;
          }
        }
        
        return false;
      });

    if (missingFields.length > 0) {
      alert('Please fill in all required fields (including colors if applicable)');
      setSubmitting(false);
      return;
    }

    // Combine form data with prefilled data for submission
    const combinedData = { ...formData, ...prefilledData };

    // Submit the form
    const submission = submitForm(form.id, combinedData);
    
    // If this is a Team Registration form (id: 1), save the kit pricing
    if (form.id === 1 && submission) {
      const basePrice = formData['29_basePrice'] || 150;
      const markup = formData['29_markup'] || 0;
      setTeamKitPricing(submission.id, basePrice, markup);
    }
    
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      if (onSubmitSuccess) {
        onSubmitSuccess(submission);
      }
    }, 500);
  };

  if (submitted) {
    return (
      <div className={styles.successMessage}>
        <div className={styles.successIcon}>✓</div>
        <h3>Thank you for your submission!</h3>
        <p>We've received your information and will get back to you soon.</p>
        <button 
          onClick={() => {
          setSubmitted(false);
          setFormData({});
          setPrefilledData({});
        }}
        className={styles.resetButton}
        >
          Submit Another Response
        </button>
      </div>
    );
  }

  // Show landing page if enabled
  if (showLandingPage && landingPage) {
    return (
      <FormLandingPage 
        landingPage={landingPage} 
        onStart={() => setShowLandingPage(false)} 
      />
    );
  }

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h3>{form.name}</h3>
        <p>{form.description}</p>
        {isMultiPage && (
          <div style={{ 
            marginTop: '2rem', 
            display: 'flex', 
            gap: '0.75rem', 
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            {form.pages.map((page, idx) => (
              <div key={page.pageId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: idx < form.pages.length - 1 ? 1 : 'auto' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: currentPage === page.pageId 
                    ? 'white' 
                    : currentPage > page.pageId 
                      ? 'rgba(34, 197, 94, 0.9)' 
                      : 'rgba(255, 255, 255, 0.2)',
                  color: currentPage === page.pageId ? '#dc0000' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '1.1rem',
                  boxShadow: currentPage === page.pageId ? '0 4px 12px rgba(255,255,255,0.3)' : 'none',
                  border: currentPage === page.pageId ? '2px solid rgba(255,255,255,0.5)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                  {currentPage > page.pageId ? '✓' : page.pageId}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '0.95rem', 
                    fontWeight: currentPage === page.pageId ? '700' : '500',
                    color: currentPage === page.pageId ? 'white' : 'rgba(255, 255, 255, 0.8)',
                    marginBottom: '0.25rem'
                  }}>
                    {page.pageTitle}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontWeight: '500'
                  }}>
                    Step {page.pageId} of {totalPages}
                  </div>
                </div>
                {idx < form.pages.length - 1 && (
                  <div style={{ 
                    flex: 1,
                    height: '3px', 
                    background: currentPage > page.pageId ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.2)', 
                    borderRadius: '2px',
                    transition: 'all 0.3s'
                  }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Welcome Banner */}
      {form.welcomeBanner && currentPage === form.welcomeBanner.showOnPage && (
        <div style={{
          width: '100%',
          height: '400px',
          borderRadius: '20px',
          overflow: 'hidden',
          position: 'relative',
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: form.welcomeBanner.imageUrl 
              ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url(${form.welcomeBanner.imageUrl})`
              : 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '3rem',
              fontWeight: '900',
              color: 'white',
              margin: '0 0 1rem 0',
              textShadow: '0 4px 12px rgba(0,0,0,0.3)',
              letterSpacing: '-1px'
            }}>
              {form.welcomeBanner.title}
            </h2>
            <p style={{
              fontSize: '1.25rem',
              color: 'rgba(255,255,255,0.95)',
              margin: 0,
              maxWidth: '600px',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              fontWeight: '500'
            }}>
              {form.welcomeBanner.subtitle}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Compact grid layout for Team Registration Page 1 */}
        {form.id === 1 && currentPage === 1 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.25rem',
            marginBottom: '1rem'
          }}>
            {currentFields
              .sort((a, b) => a.order - b.order)
              .map(field => (
                <div 
                  key={field.id} 
                  style={{
                    gridColumn: field.id === 22 || field.id === 5 ? 'span 2' : 'span 1'
                  }}
                >
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    color: '#111827',
                    fontSize: '0.95rem',
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.2px'
                  }}>
                    {field.label}
                    {field.required && <span style={{ color: '#dc0000', marginLeft: '0.25rem' }}>*</span>}
                  </label>
                  
                  {field.id === 22 ? (
                    // Team Logo Upload Field
                    <div>
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start'
                      }}>
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          value={formData[field.id] || ''}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          required={field.required}
                          style={{
                            flex: 1,
                            padding: '0.75rem 0.95rem',
                            border: '2px solid #e5e7eb',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontFamily: 'inherit',
                            transition: 'all 0.3s',
                            background: '#fafafa'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#dc0000';
                            e.target.style.background = 'white';
                            e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e5e7eb';
                            e.target.style.background = '#fafafa';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                        <label style={{
                          padding: '0.75rem 1.25rem',
                          background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                          color: 'white',
                          borderRadius: '10px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                        >
                          📁 Upload
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  handleInputChange(field.id, reader.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      {formData[field.id] && (
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.75rem',
                          background: '#f0fdf4',
                          border: '2px solid #86efac',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}>
                          <img 
                            src={formData[field.id]} 
                            alt="Team logo preview" 
                            style={{
                              width: '60px',
                              height: '60px',
                              objectFit: 'contain',
                              borderRadius: '6px',
                              background: 'white',
                              padding: '4px'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <p style={{ 
                              margin: 0, 
                              fontSize: '0.85rem', 
                              color: '#166534',
                              fontWeight: '600'
                            }}>
                              ✓ Logo uploaded successfully
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleInputChange(field.id, '')}
                            style={{
                              padding: '0.5rem 0.75rem',
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#fecaca';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#fee2e2';
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ) : field.type === 'text' && (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      required={field.required}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.95rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                        transition: 'all 0.3s',
                        background: '#fafafa'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#dc0000';
                        e.target.style.background = 'white';
                        e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.background = '#fafafa';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  )}
                  
                  {field.type === 'email' && (
                    <input
                      type="email"
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      required={field.required}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.95rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                        transition: 'all 0.3s',
                        background: '#fafafa'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#dc0000';
                        e.target.style.background = 'white';
                        e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.background = '#fafafa';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  )}
                  
                  {field.type === 'select' && (
                    <select
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      required={field.required}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.95rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                        transition: 'all 0.3s',
                        background: '#fafafa',
                        cursor: 'pointer'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#dc0000';
                        e.target.style.background = 'white';
                        e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.background = '#fafafa';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map((option, idx) => (
                        <option key={idx} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                  
                  {field.type === 'tel' && (
                    <input
                      type="tel"
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      required={field.required}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.95rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                        transition: 'all 0.3s',
                        background: '#fafafa'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#dc0000';
                        e.target.style.background = 'white';
                        e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.background = '#fafafa';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  )}
                  
                  {field.type === 'number' && (
                    <>
                      <input
                        type="number"
                        placeholder={field.placeholder}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        required={field.required}
                        min={field.min}
                        max={field.max}
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.95rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '10px',
                          fontSize: '0.95rem',
                          fontFamily: 'inherit',
                          transition: 'all 0.3s',
                          background: '#fafafa'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#dc0000';
                          e.target.style.background = 'white';
                          e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.background = '#fafafa';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      {field.helpText && (
                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                          {field.helpText}
                        </div>
                      )}
                    </>
                  )}
                  
                  {field.type === 'checkbox-group' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {field.options?.map((option, idx) => {
                        const currentValues = formData[field.id] || [];
                        const isChecked = currentValues.includes(option.value);
                        
                        return (
                          <label key={idx} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.75rem',
                            cursor: 'pointer',
                            padding: '0.75rem',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            background: isChecked ? '#fee2e2' : '#fafafa',
                            transition: 'all 0.2s'
                          }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newValues = e.target.checked
                                  ? [...currentValues, option.value]
                                  : currentValues.filter(v => v !== option.value);
                                handleInputChange(field.id, newValues);
                              }}
                              style={{
                                width: '1.25rem',
                                height: '1.25rem',
                                cursor: 'pointer',
                                accentColor: '#dc0000'
                              }}
                            />
                            <span style={{ 
                              fontSize: '0.95rem', 
                              color: '#111827',
                              fontWeight: isChecked ? '600' : '400'
                            }}>
                              {option.label}
                            </span>
                          </label>
                        );
                      })}
                      {field.helpText && (
                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          {field.helpText}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {field.type === 'dynamic-team-entries' && (() => {
                    const numberOfTeams = parseInt(formData[field.dependsOn] || 0);
                    
                    if (numberOfTeams > 0) {
                      if (!formData[field.id]) {
                        const initialEntries = Array.from({ length: numberOfTeams }, (_, i) => ({
                          teamNumber: i + 1,
                          teamName: '',
                          ageGroup: '',
                          gender: '',
                          coachName: '',
                          coachContact: ''
                        }));
                        handleInputChange(field.id, initialEntries);
                      }

                      const teamEntries = formData[field.id] || [];

                      return (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '1rem',
                          marginTop: '0.75rem',
                          gridColumn: 'span 2'
                        }}>
                          {Array.from({ length: numberOfTeams }, (_, i) => {
                            const entry = teamEntries[i] || { teamNumber: i + 1, teamName: '', ageGroup: '', gender: '', coachName: '', coachContact: '' };
                            const selectedGender = entry.gender || '';
                            const selectedAgeGroup = entry.ageGroup || '';
                            const ageGroups = selectedGender === 'Female' 
                              ? ['U13', 'U17']
                              : selectedGender === 'Male'
                              ? ['U9', 'U11', 'U13', 'U15', 'U17', 'Senior']
                              : [];
                            
                            return (
                              <div 
                                key={i}
                                style={{
                                  padding: '1rem',
                                  border: '2px solid #e5e7eb',
                                  borderRadius: '8px',
                                  background: '#f9fafb'
                                }}
                              >
                                <div style={{ 
                                  fontSize: '0.95rem', 
                                  fontWeight: '700', 
                                  color: '#111827', 
                                  marginBottom: '0.85rem',
                                  paddingBottom: '0.5rem',
                                  borderBottom: '2px solid #e5e7eb'
                                }}>
                                  Team {i + 1}
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                                  <div>
                                    <label style={{ 
                                      display: 'block', 
                                      fontSize: '0.85rem', 
                                      fontWeight: '600', 
                                      color: '#111827',
                                      marginBottom: '0.4rem'
                                    }}>
                                      Team Name <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                      type="text"
                                      placeholder={`Team ${i + 1} name`}
                                      value={entry.teamName || ''}
                                      onChange={(e) => {
                                        const updatedEntries = [...teamEntries];
                                        updatedEntries[i] = { ...entry, teamName: e.target.value };
                                        handleInputChange(field.id, updatedEntries);
                                      }}
                                      required
                                      style={{
                                        width: '100%',
                                        padding: '0.6rem 0.75rem',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        fontFamily: 'inherit',
                                        transition: 'all 0.3s',
                                        background: 'white',
                                        boxSizing: 'border-box'
                                      }}
                                      onFocus={(e) => {
                                        e.target.style.borderColor = '#dc0000';
                                        e.target.style.background = 'white';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.background = 'white';
                                        e.target.style.boxShadow = 'none';
                                      }}
                                    />
                                  </div>
                                  
                                  <div>
                                    <label style={{ 
                                      display: 'block', 
                                      fontSize: '0.85rem', 
                                      fontWeight: '600', 
                                      color: '#111827',
                                      marginBottom: '0.4rem'
                                    }}>
                                      Gender <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <select
                                      value={entry.gender || ''}
                                      onChange={(e) => {
                                        const updatedEntries = [...teamEntries];
                                        updatedEntries[i] = { ...entry, gender: e.target.value, ageGroup: '' };
                                        handleInputChange(field.id, updatedEntries);
                                      }}
                                      required
                                      style={{
                                        width: '100%',
                                        padding: '0.6rem 0.75rem',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        fontFamily: 'inherit',
                                        transition: 'all 0.3s',
                                        background: 'white',
                                        cursor: 'pointer',
                                        boxSizing: 'border-box'
                                      }}
                                      onFocus={(e) => {
                                        e.target.style.borderColor = '#dc0000';
                                        e.target.style.background = 'white';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.background = 'white';
                                        e.target.style.boxShadow = 'none';
                                      }}
                                    >
                                      <option value="">Select Gender</option>
                                      <option value="Male">Male</option>
                                      <option value="Female">Female</option>
                                    </select>
                                  </div>
                                  
                                  <div>
                                    <label style={{ 
                                      display: 'block', 
                                      fontSize: '0.85rem', 
                                      fontWeight: '600', 
                                      color: '#111827',
                                      marginBottom: '0.4rem'
                                    }}>
                                      Age Group <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <select
                                      value={entry.ageGroup || ''}
                                      onChange={(e) => {
                                        const updatedEntries = [...teamEntries];
                                        updatedEntries[i] = { ...entry, ageGroup: e.target.value };
                                        handleInputChange(field.id, updatedEntries);
                                      }}
                                      required
                                      disabled={!selectedGender}
                                      style={{
                                        width: '100%',
                                        padding: '0.6rem 0.75rem',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        fontFamily: 'inherit',
                                        transition: 'all 0.3s',
                                        background: selectedGender ? 'white' : '#f3f4f6',
                                        cursor: selectedGender ? 'pointer' : 'not-allowed',
                                        opacity: selectedGender ? 1 : 0.6,
                                        boxSizing: 'border-box'
                                      }}
                                      onFocus={(e) => {
                                        if (selectedGender) {
                                          e.target.style.borderColor = '#dc0000';
                                          e.target.style.background = 'white';
                                          e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                                        }
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.background = selectedGender ? 'white' : '#f3f4f6';
                                        e.target.style.boxShadow = 'none';
                                      }}
                                    >
                                      <option value="">Select Age Group</option>
                                      {ageGroups.map((age, idx) => (
                                        <option key={idx} value={age}>{age}</option>
                                      ))}
                                    </select>
                                    {!selectedGender && (
                                      <div style={{ 
                                        fontSize: '0.75rem', 
                                        color: '#6b7280', 
                                        marginTop: '0.35rem',
                                        fontStyle: 'italic'
                                      }}>
                                        Select gender first
                                      </div>
                                    )}
                                  </div>
                                  
                                  {selectedAgeGroup && (
                                    <>
                                      <div>
                                        <label style={{ 
                                          display: 'block', 
                                          fontSize: '0.85rem', 
                                          fontWeight: '600', 
                                          color: '#111827',
                                          marginBottom: '0.4rem'
                                        }}>
                                          Coach Name <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="Enter coach name"
                                          value={entry.coachName || ''}
                                          onChange={(e) => {
                                            const updatedEntries = [...teamEntries];
                                            updatedEntries[i] = { ...entry, coachName: e.target.value };
                                            handleInputChange(field.id, updatedEntries);
                                          }}
                                          required
                                          style={{
                                            width: '100%',
                                            padding: '0.6rem 0.75rem',
                                            border: '2px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem',
                                            fontFamily: 'inherit',
                                            transition: 'all 0.3s',
                                            background: 'white',
                                            boxSizing: 'border-box'
                                          }}
                                          onFocus={(e) => {
                                            e.target.style.borderColor = '#dc0000';
                                            e.target.style.background = 'white';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                                          }}
                                          onBlur={(e) => {
                                            e.target.style.borderColor = '#e5e7eb';
                                            e.target.style.background = 'white';
                                            e.target.style.boxShadow = 'none';
                                          }}
                                        />
                                      </div>
                                      
                                      <div>
                                        <label style={{ 
                                          display: 'block', 
                                          fontSize: '0.85rem', 
                                          fontWeight: '600', 
                                          color: '#111827',
                                          marginBottom: '0.4rem'
                                        }}>
                                          Coach Contact <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                          type="tel"
                                          placeholder="0821234567"
                                          value={entry.coachContact || ''}
                                          onChange={(e) => {
                                            const updatedEntries = [...teamEntries];
                                            updatedEntries[i] = { ...entry, coachContact: e.target.value };
                                            handleInputChange(field.id, updatedEntries);
                                          }}
                                          required
                                          style={{
                                            width: '100%',
                                            padding: '0.6rem 0.75rem',
                                            border: '2px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem',
                                            fontFamily: 'inherit',
                                            transition: 'all 0.3s',
                                            background: 'white',
                                            boxSizing: 'border-box'
                                          }}
                                          onFocus={(e) => {
                                            e.target.style.borderColor = '#dc0000';
                                            e.target.style.background = 'white';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                                          }}
                                          onBlur={(e) => {
                                            e.target.style.borderColor = '#e5e7eb';
                                            e.target.style.background = 'white';
                                            e.target.style.boxShadow = 'none';
                                          }}
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ))}
          </div>
        ) : (
          // Regular layout for all other forms/pages
          currentFields
            .sort((a, b) => a.order - b.order)
            .map(field => (
              <div key={field.id} className={styles.fieldGroup}>
                <label className={styles.label}>
                  {field.label}
                  {field.required && <span className={styles.required}>*</span>}
                  {field.autofillFromSubmission && formData[field.id] && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#22c55e', fontWeight: '500' }}>
                      (auto-filled)
                    </span>
                  )}
                </label>

              {field.type === 'text' && (
                <>
                  {field.id === 30 ? (
                    // Sponsor Logo Upload Field
                    <div>
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start'
                      }}>
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          value={formData[field.id] || ''}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          required={field.required}
                          className={styles.input}
                        />
                        <label style={{
                          padding: '1.15rem 1.5rem',
                          background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                        >
                          📁 Upload
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  handleInputChange(field.id, reader.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      {field.helpText && (
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '1rem',
                          background: '#eff6ff',
                          border: '2px solid #bfdbfe',
                          borderRadius: '10px',
                          display: 'flex',
                          gap: '0.75rem',
                          alignItems: 'flex-start'
                        }}>
                          <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
                          <p style={{ 
                            margin: 0, 
                            fontSize: '0.9rem', 
                            color: '#1e40af',
                            lineHeight: '1.5',
                            fontWeight: '500'
                          }}>
                            {field.helpText}
                          </p>
                        </div>
                      )}
                      {formData[field.id] && (
                        <div style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          background: '#f0fdf4',
                          border: '2px solid #86efac',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem'
                        }}>
                          <img 
                            src={formData[field.id]} 
                            alt="Sponsor logo preview" 
                            style={{
                              width: '80px',
                              height: '80px',
                              objectFit: 'contain',
                              borderRadius: '8px',
                              background: 'white',
                              padding: '8px',
                              border: '2px solid #d1fae5'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <p style={{ 
                              margin: 0, 
                              fontSize: '0.95rem', 
                              color: '#166534',
                              fontWeight: '700'
                            }}>
                              ✓ Sponsor logo uploaded
                            </p>
                            <p style={{ 
                              margin: '0.25rem 0 0 0', 
                              fontSize: '0.8rem', 
                              color: '#16a34a'
                            }}>
                              Logo will appear on sleeve and/or pant leg
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleInputChange(field.id, '')}
                            style={{
                              padding: '0.75rem 1rem',
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#fecaca';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#fee2e2';
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      required={field.required}
                      readOnly={field.autofillFromSubmission && formData[field.id]}
                      className={styles.input}
                      style={field.autofillFromSubmission && formData[field.id] ? { 
                        background: '#e0f2fe', 
                        cursor: 'not-allowed',
                        border: '2px solid #0ea5e9'
                      } : {}}
                    />
                  )}
                </>
              )}

              {field.type === 'email' && (
                <input
                  type="email"
                  placeholder={field.placeholder}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  readOnly={field.autofillFromSubmission && formData[field.id]}
                  className={styles.input}
                  style={field.autofillFromSubmission && formData[field.id] ? { 
                    background: '#e0f2fe', 
                    cursor: 'not-allowed',
                    border: '2px solid #0ea5e9'
                  } : {}}
                />
              )}

              {field.type === 'password' && (
                <input
                  type="password"
                  placeholder={field.placeholder}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  className={styles.input}
                />
              )}

              {field.type === 'tel' && (
                <input
                  type="tel"
                  placeholder={field.placeholder}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  readOnly={field.autofillFromSubmission && formData[field.id]}
                  className={styles.input}
                  style={field.autofillFromSubmission && formData[field.id] ? { 
                    background: '#e0f2fe', 
                    cursor: 'not-allowed',
                    border: '2px solid #0ea5e9'
                  } : {}}
                />
              )}

              {field.type === 'number' && (
                <input
                  type="number"
                  placeholder={field.placeholder}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  readOnly={field.autofillFromSubmission && formData[field.id]}
                  className={styles.input}
                  min={field.min}
                  max={field.max}
                  style={field.autofillFromSubmission && formData[field.id] ? { 
                    background: '#e0f2fe', 
                    cursor: 'not-allowed',
                    border: '2px solid #0ea5e9'
                  } : {}}
                />
              )}

              {field.helpText && (
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {field.helpText}
                </div>
              )}

              {field.type === 'dynamic-team-entries' && (() => {
                const numberOfTeams = parseInt(formData[field.dependsOn] || 0);
                
                if (numberOfTeams > 0) {
                  // Initialize team entries if not exists
                  if (!formData[field.id]) {
                    const initialEntries = Array.from({ length: numberOfTeams }, (_, i) => ({
                      teamNumber: i + 1,
                      teamName: '',
                      ageGroup: '',
                      gender: '',
                      coachName: '',
                      coachContact: ''
                    }));
                    handleInputChange(field.id, initialEntries);
                  }

                  const teamEntries = formData[field.id] || [];

                  return (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '1.5rem',
                      marginTop: '1rem'
                    }}>
                      {Array.from({ length: numberOfTeams }, (_, i) => {
                        const entry = teamEntries[i] || { teamNumber: i + 1, teamName: '', ageGroup: '', gender: '', coachName: '', coachContact: '' };
                        const selectedGender = entry.gender || '';
                        const selectedAgeGroup = entry.ageGroup || '';
                        const ageGroups = selectedGender === 'Female' 
                          ? ['U13', 'U17']
                          : selectedGender === 'Male'
                          ? ['U9', 'U11', 'U13', 'U15', 'U17', 'Senior']
                          : [];
                        
                        return (
                          <div 
                            key={i}
                            style={{
                              padding: '1.5rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '12px',
                              background: '#f9fafb'
                            }}
                          >
                            <div style={{ 
                              fontSize: '1.1rem', 
                              fontWeight: '700', 
                              color: '#111827', 
                              marginBottom: '1.25rem',
                              paddingBottom: '0.75rem',
                              borderBottom: '2px solid #e5e7eb'
                            }}>
                              Team {i + 1}
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                              <div>
                                <label style={{ 
                                  display: 'block', 
                                  fontSize: '1rem', 
                                  fontWeight: '700', 
                                  color: '#111827',
                                  marginBottom: '0.5rem'
                                }}>
                                  Team Name <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder={`Team ${i + 1} name`}
                                  value={entry.teamName || ''}
                                  onChange={(e) => {
                                    const updatedEntries = [...teamEntries];
                                    updatedEntries[i] = { ...entry, teamName: e.target.value };
                                    handleInputChange(field.id, updatedEntries);
                                  }}
                                  required
                                  style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.3s',
                                    background: 'white',
                                    boxSizing: 'border-box'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = '#dc0000';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.boxShadow = 'none';
                                  }}
                                />
                              </div>
                              
                              <div>
                                <label style={{ 
                                  display: 'block', 
                                  fontSize: '1rem', 
                                  fontWeight: '700', 
                                  color: '#111827',
                                  marginBottom: '0.5rem'
                                }}>
                                  Gender <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <select
                                  value={entry.gender || ''}
                                  onChange={(e) => {
                                    const updatedEntries = [...teamEntries];
                                    updatedEntries[i] = { ...entry, gender: e.target.value, ageGroup: '' };
                                    handleInputChange(field.id, updatedEntries);
                                  }}
                                  required
                                  style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.3s',
                                    background: 'white',
                                    cursor: 'pointer',
                                    boxSizing: 'border-box'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = '#dc0000';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.boxShadow = 'none';
                                  }}
                                >
                                  <option value="">Select Gender</option>
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                </select>
                              </div>
                              
                              <div>
                                <label style={{ 
                                  display: 'block', 
                                  fontSize: '1rem', 
                                  fontWeight: '700', 
                                  color: '#111827',
                                  marginBottom: '0.5rem'
                                }}>
                                  Age Group <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <select
                                  value={entry.ageGroup || ''}
                                  onChange={(e) => {
                                    const updatedEntries = [...teamEntries];
                                    updatedEntries[i] = { ...entry, ageGroup: e.target.value };
                                    handleInputChange(field.id, updatedEntries);
                                  }}
                                  required
                                  disabled={!selectedGender}
                                  style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.3s',
                                    background: selectedGender ? 'white' : '#f3f4f6',
                                    cursor: selectedGender ? 'pointer' : 'not-allowed',
                                    opacity: selectedGender ? 1 : 0.6,
                                    boxSizing: 'border-box'
                                  }}
                                  onFocus={(e) => {
                                    if (selectedGender) {
                                      e.target.style.borderColor = '#dc0000';
                                      e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                                    }
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.boxShadow = 'none';
                                  }}
                                >
                                  <option value="">Select Age Group</option>
                                  {ageGroups.map((age, idx) => (
                                    <option key={idx} value={age}>{age}</option>
                                  ))}
                                </select>
                                {!selectedGender && (
                                  <div style={{ 
                                    fontSize: '0.8rem', 
                                    color: '#6b7280', 
                                    marginTop: '0.25rem',
                                    fontStyle: 'italic'
                                  }}>
                                    Select gender first
                                  </div>
                                )}
                              </div>
                              
                              {selectedAgeGroup && (
                                <>
                                  <div>
                                    <label style={{ 
                                      display: 'block', 
                                      fontSize: '1rem', 
                                      fontWeight: '700', 
                                      color: '#111827',
                                      marginBottom: '0.5rem'
                                    }}>
                                      Coach Name <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Enter coach name"
                                      value={entry.coachName || ''}
                                      onChange={(e) => {
                                        const updatedEntries = [...teamEntries];
                                        updatedEntries[i] = { ...entry, coachName: e.target.value };
                                        handleInputChange(field.id, updatedEntries);
                                      }}
                                      required
                                      style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '0.95rem',
                                        fontFamily: 'inherit',
                                        transition: 'all 0.3s',
                                        background: 'white',
                                        boxSizing: 'border-box'
                                      }}
                                      onFocus={(e) => {
                                        e.target.style.borderColor = '#dc0000';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.boxShadow = 'none';
                                      }}
                                    />
                                  </div>
                                  
                                  <div>
                                    <label style={{ 
                                      display: 'block', 
                                      fontSize: '1rem', 
                                      fontWeight: '700', 
                                      color: '#111827',
                                      marginBottom: '0.5rem'
                                    }}>
                                      Coach Contact <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                      type="tel"
                                      placeholder="0821234567"
                                      value={entry.coachContact || ''}
                                      onChange={(e) => {
                                        const updatedEntries = [...teamEntries];
                                        updatedEntries[i] = { ...entry, coachContact: e.target.value };
                                        handleInputChange(field.id, updatedEntries);
                                      }}
                                      required
                                      style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '0.95rem',
                                        fontFamily: 'inherit',
                                        transition: 'all 0.3s',
                                        background: 'white',
                                        boxSizing: 'border-box'
                                      }}
                                      onFocus={(e) => {
                                        e.target.style.borderColor = '#dc0000';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.boxShadow = 'none';
                                      }}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return null;
              })()}

              {field.type === 'date' && (
                <input
                  type="date"
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  readOnly={field.autofillFromSubmission && formData[field.id]}
                  className={styles.input}
                  style={field.autofillFromSubmission && formData[field.id] ? { 
                    background: '#e0f2fe', 
                    cursor: 'not-allowed',
                    border: '2px solid #0ea5e9'
                  } : {}}
                />
              )}

              {field.type === 'file' && (
                <div>
                  <input
                    type="file"
                    accept={field.accept || 'image/*'}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          handleInputChange(field.id, reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    required={field.required}
                    className={styles.input}
                    style={{ padding: '0.5rem' }}
                  />
                  {formData[field.id] && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <img 
                        src={formData[field.id]} 
                        alt="Preview" 
                        style={{ 
                          maxWidth: '200px', 
                          maxHeight: '200px', 
                          borderRadius: '8px',
                          border: '2px solid #e5e7eb'
                        }} 
                      />
                    </div>
                  )}
                  {field.helpText && (
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      {field.helpText}
                    </div>
                  )}
                </div>
              )}

              {field.type === 'textarea' && (
                <textarea
                  placeholder={field.placeholder}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  readOnly={field.autofillFromSubmission && formData[field.id]}
                  rows={4}
                  className={styles.textarea}
                  style={field.autofillFromSubmission && formData[field.id] ? { 
                    background: '#e0f2fe', 
                    cursor: 'not-allowed',
                    border: '2px solid #0ea5e9'
                  } : {}}
                />
              )}

              {field.type === 'radio' && (
                <div className={styles.radioGroup}>
                  {field.options.map((option, index) => (
                    <label key={index} className={styles.radioLabel}>
                      <input
                        type="radio"
                        name={`field-${field.id}`}
                        value={option}
                        checked={formData[field.id] === option}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        required={field.required}
                        className={styles.radio}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.type === 'checkbox' && (
                <div className={styles.checkboxGroup}>
                  {field.options.map((option, index) => (
                    <label key={index} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={(formData[field.id] || []).includes(option)}
                        onChange={(e) => handleCheckboxChange(field.id, option, e.target.checked)}
                        className={styles.checkbox}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.type === 'select' && (
                <select
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  disabled={field.autofillFromSubmission && formData[field.id]}
                  className={styles.select}
                  style={field.autofillFromSubmission && formData[field.id] ? { 
                    background: '#e0f2fe', 
                    cursor: 'not-allowed',
                    border: '2px solid #0ea5e9'
                  } : {}}
                >
                  <option value="">Select an option...</option>
                  {field.options.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}

              {field.type === 'checkbox-group' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {field.options?.map((option, idx) => {
                    const currentValues = formData[field.id] || [];
                    const isChecked = currentValues.includes(option.value);
                    
                    return (
                      <label key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem',
                        cursor: 'pointer',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        background: isChecked ? '#fee2e2' : '#fafafa',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newValues = e.target.checked
                              ? [...currentValues, option.value]
                              : currentValues.filter(v => v !== option.value);
                            handleInputChange(field.id, newValues);
                          }}
                          style={{
                            width: '1.25rem',
                            height: '1.25rem',
                            cursor: 'pointer',
                            accentColor: '#dc0000'
                          }}
                        />
                        <span style={{ 
                          fontSize: '0.95rem', 
                          color: '#111827',
                          fontWeight: isChecked ? '600' : '400'
                        }}>
                          {option.label}
                        </span>
                      </label>
                    );
                  })}
                  {field.helpText && (
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {field.helpText}
                    </div>
                  )}
                </div>
              )}

              {field.type === 'image-select' && (
                <div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    {field.options.map((option, index) => {
                      const isSelected = formData[field.id] === option.name;
                      const isDisabled = field.autofillFromSubmission && formData[field.id];
                      return (
                        <div 
                          key={index}
                          onClick={() => !isDisabled && handleInputChange(field.id, option.name)}
                          style={{ 
                            border: isSelected ? '3px solid #22c55e' : '2px solid #e5e7eb',
                            borderRadius: '8px', 
                            padding: '0.75rem',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            background: isDisabled ? '#e0f2fe' : (isSelected ? '#f0fdf4' : 'white'),
                            opacity: isDisabled ? 0.7 : 1,
                            position: 'relative'
                          }}
                        >
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              top: '0.5rem',
                              right: '0.5rem',
                              background: '#22c55e',
                              color: 'white',
                              borderRadius: '50%',
                              width: '28px',
                              height: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '1.2rem'
                            }}>
                              ✓
                            </div>
                          )}
                          <img 
                            src={option.imageUrl} 
                            alt={option.name}
                            style={{ 
                              width: '100%', 
                              height: '150px', 
                              objectFit: 'cover', 
                              borderRadius: '6px',
                              marginBottom: '0.5rem'
                            }}
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <p style={{ 
                            fontSize: '0.9rem', 
                            fontWeight: isSelected ? '600' : '500',
                            textAlign: 'center',
                            margin: 0,
                            color: isSelected ? '#166534' : '#374151'
                          }}>
                            {option.name}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {field.autofillFromSubmission && formData[field.id] && (
                    <p style={{ 
                      fontSize: '0.85rem', 
                      color: '#0c4a6e', 
                      margin: 0,
                      padding: '0.5rem',
                      background: '#e0f2fe',
                      borderRadius: '4px',
                      border: '1px solid #0ea5e9'
                    }}>
                      <strong>(auto-filled)</strong> This was selected by your team
                    </p>
                  )}
                </div>
              )}

              {field.type === 'image-select-library' && (
                <div>
                  {/* Only show if team is selected (for autofill fields) or always show (for non-autofill) */}
                  {(!field.autofillFromSubmission || (field.autofillLinkedDropdownFieldId && formData[field.autofillLinkedDropdownFieldId])) ? (
                    <>
                      {field.autofillFromSubmission && formData[field.id] ? (
                        /* Show team shirt preview when auto-filled */
                        <div style={{
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                          border: '3px solid #22c55e',
                          borderRadius: '16px',
                          padding: '2rem',
                          marginBottom: '1.5rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.5rem',
                            marginBottom: '1rem'
                          }}>
                            <div style={{
                              background: '#22c55e',
                              color: 'white',
                              padding: '0.5rem 1rem',
                              borderRadius: '8px',
                              fontWeight: '700',
                              fontSize: '0.85rem',
                              letterSpacing: '0.5px'
                            }}>
                              ✓ TEAM KIT LOADED
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                            <div>
                              {shirtDesigns.find(d => d.name === formData[field.id]) && (
                                <img 
                                  src={getMainImage(shirtDesigns.find(d => d.name === formData[field.id]))}
                                  alt={formData[field.id]}
                                  style={{ 
                                    width: '200px', 
                                    height: '200px', 
                                    objectFit: 'contain', 
                                    borderRadius: '12px',
                                    border: '3px solid white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    background: '#f9fafb'
                                  }}
                                />
                              )}
                            </div>
                            
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: '800', color: '#166534' }}>
                                {formData[field.id]}
                              </h4>
                              <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#15803d' }}>
                                Your team's official kit design
                              </p>
                              
                              {formData[`${field.id}_primaryColor`] && formData[`${field.id}_secondaryColor`] && (
                                <div>
                                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#166534' }}>
                                    Team Colors:
                                  </p>
                                  <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <div style={{
                                        width: '32px',
                                        height: '32px',
                                        background: formData[`${field.id}_primaryColor`].startsWith('#') 
                                          ? formData[`${field.id}_primaryColor`]
                                          : availableColors.find(c => c.name === formData[`${field.id}_primaryColor`])?.hex,
                                        borderRadius: '6px',
                                        border: '2px solid white',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                      }} />
                                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#166534' }}>
                                        {formData[`${field.id}_primaryColor`]}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <div style={{
                                        width: '32px',
                                        height: '32px',
                                        background: formData[`${field.id}_secondaryColor`].startsWith('#')
                                          ? formData[`${field.id}_secondaryColor`]
                                          : availableColors.find(c => c.name === formData[`${field.id}_secondaryColor`])?.hex,
                                        borderRadius: '6px',
                                        border: '2px solid white',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                      }} />
                                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#166534' }}>
                                        {formData[`${field.id}_secondaryColor`]}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Show shirt selection grid for non-autofill or when not yet filled */
                        <>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                            gap: '1rem',
                            marginBottom: '1rem'
                          }}>
                            {shirtDesigns.map((design) => {
                              const isSelected = formData[field.id] === design.name;
                              const isDisabled = field.autofillFromSubmission && formData[field.id];
                              const mainImage = getMainImage(design);
                              const hasMultipleImages = design.images && design.images.length > 1;
                              
                              return (
                                <div 
                                  key={design.id}
                                  style={{ 
                                    border: isSelected ? '3px solid #22c55e' : '2px solid #e5e7eb',
                                    borderRadius: '8px', 
                                    padding: '0.75rem',
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    background: isDisabled ? '#e0f2fe' : (isSelected ? '#f0fdf4' : 'white'),
                                    opacity: isDisabled ? 0.7 : 1,
                                    position: 'relative'
                                  }}
                                >
                                  {isSelected && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '0.5rem',
                                      right: '0.5rem',
                                      background: '#22c55e',
                                      color: 'white',
                                      borderRadius: '50%',
                                      width: '28px',
                                      height: '28px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 'bold',
                                      fontSize: '1.2rem',
                                      zIndex: 2
                                    }}>
                                      ✓
                                    </div>
                                  )}
                                  {hasMultipleImages && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '0.5rem',
                                      left: '0.5rem',
                                      background: 'rgba(0, 0, 0, 0.8)',
                                      color: 'white',
                                      borderRadius: '6px',
                                      padding: '0.25rem 0.5rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 'bold',
                                      zIndex: 2
                                    }}>
                                      📷 {design.images.length}
                                    </div>
                                  )}
                                  <div
                                    onClick={() => !isDisabled && handleInputChange(field.id, design.name)}
                                  >
                                    <img 
                                      src={mainImage} 
                                      alt={design.name}
                                      style={{ 
                                        width: '100%', 
                                        height: '150px', 
                                        objectFit: 'contain', 
                                        borderRadius: '6px',
                                        marginBottom: '0.5rem',
                                        background: '#f9fafb'
                                      }}
                                      onError={(e) => {
                                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                                      }}
                                    />
                                  </div>
                                  <p style={{ 
                                    fontSize: '0.9rem', 
                                    fontWeight: isSelected ? '600' : '500',
                                    textAlign: 'center',
                                    margin: '0 0 0.5rem 0',
                                    color: isSelected ? '#166534' : '#374151'
                                  }}>
                                    {design.name}
                                  </p>
                                  {hasMultipleImages && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setModalDesign(design);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      View All Images
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    /* Show message when team not selected yet */
                    <div style={{
                      padding: '2rem',
                      background: '#f9fafb',
                      border: '2px dashed #d1d5db',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👕</div>
                      <p style={{ margin: 0, color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                        Please select your team first to view the kit design
                      </p>
                    </div>
                  )}

                  {field.includeColorPickers && formData[field.id] && !field.autofillFromSubmission && (
                    <div style={{ 
                      marginTop: '2rem',
                      padding: '2rem',
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                      border: '2px solid #e5e7eb',
                      borderRadius: '16px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1.5rem'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: 'linear-gradient(135deg, #dc0000 0%, #000000 100%)',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem'
                        }}>
                          🎨
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#111827' }}>
                            Customize Your Team Colors
                          </h4>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                            Choose from primary colors or enter custom hex codes
                          </p>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '700', color: '#111827', fontSize: '1rem' }}>
                          Primary Color *
                        </label>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(4, 1fr)', 
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          {availableColors.map(color => {
                            const isSelected = formData[`${field.id}_primaryColor`] === color.name;
                            return (
                              <div
                                key={color.name}
                                onClick={() => handleInputChange(`${field.id}_primaryColor`, color.name)}
                                style={{
                                  border: isSelected ? '3px solid #dc0000' : '2px solid #e5e7eb',
                                  borderRadius: '12px',
                                  padding: '1rem',
                                  cursor: 'pointer',
                                  background: 'white',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  textAlign: 'center',
                                  position: 'relative',
                                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                  boxShadow: isSelected ? '0 8px 16px rgba(220, 0, 0, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                                  }
                                }}
                              >
                                {isSelected && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '0.5rem',
                                    right: '0.5rem',
                                    background: '#22c55e',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)'
                                  }}>
                                    ✓
                                  </div>
                                )}
                                <div
                                  style={{
                                    width: '100%',
                                    height: '70px',
                                    background: color.hex,
                                    borderRadius: '8px',
                                    marginBottom: '0.75rem',
                                    border: color.name === 'White' ? '2px solid #e5e7eb' : 'none',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                  }}
                                />
                                <p style={{ 
                                  margin: '0 0 0.25rem 0', 
                                  fontSize: '0.9rem', 
                                  fontWeight: '700',
                                  color: isSelected ? '#dc0000' : '#111827'
                                }}>
                                  {color.name}
                                </p>
                                <p style={{
                                  margin: 0,
                                  fontSize: '0.75rem',
                                  fontFamily: 'monospace',
                                  color: '#6b7280',
                                  fontWeight: '600'
                                }}>
                                  {color.hex}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ 
                          background: 'white',
                          padding: '1.25rem',
                          borderRadius: '10px',
                          border: '2px dashed #d1d5db'
                        }}>
                          <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                            💡 Or enter a custom hex code:
                          </label>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="#DC2626"
                              value={formData[`${field.id}_primaryColor`] && formData[`${field.id}_primaryColor`].startsWith('#') ? formData[`${field.id}_primaryColor`] : ''}
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                if (value === '' || value.startsWith('#')) {
                                  handleInputChange(`${field.id}_primaryColor`, value);
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: '0.75rem 1rem',
                                border: '2px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontFamily: 'monospace',
                                fontWeight: '600',
                                transition: 'all 0.3s'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#dc0000';
                                e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                            {formData[`${field.id}_primaryColor`] && formData[`${field.id}_primaryColor`].startsWith('#') && formData[`${field.id}_primaryColor`].match(/^#[0-9A-F]{6}$/i) && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: '#f9fafb',
                                borderRadius: '8px',
                                border: '2px solid #e5e7eb'
                              }}>
                                <div style={{
                                  width: '50px',
                                  height: '50px',
                                  background: formData[`${field.id}_primaryColor`],
                                  border: '2px solid #d1d5db',
                                  borderRadius: '8px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }} />
                                <div>
                                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Preview</p>
                                  <p style={{ margin: 0, fontSize: '0.8rem', fontFamily: 'monospace', color: '#111827', fontWeight: '700' }}>
                                    {formData[`${field.id}_primaryColor`]}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '700', color: '#111827', fontSize: '1rem' }}>
                          Secondary Color *
                        </label>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(4, 1fr)', 
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          {availableColors.map(color => {
                            const isSelected = formData[`${field.id}_secondaryColor`] === color.name;
                            return (
                              <div
                                key={color.name}
                                onClick={() => handleInputChange(`${field.id}_secondaryColor`, color.name)}
                                style={{
                                  border: isSelected ? '3px solid #dc0000' : '2px solid #e5e7eb',
                                  borderRadius: '12px',
                                  padding: '1rem',
                                  cursor: 'pointer',
                                  background: 'white',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  textAlign: 'center',
                                  position: 'relative',
                                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                  boxShadow: isSelected ? '0 8px 16px rgba(220, 0, 0, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                                  }
                                }}
                              >
                                {isSelected && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '0.5rem',
                                    right: '0.5rem',
                                    background: '#22c55e',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)'
                                  }}>
                                    ✓
                                  </div>
                                )}
                                <div
                                  style={{
                                    width: '100%',
                                    height: '70px',
                                    background: color.hex,
                                    borderRadius: '8px',
                                    marginBottom: '0.75rem',
                                    border: color.name === 'White' ? '2px solid #e5e7eb' : 'none',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                  }}
                                />
                                <p style={{ 
                                  margin: '0 0 0.25rem 0', 
                                  fontSize: '0.9rem', 
                                  fontWeight: '700',
                                  color: isSelected ? '#dc0000' : '#111827'
                                }}>
                                  {color.name}
                                </p>
                                <p style={{
                                  margin: 0,
                                  fontSize: '0.75rem',
                                  fontFamily: 'monospace',
                                  color: '#6b7280',
                                  fontWeight: '600'
                                }}>
                                  {color.hex}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ 
                          background: 'white',
                          padding: '1.25rem',
                          borderRadius: '10px',
                          border: '2px dashed #d1d5db'
                        }}>
                          <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                            💡 Or enter a custom hex code:
                          </label>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="#2563EB"
                              value={formData[`${field.id}_secondaryColor`] && formData[`${field.id}_secondaryColor`].startsWith('#') ? formData[`${field.id}_secondaryColor`] : ''}
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                if (value === '' || value.startsWith('#')) {
                                  handleInputChange(`${field.id}_secondaryColor`, value);
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: '0.75rem 1rem',
                                border: '2px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontFamily: 'monospace',
                                fontWeight: '600',
                                transition: 'all 0.3s'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#dc0000';
                                e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                            {formData[`${field.id}_secondaryColor`] && formData[`${field.id}_secondaryColor`].startsWith('#') && formData[`${field.id}_secondaryColor`].match(/^#[0-9A-F]{6}$/i) && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: '#f9fafb',
                                borderRadius: '8px',
                                border: '2px solid #e5e7eb'
                              }}>
                                <div style={{
                                  width: '50px',
                                  height: '50px',
                                  background: formData[`${field.id}_secondaryColor`],
                                  border: '2px solid #d1d5db',
                                  borderRadius: '8px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }} />
                                <div>
                                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Preview</p>
                                  <p style={{ margin: 0, fontSize: '0.8rem', fontFamily: 'monospace', color: '#111827', fontWeight: '700' }}>
                                    {formData[`${field.id}_secondaryColor`]}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live Kit Preview */}
                  {formData[field.id] && formData[`${field.id}_primaryColor`] && formData[`${field.id}_secondaryColor`] && (
                    <div style={{
                      marginTop: '2rem',
                      padding: '2rem',
                      background: 'linear-gradient(135deg, #000000 0%, #1f1f1f 100%)',
                      borderRadius: '16px',
                      border: '3px solid #dc0000',
                      boxShadow: '0 8px 32px rgba(220, 0, 0, 0.3)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1.5rem'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: 'linear-gradient(135deg, #dc0000 0%, #ff0000 100%)',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem'
                        }}>
                          👕
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: 'white' }}>
                            Live Kit Preview
                          </h4>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                            See your customized team kit in action
                          </p>
                        </div>
                      </div>

                      <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem'
                      }}>
                        {/* Kit Image with Color Filter */}
                        <div style={{ position: 'relative', width: '300px', height: '300px' }}>
                          {/* Base image in grayscale */}
                          <img
                            src={getMainImage(shirtDesigns.find(d => d.name === formData[field.id]))}
                            alt="Selected kit"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '12px',
                              filter: 'grayscale(100%) contrast(1.1) brightness(1.1)'
                            }}
                          />
                          {/* Color overlay - primary color */}
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            borderRadius: '12px',
                            background: `linear-gradient(135deg, ${
                              availableColors.find(c => c.name === formData[`${field.id}_primaryColor`])?.hex || formData[`${field.id}_primaryColor`]
                            } 0%, ${
                              availableColors.find(c => c.name === formData[`${field.id}_secondaryColor`])?.hex || formData[`${field.id}_secondaryColor`]
                            } 100%)`,
                            mixBlendMode: 'color',
                            opacity: 1
                          }} />
                          {/* Multiply layer for depth */}
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            borderRadius: '12px',
                            background: `linear-gradient(135deg, ${
                              availableColors.find(c => c.name === formData[`${field.id}_primaryColor`])?.hex || formData[`${field.id}_primaryColor`]
                            } 0%, ${
                              availableColors.find(c => c.name === formData[`${field.id}_secondaryColor`])?.hex || formData[`${field.id}_secondaryColor`]
                            } 100%)`,
                            mixBlendMode: 'multiply',
                            opacity: 0.4
                          }} />
                        </div>

                        {/* Color Details */}
                        <div style={{
                          width: '100%',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '1rem'
                        }}>
                          <div style={{
                            padding: '1rem',
                            background: '#f9fafb',
                            borderRadius: '10px',
                            border: '2px solid #e5e7eb'
                          }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Primary Color
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '50px',
                                height: '50px',
                                background: availableColors.find(c => c.name === formData[`${field.id}_primaryColor`])?.hex || formData[`${field.id}_primaryColor`],
                                borderRadius: '8px',
                                border: '2px solid #d1d5db',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }} />
                              <div>
                                <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#111827' }}>
                                  {formData[`${field.id}_primaryColor`].startsWith('#') ? 'Custom' : formData[`${field.id}_primaryColor`]}
                                </p>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontFamily: 'monospace', color: '#6b7280', fontWeight: '600' }}>
                                  {availableColors.find(c => c.name === formData[`${field.id}_primaryColor`])?.hex || formData[`${field.id}_primaryColor`]}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div style={{
                            padding: '1rem',
                            background: '#f9fafb',
                            borderRadius: '10px',
                            border: '2px solid #e5e7eb'
                          }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Secondary Color
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '50px',
                                height: '50px',
                                background: availableColors.find(c => c.name === formData[`${field.id}_secondaryColor`])?.hex || formData[`${field.id}_secondaryColor`],
                                borderRadius: '8px',
                                border: '2px solid #d1d5db',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }} />
                              <div>
                                <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#111827' }}>
                                  {formData[`${field.id}_secondaryColor`].startsWith('#') ? 'Custom' : formData[`${field.id}_secondaryColor`]}
                                </p>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontFamily: 'monospace', color: '#6b7280', fontWeight: '600' }}>
                                  {availableColors.find(c => c.name === formData[`${field.id}_secondaryColor`])?.hex || formData[`${field.id}_secondaryColor`]}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Kit Name */}
                        <div style={{
                          padding: '1rem 1.5rem',
                          background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
                          borderRadius: '10px',
                          border: '2px solid #e5e7eb',
                          textAlign: 'center',
                          width: '100%'
                        }}>
                          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Selected Design
                          </p>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>
                            {formData[field.id]}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {field.autofillFromSubmission && formData[field.id] && (
                    <div>
                      <p style={{ 
                        fontSize: '0.85rem', 
                        color: '#0c4a6e', 
                        margin: '0 0 1rem 0',
                        padding: '0.5rem',
                        background: '#e0f2fe',
                        borderRadius: '4px',
                        border: '1px solid #0ea5e9'
                      }}>
                        <strong>(auto-filled)</strong> This was selected by your team
                      </p>
                      {formData[`${field.id}_primaryColor`] && formData[`${field.id}_secondaryColor`] && (
                        <div style={{ 
                          padding: '1rem',
                          background: '#f0f9ff',
                          border: '2px solid #0ea5e9',
                          borderRadius: '8px'
                        }}>
                          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#0c4a6e' }}>
                            Team Colors:
                          </p>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#475569' }}>Primary</p>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                padding: '0.5rem',
                                background: 'white',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db'
                              }}>
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  background: formData[`${field.id}_primaryColor`].startsWith('#') 
                                    ? formData[`${field.id}_primaryColor`]
                                    : availableColors.find(c => c.name === formData[`${field.id}_primaryColor`])?.hex,
                                  borderRadius: '4px',
                                  border: '1px solid #d1d5db'
                                }} />
                                <span style={{ fontWeight: '600', fontFamily: formData[`${field.id}_primaryColor`].startsWith('#') ? 'monospace' : 'inherit' }}>
                                  {formData[`${field.id}_primaryColor`]}
                                </span>
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#475569' }}>Secondary</p>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                padding: '0.5rem',
                                background: 'white',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db'
                              }}>
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  background: formData[`${field.id}_secondaryColor`].startsWith('#')
                                    ? formData[`${field.id}_secondaryColor`]
                                    : availableColors.find(c => c.name === formData[`${field.id}_secondaryColor`])?.hex,
                                  borderRadius: '4px',
                                  border: '1px solid #d1d5db'
                                }} />
                                <span style={{ fontWeight: '600', fontFamily: formData[`${field.id}_secondaryColor`].startsWith('#') ? 'monospace' : 'inherit' }}>
                                  {formData[`${field.id}_secondaryColor`]}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {field.type === 'submission-dropdown' && (
                <div>
                  <select
                    value={formData[field.id] || ''}
                    onChange={(e) => handleSubmissionDropdownChange(field.id, e.target.value)}
                    required={field.required}
                    className={styles.select}
                  >
                    <option value="">Select an option...</option>
                    {submissionDropdownData[field.id]?.submissions.map((submission) => {
                      const displayFieldId = submissionDropdownData[field.id].displayFieldId;
                      const displayValue = submission.data[displayFieldId];
                      return (
                        <option key={submission.id} value={submission.id}>
                          {displayValue}
                        </option>
                      );
                    })}
                  </select>

                  {formData[field.id] && submissionDropdownData[field.id]?.prefillFields.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      {submissionDropdownData[field.id].prefillFields.map((prefillField, idx) => {
                        const value = prefilledData[`${field.id}_${prefillField.sourceFieldId}`];
                        return (
                          <div key={idx} className={styles.fieldGroup} style={{ background: '#f0f9ff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #0ea5e9' }}>
                            <label className={styles.label} style={{ color: '#0c4a6e', fontSize: '0.9rem' }}>
                              {prefillField.sourceFieldLabel} (auto-filled)
                            </label>
                            <input
                              type="text"
                              value={value || ''}
                              readOnly
                              className={styles.input}
                              style={{ background: '#e0f2fe', cursor: 'not-allowed' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {field.type === 'sub-team-selector' && (() => {
                const selectedTeamSubmissionId = formData[field.dependsOn];
                if (!selectedTeamSubmissionId) return null;

                // Find the selected team submission
                const teamDropdownField = allFields.find(f => f.type === 'submission-dropdown' && f.id === field.dependsOn);
                if (!teamDropdownField || !submissionDropdownData[teamDropdownField.id]) return null;

                const selectedSubmission = submissionDropdownData[teamDropdownField.id].submissions.find(
                  sub => sub.id === parseInt(selectedTeamSubmissionId)
                );

                if (!selectedSubmission) return null;

                // Get sub-teams from field 33
                const subTeams = selectedSubmission.data[33];
                
                // Only show if there are multiple sub-teams
                if (!subTeams || subTeams.length <= 1) return null;

                return (
                  <div>
                    <select
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      required={field.required}
                      className={styles.select}
                    >
                      <option value="">Select age group team...</option>
                      {subTeams.map((subTeam, index) => (
                        <option key={index} value={JSON.stringify(subTeam)}>
                          {subTeam.teamName} ({subTeam.gender} - {subTeam.ageGroup})
                        </option>
                      ))}
                    </select>
                    {field.helpText && (
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                        {field.helpText}
                      </div>
                    )}
                  </div>
                );
              })()}

              {field.type === 'product-bundle' && (
                <div>
                  <div style={{ 
                    padding: '2rem', 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
                    border: '3px solid #22c55e',
                    borderRadius: '20px',
                    boxShadow: '0 12px 40px rgba(34, 197, 94, 0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-50px',
                      right: '-50px',
                      width: '150px',
                      height: '150px',
                      background: 'radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, transparent 70%)',
                      borderRadius: '50%'
                    }}></div>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                      <div style={{ 
                        width: '220px', 
                        height: '220px', 
                        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '5rem',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        border: '3px solid white'
                      }}>
                        👕
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          display: 'inline-block',
                          padding: '0.5rem 1.25rem',
                          background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                          color: '#166534',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          marginBottom: '0.75rem',
                          letterSpacing: '0.5px',
                          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)',
                          border: '2px solid #86efac'
                        }}>
                          ✓ REQUIRED
                        </div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', color: '#111827' }}>
                          {field.label}
                        </h4>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#6b7280', lineHeight: '1.5' }}>
                          {field.description}
                        </p>

                        {field.colorInheritFromTeam && formData['23_primaryColor'] && formData['23_secondaryColor'] && (
                          <div style={{ 
                            padding: '0.75rem', 
                            background: '#f0f9ff', 
                            borderRadius: '6px',
                            marginBottom: '1rem',
                            border: '1px solid #bae6fd'
                          }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: '600', color: '#0c4a6e' }}>
                              🎨 Your Team Colors:
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  background: formData['23_primaryColor'].startsWith('#') 
                                    ? formData['23_primaryColor']
                                    : availableColors.find(c => c.name === formData['23_primaryColor'])?.hex,
                                  borderRadius: '4px',
                                  border: '1px solid #0ea5e9'
                                }} />
                                <span style={{ fontSize: '0.85rem', color: '#0c4a6e' }}>
                                  {formData['23_primaryColor']}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  background: formData['23_secondaryColor'].startsWith('#')
                                    ? formData['23_secondaryColor']
                                    : availableColors.find(c => c.name === formData['23_secondaryColor'])?.hex,
                                  borderRadius: '4px',
                                  border: '1px solid #0ea5e9'
                                }} />
                                <span style={{ fontSize: '0.85rem', color: '#0c4a6e' }}>
                                  {formData['23_secondaryColor']}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
                            Size *
                          </label>
                          <select
                            value={formData[`${field.id}_size`] || ''}
                            onChange={(e) => handleInputChange(`${field.id}_size`, e.target.value)}
                            required={field.required}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '1rem',
                              background: 'white',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">Choose your size...</option>
                            {field.sizeOptions.map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                          <div>
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Price
                            </p>
                            <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: '900', color: '#22c55e', letterSpacing: '-1px' }}>
                              R{field.basePrice.toFixed(2)}
                            </p>
                          </div>
                          <div style={{
                            padding: '1rem 1.75rem',
                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            color: 'white',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '1rem',
                            boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)',
                            letterSpacing: '0.5px'
                          }}>
                            ✓ INCLUDED
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {field.type === 'upsell-products' && (
                <div>
                  <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
                        {field.label}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
                        Enhance your kit with additional equipment
                      </p>
                    </div>
                    {getCartCount() > 0 && (
                      <button
                        type="button"
                        onClick={openCart}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: '#dc0000',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        🛒 View Cart ({getCartCount()})
                      </button>
                    )}
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                    gap: '1rem',
                    marginBottom: '2rem',
                    maxWidth: '100%'
                  }}>
                    {field.products.map(product => {
                      const inCart = cart.some(item => item.id === product.id);
                      
                      return (
                        <div 
                          key={product.id}
                          style={{
                            background: 'white',
                            border: inCart ? '2px solid #dc0000' : '2px solid #e5e7eb',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            transition: 'all 0.2s',
                            boxShadow: inCart ? '0 2px 8px rgba(220,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%'
                          }}
                        >
                          <div style={{ 
                            width: '100%', 
                            height: '140px', 
                            background: '#f9fafb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '3rem',
                            position: 'relative',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                            {product.id === 'training-shirt' && '👔'}
                            {product.id === 'playing-socks' && '🧦'}
                            {product.id === 'kit-bag' && '💼'}
                            {product.id === 'water-bottle' && '🍶'}
                            {inCart && (
                              <div style={{
                                position: 'absolute',
                                top: '0.5rem',
                                right: '0.5rem',
                                background: '#dc0000',
                                color: 'white',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.75rem'
                              }}>
                                ✓
                              </div>
                            )}
                          </div>
                          
                          <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <h5 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', color: '#111827', lineHeight: '1.3' }}>
                              {product.name}
                            </h5>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', lineHeight: '1.4', flex: 1 }}>
                              {product.description}
                            </p>
                            
                            <p style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>
                              R{product.price.toFixed(2)}
                            </p>

                            {product.sizeOptions.length > 0 && (
                              <div style={{ marginBottom: '0.75rem' }}>
                                <select
                                  value={formData[`upsell_${product.id}_size`] || ''}
                                  onChange={(e) => handleInputChange(`upsell_${product.id}_size`, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    background: 'white',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <option value="">Select size</option>
                                  {product.sizeOptions.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (product.sizeOptions.length > 0 && !formData[`upsell_${product.id}_size`]) {
                                  alert('Please select a size first');
                                  return;
                                }
                                addToCart(
                                  {
                                    id: product.id,
                                    name: product.name,
                                    price: product.price
                                  },
                                  formData[`upsell_${product.id}_size`] || null
                                );
                              }}
                              style={{
                                width: '100%',
                                padding: '0.6rem',
                                background: '#dc0000',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#b91c1c'}
                              onMouseLeave={(e) => e.target.style.background = '#dc0000'}
                            >
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {field.type === 'kit-pricing' && (
                <div>
                  <div style={{
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '2rem',
                    marginBottom: '1.5rem'
                  }}>
                    {/* Kit Preview Card */}
                    <div style={{
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginBottom: '1.5rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}>
                      <div style={{
                        width: '100%',
                        height: '250px',
                        background: formData[23] && shirtDesigns.find(d => d.name === formData[23])
                          ? `url(${getMainImage(shirtDesigns.find(d => d.name === formData[23]))})`
                          : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '5rem',
                        borderBottom: '2px solid #e5e7eb',
                        position: 'relative'
                      }}>
                        {!formData[23] && '👕'}
                        {formData[23] && (
                          <div style={{
                            position: 'absolute',
                            bottom: '1rem',
                            left: '1rem',
                            right: '1rem',
                            background: 'rgba(0,0,0,0.8)',
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            backdropFilter: 'blur(10px)'
                          }}>
                            <p style={{ margin: 0, color: 'white', fontWeight: '700', fontSize: '1.1rem' }}>
                              {formData[23]}
                            </p>
                            {formData['23_primaryColor'] && formData['23_secondaryColor'] && (
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '4px',
                                  background: availableColors.find(c => c.name === formData['23_primaryColor'])?.hex || formData['23_primaryColor'],
                                  border: '2px solid white'
                                }} />
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '4px',
                                  background: availableColors.find(c => c.name === formData['23_secondaryColor'])?.hex || formData['23_secondaryColor'],
                                  border: '2px solid white'
                                }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: '800', color: '#111827' }}>
                              Basic Kit Package
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280', lineHeight: '1.5' }}>
                              Includes: Playing Top, Pants, and Cap
                            </p>
                          </div>
                        </div>

                        {/* Base Price */}
                        <div style={{
                          background: '#f9fafb',
                          padding: '1rem',
                          borderRadius: '8px',
                          marginBottom: '1rem',
                          border: '2px solid #e5e7eb'
                        }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                            Base Kit Price
                          </label>
                          <div style={{
                            padding: '0.75rem',
                            background: 'white',
                            borderRadius: '8px',
                            border: '2px solid #e5e7eb'
                          }}>
                            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>
                              R{(formData[`${field.id}_basePrice`] || 150).toFixed(2)}
                            </p>
                          </div>
                          <input
                            type="hidden"
                            value={formData[`${field.id}_basePrice`] || 150}
                          />
                        </div>

                        {/* Team Markup */}
                        <div style={{
                          background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                          padding: '1.25rem',
                          borderRadius: '12px',
                          marginBottom: '1rem',
                          border: '2px solid #e5e7eb',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '1rem'
                          }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              background: 'linear-gradient(135deg, #dc0000 0%, #000000 100%)',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.2rem'
                            }}>
                              💰
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: '1rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                                Team Markup (Optional)
                              </label>
                              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                                Add your markup to earn funds for your team
                              </p>
                            </div>
                          </div>
                          <div style={{ position: 'relative' }}>
                            <span style={{
                              position: 'absolute',
                              left: '1rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '1.2rem',
                              fontWeight: '700',
                              color: '#6b7280',
                              zIndex: 1
                            }}>
                              R
                            </span>
                            <input
                              type="number"
                              value={formData[`${field.id}_markup`] || ''}
                              onChange={(e) => handleInputChange(`${field.id}_markup`, parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              style={{
                                width: '100%',
                                padding: '1rem 1rem 1rem 2.5rem',
                                border: '2px solid #e5e7eb',
                                borderRadius: '10px',
                                fontSize: '1.3rem',
                                fontWeight: '700',
                                fontFamily: 'inherit',
                                background: 'white',
                                transition: 'all 0.3s'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#dc0000';
                                e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                          </div>
                        </div>

                        {/* Final Price Display */}
                        <div style={{
                          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                          padding: '1.25rem',
                          borderRadius: '12px',
                          textAlign: 'center'
                        }}>
                          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                            Player Basic Kit Price
                          </p>
                          <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>
                            R{((formData[`${field.id}_basePrice`] || 150) + (formData[`${field.id}_markup`] || 0)).toFixed(2)}
                          </p>
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                            This is what players will pay during registration
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {field.type === 'entry-fee-pricing' && (
                <div>
                  <div style={{
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '2rem',
                    marginBottom: '1.5rem'
                  }}>
                    {/* Base Entry Fee */}
                    <div style={{
                      background: '#f9fafb',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      border: '2px solid #e5e7eb'
                    }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Base Entry Fee
                      </label>
                      <div style={{
                        padding: '0.75rem',
                        background: 'white',
                        borderRadius: '8px',
                        border: '2px solid #e5e7eb'
                      }}>
                        <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>
                          R{(formData[`${field.id}_baseFee`] || 500).toFixed(2)}
                        </p>
                      </div>
                      <input
                        type="hidden"
                        value={formData[`${field.id}_baseFee`] || 500}
                      />
                    </div>

                    {/* Final Price Display */}
                    <div style={{
                      background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                        League Entry Fee
                      </p>
                      <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>
                        R{(formData[`${field.id}_baseFee`] || 500).toFixed(2)}
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                        This is your team's entry fee
                      </p>
                    </div>

                    {/* What's Included */}
                    {entryFeeIncludedItems.length > 0 && (
                      <div style={{
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb',
                        marginTop: '1rem'
                      }}>
                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>
                          What's Included
                        </h4>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                          {entryFeeIncludedItems.map((item, index) => (
                            <div key={index} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem'
                            }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <span style={{ color: 'white', fontSize: '1.2rem', fontWeight: '900' }}>✓</span>
                              </div>
                              <span style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '500' }}>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {field.type === 'supporter-apparel' && (
                <div>
                  <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
                      Support your team with official merchandise
                    </p>
                    {getCartCount() > 0 && (
                      <button
                        type="button"
                        onClick={openCart}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: '#dc0000',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        🛒 View Cart ({getCartCount()})
                      </button>
                    )}
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                    gap: '1.25rem',
                    marginBottom: '2rem',
                    maxWidth: '100%'
                  }}>
                    {field.products.map(product => {
                      const inCart = cart.some(item => item.id === product.id);
                      
                      return (
                        <div 
                          key={product.id}
                          style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            border: inCart ? '3px solid #dc0000' : '2px solid #e5e7eb',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            transition: 'all 0.3s',
                            boxShadow: inCart ? '0 8px 24px rgba(220,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            transform: inCart ? 'translateY(-4px)' : 'none'
                          }}
                        >
                          <div style={{ 
                            width: '100%', 
                            height: '180px', 
                            background: product.imageUrl ? `url(${product.imageUrl})` : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '4rem',
                            position: 'relative',
                            borderBottom: '2px solid #e5e7eb'
                          }}>
                            {!product.imageUrl && '👕'}
                            {inCart && (
                              <div style={{
                                position: 'absolute',
                                top: '0.75rem',
                                right: '0.75rem',
                                background: '#dc0000',
                                color: 'white',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                              }}>
                                ✓
                              </div>
                            )}
                          </div>
                          
                          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#111827', lineHeight: '1.3', fontWeight: '700' }}>
                              {product.name}
                            </h5>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#6b7280', lineHeight: '1.5', flex: 1 }}>
                              {product.description}
                            </p>
                            
                            <p style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '900', color: '#111827', letterSpacing: '-0.5px' }}>
                              R{product.price.toFixed(2)}
                            </p>

                            {product.sizeOptions && product.sizeOptions.length > 0 && (
                              <div style={{ marginBottom: '0.75rem' }}>
                                <select
                                  value={formData[`supporter_${product.id}_size`] || ''}
                                  onChange={(e) => handleInputChange(`supporter_${product.id}_size`, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.65rem',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    background: 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <option value="">Select size</option>
                                  {product.sizeOptions.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (product.sizeOptions && product.sizeOptions.length > 0 && !formData[`supporter_${product.id}_size`]) {
                                  alert('Please select a size first');
                                  return;
                                }
                                addToCart(
                                  {
                                    id: product.id,
                                    name: product.name,
                                    price: product.price
                                  },
                                  formData[`supporter_${product.id}_size`] || null
                                );
                              }}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'linear-gradient(135deg, #dc0000 0%, #b91c1c 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                boxShadow: '0 2px 8px rgba(220,0,0,0.3)'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(220,0,0,0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 2px 8px rgba(220,0,0,0.3)';
                              }}
                            >
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {field.type === 'checkout-form' && (
                <div>
                  <div style={{ 
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>
                      Customer Information
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#374151' }}>
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={formData['checkout_email'] || ''}
                          onChange={(e) => handleInputChange('checkout_email', e.target.value)}
                          placeholder="your.email@example.com"
                          required
                          style={{ width: '100%', padding: '0.7rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#374151' }}>
                          Create Password *
                        </label>
                        <input
                          type="password"
                          value={formData['checkout_password'] || ''}
                          onChange={(e) => handleInputChange('checkout_password', e.target.value)}
                          placeholder="Create a password to access your order"
                          required
                          style={{ width: '100%', padding: '0.7rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#374151' }}>
                            First Name *
                          </label>
                          <input
                            type="text"
                            value={formData['checkout_firstName'] || ''}
                            onChange={(e) => handleInputChange('checkout_firstName', e.target.value)}
                            placeholder="First name"
                            required
                            style={{ width: '100%', padding: '0.7rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#374151' }}>
                            Last Name *
                          </label>
                          <input
                            type="text"
                            value={formData['checkout_lastName'] || ''}
                            onChange={(e) => handleInputChange('checkout_lastName', e.target.value)}
                            placeholder="Last name"
                            required
                            style={{ width: '100%', padding: '0.7rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#374151' }}>
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={formData['checkout_phone'] || ''}
                          onChange={(e) => handleInputChange('checkout_phone', e.target.value)}
                          placeholder="0XX XXX XXXX"
                          required
                          style={{ width: '100%', padding: '0.7rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                    padding: '1.5rem',
                    borderRadius: '12px'
                  }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>
                      Shipping Address
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#374151' }}>
                          Street Address *
                        </label>
                        <input
                          type="text"
                          value={formData['checkout_address'] || ''}
                          onChange={(e) => handleInputChange('checkout_address', e.target.value)}
                          placeholder="Enter your street address"
                          required
                          style={{ width: '100%', padding: '0.7rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#374151' }}>
                          Apartment, suite, etc.
                        </label>
                        <input
                          type="text"
                          value={formData['checkout_address2'] || ''}
                          onChange={(e) => handleInputChange('checkout_address2', e.target.value)}
                          placeholder="Optional"
                          style={{ width: '100%', padding: '0.7rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#374151' }}>
                            City *
                          </label>
                          <input
                            type="text"
                            value={formData['checkout_city'] || ''}
                            onChange={(e) => handleInputChange('checkout_city', e.target.value)}
                            placeholder="City"
                            required
                            style={{ width: '100%', padding: '0.7rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#374151' }}>
                            Province *
                          </label>
                          <input
                            type="text"
                            value={formData['checkout_province'] || ''}
                            onChange={(e) => handleInputChange('checkout_province', e.target.value)}
                            placeholder="Province"
                            required
                            style={{ width: '100%', padding: '0.7rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#374151' }}>
                            Postal Code *
                          </label>
                          <input
                            type="text"
                            value={formData['checkout_postalCode'] || ''}
                            onChange={(e) => handleInputChange('checkout_postalCode', e.target.value)}
                            placeholder="Postal code"
                            required
                            style={{ width: '100%', padding: '0.7rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#374151' }}>
                            Country *
                          </label>
                          <input
                            type="text"
                            value={formData['checkout_country'] || 'South Africa'}
                            onChange={(e) => handleInputChange('checkout_country', e.target.value)}
                            placeholder="Country"
                            required
                            style={{ width: '100%', padding: '0.7rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#374151' }}>
                          Delivery Notes
                        </label>
                        <textarea
                          value={formData['checkout_notes'] || ''}
                          onChange={(e) => handleInputChange('checkout_notes', e.target.value)}
                          placeholder="Any special delivery instructions (Optional)"
                          rows="2"
                          style={{ width: '100%', padding: '0.7rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          {isMultiPage && currentPage > 1 && (
            <button
              type="button"
              onClick={handlePrevPage}
              className={styles.submitButton}
              style={{ background: '#6b7280' }}
            >
              ← Previous
            </button>
          )}
          
          {isMultiPage && currentPage < totalPages ? (
            <button
              type="button"
              onClick={handleNextPage}
              className={styles.submitButton}
              style={{ flex: 1 }}
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className={styles.submitButton}
              style={{ flex: 1 }}
            >
              {submitting ? 'Submitting...' : 'Complete Registration'}
            </button>
          )}
        </div>
      </form>

      {/* Image Gallery Modal */}
      {modalDesign && (
        <ImageGalleryModal
          design={modalDesign}
          onSelect={(design) => {
            const field = (isMultiPage ? form.pages.flatMap(p => p.fields) : form.fields)
              .find(f => f.type === 'image-select-library');
            if (field) {
              handleInputChange(field.id, design.name);
            }
            setModalDesign(null);
          }}
          onClose={() => setModalDesign(null)}
        />
      )}
    </div>
  );
}
