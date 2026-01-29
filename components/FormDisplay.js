import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Wheel from '@uiw/react-color-wheel';
import { hsvaToHex, hexToHsva } from '@uiw/color-convert';
import styles from './FormDisplay.module.css';
import { getFormTemplateById, getFormWithProducts } from '../data/forms';
import { getShirtDesigns, availableColors, getMainImage } from '../data/shirtDesigns';
import { useCart } from '../context/CartContext';
import { getLandingPageByFormId } from '../data/landingPages';
import FormLandingPage from './FormLandingPage';
import ImageGalleryModal from './ImageGalleryModal';

const Flatpickr = dynamic(() => import('react-flatpickr'), { ssr: false });

export default function FormDisplay({ form: initialForm, onSubmitSuccess }) {
  const [form, setForm] = useState(initialForm);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [teamCredentials, setTeamCredentials] = useState(null); // Store team login credentials
  const [submissionDropdownData, setSubmissionDropdownData] = useState({});
  const [prefilledData, setPrefilledData] = useState({});
  const [shirtDesigns, setShirtDesigns] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [landingPage, setLandingPage] = useState(null);
  const [modalDesign, setModalDesign] = useState(null);
  const [activeKitPreview, setActiveKitPreview] = useState({});
  const kitColorsRef = useRef({});
  const lastScrolledKitRef = useRef(null);
  const [activeColorPicker, setActiveColorPicker] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const fieldRefs = useRef({});
  const [teamColorCombos, setTeamColorCombos] = useState([]);
  const [formBackground, setFormBackground] = useState(null);
  const [submittedFormData, setSubmittedFormData] = useState(null);
  const [backgroundTransparency, setBackgroundTransparency] = useState(false);
  const formTopRef = useRef(null);
  const [teamNameSet, setTeamNameSet] = useState(new Set());
  const [kitDesignCounts, setKitDesignCounts] = useState({});
  const [teamEmailSet, setTeamEmailSet] = useState(new Set());
  const [formAlert, setFormAlert] = useState({ open: false, message: '' });
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [dropdownSearch, setDropdownSearch] = useState({});
  const datePickerRefs = useRef({});
  const [fieldMessages, setFieldMessages] = useState({});
  const [playerRegistrationSubmissions, setPlayerRegistrationSubmissions] = useState([]);
  const [kitSizeCharts, setKitSizeCharts] = useState({ shirtChartUrl: '', pantsChartUrl: '' });
  const [additionalApparelProducts, setAdditionalApparelProducts] = useState([]);
  const [additionalApparelLoading, setAdditionalApparelLoading] = useState(false);
  const [additionalApparelDetails, setAdditionalApparelDetails] = useState({});
  const [activeApparelModal, setActiveApparelModal] = useState(null);

  const getDraftKey = (formId) => `formDraft_${formId}`;

  const slugify = (value) => (
    (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !form?.id) return;
    const draftKey = getDraftKey(form.id);
    const saved = window.localStorage.getItem(draftKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (parsed?.formData) {
        setFormData(parsed.formData);
      }
      if (parsed?.prefilledData) {
        setPrefilledData(parsed.prefilledData);
      }
      if (parsed?.currentPage) {
        setCurrentPage(parsed.currentPage);
      }
    } catch (error) {
      console.warn('Failed to restore saved form draft:', error);
    }
  }, [form?.id]);

  useEffect(() => {
    if (typeof window === 'undefined' || !form?.id) return;
    const draftKey = getDraftKey(form.id);

    const safeFormData = {};
    Object.entries(formData || {}).forEach(([key, value]) => {
      if (typeof value === 'string' && value.startsWith('data:') && value.length > 50000) {
        return;
      }
      safeFormData[key] = value;
    });

    const payload = {
      formData: safeFormData,
      prefilledData,
      currentPage
    };

    try {
      window.localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to save form draft:', error);
    }
  }, [formData, prefilledData, currentPage, form?.id]);

  const formatSubmissionValue = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') {
      if (value.trim().startsWith('{') && value.includes('teamName')) {
        try {
          const parsed = JSON.parse(value);
          if (parsed && parsed.teamName) {
            const parts = [parsed.teamName, parsed.gender, parsed.ageGroup].filter(Boolean);
            return parts.join(' · ');
          }
        } catch (error) {
          // fall through
        }
      }
      if (value.startsWith('data:')) return 'Uploaded file';
      if (value.length > 160) return `${value.slice(0, 160)}…`;
      return value;
    }
    if (Array.isArray(value)) {
      if (value.length && typeof value[0] === 'object' && value[0]?.teamName) {
        return value
          .map((item) => {
            const parts = [
              item.teamName,
              item.gender,
              item.ageGroup,
              item.coachName,
              item.coachContact
            ].filter(Boolean);
            return parts.join(' · ');
          })
          .join(' | ');
      }
      const text = value.join(', ');
      return text.length > 160 ? `${text.slice(0, 160)}…` : text;
    }
    if (typeof value === 'object') {
      const text = JSON.stringify(value);
      return text.length > 160 ? `${text.slice(0, 160)}…` : text;
    }
    return String(value);
  };

  const { cart, addToCart, removeFromCart, openCart, getCartCount } = useCart();
  const [entryFeeIncludedItems, setEntryFeeIncludedItems] = useState([]);

  // Determine if form is multi-page
  const isMultiPage = form.multiPage && form.pages && form.pages.length > 0;
  const totalPages = isMultiPage ? form.pages.length : 1;
  const currentFields = isMultiPage ? form.pages.find(p => p.pageId === currentPage)?.fields || [] : form.fields;
  const orderedFields = (() => {
    if (form.id === 1 && currentPage === 2) {
      const teamLogo = currentFields.find((f) => f.id === 22);
      const sponsorLogo = currentFields.find((f) => f.id === 30);
      const rest = currentFields
        .filter((f) => f.id !== 22 && f.id !== 30)
        .sort((a, b) => a.order - b.order);
      return [teamLogo, sponsorLogo, ...rest].filter(Boolean);
    }
    return [...currentFields].sort((a, b) => a.order - b.order);
  })();

  // Load landing page
  useEffect(() => {
    let isMounted = true;

    const loadLandingPage = async () => {
      try {
        const res = await fetch(`/api/landing-pages?formId=${form.id}&_=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        if (res.ok) {
          const page = await res.json();
          if (!isMounted) return;
          if (page && page.enabled) {
            setLandingPage(page);
            setShowLandingPage(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error loading landing page:', error);
      }

      // Fallback to local defaults if API fails
      const fallback = getLandingPageByFormId(form.id);
      if (!isMounted) return;
      if (fallback && fallback.enabled) {
        setLandingPage(fallback);
        setShowLandingPage(true);
      } else {
        setLandingPage(null);
        setShowLandingPage(false);
      }
    };

    loadLandingPage();
    return () => {
      isMounted = false;
    };
  }, [form.id]);

  useEffect(() => {
    if (!form || form.id !== 2) return;
    let isMounted = true;

    const loadAdditionalApparel = async () => {
      setAdditionalApparelLoading(true);
      try {
        const response = await fetch('/api/products?category=additional-apparel&lite=true&noImages=true', {
          cache: 'no-store'
        });
        const data = await response.json();
        if (!isMounted) return;
        if (response.ok && data?.success && Array.isArray(data.products)) {
          const filtered = data.products.filter(
            (product) => slugify(product.category) === 'additional-apparel'
          );
          setAdditionalApparelProducts(filtered);
          return;
        }
        console.error('Error loading additional apparel products:', data?.error || 'Unknown error');
      } catch (error) {
        console.error('Error loading additional apparel products:', error);
      } finally {
        if (isMounted) setAdditionalApparelLoading(false);
      }
    };

    loadAdditionalApparel();
    return () => {
      isMounted = false;
    };
  }, [form?.id]);

  // Load form background image from DB
  useEffect(() => {
    let isMounted = true;

    const loadFormBackground = async () => {
      try {
        const res = await fetch(`/api/form-background?formId=${form.id}`);
        const data = await res.json();
        if (!isMounted) return;
        if (data.success && data.background) {
          const imageUrl = typeof data.background === 'string'
            ? data.background
            : data.background.imageUrl;
          const transparencyEnabled = typeof data.background === 'object'
            ? !!data.background.transparencyEnabled
            : false;
          if (imageUrl) {
            setFormBackground(imageUrl);
          }
          setBackgroundTransparency(transparencyEnabled);
        }
      } catch (error) {
        console.error('Error loading form background:', error);
      }
    };

    loadFormBackground();
    return () => {
      isMounted = false;
    };
  }, [form.id]);

  // Apply form background to full page
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (formBackground) {
      document.body.style.backgroundImage = `url(${formBackground})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundColor = '#0b0f16';
    } else {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
    }

    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
      document.body.style.backgroundColor = '';
    };
  }, [formBackground]);

  // Load team registration banner from DB
  useEffect(() => {
    if (form.id !== 1) return;
    let isMounted = true;

    const loadBanner = async () => {
      try {
        const res = await fetch('/api/team-registration-banner');
        const data = await res.json();
        if (!isMounted) return;
        if (data.success && data.banner) {
          setForm(prev => ({
            ...prev,
            welcomeBanner: data.banner
          }));
        }
      } catch (error) {
        console.error('Error loading team banner:', error);
      }
    };

    loadBanner();
    return () => {
      isMounted = false;
    };
  }, [form.id]);

  // Load supporter products from DB
  useEffect(() => {
    if (form.id !== 2) return;
    let isMounted = true;

    const loadSupporterProducts = async () => {
      try {
        const res = await fetch('/api/supporter-products');
        const data = await res.json();
        if (!isMounted) return;
        if (data.success && Array.isArray(data.products)) {
          setForm(prev => {
            if (!prev?.pages) return prev;
            const updatedPages = prev.pages.map(page => {
              if (page.pageId !== 3) return page;
              return {
                ...page,
                fields: page.fields.map(field => {
                  if (field.type === 'supporter-apparel') {
                    return { ...field, products: data.products };
                  }
                  return field;
                })
              };
            });
            return { ...prev, pages: updatedPages };
          });
        }
      } catch (error) {
        console.error('Error loading supporter products:', error);
      }
    };

    loadSupporterProducts();
    return () => {
      isMounted = false;
    };
  }, [form.id]);

  // Load kit size charts for player registration
  useEffect(() => {
    if (form.id !== 2) return;
    let isMounted = true;

    const loadSizeCharts = async () => {
      try {
        const res = await fetch('/api/kit-size-charts');
        const data = await res.json();
        if (!isMounted) return;
        if (data?.success) {
          setKitSizeCharts({
            shirtChartUrl: data.shirtChartUrl || '',
            pantsChartUrl: data.pantsChartUrl || ''
          });
        }
      } catch (error) {
        console.error('Error loading kit size charts:', error);
      }
    };

    loadSizeCharts();
    return () => {
      isMounted = false;
    };
  }, [form.id]);

  // Load base kit price and entry fee for team registration
  useEffect(() => {
    if (form.id === 1 && typeof window !== 'undefined') {
      const loadKitBasePrice = async () => {
        try {
          const res = await fetch('/api/kit-pricing');
          const data = await res.json();
          if (data?.success && data.basePrice !== undefined && !formData['29_basePrice']) {
            const parsed = parseFloat(data.basePrice);
            if (!Number.isNaN(parsed)) {
              handleInputChange('29_basePrice', parsed);
              if (formData['29_markup'] === undefined) {
                handleInputChange('29_markup', 0);
              }
              return;
            }
          }
        } catch (error) {
          console.error('Error loading kit base price:', error);
        }
      };

      loadKitBasePrice();

      const loadEntryFeeSettings = async () => {
        try {
          const res = await fetch('/api/entry-fee-settings');
          const data = await res.json();
          if (data?.success) {
            if (data.baseFee !== undefined && !formData['31_baseFee']) {
              const parsedFee = parseFloat(data.baseFee);
              if (!Number.isNaN(parsedFee)) {
                handleInputChange('31_baseFee', parsedFee);
                if (formData['31_adjustment'] === undefined) {
                  handleInputChange('31_adjustment', 0);
                }
              }
            }
            if (Array.isArray(data.includedItems)) {
              setEntryFeeIncludedItems(data.includedItems);
            }
          }
        } catch (error) {
          console.error('Error loading entry fee settings:', error);
        }
      };

      loadEntryFeeSettings();
    }
  }, [form.id, currentPage, formData]);

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
      // Load submission dropdown data via API
      const loadSubmissionDropdowns = async () => {
        const dropdownData = {};
        for (const field of submissionFields) {
          if (field.sourceFormId) {
            const sourceForm = getFormTemplateById(field.sourceFormId);
            try {
              const response = await fetch(`/api/submissions?formId=${field.sourceFormId}`);
              if (response.ok) {
                const data = await response.json();
                dropdownData[field.id] = {
                  sourceForm,
                  submissions: data.submissions || [],
                  displayFieldId: field.displayFieldId,
                  prefillFields: field.prefillFields || []
                };
              } else {
                dropdownData[field.id] = {
                  sourceForm,
                  submissions: [],
                  displayFieldId: field.displayFieldId,
                  prefillFields: field.prefillFields || []
                };
              }
            } catch (error) {
              console.error('Error loading submissions for dropdown:', error);
              dropdownData[field.id] = {
                sourceForm,
                submissions: [],
                displayFieldId: field.displayFieldId,
                prefillFields: field.prefillFields || []
              };
            }
          }
        }
        setSubmissionDropdownData(dropdownData);
      };
      loadSubmissionDropdowns();
    }

    // Load shirt designs for any image-select-library fields via API
    const hasShirtLibraryField = allFields.some(f => f.type === 'image-select-library');
    if (hasShirtLibraryField) {
      const loadShirtDesigns = async () => {
        try {
          const response = await fetch('/api/shirt-designs');
          if (response.ok) {
            const data = await response.json();
            // Filter to only active designs
            const activeDesigns = (data.designs || []).filter(d => d.active);
            setShirtDesigns(activeDesigns);
          } else {
            // Fallback to local data if API fails
            setShirtDesigns(getShirtDesigns(true));
          }
        } catch (error) {
          console.error('Error loading shirt designs:', error);
          setShirtDesigns(getShirtDesigns(true));
        }
      };
      loadShirtDesigns();
    }
  }, [initialForm, isMultiPage]);

  // Load team color combos for duplicate checking
  useEffect(() => {
    const loadTeamColorCombos = async () => {
      try {
        if (!form || form.id !== 1) return;
        
        const allFields = isMultiPage 
          ? form.pages.flatMap(p => p.fields)
          : form.fields;
        const colorField = allFields.find(
          (field) => field.type === 'image-select-library' && field.includeColorPickers
        );
        if (!colorField) return;

        const response = await fetch('/api/submissions?formId=1');
        const data = await response.json();
        if (!data?.submissions) return;

        const submissions = data.submissions || [];
        const combos = submissions
          .map((submission) => {
            const d = submission.data || {};
            return {
              primary: d[`${colorField.id}_primaryColor`] || '',
              secondary: d[`${colorField.id}_secondaryColor`] || '',
              trim: d[`${colorField.id}_trimColor`] || ''
            };
          })
          .filter((combo) => combo.primary && combo.secondary && combo.trim)
          .map((combo) => ({
            primary: combo.primary.toUpperCase(),
            secondary: combo.secondary.toUpperCase(),
            trim: combo.trim.toUpperCase()
          }));

        setTeamColorCombos(combos);

        const names = new Set(
          submissions
            .map((submission) => (submission.data || {})[1])
            .filter(Boolean)
            .map((name) => String(name).trim().toLowerCase())
        );
        setTeamNameSet(names);

        const emails = new Set(
          submissions
            .map((submission) => (submission.data || {})[3])
            .filter(Boolean)
            .map((email) => String(email).trim().toLowerCase())
        );
        setTeamEmailSet(emails);

        const designField = allFields.find(
          (field) => field.type === 'image-select-library'
        );
        if (designField) {
          const counts = submissions.reduce((acc, submission) => {
            const design = (submission.data || {})[designField.id];
            if (design) {
              acc[design] = (acc[design] || 0) + 1;
            }
            return acc;
          }, {});
          setKitDesignCounts(counts);
        }
      } catch (error) {
        console.error('Error loading team color combos:', error);
      }
    };

    loadTeamColorCombos();
  }, [form, isMultiPage]);

  useEffect(() => {
    if (!form || form.id !== 2) return;
    let isMounted = true;

    const loadPlayerRegistrations = async () => {
      try {
        const response = await fetch('/api/submissions?formId=2');
        if (!response.ok) return;
        const data = await response.json();
        if (isMounted) {
          setPlayerRegistrationSubmissions(data.submissions || []);
        }
      } catch (error) {
        console.error('Error loading player registrations:', error);
      }
    };

    loadPlayerRegistrations();
    return () => {
      isMounted = false;
    };
  }, [form]);

  // Set default color values for image-select-library fields with color pickers
  useEffect(() => {
    const allFields = isMultiPage 
      ? form.pages.flatMap(p => p.fields)
      : form.fields;
    
    const colorDefaults = {};
    allFields.forEach(field => {
      if (field.type === 'image-select-library' && field.includeColorPickers && !field.autofillFromSubmission) {
        // Set defaults if not already set
        if (formData[field.id] && !formData[`${field.id}_primaryColor`]) {
          colorDefaults[`${field.id}_primaryColor`] = '#DC2626';
        }
        if (formData[field.id] && !formData[`${field.id}_secondaryColor`]) {
          colorDefaults[`${field.id}_secondaryColor`] = '#2563EB';
        }
        if (formData[field.id] && !formData[`${field.id}_trimColor`]) {
          colorDefaults[`${field.id}_trimColor`] = '#2563EB';
        }
      }
    });
    
    if (Object.keys(colorDefaults).length > 0) {
      setFormData(prev => ({ ...prev, ...colorDefaults }));
    }
  }, [form, isMultiPage, formData]);

  // Auto-add basic kit to cart when reaching page 3
  useEffect(() => {
    if (currentPage === 3 && form.id === 2) {
      const allFields = isMultiPage 
        ? form.pages.flatMap(p => p.fields)
        : form.fields;
      
      const basicKitField = allFields.find(f => f.type === 'product-bundle');
      if (!basicKitField) return;

      const selectedSizeLabel = getBasicKitSizeLabel(basicKitField);
      const existingKitItems = cart.filter(item => item.id === 'basic-kit');

      if (!selectedSizeLabel) {
        existingKitItems.forEach(item => removeFromCart(item.id, item.selectedSize));
        return;
      }

      const teamPricing = getSelectedTeamKitPricing(basicKitField);
      const existingMatch = existingKitItems.find(item => item.selectedSize === selectedSizeLabel);
      const priceChanged = existingMatch && Number(existingMatch.price) !== Number(teamPricing.finalPrice);

      if (!existingMatch || priceChanged) {
        existingKitItems.forEach(item => removeFromCart(item.id, item.selectedSize));
        addToCart({
          id: 'basic-kit',
          name: basicKitField.label,
          price: teamPricing.finalPrice,
          description: basicKitField.description
        }, selectedSizeLabel);
      }
    }
  }, [currentPage, form, isMultiPage, cart, addToCart, removeFromCart, formData, submissionDropdownData]);

  const handleInputChange = (fieldId, value) => {
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

  const formatUploadSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

  const handleImageFileUpload = (file, fieldId, label = 'Image') => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setFormAlert({
        open: true,
        message: `${label} is too large. Max size is ${formatUploadSize(MAX_UPLOAD_BYTES)}.`
      });
      setValidationErrors(prev => ({ ...prev, [fieldId]: true }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      handleInputChange(fieldId, reader.result);
    };
    reader.readAsDataURL(file);
  };

  const isWhiteColor = (value) => {
    if (!value) return false;
    const normalized = value.toUpperCase();
    return normalized === '#FFFFFF' || normalized === '#FFF';
  };

  const isDuplicateTeamColors = (candidate) => {
    if (!candidate.primary || !candidate.secondary || !candidate.trim) return false;
    return teamColorCombos.some((combo) =>
      combo.primary === candidate.primary &&
      combo.secondary === candidate.secondary &&
      combo.trim === candidate.trim
    );
  };

  const normalizeSubTeamValue = (value) => {
    if (!value) return '';
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return `${parsed.teamName || ''}|${parsed.gender || ''}|${parsed.ageGroup || ''}`;
      } catch (error) {
        return value;
      }
    }
    if (typeof value === 'object') {
      return `${value.teamName || ''}|${value.gender || ''}|${value.ageGroup || ''}`;
    }
    return String(value);
  };

  const getSelectedTeamKitPricing = (basicKitField) => {
    const fallbackBase = basicKitField?.basePrice ?? 150;
    const allFields = isMultiPage ? form.pages.flatMap(p => p.fields) : form.fields;
    const teamDropdownField = allFields.find(f => f.type === 'submission-dropdown' && f.sourceFormId === 1);
    if (!teamDropdownField) {
      return { basePrice: fallbackBase, markup: 0, finalPrice: fallbackBase };
    }
    const selectedTeamId = formData[teamDropdownField.id];
    const submissions = submissionDropdownData[teamDropdownField.id]?.submissions || [];
    const selectedSubmission = submissions.find(sub => String(sub.id) === String(selectedTeamId));
    const baseRaw = selectedSubmission?.data?.['29_basePrice'];
    const markupRaw = selectedSubmission?.data?.['29_markup'];
    const basePrice = Number.isFinite(parseFloat(baseRaw)) ? parseFloat(baseRaw) : fallbackBase;
    const markup = Number.isFinite(parseFloat(markupRaw)) ? parseFloat(markupRaw) : 0;
    return {
      basePrice,
      markup,
      finalPrice: basePrice + markup
    };
  };

  const getBasicKitSizeLabel = (basicKitField) => {
    if (!basicKitField) return null;
    const shirt = formData[`${basicKitField.id}_shirtSize`];
    const pants = formData[`${basicKitField.id}_pantsSize`];
    if (!shirt || !pants) return null;
    return `Shirt: ${shirt} / Pants: ${pants}`;
  };

  const getSelectedKitDesign = () => {
    if (!form || form.id !== 2) return null;
    const rawValue = formData[24] || '';
    const allFields = isMultiPage ? form.pages.flatMap(p => p.fields) : form.fields;
    const teamDropdownField = allFields.find(f => f.type === 'submission-dropdown' && f.sourceFormId === 1);
    const selectedTeamId = teamDropdownField ? formData[teamDropdownField.id] : null;
    const submissions = teamDropdownField ? (submissionDropdownData[teamDropdownField.id]?.submissions || []) : [];
    const selectedSubmission = selectedTeamId
      ? submissions.find(sub => String(sub.id) === String(selectedTeamId))
      : null;
    const submissionData = selectedSubmission?.data || {};
    const submissionKitValue =
      submissionData['select team kit design-design'] ??
      submissionData['select team kit design'] ??
      submissionData['team kit design'] ??
      submissionData[23] ??
      submissionData['23'] ??
      '';
    const resolvedValue = rawValue || submissionKitValue || '';
    if (!resolvedValue) return null;
    const numericValue = Number(resolvedValue);
    const byId = Number.isFinite(numericValue) && numericValue > 0
      ? shirtDesigns.find(d => Number(d.id) === numericValue)
      : null;
    const byName = shirtDesigns.find(d => d.name === resolvedValue);
    const design = byId || byName || null;
    return {
      name: design?.name || resolvedValue,
      id: design?.id
    };
  };

  const isShirtNumberField = (field) => (
    form?.id === 2
    && currentPage === 3
    && field?.id === 36
  );

  const isKitPreviewField = (field) => (
    form?.id === 2
    && currentPage === 3
    && field?.type === 'image-select-library'
    && field?.id === 24
  );

  const renderAdditionalApparelSection = () => {
    const selectedDesign = getSelectedKitDesign();
    const matchedProducts = additionalApparelProducts.filter(product => matchesKitDesign(product, selectedDesign));

    return (
      <div style={{ marginTop: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.2rem' }}>Additional Apparel</h4>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: '#6b7280' }}>
              Optional add-ons linked to your team kit design.
            </p>
          </div>
          {getCartCount() > 0 && (
            <button
              type="button"
              onClick={openCart}
              style={{
                padding: '0.6rem 1.2rem',
                background: '#dc0000',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
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

        {!selectedDesign && (
          <div style={{
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px dashed #cbd5f5',
            color: '#64748b'
          }}>
            Select your team to view additional apparel options.
          </div>
        )}

        {selectedDesign && additionalApparelLoading && (
          <div style={{ color: '#6b7280' }}>Loading additional apparel...</div>
        )}

        {selectedDesign && !additionalApparelLoading && matchedProducts.length === 0 && (
          <div style={{
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px dashed #cbd5f5',
            color: '#64748b'
          }}>
            No additional apparel is available for this kit design yet.
          </div>
        )}

        {selectedDesign && matchedProducts.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '1rem'
          }}>
            {matchedProducts.map(product => {
              const sizes = Array.isArray(product.sizes) ? product.sizes : [];
              const selectedSize = formData[`addon_${product.id}_size`] || '';
              const inCart = cart.some(item => item.id === product.id && item.selectedSize === (sizes.length ? selectedSize : null));
              const detailRecord = additionalApparelDetails[product.id];
              const imageUrl = (detailRecord?.images && detailRecord.images.length > 0)
                ? detailRecord.images[0]
                : (product.images && product.images.length > 0 ? product.images[0] : (product.image || '/images/placeholder.svg'));

              return (
                <div
                  key={product.id}
                  style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #111827 100%)',
                    border: inCart ? '2px solid #dc0000' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: inCart ? '0 12px 28px rgba(220, 0, 0, 0.25)' : '0 10px 26px rgba(15, 23, 42, 0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease'
                  }}
                  onClick={async () => {
                    try {
                      if (!additionalApparelDetails[product.id]) {
                        const response = await fetch(`/api/products?id=${product.id}`);
                        const data = await response.json();
                        if (response.ok && data?.success && data.product) {
                          setAdditionalApparelDetails(prev => ({
                            ...prev,
                            [product.id]: data.product
                          }));
                          setActiveApparelModal(data.product);
                          return;
                        }
                      }
                      setActiveApparelModal(additionalApparelDetails[product.id] || product);
                    } catch (error) {
                      console.error('Error loading product details:', error);
                      setActiveApparelModal(additionalApparelDetails[product.id] || product);
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = inCart
                      ? '0 18px 32px rgba(220, 0, 0, 0.35)'
                      : '0 18px 34px rgba(220, 0, 0, 0.25)';
                    e.currentTarget.style.border = '1px solid rgba(220, 38, 38, 0.65)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = inCart
                      ? '0 12px 28px rgba(220, 0, 0, 0.25)'
                      : '0 10px 26px rgba(15, 23, 42, 0.6)';
                    e.currentTarget.style.border = inCart ? '2px solid #dc0000' : '1px solid rgba(255, 255, 255, 0.08)';
                  }}
                >
                  <div style={{
                    width: '100%',
                    height: '200px',
                    background: '#0b1220',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <img
                      src={imageUrl}
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div>
                      <h5 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: '700' }}>{product.name}</h5>
                      <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600' }}>
                        Tap to view details
                      </div>
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#f8fafc' }}>
                      R{Number(product.price || 0).toFixed(2)}
                    </div>

                    {sizes.length > 0 && (
                      <select
                        value={selectedSize}
                        onChange={(e) => handleInputChange(`addon_${product.id}_size`, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: '#0f172a',
                          color: '#f8fafc',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="">Select size</option>
                        {sizes.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (sizes.length > 0 && !selectedSize) {
                          setFormAlert({ open: true, message: 'Please select a size first.' });
                          return;
                        }

                        if (inCart) {
                          removeFromCart(product.id, sizes.length ? selectedSize : null);
                          return;
                        }

                        addToCart({
                          id: product.id,
                          name: product.name,
                          price: Number(product.price || 0),
                          description: product.description,
                          image: imageUrl,
                          category: product.category
                        }, sizes.length ? selectedSize : null);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        padding: '0.6rem 0.9rem',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: inCart ? '#1f2937' : '#dc0000',
                        color: 'white',
                        boxShadow: inCart ? 'none' : '0 8px 18px rgba(220, 0, 0, 0.35)'
                      }}
                    >
                      {inCart ? 'Remove from Cart' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeApparelModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: '1.5rem'
            }}
            onClick={() => setActiveApparelModal(null)}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #111827 100%)',
                borderRadius: '18px',
                width: '100%',
                maxWidth: '720px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.2rem' }}>{activeApparelModal.name}</h3>
                  <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                    R{Number(activeApparelModal.price || 0).toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveApparelModal(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#f8fafc',
                    borderRadius: '8px',
                    padding: '0.35rem 0.65rem',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', padding: '0 1.25rem 1.25rem' }}>
                {(activeApparelModal.images && activeApparelModal.images.length > 0
                  ? activeApparelModal.images.slice(0, 2)
                  : [activeApparelModal.image || '/images/placeholder.svg']
                ).map((img, idx) => (
                  <div key={`${activeApparelModal.id}-${idx}`} style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: '#0b1220'
                  }}>
                    <img src={img} alt={`${activeApparelModal.name} ${idx + 1}`} style={{ width: '100%', height: '240px', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
              {activeApparelModal.description && (
                <div style={{ padding: '0 1.25rem 1.25rem', color: '#cbd5f5', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {activeApparelModal.description}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const matchesKitDesign = (product, design) => {
    if (!design) return false;
    const productDesignId = product.designId ?? product.kitDesignId ?? product.designID;
    if (productDesignId && design.id) {
      return String(productDesignId) === String(design.id);
    }
    if (product.designName && design.name) {
      return String(product.designName) === String(design.name);
    }
    if (design.name) {
      const kitMatch = String(design.name).match(/kit\s*(\d+)/i);
      if (kitMatch) {
        const kitNumber = kitMatch[1];
        const productName = String(product.name || '');
        if (productName.toLowerCase().includes(`kit ${kitNumber}`.toLowerCase())) {
          return true;
        }
      }
    }
    return false;
  };

  useEffect(() => {
    if (!form || form.id !== 2) return;

    const jerseyValue = formData[36];
    const jerseyString = jerseyValue === undefined || jerseyValue === null ? '' : String(jerseyValue).trim();
    const teamSelection = formData[8];
    const subTeamSelection = formData[34];

    if (!jerseyString) {
      setFieldMessages(prev => {
        const next = { ...prev };
        delete next[36];
        return next;
      });
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[36];
        return next;
      });
      return;
    }

    if (!/^\d{1,2}$/.test(jerseyString)) {
      setFieldMessages(prev => ({
        ...prev,
        [36]: 'Only a 1–2 digit shirt number can be used.'
      }));
      setValidationErrors(prev => ({ ...prev, [36]: true }));
      return;
    }

    const targetSubTeamKey = normalizeSubTeamValue(subTeamSelection);
    if (teamSelection && targetSubTeamKey) {
      const duplicate = playerRegistrationSubmissions.some((submission) => {
        const data = submission.data || {};
        const submissionTeam = data[8] ?? data['8'];
        const submissionSubTeam = data[34] ?? data['34'];
        const submissionJersey = data[36] ?? data['36'];
        if (String(submissionTeam) !== String(teamSelection)) return false;
        const submissionSubTeamKey = normalizeSubTeamValue(submissionSubTeam);
        if (submissionSubTeamKey !== targetSubTeamKey) return false;
        return String(submissionJersey) === jerseyString;
      });

      if (duplicate) {
        setFieldMessages(prev => ({
          ...prev,
          [36]: 'This shirt number is already taken for the selected age group team. Please choose another.'
        }));
        setValidationErrors(prev => ({ ...prev, [36]: true }));
        return;
      }
    }

    setFieldMessages(prev => {
      const next = { ...prev };
      delete next[36];
      return next;
    });
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[36];
      return next;
    });
  }, [form, formData[36], formData[8], formData[34], playerRegistrationSubmissions]);

  const compressImageDataUrl = (dataUrl, options = {}) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return Promise.resolve(dataUrl);
    }

    const { maxWidth = 1600, maxHeight = 1600, quality = 0.7 } = options;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        const targetWidth = Math.max(1, Math.round(width * scale));
        const targetHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleColorChange = (fieldId, colorKey, value) => {
    if (value && value.startsWith('#') && value.length >= 4 && isWhiteColor(value)) {
      setFormAlert({ open: true, message: 'White is not allowed as a color option.' });
      return;
    }

    const candidate = {
      primary: (colorKey === 'primary' ? value : formData[`${fieldId}_primaryColor`]) || '',
      secondary: (colorKey === 'secondary' ? value : formData[`${fieldId}_secondaryColor`]) || '',
      trim: (colorKey === 'trim' ? value : formData[`${fieldId}_trimColor`]) || ''
    };

    const normalizedCandidate = {
      primary: candidate.primary.toUpperCase(),
      secondary: candidate.secondary.toUpperCase(),
      trim: candidate.trim.toUpperCase()
    };

    if (form?.id === 1 && isDuplicateTeamColors(normalizedCandidate)) {
      setFormAlert({ open: true, message: 'This color combination is already in use. Please choose a unique set of team colors.' });
      return;
    }

    handleInputChange(`${fieldId}_${colorKey}Color`, value);
  };

  const getColorPickerFields = () => {
    if (!form) return [];
    const allFields = isMultiPage
      ? form.pages.flatMap(p => p.fields)
      : form.fields;
    return allFields.filter(
      (field) => field.type === 'image-select-library' && field.includeColorPickers && !field.autofillFromSubmission
    );
  };

  const markMissingFields = (missingFields) => {
    const nextErrors = {};
    missingFields.forEach(field => {
      nextErrors[field.id] = true;
    });
    setValidationErrors(nextErrors);
  };

  const focusMissingField = (field) => {
    const scrollToField = () => {
      const node = fieldRefs.current[field.id];
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    if (isMultiPage) {
      const targetPage = form.pages.find(page => page.fields.some(f => f.id === field.id));
      if (targetPage && targetPage.pageId !== currentPage) {
        setCurrentPage(targetPage.pageId);
        setTimeout(scrollToField, 200);
        return;
      }
    }

    scrollToField();
  };

  const scrollToKitColors = (fieldId) => {
    const node = kitColorsRef.current[fieldId];
    if (node) {
      const offset = 140;
      requestAnimationFrame(() => {
        const y = node.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
    }
  };

  useEffect(() => {
    if (formData[23] && lastScrolledKitRef.current !== formData[23]) {
      lastScrolledKitRef.current = formData[23];
      scrollToKitColors(23);
    }
  }, [formData[23]]);

  const handleSubmissionDropdownChange = (fieldId, submissionId) => {
    // Update the dropdown value
    handleInputChange(fieldId, submissionId);

    // Get the selected submission data and prefill fields
    const dropdownInfo = submissionDropdownData[fieldId];
    if (dropdownInfo && submissionId) {
      const selectedSubmission = dropdownInfo.submissions.find(
        s => String(s.id) === String(submissionId)
      );
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
        const allFields = isMultiPage
          ? form.pages.flatMap(page => page.fields || [])
          : form.fields;
        allFields.forEach(field => {
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
      const allFields = isMultiPage
        ? form.pages.flatMap(page => page.fields || [])
        : form.fields;
      allFields.forEach(field => {
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
          if (form.id === 2) {
            return !formData[`${field.id}_shirtSize`] || !formData[`${field.id}_pantsSize`];
          }
          return !formData[`${field.id}_size`];
        }
        
        // Checkout form requires all checkout fields
        if (field.type === 'checkout-form') {
          const requiredCheckoutFields = ['checkout_email', 'checkout_password', 'checkout_firstName', 'checkout_lastName', 'checkout_phone', 'checkout_address', 'checkout_city', 'checkout_province', 'checkout_postalCode', 'checkout_country'];
          return requiredCheckoutFields.some(fieldName => !formData[fieldName]);
        }
        
        // Kit pricing - only requires base price if field is required (markup is optional)
        if (field.type === 'kit-pricing') {
          // Base price is auto-loaded from the database, so it's always present
          return false; // Never mark as missing - the base price is set by admin
        }
        
        // Entry fee pricing - no validation needed (fixed fee, no user input)
        if (field.type === 'entry-fee-pricing') {
          return false; // Never mark as missing - it's a display-only field
        }
        
        // Dynamic team entries validation
        if (field.type === 'dynamic-team-entries') {
          const numberOfTeams = parseInt(formData[field.dependsOn] || 0);
          const teamEntries = formData[field.id] || [];
          
          if (numberOfTeams === 0) return true; // Must have at least 1 team
          if (teamEntries.length === 0) return true;
          
          // Check all teams have required fields
          for (let i = 0; i < numberOfTeams; i++) {
            const entry = teamEntries[i];
            if (!entry || !entry.teamName || !entry.gender || !entry.ageGroup || !entry.coachName || !entry.coachContact) {
              return true;
            }
          }
          return false;
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
      markMissingFields(missingFields);
      focusMissingField(missingFields[0]);
      return;
    }

    if (form.id === 1 && currentPage === 1) {
      const teamName = String(formData[1] || '').trim();
      if (teamName && teamNameSet.has(teamName.toLowerCase())) {
        setFormAlert({ open: true, message: 'This team name is already registered. Please choose a unique team name.' });
        const teamField = currentFields.find((field) => field.id === 1);
        if (teamField) {
          focusMissingField(teamField);
        }
        return;
      }

      const teamEmail = String(formData[3] || '').trim();
      if (teamEmail && teamEmailSet.has(teamEmail.toLowerCase())) {
        setFormAlert({ open: true, message: 'This email is already registered. Please use a different team email.' });
        const emailField = currentFields.find((field) => field.id === 3);
        if (emailField) {
          focusMissingField(emailField);
        }
        return;
      }
    }

    const colorFields = getColorPickerFields();
    for (const field of colorFields) {
      if (!formData[field.id]) continue;

      const primary = formData[`${field.id}_primaryColor`] || '';
      const secondary = formData[`${field.id}_secondaryColor`] || '';
      const trim = formData[`${field.id}_trimColor`] || '';

      if (isWhiteColor(primary) || isWhiteColor(secondary) || isWhiteColor(trim)) {
        setFormAlert({ open: true, message: 'White is not allowed as a color option.' });
        focusMissingField(field);
        return;
      }

      const candidate = {
        primary: primary.toUpperCase(),
        secondary: secondary.toUpperCase(),
        trim: trim.toUpperCase()
      };

      if (form.id === 1 && isDuplicateTeamColors(candidate)) {
        setFormAlert({ open: true, message: 'This color combination is already in use. Please choose a unique set of team colors.' });
        focusMissingField(field);
        return;
      }
    }

    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  useEffect(() => {
    if (!formTopRef.current) return;
    requestAnimationFrame(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [currentPage]);

  useEffect(() => {
    if (!submitted) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [submitted]);

  const handleStepClick = (pageId) => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth > 768) return;
    if (!isMultiPage) return;

    const scrollToFirstField = () => {
      const targetPage = form.pages?.find(page => page.pageId === pageId);
      const sortedFields = targetPage?.fields
        ? [...targetPage.fields].sort((a, b) => a.order - b.order)
        : [];
      const firstField = sortedFields[0];
      const targetNode = firstField ? fieldRefs.current[firstField.id] : formTopRef.current;

      if (targetNode) {
        const offset = 120;
        const y = targetNode.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    };

    setCurrentPage(pageId);
    setTimeout(scrollToFirstField, 200);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      if (!showLandingPage && currentPage === 1 && landingPage?.enabled) {
        setShowLandingPage(true);
        window.history.pushState({ view: 'landing' }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showLandingPage, currentPage, landingPage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (fieldMessages[36]) {
      setSubmitting(false);
      const allFields = isMultiPage
        ? form.pages.flatMap(p => p.fields)
        : form.fields;
      const jerseyField = allFields.find((field) => field.id === 36);
      if (jerseyField) {
        focusMissingField(jerseyField);
      }
      return;
    }

    // Validate all required fields across all pages
    const allFields = isMultiPage 
      ? form.pages.flatMap(p => p.fields)
      : form.fields;

    const missingFields = allFields
      .filter(field => field.required)
      .filter(field => {
        // Product bundle only needs size selection
        if (field.type === 'product-bundle') {
          if (form.id === 2) {
            return !formData[`${field.id}_shirtSize`] || !formData[`${field.id}_pantsSize`];
          }
          return !formData[`${field.id}_size`];
        }
        
        // Kit pricing and entry fee pricing - skip validation (these are display/config fields)
        if (field.type === 'kit-pricing' || field.type === 'entry-fee-pricing') {
          return false; // Never mark as missing
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
      markMissingFields(missingFields);
      focusMissingField(missingFields[0]);
      setSubmitting(false);
      return;
    }

    if (form.id === 1) {
      const teamName = String(formData[1] || '').trim();
      if (teamName && teamNameSet.has(teamName.toLowerCase())) {
        setFormAlert({ open: true, message: 'This team name is already registered. Please choose a unique team name.' });
        const teamField = allFields.find((field) => field.id === 1);
        if (teamField) {
          focusMissingField(teamField);
        }
        setSubmitting(false);
        return;
      }

      const teamEmail = String(formData[3] || '').trim();
      if (teamEmail && teamEmailSet.has(teamEmail.toLowerCase())) {
        setFormAlert({ open: true, message: 'This email is already registered. Please use a different team email.' });
        const emailField = allFields.find((field) => field.id === 3);
        if (emailField) {
          focusMissingField(emailField);
        }
        setSubmitting(false);
        return;
      }
    }

    const colorFields = getColorPickerFields();
    for (const field of colorFields) {
      if (!formData[field.id]) continue;

      const primary = formData[`${field.id}_primaryColor`] || '';
      const secondary = formData[`${field.id}_secondaryColor`] || '';
      const trim = formData[`${field.id}_trimColor`] || '';

      if (isWhiteColor(primary) || isWhiteColor(secondary) || isWhiteColor(trim)) {
        setFormAlert({ open: true, message: 'White is not allowed as a color option.' });
        focusMissingField(field);
        setSubmitting(false);
        return;
      }

      const candidate = {
        primary: primary.toUpperCase(),
        secondary: secondary.toUpperCase(),
        trim: trim.toUpperCase()
      };

      if (form.id === 1 && isDuplicateTeamColors(candidate)) {
        setFormAlert({ open: true, message: 'This color combination is already in use. Please choose a unique set of team colors.' });
        focusMissingField(field);
        setSubmitting(false);
        return;
      }
    }

    // Combine form data with prefilled data for submission
    let combinedData = { ...formData, ...prefilledData };

    try {
      // Compress birth certificate image before submission (if present)
      const birthCertField = allFields.find((field) => field.id === 43);
      if (birthCertField && combinedData[43]) {
        combinedData[43] = await compressImageDataUrl(combinedData[43], {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.7
        });
      }

      // Submit the form via API
      const response = await fetch('/api/form-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: form.id,
          data: combinedData
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit form');
      }

      // If this is a Team Registration form (id: 1), store team credentials to show to user
      if (form.id === 1 && result.submission && result.teamProfile) {
        setTeamCredentials({
          teamName: result.teamProfile.teamName,
          email: result.teamProfile.email,
          password: result.teamProfile.password
        });
      }

      // Store the submitted data with field labels for the success page
      const submittedFieldsList = isMultiPage 
        ? form.pages.flatMap(p => p.fields)
        : form.fields;
      
      const submittedData = {};
      submittedFieldsList.forEach(field => {
        const value = combinedData[field.id];
        if (value !== undefined && value !== null && value !== '') {
          // Skip complex fields that aren't suitable for display
          if (!['kit-pricing', 'entry-fee-pricing', 'product-bundle', 'supporter-apparel', 'registration-products'].includes(field.type)) {
            submittedData[field.label || `Field ${field.id}`] = value;
          }
        }
        // Handle color fields
        if (field.type === 'kit-color-picker') {
          const primary = combinedData[`${field.id}_primaryColor`];
          const secondary = combinedData[`${field.id}_secondaryColor`];
          const trim = combinedData[`${field.id}_trimColor`];
          if (primary) submittedData['Primary Color'] = primary;
          if (secondary) submittedData['Secondary Color'] = secondary;
          if (trim) submittedData['Trim Color'] = trim;
        }
      });
      setSubmittedFormData(submittedData);

      setSubmitting(false);
      if (typeof window !== 'undefined' && form?.id) {
        window.localStorage.removeItem(getDraftKey(form.id));
      }
      setSubmitted(true);
      if (onSubmitSuccess && form.id !== 1) {
        onSubmitSuccess(result.submission);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitting(false);
      setFormAlert({ open: true, message: 'There was an error submitting the form. Please try again.' });
    }
  };

  if (submitted) {
    return (
      <div className={styles.successMessage}>
        <div className={styles.successIcon}>✓</div>
        <h3>Thank you for your submission!</h3>
        <p>We've received your information and will get back to you soon.</p>
        
        {/* Display submitted information summary */}
        {submittedFormData && Object.keys(submittedFormData).length > 0 && (
          <div className={styles.successSummary}>
            <h4 className={styles.successSummaryTitle}>
              📋 Submission Summary
            </h4>
            <div className={styles.successSummaryGrid}>
              {Object.entries(submittedFormData).map(([label, value], index) => (
                <div key={index} className={styles.successSummaryItem}>
                  <span className={styles.successSummaryLabel}>{label}</span>
                  <span className={styles.successSummaryValue}>
                    {formatSubmissionValue(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <button 
          onClick={() => {
          setSubmitted(false);
          setFormData({});
          setPrefilledData({});
          setTeamCredentials(null);
          setSubmittedFormData(null);
          setCurrentPage(1);
          setShowLandingPage(true);
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 50);
        }}
        className={styles.resetButton}
        >
          OK
        </button>
      </div>
    );
  }

  // Show landing page if enabled
  if (showLandingPage && landingPage) {
    return (
      <FormLandingPage 
        landingPage={landingPage} 
        onStart={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState({ view: 'form' }, '', window.location.href);
          }
          setShowLandingPage(false);
          setTimeout(() => {
            formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        }} 
      />
    );
  }

  return (
    <div 
      className={styles.formBackgroundWrapper}
      style={{ minHeight: '100vh' }}
    >
      {formAlert.open && (
        <div className={styles.formAlertOverlay} onClick={() => setFormAlert({ open: false, message: '' })}>
          <div className={styles.formAlertModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formAlertTitle}>Please check your details</div>
            <div className={styles.formAlertMessage}>{formAlert.message}</div>
            <button
              type="button"
              className={styles.formAlertButton}
              onClick={() => setFormAlert({ open: false, message: '' })}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {formBackground && <div className={styles.formBackgroundEffect} />}
      <div className={styles.formBackgroundContent}>
        <div
          ref={formTopRef}
          className={`${styles.formContainer} ${backgroundTransparency ? styles.formContainerTransparent : ''}`}
        >
        <div className={styles.formHeader}>
          <h3>{form.name}</h3>
          <p>{form.description}</p>
          {isMultiPage && (
          <div className={styles.stepsContainer}>
            {form.pages.map((page, idx) => (
              <div
                key={page.pageId}
                className={styles.stepItem}
                onClick={() => handleStepClick(page.pageId)}
              >
                <div
                  className={styles.stepBadge}
                  style={{
                    background: currentPage === page.pageId
                      ? 'white'
                      : currentPage > page.pageId
                        ? 'rgba(34, 197, 94, 0.9)'
                        : 'rgba(255, 255, 255, 0.2)',
                    color: currentPage === page.pageId ? '#111827' : 'white',
                    boxShadow: currentPage === page.pageId ? '0 4px 12px rgba(255,255,255,0.3)' : 'none',
                    border: currentPage === page.pageId ? '2px solid rgba(255,255,255,0.5)' : 'none'
                  }}
                >
                  {currentPage > page.pageId ? '✓' : page.pageId}
                </div>
                <div className={styles.stepText}>
                  <div
                    className={styles.stepTitle}
                    style={{
                      fontWeight: currentPage === page.pageId ? '700' : '500',
                      color: currentPage === page.pageId ? 'white' : 'rgba(255, 255, 255, 0.8)'
                    }}
                  >
                    {page.pageTitle}
                  </div>
                  <div className={styles.stepMeta}>
                    Step {page.pageId} of {totalPages}
                  </div>
                </div>
                {idx < form.pages.length - 1 && (
                  <div
                    className={styles.stepBar}
                    style={{
                      background: currentPage > page.pageId ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.2)'
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Welcome Banner */}
      {form.welcomeBanner && currentPage === form.welcomeBanner.showOnPage && (
        <div className={styles.welcomeBanner}>
          {form.welcomeBanner.imageUrl ? (
            <img
              src={form.welcomeBanner.imageUrl}
              alt={form.welcomeBanner.title || 'Welcome banner'}
              className={styles.welcomeBannerImage}
            />
          ) : (
            <div className={styles.welcomeBannerFallback} />
          )}
          <div className={styles.welcomeBannerOverlay}>
            <h2 className={styles.welcomeBannerTitle}>{form.welcomeBanner.title}</h2>
            <p className={styles.welcomeBannerSubtitle}>{form.welcomeBanner.subtitle}</p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`${styles.form} ${form?.id === 2 ? styles.formCompact : ''}`}
        noValidate
      >
        {/* Compact grid layout for Team Registration Page 1 */}
        {form.id === 1 && currentPage === 1 ? (
          <div className={styles.teamGrid}>
            {currentFields
              .sort((a, b) => a.order - b.order)
              .map(field => (
                <div 
                  key={field.id} 
                  ref={(node) => {
                    if (node) {
                      fieldRefs.current[field.id] = node;
                    }
                  }}
                  className={`${field.id === 22 || field.id === 5 ? styles.teamGridWide : styles.teamGridItem} ${validationErrors[field.id] ? styles.fieldError : ''}`}
                >
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    color: '#e5e7eb',
                    fontSize: '0.95rem',
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.2px'
                  }}>
                    {field.label}
                    {field.required && <span style={{ color: '#dc0000', marginLeft: '0.25rem' }}>*</span>}
                  </label>
                  {validationErrors[field.id] && (
                    <div className={styles.fieldErrorText}>*Please fill in the required information.</div>
                  )}
                  
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
                            border: '2px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontFamily: 'inherit',
                            transition: 'all 0.3s',
                            background: 'rgba(15, 23, 42, 0.9)',
                            color: '#f8fafc'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#dc0000';
                            e.target.style.background = 'rgba(17, 24, 39, 0.95)';
                            e.target.style.boxShadow = '0 0 0 3px rgba(220, 0, 0, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                            e.target.style.background = 'rgba(15, 23, 42, 0.9)';
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
                              handleImageFileUpload(file, field.id, 'Team logo');
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
                      {isShirtNumberField(field) && renderAdditionalApparelSection()}
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
          orderedFields
            .map(field => {
              if (form.id === 2 && field.type === 'product-bundle') {
                return null;
              }
              if (form.id === 2 && field.type === 'upsell-products') {
                return null;
              }
              return (
                <div key={field.id}>
                  <div
                    ref={(node) => {
                      if (node) {
                        fieldRefs.current[field.id] = node;
                      }
                    }}
                    className={`${styles.fieldGroup} ${validationErrors[field.id] ? styles.fieldError : ''}`}
                  >
                <label className={styles.label}>
                  {field.label}
                  {field.required && <span className={styles.required}>*</span>}
                  {field.autofillFromSubmission && formData[field.id] && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#22c55e', fontWeight: '500' }}>
                      (auto-filled)
                    </span>
                  )}
                </label>
                {validationErrors[field.id] && (
                  <div className={styles.fieldErrorText}>*Please fill in the required information.</div>
                )}
                {fieldMessages[field.id] && (
                  <div className={styles.fieldErrorText}>{fieldMessages[field.id]}</div>
                )}
                {field.type === 'image-select-library' && field.id === 23 && (
                  <p className={styles.kitSelectionHint}>
                    Tap a kit to view its full gallery, then select it. Team colors are chosen after you pick a design.
                  </p>
                )}

              {field.type === 'text' && (
                <>
                  {field.id === 30 ? (
                    <div className={styles.uploadField}>
                      <label
                        className={styles.dropzone}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          handleImageFileUpload(file, field.id, 'Sponsor logo');
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            handleImageFileUpload(file, field.id, 'Sponsor logo');
                          }}
                          required={field.required}
                          className={styles.uploadInput}
                        />
                        <div className={styles.dropzoneIcon}>⤴</div>
                        <div className={styles.dropzoneText}>Drag & drop Sponsor Logo here</div>
                        <div className={styles.dropzoneHint}>or click to browse</div>
                      </label>

                      <div className={styles.uploadRow}>
                        {formData[field.id] && (
                          <button
                            type="button"
                            className={styles.uploadRemove}
                            onClick={() => handleInputChange(field.id, '')}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {formData[field.id] && (
                        <div className={styles.uploadPreview}>
                          <img src={formData[field.id]} alt="Sponsor logo preview" />
                          <span>Uploaded successfully</span>
                        </div>
                      )}
                      {field.helpText && (
                        <p className={styles.uploadHelp}>{field.helpText}</p>
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
                        background: '#0b1220', 
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
                <div className={styles.passwordField}>
                  <input
                    type={visiblePasswords[field.id] ? 'text' : 'password'}
                    placeholder={field.placeholder}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.required}
                    className={styles.input}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() =>
                      setVisiblePasswords((prev) => ({
                        ...prev,
                        [field.id]: !prev[field.id]
                      }))
                    }
                    aria-label={visiblePasswords[field.id] ? 'Hide password' : 'Show password'}
                  >
                    {visiblePasswords[field.id] ? (
                      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                        <path
                          d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l2.04 2.04C2.6 6.9 1.35 8.53.75 10.5a.75.75 0 0 0 0 .45C2.15 15.76 6.6 19 12 19c1.83 0 3.57-.37 5.15-1.04l2.32 2.32a.75.75 0 1 0 1.06-1.06L3.53 2.47Zm8.47 4.28a4.5 4.5 0 0 1 4.25 6.05l-1.12-1.12a3 3 0 0 0-3.13-3.13L11 6.75c.32-.06.66-.1 1-.1Zm-6.1-.02 1.26 1.26A4.5 4.5 0 0 0 11.02 13l-1.18-1.18a3 3 0 0 1-2.12-2.12L5.9 6.73Zm6.1 10.77c-4.53 0-8.2-2.73-9.6-6 0-.01 0-.02.01-.03.5-1.54 1.47-2.9 2.76-3.94l1.67 1.67a4.5 4.5 0 0 0 6.12 6.12l2.12 2.12c-1.18.46-2.44.71-3.08.71Zm6.62-2.06-1.08-1.08c.88-.84 1.6-1.86 2.07-3.01a.75.75 0 0 0 0-.56C18.2 8.24 15.52 6.3 12.3 5.86l-1.1-1.1c.26-.02.52-.03.8-.03 4.53 0 8.2 2.73 9.6 6-.43 1.04-1.06 2-1.88 2.91Z"
                          fill="currentColor"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                        <path
                          d="M12 5c5.4 0 9.85 3.24 11.25 8.05.04.15.04.3 0 .45C21.85 18.76 17.4 22 12 22S2.15 18.76.75 13.5a.75.75 0 0 1 0-.45C2.15 8.24 6.6 5 12 5Zm0 2c-4.45 0-8.1 2.5-9.43 6 1.33 3.5 4.98 6 9.43 6s8.1-2.5 9.43-6c-1.33-3.5-4.98-6-9.43-6Zm0 2.25A3.75 3.75 0 1 1 8.25 13 3.75 3.75 0 0 1 12 9.25Zm0 1.5A2.25 2.25 0 1 0 14.25 13 2.25 2.25 0 0 0 12 10.75Z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                  </button>
                </div>
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
                <div className={styles.datePickerWrapper}>
                  <Flatpickr
                    ref={(fp) => {
                      if (fp) {
                        datePickerRefs.current[field.id] = fp;
                      }
                    }}
                    value={formData[field.id] || ''}
                    options={{
                      dateFormat: 'Y-m-d',
                      altInput: true,
                      altFormat: 'Y/m/d',
                      allowInput: true,
                      disableMobile: false,
                      monthSelectorType: 'dropdown',
                      maxDate: 'today',
                      minDate: '1950-01-01',
                      onOpen: (_, __, instance) => {
                        if (!instance.selectedDates.length) {
                          instance.changeYear(2000, false);
                          instance.changeMonth(0, false);
                          instance.redraw();
                        }
                      }
                    }}
                    onChange={(_, dateStr) => handleInputChange(field.id, dateStr)}
                    placeholder={field.placeholder || 'Select date'}
                    disabled={field.autofillFromSubmission && formData[field.id]}
                    className={styles.input}
                  />
                  <span className={styles.datePickerIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path
                        d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1.5A2.5 2.5 0 0 1 22 6.5v12A2.5 2.5 0 0 1 19.5 21h-15A2.5 2.5 0 0 1 2 18.5v-12A2.5 2.5 0 0 1 4.5 4H6V3a1 1 0 0 1 1-1Zm12 8H5v8.5a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V10ZM5 8h14V6.5a.5.5 0 0 0-.5-.5h-2.5v1a1 1 0 1 1-2 0V6H8v1a1 1 0 1 1-2 0V6H5.5a.5.5 0 0 0-.5.5V8Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  {formData[field.id] && (
                    <button
                      type="button"
                      className={styles.dateClearButton}
                      onClick={() => {
                        const instance = datePickerRefs.current[field.id]?.flatpickr;
                        if (instance) {
                          instance.clear();
                          instance.setDate(null, true);
                          instance.changeYear(2000, false);
                          instance.changeMonth(0, false);
                          instance.redraw();
                        }
                        handleInputChange(field.id, '');
                      }}
                      aria-label="Clear date"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}

              {field.type === 'file' && (
                field.dependsOn && !formData[field.dependsOn] ? null :
                <div className={styles.uploadField}>
                  <label
                    className={styles.dropzone}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      handleImageFileUpload(file, field.id, field.label || 'File');
                    }}
                  >
                    <input
                      type="file"
                      accept={field.accept || 'image/*'}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        handleImageFileUpload(file, field.id, field.label || 'File');
                      }}
                      required={field.required}
                      className={styles.uploadInput}
                    />
                    <div className={styles.dropzoneIcon}>⤴</div>
                    <div className={styles.dropzoneText}>
                      Drag & drop {field.label} here
                    </div>
                    <div className={styles.dropzoneHint}>or click to browse</div>
                  </label>

                  <div className={styles.uploadRow}>
                    {formData[field.id] && (
                      <button
                        type="button"
                        className={styles.uploadRemove}
                        onClick={() => handleInputChange(field.id, '')}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {formData[field.id] && (
                    <div className={styles.uploadPreview}>
                      <img src={formData[field.id]} alt={`${field.label} preview`} />
                      <span>Uploaded successfully</span>
                    </div>
                  )}
                  {field.helpText && (
                    <p className={styles.uploadHelp}>{field.helpText}</p>
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
                    field.autofillFromSubmission ? (
                      formData[field.id] ? (() => {
                        const selectedDesign = shirtDesigns.find(d => d.name === formData[field.id]);
                        const allFields = isMultiPage
                          ? form.pages.flatMap(page => page.fields || [])
                          : form.fields;
                        const basicKitField = allFields.find(f => f.type === 'product-bundle');
                        const teamPricing = basicKitField ? getSelectedTeamKitPricing(basicKitField) : null;
                        const shirtSize = basicKitField ? (formData[`${basicKitField.id}_shirtSize`] || '') : '';
                        const pantsSize = basicKitField ? (formData[`${basicKitField.id}_pantsSize`] || '') : '';
                        if (!selectedDesign) {
                          return (
                            <div className={styles.kitAutofillNotice}>
                              This kit design was selected by your team.
                            </div>
                          );
                        }
                        const previewImages = (selectedDesign.images && selectedDesign.images.length > 0
                          ? selectedDesign.images
                          : [getMainImage(selectedDesign)]
                        ).slice(0, 2);

                        return (
                          <div className={styles.kitPreviewPanelInline}>
                            <div className={styles.kitPreviewHeader}>
                              <div>
                                <h4 className={styles.kitPreviewTitle}>{selectedDesign.name}</h4>
                                <p className={styles.kitPreviewSubtitle}>Preview of the basic kit your team selected.</p>
                              </div>
                              <div className={styles.kitPreviewMeta}>
                                <span className={styles.kitPreviewMetaLabel}>Gallery</span>
                                <span className={styles.kitPreviewMetaCount}>{previewImages.length} images</span>
                              </div>
                            </div>
                            <div className={styles.kitPreviewGrid}>
                              {previewImages.map((img, index) => (
                                <button
                                  type="button"
                                  key={`${selectedDesign.id}-${index}`}
                                  className={styles.kitPreviewThumb}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalDesign(selectedDesign);
                                  }}
                                >
                                  <img src={img} alt={`${selectedDesign.name} preview ${index + 1}`} />
                                </button>
                              ))}
                            </div>

                            {form.id === 2 && basicKitField && (
                              <div className={styles.kitSizingCard}>
                                <div className={styles.kitSizingHeader}>
                                  <div>
                                    <h4 className={styles.kitSizingTitle}>{basicKitField.label}</h4>
                                    <p className={styles.kitSizingSubtitle}>{basicKitField.description}</p>
                                  </div>
                                  {teamPricing && (
                                    <div className={styles.kitSizingPrice}>
                                      <span>R{teamPricing.finalPrice.toFixed(2)}</span>
                                      <small>Base + team markup</small>
                                    </div>
                                  )}
                                </div>

                                  <div className={styles.kitSizingGrid}>
                                  <div>
                                    <label className={styles.kitSizingLabel}>Shirt Size *</label>
                                    <div
                                      className={styles.selectGlowWrap}
                                      tabIndex={0}
                                      onBlur={(e) => {
                                        if (!e.currentTarget.contains(e.relatedTarget)) {
                                          setDropdownOpen((prev) => ({ ...prev, [`${basicKitField.id}_shirtSize`]: false }));
                                        }
                                      }}
                                    >
                                      <button
                                        type="button"
                                        className={styles.dropdownButton}
                                        onClick={() =>
                                          setDropdownOpen((prev) => ({
                                            ...prev,
                                            [`${basicKitField.id}_shirtSize`]: !prev[`${basicKitField.id}_shirtSize`]
                                          }))
                                        }
                                      >
                                        <span className={styles.dropdownButtonText}>
                                          {shirtSize || 'Select shirt size'}
                                        </span>
                                        <span className={styles.dropdownChevron} aria-hidden="true">▾</span>
                                      </button>
                                      {dropdownOpen[`${basicKitField.id}_shirtSize`] && (
                                        <div className={styles.dropdownPanel}>
                                          <div className={`${styles.dropdownList} ${(basicKitField.shirtSizeOptions || basicKitField.sizeOptions || []).length > 4 ? styles.dropdownListScroll : ''}`}>
                                            {(basicKitField.shirtSizeOptions || basicKitField.sizeOptions || []).map((size) => {
                                              const isSelected = size === shirtSize;
                                              return (
                                                <button
                                                  type="button"
                                                  key={`shirt-${size}`}
                                                  className={`${styles.dropdownItem} ${isSelected ? styles.dropdownItemActive : ''}`}
                                                  onClick={() => {
                                                    handleInputChange(`${basicKitField.id}_shirtSize`, size);
                                                    setDropdownOpen((prev) => ({ ...prev, [`${basicKitField.id}_shirtSize`]: false }));
                                                  }}
                                                >
                                                  {size}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    {shirtSize && (
                                      <div className={styles.kitSizeChart}>
                                        {kitSizeCharts.shirtChartUrl ? (
                                          <img src={kitSizeCharts.shirtChartUrl} alt="Shirt size chart" />
                                        ) : (
                                          <div className={styles.kitSizeChartPlaceholder}>Shirt size chart not available yet.</div>
                                        )}
                                        <div style={{ marginTop: '0.65rem', fontSize: '0.8rem', color: '#cbd5f5', lineHeight: 1.5 }}>
                                          Please ensure you select the correct size (measure the player and use this sizing chart to get the right size). Winter League Cricket will not be held responsible for selecting the incorrect size.
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <label className={styles.kitSizingLabel}>Pants Size *</label>
                                    <div
                                      className={styles.selectGlowWrap}
                                      tabIndex={0}
                                      onBlur={(e) => {
                                        if (!e.currentTarget.contains(e.relatedTarget)) {
                                          setDropdownOpen((prev) => ({ ...prev, [`${basicKitField.id}_pantsSize`]: false }));
                                        }
                                      }}
                                    >
                                      <button
                                        type="button"
                                        className={styles.dropdownButton}
                                        onClick={() =>
                                          setDropdownOpen((prev) => ({
                                            ...prev,
                                            [`${basicKitField.id}_pantsSize`]: !prev[`${basicKitField.id}_pantsSize`]
                                          }))
                                        }
                                      >
                                        <span className={styles.dropdownButtonText}>
                                          {pantsSize || 'Select pants size'}
                                        </span>
                                        <span className={styles.dropdownChevron} aria-hidden="true">▾</span>
                                      </button>
                                      {dropdownOpen[`${basicKitField.id}_pantsSize`] && (
                                        <div className={styles.dropdownPanel}>
                                          <div className={`${styles.dropdownList} ${(basicKitField.pantsSizeOptions || basicKitField.sizeOptions || []).length > 4 ? styles.dropdownListScroll : ''}`}>
                                            {(basicKitField.pantsSizeOptions || basicKitField.sizeOptions || []).map((size) => {
                                              const isSelected = size === pantsSize;
                                              return (
                                                <button
                                                  type="button"
                                                  key={`pants-${size}`}
                                                  className={`${styles.dropdownItem} ${isSelected ? styles.dropdownItemActive : ''}`}
                                                  onClick={() => {
                                                    handleInputChange(`${basicKitField.id}_pantsSize`, size);
                                                    setDropdownOpen((prev) => ({ ...prev, [`${basicKitField.id}_pantsSize`]: false }));
                                                  }}
                                                >
                                                  {size}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    {pantsSize && (
                                      <div className={styles.kitSizeChart}>
                                        {kitSizeCharts.pantsChartUrl ? (
                                          <img src={kitSizeCharts.pantsChartUrl} alt="Pants size chart" />
                                        ) : (
                                          <div className={styles.kitSizeChartPlaceholder}>Pants size chart not available yet.</div>
                                        )}
                                        <div style={{ marginTop: '0.65rem', fontSize: '0.8rem', color: '#cbd5f5', lineHeight: 1.5 }}>
                                          Please ensure you select the correct size (measure the player and use this sizing chart to get the right size). Winter League Cricket will not be held responsible for selecting the incorrect size.
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        <div className={styles.kitAutofillNotice}>
                          Select your team to view the basic kit preview.
                        </div>
                      )
                    ) : (
                      /* Show shirt selection grid for non-autofill */
                      <>
                        {formData[field.id] && !field.autofillFromSubmission && (
                          <button
                            type="button"
                            className={styles.kitChangeButton}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                [field.id]: '',
                                [`${field.id}_primaryColor`]: '',
                                [`${field.id}_secondaryColor`]: '',
                                [`${field.id}_trimColor`]: ''
                              }));
                              setActiveKitPreview(prev => ({
                                ...prev,
                                [field.id]: null
                              }));
                            }}
                          >
                            Change kit selection
                          </button>
                        )}

                    {isKitPreviewField(field) && renderAdditionalApparelSection()}
                        <div
                          className={styles.kitGrid}
                          style={{
                            display: 'grid',
                            gap: '1rem',
                            marginBottom: '1rem'
                          }}
                        >
                          {(formData[field.id]
                            ? shirtDesigns.filter(d => d.name === formData[field.id])
                            : shirtDesigns
                          ).map((design) => {
                            const isSelected = formData[field.id] === design.name;
                            const isDisabled = field.autofillFromSubmission && formData[field.id];
                            const isActive = activeKitPreview[field.id] === design.id;
                            const mainImage = getMainImage(design);
                            const hasMultipleImages = design.images && design.images.length > 1;
                            const previewImages = design.images && design.images.length > 0
                              ? design.images
                              : [getMainImage(design)];
                            
                            return (
                              <div
                                key={design.id}
                                className={`${styles.kitCardWrapper} ${isActive ? styles.kitCardWrapperActive : ''}`}
                              >
                                <div 
                                  className={`${styles.kitCard} ${isSelected ? styles.kitCardSelected : ''} ${isActive ? styles.kitCardActive : ''}`}
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
                                  onClick={() => {
                                    if (isDisabled) return;
                                    const currentSelection = formData[field.id];
                                    const currentCount = kitDesignCounts[design.name] || 0;
                                    if (currentSelection !== design.name && currentCount >= 5) {
                                      setFormAlert({ open: true, message: 'This kit design has reached the maximum of 5 teams. Please choose another design.' });
                                      return;
                                    }
                                    setActiveKitPreview(prev => ({
                                      ...prev,
                                      [field.id]: prev[field.id] === design.id ? null : design.id
                                    }));
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
                                    <div className={styles.kitImageCountBadge}>
                                      <span className={styles.kitImageCountLabel}>IMAGES</span>
                                      <span className={styles.kitImageCountValue}>{design.images.length}</span>
                                    </div>
                                  )}
                                  <div>
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
                                </div>

                                {isActive && (
                                  <div className={styles.kitPreviewPanelInline}>
                                    <div className={styles.kitPreviewHeader}>
                                      <div>
                                        <h4 className={styles.kitPreviewTitle}>{design.name}</h4>
                                        <p className={styles.kitPreviewSubtitle}>Preview all kit images, then confirm your selection.</p>
                                      </div>
                                      <div className={styles.kitPreviewMeta}>
                                        <span className={styles.kitPreviewMetaLabel}>Gallery</span>
                                        <span className={styles.kitPreviewMetaCount}>{previewImages.length} images</span>
                                      </div>
                                      <button
                                        type="button"
                                        className={styles.kitSelectButton}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const currentSelection = formData[field.id];
                                          const currentCount = kitDesignCounts[design.name] || 0;
                                          if (currentSelection !== design.name && currentCount >= 5) {
                                            setFormAlert({ open: true, message: 'This kit design has reached the maximum of 5 teams. Please choose another design.' });
                                            return;
                                          }
                                          if (field.includeColorPickers && !field.autofillFromSubmission) {
                                            setFormData(prev => ({
                                              ...prev,
                                              [field.id]: design.name,
                                              [`${field.id}_primaryColor`]: prev[`${field.id}_primaryColor`] || '#DC2626',
                                              [`${field.id}_secondaryColor`]: prev[`${field.id}_secondaryColor`] || '#2563EB',
                                              [`${field.id}_trimColor`]: prev[`${field.id}_trimColor`] || '#2563EB'
                                            }));
                                          } else {
                                            handleInputChange(field.id, design.name);
                                          }
                                        }}
                                      >
                                        Select This Kit
                                      </button>
                                    </div>
                                    <div className={styles.kitPreviewGrid}>
                                      {previewImages.map((img, index) => (
                                        <button
                                          type="button"
                                          key={`${design.id}-${index}`}
                                          className={styles.kitPreviewThumb}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setModalDesign(design);
                                          }}
                                        >
                                          <img src={img} alt={`${design.name} preview ${index + 1}`} />
                                        </button>
                                      ))}
                                    </div>
                                    <div className={styles.kitPreviewActions}>
                                      <button
                                        type="button"
                                        className={styles.kitCancelButton}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFormData(prev => ({
                                            ...prev,
                                            [field.id]: '',
                                            [`${field.id}_primaryColor`]: '',
                                            [`${field.id}_secondaryColor`]: '',
                                            [`${field.id}_trimColor`]: ''
                                          }));
                                          setActiveKitPreview(prev => ({
                                            ...prev,
                                            [field.id]: null
                                          }));
                                        }}
                                      >
                                        Cancel selection
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.kitCloseButton}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveKitPreview(prev => ({
                                            ...prev,
                                            [field.id]: null
                                          }));
                                        }}
                                      >
                                        Close
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )
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
                    <div
                      ref={(node) => {
                        if (node) {
                          kitColorsRef.current[field.id] = node;
                        }
                      }}
                      style={{ 
                      marginTop: '1.5rem',
                      padding: '1.5rem',
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px'
                    }}>
                      <div className={styles.kitColorsHeader}>
                        <span className={styles.kitColorsIcon} />
                        <h4 className={styles.kitColorsTitle}>Team Colors</h4>
                      </div>
                      <p style={{ 
                        margin: '0 0 1rem 0', 
                        fontSize: '0.85rem', 
                        color: '#6b7280',
                        lineHeight: '1.4'
                      }}>
                        Click on each color circle to open a color picker. Drag the selector to choose your desired color, 
                        or type a hex code (e.g. #FF0000) directly in the text box below each picker.
                      </p>
                      
                      {/* Compact 3-column color picker layout */}
                      <div className={styles.kitColorGrid}>
                        {/* Primary Color */}
                        <div className={styles.kitColorCard}>
                          <label className={styles.kitColorLabel}>
                            Primary *
                          </label>
                          <div className={styles.kitColorControl}>
                            <div className={styles.kitColorWheel}>
                              <button
                                type="button"
                                className={styles.kitColorTrigger}
                                style={{ background: formData[`${field.id}_primaryColor`] || '#DC2626' }}
                                onClick={() => {
                                  const key = `${field.id}_primaryColor`;
                                  setActiveColorPicker(prev => (prev === key ? null : key));
                                }}
                              />
                              {activeColorPicker === `${field.id}_primaryColor` && (
                                <div
                                  className={styles.kitColorPopover}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onTouchStart={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Wheel
                                    color={hexToHsva(formData[`${field.id}_primaryColor`] || '#DC2626')}
                                    onChange={(color) => handleColorChange(field.id, 'primary', hsvaToHex(color.hsva))}
                                  />
                                  <button
                                    type="button"
                                    className={styles.kitColorDone}
                                    onClick={() => setActiveColorPicker(null)}
                                  >
                                    Done
                                  </button>
                                </div>
                              )}
                            </div>
                            <input
                              type="text"
                              placeholder="#DC2626"
                              value={formData[`${field.id}_primaryColor`] || ''}
                                  onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                if (value === '' || /^#[0-9A-F]{0,6}$/i.test(value)) {
                                      handleColorChange(field.id, 'primary', value);
                                }
                              }}
                              className={styles.kitColorInput}
                            />
                          </div>
                        </div>

                        {/* Secondary Color */}
                        <div className={styles.kitColorCard}>
                          <label className={styles.kitColorLabel}>
                            Secondary *
                          </label>
                          <div className={styles.kitColorControl}>
                            <div className={styles.kitColorWheel}>
                              <button
                                type="button"
                                className={styles.kitColorTrigger}
                                style={{ background: formData[`${field.id}_secondaryColor`] || '#2563EB' }}
                                onClick={() => {
                                  const key = `${field.id}_secondaryColor`;
                                  setActiveColorPicker(prev => (prev === key ? null : key));
                                }}
                              />
                              {activeColorPicker === `${field.id}_secondaryColor` && (
                                <div
                                  className={styles.kitColorPopover}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onTouchStart={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Wheel
                                    color={hexToHsva(formData[`${field.id}_secondaryColor`] || '#2563EB')}
                                    onChange={(color) => handleColorChange(field.id, 'secondary', hsvaToHex(color.hsva))}
                                  />
                                  <button
                                    type="button"
                                    className={styles.kitColorDone}
                                    onClick={() => setActiveColorPicker(null)}
                                  >
                                    Done
                                  </button>
                                </div>
                              )}
                            </div>
                            <input
                              type="text"
                              placeholder="#2563EB"
                              value={formData[`${field.id}_secondaryColor`] || ''}
                                  onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                if (value === '' || /^#[0-9A-F]{0,6}$/i.test(value)) {
                                      handleColorChange(field.id, 'secondary', value);
                                }
                              }}
                              className={styles.kitColorInput}
                            />
                          </div>
                        </div>

                        {/* Trim Color */}
                        <div className={styles.kitColorCard}>
                          <label className={styles.kitColorLabel}>
                            Trim
                          </label>
                          <div className={styles.kitColorControl}>
                            <div className={styles.kitColorWheel}>
                              <button
                                type="button"
                                className={styles.kitColorTrigger}
                                style={{ background: formData[`${field.id}_trimColor`] || '#DC2626' }}
                                onClick={() => {
                                  const key = `${field.id}_trimColor`;
                                  setActiveColorPicker(prev => (prev === key ? null : key));
                                }}
                              />
                              {activeColorPicker === `${field.id}_trimColor` && (
                                <div
                                  className={styles.kitColorPopover}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onTouchStart={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Wheel
                                    color={hexToHsva(formData[`${field.id}_trimColor`] || '#DC2626')}
                                    onChange={(color) => handleColorChange(field.id, 'trim', hsvaToHex(color.hsva))}
                                  />
                                  <button
                                    type="button"
                                    className={styles.kitColorDone}
                                    onClick={() => setActiveColorPicker(null)}
                                  >
                                    Done
                                  </button>
                                </div>
                              )}
                            </div>
                            <input
                              type="text"
                              placeholder="#DC2626"
                              value={formData[`${field.id}_trimColor`] || ''}
                                  onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                if (value === '' || /^#[0-9A-F]{0,6}$/i.test(value)) {
                                      handleColorChange(field.id, 'trim', value);
                                }
                              }}
                              className={styles.kitColorInput}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Color Preview Strip */}
                      {(formData[`${field.id}_primaryColor`] || formData[`${field.id}_secondaryColor`]) && (
                        <div style={{
                          marginTop: '1rem',
                          height: '40px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          display: 'flex',
                          border: '2px solid #e5e7eb'
                        }}>
                          <div style={{ 
                            flex: 1, 
                            background: formData[`${field.id}_primaryColor`] || '#DC2626'
                          }} />
                          <div style={{ 
                            flex: 1, 
                            background: formData[`${field.id}_secondaryColor`] || '#2563EB'
                          }} />
                          <div style={{ 
                            flex: 0.5, 
                            background: formData[`${field.id}_trimColor`] || '#DC2626',
                            border: '1px solid #e5e7eb'
                          }} />
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {field.type === 'submission-dropdown' && (
                <div>
                  {(() => {
                    const submissions = submissionDropdownData[field.id]?.submissions || [];
                    const isTeamSelect = form?.id === 2 && field.id === 8;
                    const shouldScroll = isTeamSelect && submissions.length > 3;
                    const selectClasses = [styles.select];
                    if (isTeamSelect) selectClasses.push(styles.selectTeam);
                    if (shouldScroll) selectClasses.push(styles.selectScrollable);
                    if (isTeamSelect) {
                      const currentValue = formData[field.id] || '';
                      const displayFieldId = submissionDropdownData[field.id]?.displayFieldId;
                      if (!displayFieldId) {
                        return (
                          <div className={styles.selectGlowWrap}>
                            <button
                              type="button"
                              className={styles.dropdownButton}
                              disabled
                            >
                              <span className={styles.dropdownButtonText}>Loading teams...</span>
                              <span className={styles.dropdownChevron} aria-hidden="true">▾</span>
                            </button>
                          </div>
                        );
                      }
                      const currentSelection = submissions.find(
                        (submission) => String(submission.id) === String(currentValue)
                      );
                      const currentLabel = currentSelection
                        ? currentSelection.data[displayFieldId]
                        : 'Select your team...';
                      const query = dropdownSearch[field.id] || '';
                      const filtered = submissions.filter((submission) => {
                        const label = submission.data[displayFieldId] || '';
                        return label.toLowerCase().includes(query.toLowerCase());
                      });

                      return (
                        <div
                          className={styles.selectGlowWrap}
                          tabIndex={0}
                          onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget)) {
                              setDropdownOpen((prev) => ({ ...prev, [field.id]: false }));
                            }
                          }}
                        >
                          <button
                            type="button"
                            className={styles.dropdownButton}
                            onClick={() =>
                              setDropdownOpen((prev) => ({
                                ...prev,
                                [field.id]: !prev[field.id]
                              }))
                            }
                          >
                            <span className={styles.dropdownButtonText}>{currentLabel}</span>
                            <span className={styles.dropdownChevron} aria-hidden="true">▾</span>
                          </button>
                          {dropdownOpen[field.id] && (
                            <div className={styles.dropdownPanel}>
                              <div className={styles.dropdownSearchWrap}>
                                <input
                                  type="text"
                                  placeholder="Search team"
                                  value={query}
                                  onChange={(e) =>
                                    setDropdownSearch((prev) => ({
                                      ...prev,
                                      [field.id]: e.target.value
                                    }))
                                  }
                                  className={styles.dropdownSearch}
                                />
                              </div>
                              <div
                                className={`${styles.dropdownList} ${filtered.length > 3 ? styles.dropdownListScroll : ''}`}
                              >
                                {filtered.length === 0 && (
                                  <div className={styles.dropdownEmpty}>No teams found</div>
                                )}
                                {filtered.map((submission) => {
                                  const label = submission.data[displayFieldId];
                                  const isSelected = String(submission.id) === String(currentValue);
                                  return (
                                    <button
                                      type="button"
                                      key={submission.id}
                                      className={`${styles.dropdownItem} ${isSelected ? styles.dropdownItemActive : ''}`}
                                      onClick={() => {
                                        handleSubmissionDropdownChange(field.id, submission.id);
                                        setDropdownOpen((prev) => ({ ...prev, [field.id]: false }));
                                      }}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className={styles.selectGlowWrap}>
                        <select
                          value={formData[field.id] || ''}
                          onChange={(e) => handleSubmissionDropdownChange(field.id, e.target.value)}
                          required={field.required}
                          className={selectClasses.join(' ')}
                          size={shouldScroll ? 4 : undefined}
                        >
                          <option value="">Select an option...</option>
                          {submissions.map((submission) => {
                            const displayFieldId = submissionDropdownData[field.id].displayFieldId;
                            const displayValue = submission.data[displayFieldId];
                            return (
                              <option key={submission.id} value={submission.id}>
                                {displayValue}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    );
                  })()}
                </div>
              )}

              {field.type === 'sub-team-selector' && (() => {
                const allFields = isMultiPage
                  ? form.pages.flatMap(page => page.fields || [])
                  : form.fields;
                const selectedTeamSubmissionId = formData[field.dependsOn];
                if (!selectedTeamSubmissionId) return null;

                // Find the selected team submission
                const teamDropdownField = allFields.find(f => f.type === 'submission-dropdown' && f.id === field.dependsOn);
                if (!teamDropdownField || !submissionDropdownData[teamDropdownField.id]) return null;

                const selectedSubmission = submissionDropdownData[teamDropdownField.id].submissions.find(
                  sub => String(sub.id) === String(selectedTeamSubmissionId)
                );

                if (!selectedSubmission) return null;

                // Get sub-teams from field 33
                const rawSubTeams = selectedSubmission.data?.[33] ?? selectedSubmission.data?.['33'];
                const subTeams = typeof rawSubTeams === 'string'
                  ? JSON.parse(rawSubTeams || '[]')
                  : rawSubTeams;
                
                // Don't show if no sub-teams at all
                if (!subTeams || subTeams.length === 0) return null;

                // If only one sub-team, auto-select it
                if (subTeams.length === 1 && !formData[field.id]) {
                  const singleTeamValue = JSON.stringify(subTeams[0]);
                  // Use setTimeout to avoid state update during render
                  setTimeout(() => handleInputChange(field.id, singleTeamValue), 0);
                }

                return (
                  <div
                    className={styles.selectGlowWrap}
                    tabIndex={0}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDropdownOpen((prev) => ({ ...prev, [field.id]: false }));
                      }
                    }}
                  >
                    <button
                      type="button"
                      className={styles.dropdownButton}
                      onClick={() =>
                        setDropdownOpen((prev) => ({
                          ...prev,
                          [field.id]: !prev[field.id]
                        }))
                      }
                    >
                      <span className={styles.dropdownButtonText}>
                        {formData[field.id]
                          ? (() => {
                              try {
                                const parsed = JSON.parse(formData[field.id]);
                                return `${parsed.teamName} (${parsed.gender} - ${parsed.ageGroup})`;
                              } catch (error) {
                                return 'Select age group team...';
                              }
                            })()
                          : 'Select age group team...'}
                      </span>
                      <span className={styles.dropdownChevron} aria-hidden="true">▾</span>
                    </button>
                    {dropdownOpen[field.id] && (
                      <div className={styles.dropdownPanel}>
                        <div
                          className={`${styles.dropdownList} ${subTeams.length > 3 ? styles.dropdownListScroll : ''}`}
                        >
                          {subTeams.map((subTeam, index) => {
                            const label = `${subTeam.teamName} (${subTeam.gender} - ${subTeam.ageGroup})`;
                            const value = JSON.stringify(subTeam);
                            const isSelected = formData[field.id] === value;
                            return (
                              <button
                                type="button"
                                key={index}
                                className={`${styles.dropdownItem} ${isSelected ? styles.dropdownItemActive : ''}`}
                                onClick={() => {
                                  handleInputChange(field.id, value);
                                  setDropdownOpen((prev) => ({ ...prev, [field.id]: false }));
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {field.helpText && (
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                        {field.helpText}
                      </div>
                    )}
                  </div>
                );
              })()}

              {field.type === 'product-bundle' && form.id !== 2 && (
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
                                  setFormAlert({ open: true, message: 'Please select a size first.' });
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
                  <div className={styles.kitPricingContainer} style={{
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
                    marginBottom: '1.5rem'
                  }}>
                    {/* Kit Preview Card */}
                    <div className={styles.kitPreviewCard} style={{
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}>
                      <div className={styles.kitImagePreview} style={{
                        background: formData[23] && shirtDesigns.find(d => d.name === formData[23])
                          ? `url(${getMainImage(shirtDesigns.find(d => d.name === formData[23]))})`
                          : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
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
                            <h4 className={styles.kitPricingTitle} style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: '800', color: '#111827' }}>
                              Basic Kit Package
                            </h4>
                            <p className={styles.kitPricingSubtitle} style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280', lineHeight: '1.5' }}>
                              Includes: Playing Top, Pants, and Cap
                            </p>
                          </div>
                        </div>

                        {/* Base Price */}
                        <div className={styles.kitBasePriceCard} style={{
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
                            <p className={styles.kitPriceAmount} style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>
                              R{(formData[`${field.id}_basePrice`] || 150).toFixed(2)}
                            </p>
                          </div>
                          <input
                            type="hidden"
                            value={formData[`${field.id}_basePrice`] || 150}
                          />
                        </div>

                        {/* Team Markup */}
                        <div className={styles.kitMarkupCard} style={{
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
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: '1rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                                Team Markup (Optional)
                              </label>
                              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                                Add your markup to earn funds for your team
                              </p>
                            </div>
                          </div>
                          <div className={styles.kitPriceInputWrapper} style={{ position: 'relative' }}>
                            <span className={styles.kitPricePrefix} style={{
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
                              className={styles.kitPriceInput}
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
                          <p className={styles.kitTotalAmount} style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>
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
                  <div className={styles.entryFeeCard} style={{
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
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
                      <p className={styles.entryFeeAmount} style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>
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
                        <h4 className={styles.entryFeeTitle} style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>
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
                                  setFormAlert({ open: true, message: 'Please select a size first.' });
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
                  {isShirtNumberField(field) && renderAdditionalApparelSection()}
                </div>
          );
        })
        )}

        <div className={styles.formNav}>
          {isMultiPage && currentPage > 1 && (
            <button
              type="button"
              onClick={handlePrevPage}
              className={`${styles.submitButton} ${styles.navButton}`}
            >
              ← Previous
            </button>
          )}
          
          {isMultiPage && currentPage < totalPages ? (
            <button
              type="button"
              onClick={handleNextPage}
              className={`${styles.submitButton} ${styles.navButton}`}
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className={`${styles.submitButton} ${styles.navButton}`}
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
      </div>
    </div>
  );
}
