import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Wheel from '@uiw/react-color-wheel';
import { hsvaToHex, hexToHsva } from '@uiw/color-convert';
import styles from './FormDisplay.module.css';
import { getFormTemplateById, getFormWithProducts } from '../data/forms';
import { availableColors, getMainImage } from '../data/shirtDesigns';
import { useCart } from '../context/CartContext';
import { getLandingPageByFormId } from '../data/landingPages';
import FormLandingPage from './FormLandingPage';
import ImageGalleryModal from './ImageGalleryModal';

const Flatpickr = dynamic(() => import('react-flatpickr'), { ssr: false });

export default function FormDisplay({ form: initialForm, onSubmitSuccess, landingPage: landingPageOverride }) {
  const [form, setForm] = useState(initialForm);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [teamCredentials, setTeamCredentials] = useState(null); // Store team login credentials
  const [submissionDropdownData, setSubmissionDropdownData] = useState({});
  const [prefilledData, setPrefilledData] = useState({});
  const [shirtDesigns, setShirtDesigns] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showLandingPage, setShowLandingPage] = useState(!!(landingPageOverride && landingPageOverride.enabled));
  const [landingPage, setLandingPage] = useState(landingPageOverride || null);
  const [landingPageLoading, setLandingPageLoading] = useState(!landingPageOverride);
  const landingPageDismissedRef = useRef(false);
  const [modalDesign, setModalDesign] = useState(null);
  const [activeKitPreview, setActiveKitPreview] = useState({});
  const kitColorsRef = useRef({});
  const lastScrolledKitRef = useRef(null);
  const [activeColorPicker, setActiveColorPicker] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const fieldRefs = useRef({});
  const [teamColorCombos, setTeamColorCombos] = useState([]);
  const [formBackground, setFormBackground] = useState(null);
  const [formBackgroundReady, setFormBackgroundReady] = useState(false);
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
  const [activeApparelImageIndex, setActiveApparelImageIndex] = useState(0);
  // Apparel quantity and multi-size state: { productId: { quantity: 1, sizes: ['S', 'M'] } }
  const [apparelSelections, setApparelSelections] = useState({});
  const [playerEntryErrors, setPlayerEntryErrors] = useState({});
  const [selectedTeamData, setSelectedTeamData] = useState(null);

  // Player lookup state (per player index)
  const [playerLookupState, setPlayerLookupState] = useState({});
  const playerLookupTimeouts = useRef({});

  // Refs to break dependency cycles and enable debouncing
  const formDataRef = useRef(formData);
  const additionalApparelDetailsRef = useRef(additionalApparelDetails);
  const playerLookupStateRef = useRef(playerLookupState);
  const draftTimerRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => { formDataRef.current = formData; }, [formData]);
  useEffect(() => { additionalApparelDetailsRef.current = additionalApparelDetails; }, [additionalApparelDetails]);
  useEffect(() => { playerLookupStateRef.current = playerLookupState; }, [playerLookupState]);

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
        // Clamp player count on draft restore to prevent rendering thousands of cards
        if (parsed.formData[44] !== undefined) {
          const n = parseInt(parsed.formData[44], 10);
          if (!isNaN(n)) parsed.formData[44] = String(Math.min(Math.max(n, 1), 4));
        }
        setFormData(parsed.formData);
      }
      if (parsed?.prefilledData) {
        setPrefilledData(parsed.prefilledData);
      }
      if (parsed?.currentPage) {
        // For player registration (form 2), always start at page 1 to ensure
        // all steps are validated in order. Form data is still restored.
        if (form?.id !== 2) {
          setCurrentPage(parsed.currentPage);
        }
      }
      // Restore selected CricClubs profiles so they survive page reloads
      if (parsed?.playerLookupState && typeof parsed.playerLookupState === 'object') {
        setPlayerLookupState(parsed.playerLookupState);
      }
    } catch (error) {
      console.warn('Failed to restore saved form draft:', error);
    }
  }, [form?.id]);

  // Debounced draft saving — prevents JSON.stringify on every keystroke
  useEffect(() => {
    if (typeof window === 'undefined' || !form?.id) return;

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const draftKey = getDraftKey(form.id);
      const currentFormData = formDataRef.current;

      const safeFormData = {};
      Object.entries(currentFormData || {}).forEach(([key, value]) => {
        if (typeof value === 'string' && value.startsWith('data:') && value.length > 50000) {
          return;
        }
        if (key === '45' || key === 45) {
          if (Array.isArray(value)) {
            safeFormData[key] = value.map((entry) => ({
              ...entry,
              birthCertificate: entry?.birthCertificate && String(entry.birthCertificate).startsWith('data:') ? '' : entry?.birthCertificate,
              profileImage: entry?.profileImage && String(entry.profileImage).startsWith('data:') ? '' : entry?.profileImage
            }));
            return;
          }
        }
        safeFormData[key] = value;
      });

      // Save only selectedProfile per player index (not search results or loading state)
      const safeLookupState = {};
      const currentLookup = playerLookupStateRef.current || {};
      Object.entries(currentLookup).forEach(([idx, state]) => {
        if (state?.selectedProfile) {
          safeLookupState[idx] = { selectedProfile: state.selectedProfile };
        }
      });

      const payload = {
        formData: safeFormData,
        prefilledData,
        currentPage,
        playerLookupState: Object.keys(safeLookupState).length > 0 ? safeLookupState : undefined
      };

      try {
        window.localStorage.setItem(draftKey, JSON.stringify(payload));
      } catch (error) {
        console.warn('Failed to save form draft:', error);
      }
    }, 1000);

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [formData, prefilledData, currentPage, playerLookupState, form?.id]);

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
      if (value.length && typeof value[0] === 'object' && (value[0]?.playerName || value[0]?.name)) {
        return value
          .map((item) => {
            const parts = [
              item.playerName || item.name,
              item.subTeam,
              item.dob
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

  const { cart, syncKitItems, addToCart, removeFromCart, openCart, getCartCount, getCartTotal } = useCart();
  const [entryFeeIncludedItems, setEntryFeeIncludedItems] = useState([]);

  // Determine if form is multi-page
  const isMultiPage = form.multiPage && form.pages && form.pages.length > 0;
  const orderedPages = isMultiPage
    ? [...form.pages].sort((a, b) => (a.pageId || 0) - (b.pageId || 0))
    : [];
  const totalPages = isMultiPage ? orderedPages.length : 1;
  const currentFields = isMultiPage
    ? orderedPages.find(p => p.pageId === currentPage)?.fields || []
    : form.fields;
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

  useEffect(() => {
    if (!landingPageOverride) return;
    setLandingPage(landingPageOverride);
    setShowLandingPage(!!landingPageOverride.enabled);
    setLandingPageLoading(false);
  }, [landingPageOverride]);

  // Load landing page
  useEffect(() => {
    if (landingPageOverride) return;
    let isMounted = true;
    const cacheKey = form?.id ? `landingPage_${form.id}` : null;
    setLandingPageLoading(true);

    if (typeof window !== 'undefined' && cacheKey) {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed) {
            setLandingPage(parsed);
            if (parsed.enabled && !landingPageDismissedRef.current) {
              setShowLandingPage(true);
            }
            setLandingPageLoading(false);
          }
        } catch (error) {
          window.sessionStorage.removeItem(cacheKey);
        }
      }
    }

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
          if (page) {
            setLandingPage(page);
            if (typeof window !== 'undefined' && cacheKey) {
              window.sessionStorage.setItem(cacheKey, JSON.stringify(page));
            }
            if (page.enabled && !landingPageDismissedRef.current) {
              setShowLandingPage(true);
            }
            if (!page.enabled) {
              setShowLandingPage(false);
            }
            setLandingPageLoading(false);
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
        if (!landingPageDismissedRef.current) {
          setShowLandingPage(true);
        }
      } else {
        setLandingPage(null);
        setShowLandingPage(false);
      }
      setLandingPageLoading(false);
    };

    loadLandingPage();
    return () => {
      isMounted = false;
    };
  }, [form.id, landingPageOverride]);

  useEffect(() => {
    if (!form || form.id !== 2) return;
    let isMounted = true;

    const loadAdditionalApparel = async () => {
      setAdditionalApparelLoading(true);
      try {
        const response = await fetch('/api/products?category=additional-apparel&lite=true', {
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
    const cacheKey = form?.id ? `formBackground_${form.id}` : null;

    if (typeof window !== 'undefined' && cacheKey) {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) {
        setFormBackground(cached);
        setFormBackgroundReady(true);
      }
    }

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
          setBackgroundTransparency(transparencyEnabled);

          if (imageUrl) {
            if (typeof window !== 'undefined' && cacheKey) {
              window.sessionStorage.setItem(cacheKey, imageUrl);
            }
            setFormBackgroundReady(false);
            const preload = new Image();
            preload.onload = () => {
              if (!isMounted) return;
              setFormBackground(imageUrl);
              setFormBackgroundReady(true);
            };
            preload.onerror = () => {
              if (!isMounted) return;
              setFormBackground(null);
              setFormBackgroundReady(false);
            };
            preload.src = imageUrl;
            return;
          }
        }
        if (typeof window !== 'undefined' && cacheKey) {
          window.sessionStorage.removeItem(cacheKey);
        }
        setFormBackground(null);
        setFormBackgroundReady(false);
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
    const shouldApplyBackground = !!(formBackground && formBackgroundReady);

    if (shouldApplyBackground) {
      document.body.style.backgroundImage = `url(${formBackground})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center top';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'scroll';
      document.body.style.backgroundColor = '#0b0f16';
    } else {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
      document.body.style.backgroundColor = '#0b0f16';
    }

    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
      document.body.style.backgroundColor = '';
    };
  }, [formBackground, formBackgroundReady]);

  // Load registration banner from DB (team=1, player=2)
  useEffect(() => {
    if (form.id !== 1 && form.id !== 2) return;
    let isMounted = true;

    const apiUrl = form.id === 1
      ? '/api/team-registration-banner'
      : '/api/player-registration-banner';

    const loadBanner = async () => {
      try {
        const res = await fetch(apiUrl);
        const data = await res.json();
        if (!isMounted) return;
        if (data.success && data.banner) {
          setForm(prev => ({
            ...prev,
            welcomeBanner: data.banner
          }));
        }
      } catch (error) {
        console.error('Error loading banner:', error);
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
              if (page.pageId !== 4) return page;
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
      const fd = formDataRef.current;
      const loadKitBasePrice = async () => {
        try {
          const res = await fetch('/api/kit-pricing');
          const data = await res.json();
          if (data?.success && data.basePrice !== undefined && !fd['29_basePrice']) {
            const parsed = parseFloat(data.basePrice);
            if (!Number.isNaN(parsed)) {
              handleInputChange('29_basePrice', parsed);
              if (fd['29_markup'] === undefined) {
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
            if (data.baseFee !== undefined && !fd['31_baseFee']) {
              const parsedFee = parseFloat(data.baseFee);
              if (!Number.isNaN(parsedFee)) {
                handleInputChange('31_baseFee', parsedFee);
                if (fd['31_adjustment'] === undefined) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id]);

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
              const response = await fetch(`/api/submissions?formId=${field.sourceFormId}&lightweight=true`);
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
            console.error('Shirt designs API returned non-OK status');
            setShirtDesigns([]);
          }
        } catch (error) {
          console.error('Error loading shirt designs:', error);
          setShirtDesigns([]);
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
        const response = await fetch('/api/submissions?formId=2&lightweight=true');
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id]);

  useEffect(() => {
    if (!form || form.id !== 2) return;
    const rawCount = parseInt(formData[44] || 0, 10);
    if (!Number.isFinite(rawCount) || rawCount <= 0) return;
    const count = Math.min(rawCount, 4); // Max 4 players per submission

    setFormData((prev) => {
      const current = Array.isArray(prev[45]) ? [...prev[45]] : [];
      const next = [...current];
      for (let i = 0; i < count; i += 1) {
        next[i] = {
          playerName: '',
          subTeam: '',
          dob: '',
          birthCertificate: '',
          profileImage: '',
          shirtNumber: '',
          shirtSize: '',
          pantsSize: '',
          ...(current[i] || {})
        };
      }
      if (next.length > count) {
        next.length = count;
      }
      return { ...prev, [45]: next };
    });

    setPlayerLookupState((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        const idx = Number(key);
        if (!Number.isNaN(idx) && idx >= count) {
          delete next[key];
        }
      });
      return next;
    });

    setPlayerEntryErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        const idx = Number(key);
        if (!Number.isNaN(idx) && idx >= count) {
          delete next[key];
        }
      });
      return next;
    });
  }, [form?.id, formData[44]]);

  // Auto-select sub-team when there is exactly one option (player registration only)
  useEffect(() => {
    if (!form || form.id !== 2) return;
    const selectedTeamId = formData[8];
    if (!selectedTeamId) return;
    const entries = Array.isArray(formData[45]) ? formData[45] : [];
    if (entries.length === 0) return;

    const allFields = form.pages ? form.pages.flatMap(p => p.fields) : form.fields;
    const teamDropdownField = allFields.find(f => f.type === 'submission-dropdown');
    if (!teamDropdownField) return;
    const teamSubmissions = submissionDropdownData[teamDropdownField.id]?.submissions || [];
    const selectedSubmission = teamSubmissions.find(sub => String(sub.id) === String(selectedTeamId));
    const rawSubTeams = selectedSubmission?.data?.[33] ?? selectedSubmission?.data?.['33'];
    const subTeams = typeof rawSubTeams === 'string' ? JSON.parse(rawSubTeams || '[]') : rawSubTeams;
    if (!Array.isArray(subTeams) || subTeams.length !== 1) return;

    const singleValue = JSON.stringify(subTeams[0]);
    let needsUpdate = false;
    entries.forEach((entry) => {
      if (!entry.subTeam) needsUpdate = true;
    });
    if (!needsUpdate) return;

    setFormData(prev => {
      const current = Array.isArray(prev[45]) ? [...prev[45]] : [];
      const next = current.map(entry => {
        if (!entry.subTeam) return { ...entry, subTeam: singleValue };
        return entry;
      });
      return { ...prev, [45]: next };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, formData[8], formData[45], submissionDropdownData]);

  // Load additional apparel product details — uses ref to avoid self-dependency cascade
  useEffect(() => {
    if (!form || form.id !== 2) return;
    const selectedDesign = getSelectedKitDesign();
    if (!selectedDesign) return;

    const matchedProducts = additionalApparelProducts.filter(product => matchesKitDesign(product, selectedDesign));
    if (matchedProducts.length === 0) return;

    let cancelled = false;

    const loadMissingDetails = async () => {
      const currentDetails = additionalApparelDetailsRef.current;
      const toLoad = matchedProducts.filter(p => !currentDetails[p.id]);
      if (toLoad.length === 0) return;

      // Fetch all missing products in parallel instead of sequential cascade
      const results = await Promise.allSettled(
        toLoad.map(product =>
          fetch(`/api/products?id=${product.id}&lite=true`)
            .then(res => res.ok ? res.json() : null)
            .then(data => data?.success && data.product ? { id: product.id, product: data.product } : null)
        )
      );

      if (cancelled) return;

      const newDetails = {};
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          newDetails[result.value.id] = result.value.product;
        }
      });

      if (Object.keys(newDetails).length > 0) {
        setAdditionalApparelDetails(prev => ({ ...prev, ...newDetails }));
      }
    };

    loadMissingDetails();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, additionalApparelProducts, formData[24], formData[8], submissionDropdownData, shirtDesigns]);

  // Set default color values for image-select-library fields with color pickers
  // Uses formDataRef to avoid re-triggering on every formData change
  useEffect(() => {
    const allFields = isMultiPage 
      ? form.pages.flatMap(p => p.fields)
      : form.fields;
    
    const fd = formDataRef.current;
    const colorDefaults = {};
    allFields.forEach(field => {
      if (field.type === 'image-select-library' && field.includeColorPickers && !field.autofillFromSubmission) {
        // Set defaults if not already set
        if (fd[field.id] && !fd[`${field.id}_primaryColor`]) {
          colorDefaults[`${field.id}_primaryColor`] = '#DC2626';
        }
        if (fd[field.id] && !fd[`${field.id}_secondaryColor`]) {
          colorDefaults[`${field.id}_secondaryColor`] = '#2563EB';
        }
        if (fd[field.id] && !fd[`${field.id}_trimColor`]) {
          colorDefaults[`${field.id}_trimColor`] = '#2563EB';
        }
      }
    });
    
    if (Object.keys(colorDefaults).length > 0) {
      setFormData(prev => ({ ...prev, ...colorDefaults }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, isMultiPage]);

  // Auto-add basic kit to cart when reaching page 3
  // Uses setCart functional updater to always read latest cart state (avoids stale closure)
  useEffect(() => {
    if (currentPage === 3 && form.id === 2) {
      const allFields = isMultiPage 
        ? form.pages.flatMap(p => p.fields)
        : form.fields;
      
      const basicKitField = allFields.find(f => f.type === 'product-bundle');
      if (!basicKitField) return;

      const teamPricing = getSelectedTeamKitPricing(basicKitField);
      const entries = getPlayerEntries();

      // Build the desired kit items from player entries
      const desiredKits = [];
      entries.forEach((entry, index) => {
        if (!entry?.shirtSize || !entry?.pantsSize) return;
        const labelParts = [`Player ${index + 1}`];
        if (entry.playerName) {
          labelParts.push(entry.playerName);
        }
        const sizeLabel = `${labelParts.join(' - ')} | Shirt: ${entry.shirtSize} / Pants: ${entry.pantsSize}`;
        desiredKits.push({
          id: 'basic-kit',
          name: basicKitField.label,
          price: teamPricing.finalPrice,
          description: basicKitField.description,
          quantity: 1,
          selectedSize: sizeLabel
        });
      });

      // Sync kit items via CartContext (atomic replace of all basic-kit entries)
      syncKitItems(desiredKits);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, form?.id, isMultiPage, formData[45], submissionDropdownData]);

  const handleInputChange = (fieldId, value) => {
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
    // Clamp player count (field 44) to 1-4 range for player registration
    if (fieldId === 44 && form?.id === 2) {
      const num = parseInt(value, 10);
      if (value !== '' && !isNaN(num)) {
        value = String(Math.min(Math.max(num, 1), 4));
      }
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

  const getPlayerEntries = () => {
    const entries = formData[45];
    return Array.isArray(entries) ? entries : [];
  };

  const updatePlayerEntry = (index, updates) => {
    setFormData((prev) => {
      const current = Array.isArray(prev[45]) ? [...prev[45]] : [];
      const next = [...current];
      const existing = next[index] || {};
      next[index] = { ...existing, ...updates };
      return { ...prev, [45]: next };
    });
  };

  const handlePlayerFileUpload = (file, index, fieldKey, label) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setFormAlert({
        open: true,
        message: `${label} is too large. Max size is ${formatUploadSize(MAX_UPLOAD_BYTES)}.`
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      updatePlayerEntry(index, { [fieldKey]: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const updatePlayerLookupState = (index, updates) => {
    setPlayerLookupState((prev) => ({
      ...prev,
      [index]: {
        ...(prev[index] || {}),
        ...updates
      }
    }));
  };

  const handlePlayerLookup = async (searchValue, index) => {
    if (playerLookupTimeouts.current[index]) {
      clearTimeout(playerLookupTimeouts.current[index]);
    }

    const currentState = playerLookupState[index] || {};
    const selectedProfile = currentState.selectedProfile;

    if (selectedProfile && searchValue !== selectedProfile.name) {
      updatePlayerLookupState(index, { selectedProfile: null });
    }

    if (selectedProfile && searchValue === selectedProfile.name) {
      return;
    }

    if (!searchValue || searchValue.trim().length < 2) {
      updatePlayerLookupState(index, { results: [], searched: false, loading: false });
      return;
    }

    playerLookupTimeouts.current[index] = setTimeout(async () => {
      updatePlayerLookupState(index, { loading: true });
      try {
        const response = await fetch(`/api/player-lookup?search=${encodeURIComponent(searchValue.trim())}`);
        const data = await response.json();
        updatePlayerLookupState(index, {
          results: data.players || [],
          searched: true
        });
      } catch (error) {
        console.error('Player lookup error:', error);
        updatePlayerLookupState(index, { results: [], searched: true });
      } finally {
        updatePlayerLookupState(index, { loading: false });
      }
    }, 500);
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

  const isKitPreviewField = (field) => (
    form?.id === 2
    && currentPage === 3
    && field?.type === 'image-select-library'
    && field?.id === 24
  );

  const renderAdditionalApparelSection = () => {
    const selectedDesign = getSelectedKitDesign();
    const matchedProducts = additionalApparelProducts.filter(product => matchesKitDesign(product, selectedDesign));
    const modalImages = activeApparelModal
      ? (activeApparelModal.images && activeApparelModal.images.length > 0
        ? activeApparelModal.images
        : [activeApparelModal.image || '/images/placeholder.svg'])
      : [];
    const modalMainImage = modalImages[activeApparelImageIndex] || modalImages[0];
    const modalSizes = (() => {
      if (!activeApparelModal) return [];
      if (Array.isArray(activeApparelModal.sizes) && activeApparelModal.sizes.length > 0) {
        return activeApparelModal.sizes;
      }
      if (typeof activeApparelModal.sizes === 'string') {
        return activeApparelModal.sizes
          .split(',')
          .map((size) => size.trim())
          .filter(Boolean);
      }
      if (Array.isArray(activeApparelModal.sizeOptions) && activeApparelModal.sizeOptions.length > 0) {
        return activeApparelModal.sizeOptions;
      }
      if (typeof activeApparelModal.sizeOptions === 'string') {
        return activeApparelModal.sizeOptions
          .split(',')
          .map((size) => size.trim())
          .filter(Boolean);
      }
      return [];
    })();
    const modalSizeKey = activeApparelModal?.id ? `addon_${activeApparelModal.id}_size` : null;
    const selectedModalSize = modalSizeKey ? (formData[modalSizeKey] || '') : '';
    const modalInCart = activeApparelModal?.id
      ? cart.some(item => item.id === activeApparelModal.id && item.selectedSize === (modalSizes.length ? selectedModalSize : null))
      : false;

    return (
      <div style={{ marginTop: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#e5e7eb' }}>Additional Apparel</h4>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: '#9ca3af' }}>
              Optional add-ons linked to your team kit design.
            </p>
          </div>
        </div>

        {/* Important info banner for parents */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>ℹ️</span>
            <div>
              <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#93c5fd', lineHeight: 1.5 }}>
                These are examples of the additional clothing items available for your team.
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: '#bfdbfe', lineHeight: 1.5 }}>
                Items that match your playing kit (e.g. training tops, hoodies, tracksuits) will have your <strong style={{ color: '#fbbf24' }}>correct team colours applied</strong> to the final product. Some items are general accessories and are not kit-specific.
              </p>
            </div>
          </div>
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
          <div className={styles.apparelGrid}>
            {matchedProducts.map(product => {
              const sizes = Array.isArray(product.sizes) ? product.sizes : [];
              const selection = apparelSelections[product.id] || { quantity: 0, sizes: [] };
              const detailRecord = additionalApparelDetails[product.id];
              const imageUrl = (detailRecord?.images && detailRecord.images.length > 0)
                ? detailRecord.images[0]
                : (product.images && product.images.length > 0 ? product.images[0] : (product.image || '/images/placeholder.svg'));
              
              // Check if any items from this product are in cart
              const cartItemsForProduct = cart.filter(item => item.id === product.id);
              const totalInCart = cartItemsForProduct.reduce((sum, item) => sum + item.quantity, 0);
              const hasItemsInCart = totalInCart > 0;
              
              // Calculate if all sizes are selected for current quantity
              const allSizesSelected = sizes.length === 0 || (selection.quantity > 0 && selection.sizes.filter(s => s).length === selection.quantity);

              return (
                <div
                  key={product.id}
                  style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #111827 100%)',
                    border: hasItemsInCart ? '2px solid #dc0000' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: hasItemsInCart ? '0 12px 28px rgba(220, 0, 0, 0.25)' : '0 10px 26px rgba(15, 23, 42, 0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = hasItemsInCart
                      ? '0 18px 32px rgba(220, 0, 0, 0.35)'
                      : '0 18px 34px rgba(220, 0, 0, 0.25)';
                    e.currentTarget.style.border = '1px solid rgba(220, 38, 38, 0.65)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = hasItemsInCart
                      ? '0 12px 28px rgba(220, 0, 0, 0.25)'
                      : '0 10px 26px rgba(15, 23, 42, 0.6)';
                    e.currentTarget.style.border = hasItemsInCart ? '2px solid #dc0000' : '1px solid rgba(255, 255, 255, 0.08)';
                  }}
                >
                  {/* Product image - clickable for modal */}
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={async () => {
                      try {
                        // Always fetch full product for modal (auto-loaded details are lite/no images)
                        const existingDetail = additionalApparelDetails[product.id];
                        const needsFetch = !existingDetail || !existingDetail.image || existingDetail.image === '/images/placeholder.svg' || existingDetail._lite;
                        if (needsFetch) {
                          const response = await fetch(`/api/products?id=${product.id}`);
                          const data = await response.json();
                          if (response.ok && data?.success && data.product) {
                            setAdditionalApparelDetails(prev => ({
                              ...prev,
                              [product.id]: data.product
                            }));
                            setActiveApparelImageIndex(0);
                            setActiveApparelModal(data.product);
                            return;
                          }
                        }
                        setActiveApparelImageIndex(0);
                        setActiveApparelModal(existingDetail || product);
                      } catch (error) {
                        console.error('Error loading product details:', error);
                        setActiveApparelImageIndex(0);
                        setActiveApparelModal(additionalApparelDetails[product.id] || product);
                      }
                    }}
                  >
                    {/* Short Sleeve Shirt Kits (IDs 67-86) need contain styling, others use cover */}
                    {product.id >= 67 && product.id <= 86 ? (
                      <div className={styles.productCardImage} style={{
                        width: '100%',
                        height: '280px',
                        background: '#0b1220',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '12px'
                      }}>
                        <img
                          src={imageUrl}
                          alt={product.name}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <div className={styles.productCardImage} style={{
                        width: '100%',
                        height: '280px',
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
                    )}
                  </div>
                  <div style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div
                      style={{ cursor: 'pointer' }}
                      onClick={async () => {
                        try {
                          const existingDetail = additionalApparelDetails[product.id];
                          const needsFetch = !existingDetail || !existingDetail.image || existingDetail.image === '/images/placeholder.svg' || existingDetail._lite;
                          if (needsFetch) {
                            const response = await fetch(`/api/products?id=${product.id}`);
                            const data = await response.json();
                            if (response.ok && data?.success && data.product) {
                              setAdditionalApparelDetails(prev => ({
                                ...prev,
                                [product.id]: data.product
                              }));
                              setActiveApparelImageIndex(0);
                              setActiveApparelModal(data.product);
                              return;
                            }
                          }
                          setActiveApparelImageIndex(0);
                          setActiveApparelModal(existingDetail || product);
                        } catch (error) {
                          console.error('Error loading product details:', error);
                          setActiveApparelImageIndex(0);
                          setActiveApparelModal(additionalApparelDetails[product.id] || product);
                        }
                      }}
                    >
                      <h5 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: '700' }}>{product.name}</h5>
                      <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600' }}>
                        Tap to view details
                      </div>
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#22c55e' }}>
                      R{Number(product.price || 0).toFixed(2)}
                    </div>

                    {/* Quantity selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Qty:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newQty = Math.max(0, selection.quantity - 1);
                            const newSizes = selection.sizes.slice(0, newQty);
                            setApparelSelections(prev => ({
                              ...prev,
                              [product.id]: { quantity: newQty, sizes: newSizes }
                            }));
                          }}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: '#1f2937',
                            color: '#f8fafc',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          −
                        </button>
                        <span style={{
                          minWidth: '30px',
                          textAlign: 'center',
                          fontSize: '0.95rem',
                          color: '#f8fafc',
                          fontWeight: '600'
                        }}>
                          {selection.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newQty = selection.quantity + 1;
                            const newSizes = [...selection.sizes, ''];
                            setApparelSelections(prev => ({
                              ...prev,
                              [product.id]: { quantity: newQty, sizes: newSizes }
                            }));
                          }}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: '#dc0000',
                            color: '#fff',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Size selectors - one for each quantity */}
                    {sizes.length > 0 && selection.quantity > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {Array.from({ length: selection.quantity }).map((_, idx) => (
                          <select
                            key={`size-${product.id}-${idx}`}
                            value={selection.sizes[idx] || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              const newSizes = [...selection.sizes];
                              newSizes[idx] = e.target.value;
                              setApparelSelections(prev => ({
                                ...prev,
                                [product.id]: { ...prev[product.id], sizes: newSizes }
                              }));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: '#0f172a',
                              color: '#f8fafc',
                              fontSize: '0.8rem'
                            }}
                          >
                            <option value="">Size {idx + 1}</option>
                            {sizes.map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        ))}
                      </div>
                    )}

                    {/* Add to Cart button */}
                    {selection.quantity > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sizes.length > 0 && !allSizesSelected) {
                            setFormAlert({ open: true, message: 'Please select a size for each item.' });
                            return;
                          }

                          // Group sizes by count to handle multiple of same size
                          const sizeCount = {};
                          selection.sizes.forEach(size => {
                            const sizeKey = sizes.length > 0 ? size : null;
                            sizeCount[sizeKey] = (sizeCount[sizeKey] || 0) + 1;
                          });

                          // Add each size group to cart
                          Object.entries(sizeCount).forEach(([size, count]) => {
                            const sizeValue = size === 'null' ? null : size;
                            // Remove existing items of this product/size first
                            removeFromCart(product.id, sizeValue);
                            // Add with the new quantity
                            for (let i = 0; i < count; i++) {
                              addToCart({
                                id: product.id,
                                name: product.name,
                                price: Number(product.price || 0),
                                description: product.description,
                                image: imageUrl,
                                category: product.category
                              }, sizeValue);
                            }
                          });

                          setFormAlert({ open: true, message: `Added ${selection.quantity} × ${product.name} to cart!` });
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          padding: '0.6rem 0.9rem',
                          borderRadius: '8px',
                          border: 'none',
                          fontWeight: '700',
                          cursor: 'pointer',
                          background: '#dc0000',
                          color: 'white',
                          boxShadow: '0 8px 18px rgba(220, 0, 0, 0.35)'
                        }}
                      >
                        Add {selection.quantity} to Cart
                      </button>
                    )}

                    {/* Show what's in cart */}
                    {hasItemsInCart && (
                      <div style={{
                        background: 'rgba(220, 0, 0, 0.1)',
                        border: '1px solid rgba(220, 0, 0, 0.3)',
                        borderRadius: '8px',
                        padding: '0.5rem',
                        fontSize: '0.75rem',
                        color: '#fca5a5'
                      }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>In Cart: {totalInCart} item{totalInCart > 1 ? 's' : ''}</div>
                        {cartItemsForProduct.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{item.selectedSize || 'No size'} × {item.quantity}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromCart(item.id, item.selectedSize);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                                textDecoration: 'underline'
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeApparelModal && !activeApparelModal.isSupporter && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: 'clamp(20px, 8vh, 80px)',
              paddingLeft: '16px',
              paddingRight: '16px',
              paddingBottom: '20px'
            }}
            onClick={() => setActiveApparelModal(null)}
          >
            <style>
              {`
                .modal-scroll-container::-webkit-scrollbar {
                  width: 8px;
                }
                .modal-scroll-container::-webkit-scrollbar-track {
                  background: #1f2937;
                  border-radius: 4px;
                }
                .modal-scroll-container::-webkit-scrollbar-thumb {
                  background: linear-gradient(180deg, #dc0000 0%, #b91c1c 100%);
                  border-radius: 4px;
                }
                .modal-scroll-container::-webkit-scrollbar-thumb:hover {
                  background: #ef4444;
                }
              `}
            </style>
            <div
              className={`modal-scroll-container ${styles.modalContainer}`}
              style={{
                background: '#111827',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: 'calc(100vh - 100px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                position: 'relative',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button - inside modal, stays visible */}
              <button
                type="button"
                onClick={() => setActiveApparelModal(null)}
                style={{
                  position: 'sticky',
                  top: '12px',
                  marginLeft: 'auto',
                  marginRight: '12px',
                  marginTop: '12px',
                  background: 'rgba(0,0,0,0.8)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.4rem',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                ×
              </button>

              {/* Large Image */}
              <div className={styles.modalImage} style={{ 
                width: '100%',
                height: '320px',
                background: activeApparelModal.id >= 67 && activeApparelModal.id <= 86 ? '#0a0f1a' : '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                flexShrink: 0
              }}>
                <img 
                  src={modalMainImage} 
                  alt={activeApparelModal.name} 
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    padding: '16px'
                  }} 
                />
                {modalImages.length > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    padding: '12px',
                    background: 'rgba(0,0,0,0.7)',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    justifyContent: 'center'
                  }}>
                    {modalImages.map((img, idx) => (
                      <button
                        key={`thumb-${idx}`}
                        type="button"
                        onClick={() => setActiveApparelImageIndex(idx)}
                        style={{
                          padding: 0,
                          border: idx === activeApparelImageIndex ? '3px solid #dc0000' : '3px solid transparent',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          background: 'none'
                        }}
                      >
                        <img src={img} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover', display: 'block' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Content - Price/Size/Cart FIRST, then description */}
              <div style={{ padding: '16px 20px 20px' }}>
                {/* Product name */}
                <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.3rem', fontWeight: '700' }}>
                  {activeApparelModal.name}
                </h3>
                
                {/* Kit subtitle - only for products with 'kit' in name (ID >= 20) */}
                {activeApparelModal.id >= 20 && activeApparelModal.name?.toLowerCase().includes('kit') && (
                  <p style={{
                    margin: '0 0 12px 0',
                    color: '#f59e0b',
                    fontSize: '0.75rem',
                    fontStyle: 'italic',
                    lineHeight: 1.4
                  }}>
                    *The team kits are examples of the design and not the final product. The final product will include the team colors.
                  </p>
                )}

                {/* Price - directly after name */}
                <div style={{
                  background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>PRICE</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#fff' }}>
                    R{Number(activeApparelModal.price || 0).toFixed(2)}
                  </span>
                </div>

                {/* Quantity selector */}
                {(() => {
                  const modalSelection = apparelSelections[activeApparelModal.id] || { quantity: 0, sizes: [] };
                  const cartItemsForModal = cart.filter(item => item.id === activeApparelModal.id);
                  const totalInCartModal = cartItemsForModal.reduce((sum, item) => sum + item.quantity, 0);
                  const hasItemsInCartModal = totalInCartModal > 0;
                  const allModalSizesSelected = modalSizes.length === 0 || (modalSelection.quantity > 0 && modalSelection.sizes.filter(s => s).length === modalSelection.quantity);
                  
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.95rem', color: '#9ca3af', fontWeight: '600' }}>Quantity:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.max(0, modalSelection.quantity - 1);
                              const newSizes = modalSelection.sizes.slice(0, newQty);
                              setApparelSelections(prev => ({
                                ...prev,
                                [activeApparelModal.id]: { quantity: newQty, sizes: newSizes }
                              }));
                            }}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: '#1f2937',
                              color: '#f8fafc',
                              fontSize: '1.25rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            −
                          </button>
                          <span style={{
                            minWidth: '40px',
                            textAlign: 'center',
                            fontSize: '1.1rem',
                            color: '#f8fafc',
                            fontWeight: '700'
                          }}>
                            {modalSelection.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = modalSelection.quantity + 1;
                              const newSizes = [...modalSelection.sizes, ''];
                              setApparelSelections(prev => ({
                                ...prev,
                                [activeApparelModal.id]: { quantity: newQty, sizes: newSizes }
                              }));
                            }}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: '#dc0000',
                              color: '#fff',
                              fontSize: '1.25rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Size selectors - one for each quantity */}
                      {modalSizes.length > 0 && modalSelection.quantity > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '12px' }}>
                          {Array.from({ length: modalSelection.quantity }).map((_, idx) => (
                            <select
                              key={`modal-size-${activeApparelModal.id}-${idx}`}
                              value={modalSelection.sizes[idx] || ''}
                              onChange={(e) => {
                                const newSizes = [...modalSelection.sizes];
                                newSizes[idx] = e.target.value;
                                setApparelSelections(prev => ({
                                  ...prev,
                                  [activeApparelModal.id]: { ...prev[activeApparelModal.id], sizes: newSizes }
                                }));
                              }}
                              style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: '#1f2937',
                                color: '#fff',
                                fontSize: '1rem'
                              }}
                            >
                              <option value="">Select Size {idx + 1}</option>
                              {modalSizes.map(size => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                          ))}
                        </div>
                      )}

                      {/* Add to cart button - only shown when quantity > 0 */}
                      {modalSelection.quantity > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (modalSizes.length > 0 && !allModalSizesSelected) {
                              setFormAlert({ open: true, message: 'Please select a size for each item.' });
                              return;
                            }

                            // Group sizes by count to handle multiple of same size
                            const sizeCount = {};
                            modalSelection.sizes.forEach(size => {
                              const sizeKey = modalSizes.length > 0 ? size : null;
                              sizeCount[sizeKey] = (sizeCount[sizeKey] || 0) + 1;
                            });

                            // Add each size group to cart
                            Object.entries(sizeCount).forEach(([size, count]) => {
                              const sizeValue = size === 'null' ? null : size;
                              // Remove existing items of this product/size first
                              removeFromCart(activeApparelModal.id, sizeValue);
                              // Add with the new quantity
                              for (let i = 0; i < count; i++) {
                                addToCart({
                                  id: activeApparelModal.id,
                                  name: activeApparelModal.name,
                                  price: Number(activeApparelModal.price || 0),
                                  description: activeApparelModal.description,
                                  image: modalMainImage || '/images/placeholder.svg',
                                  category: activeApparelModal.category
                                }, sizeValue);
                              }
                            });

                            setFormAlert({ open: true, message: `Added ${modalSelection.quantity} × ${activeApparelModal.name} to cart!` });
                          }}
                          style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '10px',
                            border: 'none',
                            fontWeight: '800',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            background: 'linear-gradient(135deg, #dc0000 0%, #b91c1c 100%)',
                            color: '#fff',
                            boxShadow: '0 8px 20px rgba(220, 0, 0, 0.4)'
                          }}
                        >
                          Add {modalSelection.quantity} to Cart
                        </button>
                      )}

                      {/* Show what's in cart */}
                      {hasItemsInCartModal && (
                        <div style={{
                          background: 'rgba(220, 0, 0, 0.1)',
                          border: '1px solid rgba(220, 0, 0, 0.3)',
                          borderRadius: '10px',
                          padding: '0.75rem',
                          marginTop: '12px',
                          fontSize: '0.85rem',
                          color: '#fca5a5'
                        }}>
                          <div style={{ fontWeight: '700', marginBottom: '0.5rem' }}>In Cart: {totalInCartModal} item{totalInCartModal > 1 ? 's' : ''}</div>
                          {cartItemsForModal.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <span>{item.selectedSize || 'No size'} × {item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.id, item.selectedSize)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  textDecoration: 'underline'
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Description - LAST, after add to cart */}
                {activeApparelModal.description && (
                  <p style={{
                    margin: '16px 0 0 0',
                    color: '#9ca3af',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '12px'
                  }}>
                    {activeApparelModal.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const matchesKitDesign = (product, design) => {
    // Check if product is kit-specific (has designId or "kit X" pattern in name)
    const productDesignId = product.designId ?? product.kitDesignId ?? product.designID;
    const productName = String(product.name || '');
    const hasKitInName = /kit\s*\d+/i.test(productName);
    const isKitSpecific = productDesignId || hasKitInName;
    
    // Non-kit-specific products (like "Winter League Beanie") should ALWAYS show
    if (!isKitSpecific) {
      return true;
    }
    
    // For kit-specific products, they must match the selected design
    if (!design) return false;
    
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
        if (productName.toLowerCase().includes(`kit ${kitNumber}`.toLowerCase())) {
          return true;
        }
      }
    }
    return false;
  };

  // Render Supporter Apparel Section (Step 4) - reuses same products as Additional Apparel but with "-Supporter" suffix
  const renderSupporterApparelSection = () => {
    const selectedDesign = getSelectedKitDesign();
    const matchedProducts = additionalApparelProducts.filter(product => matchesKitDesign(product, selectedDesign));
    const modalImages = activeApparelModal
      ? (activeApparelModal.images && activeApparelModal.images.length > 0
        ? activeApparelModal.images
        : [activeApparelModal.image || '/images/placeholder.svg'])
      : [];
    const modalMainImage = modalImages[activeApparelImageIndex] || modalImages[0];
    const modalSizes = (() => {
      if (!activeApparelModal) return [];
      if (Array.isArray(activeApparelModal.sizes) && activeApparelModal.sizes.length > 0) {
        return activeApparelModal.sizes;
      }
      if (typeof activeApparelModal.sizes === 'string') {
        return activeApparelModal.sizes.split(',').map((size) => size.trim()).filter(Boolean);
      }
      if (Array.isArray(activeApparelModal.sizeOptions) && activeApparelModal.sizeOptions.length > 0) {
        return activeApparelModal.sizeOptions;
      }
      if (typeof activeApparelModal.sizeOptions === 'string') {
        return activeApparelModal.sizeOptions.split(',').map((size) => size.trim()).filter(Boolean);
      }
      return [];
    })();
    const modalSizeKey = activeApparelModal?.id ? `supporter_${activeApparelModal.id}_size` : null;
    const selectedModalSize = modalSizeKey ? (formData[modalSizeKey] || '') : '';

    return (
      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#e5e7eb' }}>Supporter Apparel</h4>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: '#9ca3af' }}>
              Support your team with official merchandise - same great products for supporters!
            </p>
          </div>
        </div>

        {/* Important info banner for supporter parents */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>ℹ️</span>
            <div>
              <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#93c5fd', lineHeight: 1.5 }}>
                These are examples of the supporter clothing items available for your team.
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: '#bfdbfe', lineHeight: 1.5 }}>
                Items that match your playing kit (e.g. training tops, hoodies, tracksuits) will have your <strong style={{ color: '#fbbf24' }}>correct team colours applied</strong> to the final product. Some items are general accessories and are not kit-specific.
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24', lineHeight: 1.5 }}>
                🏷️ All matching kit clothing items will be labelled "SUPPORTER" to distinguish them from player kit.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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

        {!selectedDesign && (
          <div style={{
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px dashed #cbd5f5',
            color: '#64748b'
          }}>
            Select your team to view supporter apparel options.
          </div>
        )}

        {selectedDesign && additionalApparelLoading && (
          <div style={{ color: '#6b7280' }}>Loading supporter apparel...</div>
        )}

        {selectedDesign && !additionalApparelLoading && matchedProducts.length === 0 && (
          <div style={{
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px dashed #cbd5f5',
            color: '#64748b'
          }}>
            No supporter apparel is available for this kit design yet.
          </div>
        )}

        {selectedDesign && matchedProducts.length > 0 && (
          <div className={styles.apparelGrid}>
            {matchedProducts.map(product => {
              const sizes = Array.isArray(product.sizes) ? product.sizes : [];
              const selectedSize = formData[`supporter_${product.id}_size`] || '';
              // Use unique supporter cart ID to track separately from additional apparel
              const supporterCartId = `supporter_${product.id}`;
              const inCart = cart.some(item => item.id === supporterCartId);
              const detailRecord = additionalApparelDetails[product.id];
              const imageUrl = (detailRecord?.images && detailRecord.images.length > 0)
                ? detailRecord.images[0]
                : (product.images && product.images.length > 0 ? product.images[0] : (product.image || '/images/placeholder.svg'));
              const supporterName = `${product.name} - Supporter`;

              return (
                <div
                  key={supporterCartId}
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
                      const existingDetail = additionalApparelDetails[product.id];
                      const needsFetch = !existingDetail || !existingDetail.image || existingDetail.image === '/images/placeholder.svg' || existingDetail._lite;
                      if (needsFetch) {
                        const response = await fetch(`/api/products?id=${product.id}`);
                        const data = await response.json();
                        if (response.ok && data?.success && data.product) {
                          setAdditionalApparelDetails(prev => ({
                            ...prev,
                            [product.id]: data.product
                          }));
                          setActiveApparelImageIndex(0);
                          setActiveApparelModal({ ...data.product, isSupporter: true });
                          return;
                        }
                      }
                      setActiveApparelImageIndex(0);
                      setActiveApparelModal({ ...(existingDetail || product), isSupporter: true });
                    } catch (error) {
                      console.error('Error loading product details:', error);
                      setActiveApparelImageIndex(0);
                      setActiveApparelModal({ ...(additionalApparelDetails[product.id] || product), isSupporter: true });
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
                  {product.id >= 67 && product.id <= 86 ? (
                    <div className={styles.productCardImage} style={{
                      width: '100%',
                      height: '280px',
                      background: '#0b1220',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '12px'
                    }}>
                      <img
                        src={imageUrl}
                        alt={supporterName}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  ) : (
                    <div className={styles.productCardImage} style={{
                      width: '100%',
                      height: '280px',
                      background: '#0b1220',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <img
                        src={imageUrl}
                        alt={supporterName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  <div style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div>
                      <h5 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: '700' }}>{supporterName}</h5>
                      <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600' }}>
                        Tap to view details
                      </div>
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#22c55e' }}>
                      R{Number(product.price || 0).toFixed(2)}
                    </div>

                    {sizes.length > 0 && (
                      <select
                        value={selectedSize}
                        onChange={(e) => handleInputChange(`supporter_${product.id}_size`, e.target.value)}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sizes.length > 0 && !selectedSize) {
                          setFormAlert({ open: true, message: 'Please select a size first.' });
                          return;
                        }
                        addToCart(
                          {
                            id: supporterCartId,
                            name: supporterName,
                            price: product.price
                          },
                          sizes.length ? selectedSize : null,
                          true // auto-open cart on final step
                        );
                      }}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        background: inCart ? '#16a34a' : 'linear-gradient(135deg, #dc0000 0%, #b91c1c 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {inCart ? '✓ Added' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal for supporter product details */}
        {activeApparelModal && activeApparelModal.isSupporter && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: 'clamp(20px, 8vh, 80px)',
              paddingLeft: '16px',
              paddingRight: '16px',
              paddingBottom: '20px'
            }}
            onClick={() => setActiveApparelModal(null)}
          >
            <style>
              {`
                .supporter-modal-scroll::-webkit-scrollbar {
                  width: 8px;
                }
                .supporter-modal-scroll::-webkit-scrollbar-track {
                  background: #1f2937;
                  border-radius: 4px;
                }
                .supporter-modal-scroll::-webkit-scrollbar-thumb {
                  background: linear-gradient(180deg, #dc0000 0%, #b91c1c 100%);
                  border-radius: 4px;
                }
                .supporter-modal-scroll::-webkit-scrollbar-thumb:hover {
                  background: #ef4444;
                }
              `}
            </style>
            <div
              className={`supporter-modal-scroll ${styles.modalContainer}`}
              style={{
                background: '#111827',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: 'calc(100vh - 100px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                position: 'relative',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button - inside modal, stays visible */}
              <button
                type="button"
                onClick={() => setActiveApparelModal(null)}
                style={{
                  position: 'sticky',
                  top: '12px',
                  marginLeft: 'auto',
                  marginRight: '12px',
                  marginTop: '12px',
                  background: 'rgba(0,0,0,0.8)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.4rem',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                ×
              </button>

              {/* Large Image */}
              <div className={styles.modalImage} style={{ 
                width: '100%',
                height: '320px',
                background: '#0b1220',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                flexShrink: 0
              }}>
                <img 
                  src={modalMainImage} 
                  alt={`${activeApparelModal.name} - Supporter`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    padding: '16px'
                  }} 
                />
                {modalImages.length > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    padding: '12px',
                    background: 'rgba(0,0,0,0.7)',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    justifyContent: 'center'
                  }}>
                    {modalImages.map((img, idx) => (
                      <button
                        key={`thumb-${idx}`}
                        type="button"
                        onClick={() => setActiveApparelImageIndex(idx)}
                        style={{
                          padding: 0,
                          border: idx === activeApparelImageIndex ? '3px solid #dc0000' : '3px solid transparent',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          background: 'none'
                        }}
                      >
                        <img src={img} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover', display: 'block' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Content - Price/Size/Cart FIRST, then description */}
              <div style={{ padding: '16px 20px 20px' }}>
                {/* Product name */}
                <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.3rem', fontWeight: '700' }}>
                  {activeApparelModal.name} - Supporter
                </h3>
                
                {/* Kit subtitle - only for products with 'kit' in name (ID >= 20) */}
                {activeApparelModal.id >= 20 && activeApparelModal.name?.toLowerCase().includes('kit') && (
                  <p style={{
                    margin: '0 0 12px 0',
                    color: '#f59e0b',
                    fontSize: '0.75rem',
                    fontStyle: 'italic',
                    lineHeight: 1.4
                  }}>
                    *The team kits are examples of the design and not the final product. The final product will include the team colors.
                  </p>
                )}

                {/* Price - directly after name */}
                <div style={{
                  background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>PRICE</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#fff' }}>
                    R{Number(activeApparelModal.price || 0).toFixed(2)}
                  </span>
                </div>

                {/* Size selector - directly after price */}
                {modalSizes.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <select
                      value={selectedModalSize}
                      onChange={(e) => handleInputChange(`supporter_${activeApparelModal.id}_size`, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: '#1f2937',
                        color: '#fff',
                        fontSize: '1rem'
                      }}
                    >
                      <option value="">Select Size</option>
                      {modalSizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Add to cart button - directly after size */}
                <button
                  type="button"
                  onClick={() => {
                    if (modalSizes.length > 0 && !selectedModalSize) {
                      setFormAlert({ open: true, message: 'Please select a size first.' });
                      return;
                    }
                    const supporterCartId = `supporter_${activeApparelModal.id}`;
                    addToCart(
                      {
                        id: supporterCartId,
                        name: `${activeApparelModal.name} - Supporter`,
                        price: activeApparelModal.price
                      },
                      modalSizes.length ? selectedModalSize : null,
                      true
                    );
                    setActiveApparelModal(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: '800',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #dc0000 0%, #b91c1c 100%)',
                    color: '#fff',
                    boxShadow: '0 8px 20px rgba(220, 0, 0, 0.4)'
                  }}
                >
                  Add to Cart
                </button>

                {/* Description - LAST, after add to cart */}
                <p style={{
                  margin: '16px 0 0 0',
                  color: '#9ca3af',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  paddingTop: '12px'
                }}>
                  {activeApparelModal.description || 'Official supporter merchandise for your team.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Fetch team data from teams API whenever team dropdown changes (for kit image on step 3)
  useEffect(() => {
    if (!form || form.id !== 2) return;
    const fieldId = 8; // team dropdown field
    const submissionId = formData[fieldId];
    if (!submissionId) {
      setSelectedTeamData(null);
      return;
    }
    const dropdownInfo = submissionDropdownData[fieldId];
    if (!dropdownInfo) return;
    const selectedSubmission = dropdownInfo.submissions?.find(
      s => String(s.id) === String(submissionId)
    );
    if (!selectedSubmission) return;
    const teamName = (selectedSubmission.data?.[1] ?? selectedSubmission.data?.['1'] ?? '').trim();
    if (!teamName) return;
    fetch(`/api/teams?teamName=${encodeURIComponent(teamName)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setSelectedTeamData(d?.team || null))
      .catch(() => setSelectedTeamData(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, formData[8], submissionDropdownData]);

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
      setSelectedTeamData(null);
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

  const buildPlayerEntryErrors = (entries, { requireSizes }) => {
    const nextErrors = {};
    entries.forEach((entry, index) => {
      const entryErrors = {};
      if (!entry?.playerName) entryErrors.playerName = 'Player name is required.';
      if (!entry?.subTeam) entryErrors.subTeam = 'Select an age group team.';
      if (!entry?.dob) entryErrors.dob = 'Date of birth is required.';
      if (!entry?.birthCertificate) entryErrors.birthCertificate = 'Birth certificate is required.';
      if (!entry?.profileImage) entryErrors.profileImage = 'Profile image is required.';
      if (!entry?.shirtNumber) {
        entryErrors.shirtNumber = 'Shirt number is required.';
      } else if (!/^\d{1,2}$/.test(String(entry.shirtNumber).trim())) {
        entryErrors.shirtNumber = 'Only a 1–2 digit shirt number can be used.';
      }

      if (requireSizes) {
        if (!entry?.shirtSize) entryErrors.shirtSize = 'Select a shirt size.';
        if (!entry?.pantsSize) entryErrors.pantsSize = 'Select a pants size.';
      }

      if (Object.keys(entryErrors).length > 0) {
        nextErrors[index] = entryErrors;
      }
    });
    return nextErrors;
  };

  const mergePlayerEntryErrors = (incoming) => {
    setPlayerEntryErrors((prev) => {
      const next = {};
      const keys = new Set([...Object.keys(prev), ...Object.keys(incoming)]);
      keys.forEach((key) => {
        const idx = Number(key);
        const prevErrors = prev[idx] || {};
        const incomingErrors = incoming[idx] || {};
        const merged = { ...prevErrors, ...incomingErrors };
        Object.keys(merged).forEach((fieldKey) => {
          if (!merged[fieldKey]) delete merged[fieldKey];
        });
        if (Object.keys(merged).length > 0) {
          next[idx] = merged;
        }
      });
      return next;
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
            return false;
          }
          return !formData[`${field.id}_size`];
        }

        if (field.type === 'player-entries') {
          const entries = getPlayerEntries();
          const playerErrors = buildPlayerEntryErrors(entries, { requireSizes: false });
          if (Object.keys(playerErrors).length > 0) {
            mergePlayerEntryErrors(playerErrors);
            return true;
          }
          return false;
        }
        
        // Checkout form requires all checkout fields — set per-field errors
        if (field.type === 'checkout-form') {
          const requiredCheckoutFields = ['checkout_email', 'checkout_password', 'checkout_firstName', 'checkout_lastName', 'checkout_phone'];
          const emptyFields = requiredCheckoutFields.filter(fieldName => !formData[fieldName]);
          if (emptyFields.length > 0) {
            setValidationErrors(prev => {
              const next = { ...prev };
              emptyFields.forEach(f => { next[f] = true; });
              return next;
            });
            return true;
          }
          return false;
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

    // Player Registration Step 1: validate email format, password length, phone format
    if (form.id === 2 && currentPage === 1) {
      const email = String(formData[38] || '').trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormAlert({ open: true, message: 'Please enter a valid email address.' });
        const emailField = currentFields.find(f => f.id === 38);
        if (emailField) focusMissingField(emailField);
        return;
      }
      const password = String(formData[39] || '');
      if (password && password.length < 6) {
        setFormAlert({ open: true, message: 'Password must be at least 6 characters long.' });
        const pwField = currentFields.find(f => f.id === 39);
        if (pwField) focusMissingField(pwField);
        return;
      }
      const phone = String(formData[40] || '').trim();
      if (phone && !/^[0-9+\-\s()]{7,15}$/.test(phone)) {
        setFormAlert({ open: true, message: 'Please enter a valid phone number (digits, spaces, +, -, parentheses allowed).' });
        const phoneField = currentFields.find(f => f.id === 40);
        if (phoneField) focusMissingField(phoneField);
        return;
      }
      // Also validate secondary phone if provided
      const phone2 = String(formData[41] || '').trim();
      if (phone2 && !/^[0-9+\-\s()]{7,15}$/.test(phone2)) {
        setFormAlert({ open: true, message: 'Please enter a valid secondary phone number.' });
        const phone2Field = currentFields.find(f => f.id === 41);
        if (phone2Field) focusMissingField(phone2Field);
        return;
      }
    }

    if (form.id === 2 && currentPage === 3) {
      const entries = getPlayerEntries();
      const sizeErrors = buildPlayerEntryErrors(entries, { requireSizes: true });
      if (Object.keys(sizeErrors).length > 0) {
        mergePlayerEntryErrors(sizeErrors);
        const playerField = currentFields.find((field) => field.type === 'player-entries');
        if (playerField) {
          focusMissingField(playerField);
        }
        return;
      }
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

    if (isMultiPage) {
      const currentIndex = orderedPages.findIndex(page => page.pageId === currentPage);
      const nextPage = orderedPages[currentIndex + 1];
      if (nextPage) {
        setCurrentPage(nextPage.pageId);
      }
      return;
    }
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (isMultiPage) {
      const currentIndex = orderedPages.findIndex(page => page.pageId === currentPage);
      const prevPage = orderedPages[currentIndex - 1];
      if (prevPage) {
        setCurrentPage(prevPage.pageId);
      }
      return;
    }
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  useEffect(() => {
    if (!formTopRef.current) return;
    requestAnimationFrame(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [currentPage]);

  useEffect(() => {
    if (form?.id !== 2 || currentPage !== 5) return;

    openCart();

    setFormData((prev) => {
      let hasChanges = false;
      const next = { ...prev };
      const parentName = String(prev[37] || '').trim();
      const parentEmail = String(prev[38] || '').trim();
      const parentPassword = String(prev[39] || '').trim();
      const parentPhone = String(prev[40] || '').trim();

      if (!next.checkout_email && parentEmail) {
        next.checkout_email = parentEmail;
        hasChanges = true;
      }
      if (!next.checkout_password && parentPassword) {
        next.checkout_password = parentPassword;
        hasChanges = true;
      }

      if (parentName && (!next.checkout_firstName || !next.checkout_lastName)) {
        const parts = parentName.split(/\s+/).filter(Boolean);
        const firstName = parts.shift() || '';
        const lastName = parts.join(' ');
        if (!next.checkout_firstName && firstName) {
          next.checkout_firstName = firstName;
          hasChanges = true;
        }
        if (!next.checkout_lastName && lastName) {
          next.checkout_lastName = lastName;
          hasChanges = true;
        }
      }

      if (!next.checkout_phone && parentPhone) {
        next.checkout_phone = parentPhone;
        hasChanges = true;
      }

      return hasChanges ? next : prev;
    });
  }, [form?.id, currentPage]);

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

    // Only allow navigating back to previous pages, not skipping ahead
    const currentIndex = orderedPages.findIndex(p => p.pageId === currentPage);
    const targetIndex = orderedPages.findIndex(p => p.pageId === pageId);
    if (targetIndex > currentIndex) return;

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

    if (Object.values(playerEntryErrors).some((entry) => entry?.shirtNumber)) {
      setSubmitting(false);
      const allFields = isMultiPage
        ? form.pages.flatMap(p => p.fields)
        : form.fields;
      const playerField = allFields.find((field) => field.type === 'player-entries');
      if (playerField) {
        focusMissingField(playerField);
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
            return false;
          }
          return !formData[`${field.id}_size`];
        }

        if (field.type === 'player-entries') {
          const entries = getPlayerEntries();
          const playerErrors = buildPlayerEntryErrors(entries, { requireSizes: true });
          if (Object.keys(playerErrors).length > 0) {
            mergePlayerEntryErrors(playerErrors);
            return true;
          }
          return false;
        }
        
        // Kit pricing and entry fee pricing - skip validation (these are display/config fields)
        if (field.type === 'kit-pricing' || field.type === 'entry-fee-pricing') {
          return false; // Never mark as missing
        }
        
        // Checkout form requires all checkout fields — set per-field errors
        if (field.type === 'checkout-form') {
          const requiredCheckoutFields = ['checkout_email', 'checkout_password', 'checkout_firstName', 'checkout_lastName', 'checkout_phone'];
          const emptyFields = requiredCheckoutFields.filter(fieldName => !formData[fieldName]);
          if (emptyFields.length > 0) {
            setValidationErrors(prev => {
              const next = { ...prev };
              emptyFields.forEach(f => { next[f] = true; });
              return next;
            });
            return true;
          }
          return false;
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

    if (form.id === 2) {
      const entries = getPlayerEntries();
      combinedData.existingCricClubsProfiles = entries.map((_, index) => {
        const selected = playerLookupState[index]?.selectedProfile || null;
        if (!selected) return null;
        return {
          id: selected.id,
          name: selected.name,
          profileUrl: selected.profileUrl
        };
      });
    }

    try {
      if (form.id === 2) {
        const entries = getPlayerEntries();
        if (entries.length > 0) {
          const compressedEntries = [];
          for (const entry of entries) {
            const nextEntry = { ...entry };
            if (nextEntry.birthCertificate) {
              nextEntry.birthCertificate = await compressImageDataUrl(nextEntry.birthCertificate, {
                maxWidth: 1600,
                maxHeight: 1600,
                quality: 0.7
              });
            }
            if (nextEntry.profileImage) {
              nextEntry.profileImage = await compressImageDataUrl(nextEntry.profileImage, {
                maxWidth: 1200,
                maxHeight: 1200,
                quality: 0.7
              });
            }
            compressedEntries.push(nextEntry);
          }
          combinedData[45] = compressedEntries;
        }
      } else {
        const birthCertField = allFields.find((field) => field.id === 43);
        if (birthCertField && combinedData[43]) {
          combinedData[43] = await compressImageDataUrl(combinedData[43], {
            maxWidth: 1600,
            maxHeight: 1600,
            quality: 0.7
          });
        }
      }

      // Submit the form via API
      // For player registration, include cart items in submission
      const submissionPayload = {
        formId: form.id,
        data: combinedData
      };
      if (form.id === 2 && cart.length > 0) {
        submissionPayload.cartItems = cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          selectedSize: item.selectedSize || null
        }));
        submissionPayload.cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      }
      const response = await fetch('/api/form-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionPayload)
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

      if (form.id === 2 && typeof window !== 'undefined') {
        // Don't clear formDraft yet — checkout page needs it for customer profile
        if (onSubmitSuccess) {
          onSubmitSuccess(result.submission);
        }
        window.location.assign('/checkout');
        return;
      }

      // Clear draft for non-checkout forms (form 2 draft is cleared on payment success)
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

  const useFormBackground = form?.id === 2 && formBackground && formBackgroundReady;

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

  if (landingPageLoading) {
    return (
      <div
        className={styles.formBackgroundWrapper}
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ color: '#9ca3af', fontWeight: '600' }}>Loading registration...</div>
      </div>
    );
  }

  // Show landing page if enabled
  if (showLandingPage && landingPage) {
    const landingContent = (
      <FormLandingPage 
        landingPage={landingPage} 
        useFormBackground={useFormBackground}
        onStart={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState({ view: 'form' }, '', window.location.href);
          }
          landingPageDismissedRef.current = true;
          setShowLandingPage(false);
          setTimeout(() => {
            formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        }} 
      />
    );

    if (!useFormBackground) {
      return landingContent;
    }

    return (
      <div className={styles.formBackgroundWrapper} style={{ minHeight: '100vh' }}>
        {formBackground && <div className={styles.formBackgroundEffect} />}
        <div className={styles.landingBackgroundContent}>
          {landingContent}
        </div>
      </div>
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
            {orderedPages.map((page, idx) => (
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
                    Step {idx + 1} of {totalPages}
                  </div>
                </div>
                {idx < orderedPages.length - 1 && (
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
                      } else if (formData[field.id].length !== numberOfTeams) {
                        const current = formData[field.id];
                        let synced;
                        if (numberOfTeams < current.length) {
                          synced = current.slice(0, numberOfTeams);
                        } else {
                          synced = [...current];
                          for (let i = current.length; i < numberOfTeams; i++) {
                            synced.push({ teamNumber: i + 1, teamName: '', ageGroup: '', gender: '', coachName: '', coachContact: '' });
                          }
                        }
                        handleInputChange(field.id, synced);
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
                {field.type !== 'supporter-apparel' && (
                <label className={styles.label}>
                  {field.label}
                  {field.required && <span className={styles.required}>*</span>}
                  {field.autofillFromSubmission && formData[field.id] && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#22c55e', fontWeight: '500' }}>
                      (auto-filled)
                    </span>
                  )}
                </label>
                )}
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

              {field.type === 'player-entries' && (() => {
                const entries = getPlayerEntries();
                const playerCount = Math.min(parseInt(formData[field.dependsOn] || 0, 10) || entries.length, 4);
                const allFields = isMultiPage
                  ? form.pages.flatMap(page => page.fields || [])
                  : form.fields;
                const teamDropdownField = allFields.find(f => f.type === 'submission-dropdown' && f.id === 8);
                const selectedTeamId = teamDropdownField ? formData[teamDropdownField.id] : null;
                const teamSubmissions = teamDropdownField
                  ? (submissionDropdownData[teamDropdownField.id]?.submissions || [])
                  : [];
                const selectedSubmission = teamSubmissions.find(
                  sub => String(sub.id) === String(selectedTeamId)
                );
                const rawSubTeams = selectedSubmission?.data?.[33] ?? selectedSubmission?.data?.['33'];
                const subTeams = typeof rawSubTeams === 'string'
                  ? JSON.parse(rawSubTeams || '[]')
                  : rawSubTeams;

                if (!playerCount) {
                  return (
                    <div className={styles.kitSizeChartPlaceholder}>Select the number of players to continue.</div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    {!selectedTeamId && (
                      <div className={styles.kitSizeChartPlaceholder}>Select a team first to load age group options.</div>
                    )}
                    {Array.from({ length: playerCount }, (_, index) => {
                      const entry = entries[index] || {};
                      const lookupState = playerLookupState[index] || {};
                      const entryErrors = playerEntryErrors[index] || {};
                      const hasSubTeams = Array.isArray(subTeams) && subTeams.length > 0;

                      return (
                        <div key={`player-entry-${index}`} className={styles.playerCard}>
                          <div className={styles.playerCardHeader}>
                            <div>
                              <div className={styles.playerCardTitle}>Player {index + 1}</div>
                              <div className={styles.playerCardSubtitle}>Complete the details for this player.</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Player Name — full width */}
                            <div>
                              <label className={styles.kitSizingLabel}>Player Name and Surname *</label>
                              <input
                                type="text"
                                placeholder="Enter full name"
                                value={entry.playerName || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  updatePlayerEntry(index, { playerName: value });
                                  handlePlayerLookup(value, index);
                                }}
                                className={styles.input}
                              />
                              {entryErrors.playerName && (
                                <div className={styles.fieldErrorText}>{entryErrors.playerName}</div>
                              )}

                              {lookupState.loading && (
                                <div style={{
                                  marginTop: '10px',
                                  padding: '14px',
                                  background: 'rgba(220, 38, 38, 0.1)',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(220, 38, 38, 0.3)',
                                  color: '#dc2626',
                                  fontSize: '0.9rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px'
                                }}>
                                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>🔍</span>
                                  Searching Winter League player database...
                                </div>
                              )}

                              {!lookupState.loading && lookupState.searched && (lookupState.results || []).length > 0 && (
                                <div style={{
                                  marginTop: '10px',
                                  padding: '14px',
                                  background: '#0f172a',
                                  borderRadius: '12px',
                                  border: '1px solid rgba(220, 38, 38, 0.4)',
                                }}>
                                  <div style={{
                                    color: '#dc2626',
                                    fontSize: '0.95rem',
                                    fontWeight: '700',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    ⚠️ Existing player(s) found with this name:
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {lookupState.results.map((player, idx) => {
                                      const isSelected = lookupState.selectedProfile && String(lookupState.selectedProfile.id) === String(player.id);
                                      return (
                                        <div
                                          key={idx}
                                          onClick={() => {
                                            if (isSelected) {
                                              updatePlayerLookupState(index, { selectedProfile: null });
                                            } else {
                                              updatePlayerLookupState(index, { selectedProfile: player });
                                              updatePlayerEntry(index, { playerName: player.name });
                                            }
                                          }}
                                          style={{
                                            padding: '12px 14px',
                                            background: isSelected
                                              ? '#2a1520'
                                              : '#0b1120',
                                            borderRadius: '8px',
                                            border: isSelected
                                              ? '2px solid #dc2626'
                                              : '1px solid rgba(255, 255, 255, 0.1)',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <div style={{
                                              width: '24px',
                                              height: '24px',
                                              borderRadius: '6px',
                                              border: isSelected
                                                ? '2px solid #dc2626'
                                                : '2px solid rgba(255, 255, 255, 0.4)',
                                              background: isSelected
                                                ? '#dc2626'
                                                : 'transparent',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              flexShrink: 0,
                                              marginTop: '2px',
                                            }}>
                                              {isSelected && (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                  <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                              )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                              <div style={{
                                                fontWeight: '700',
                                                color: '#fff',
                                                fontSize: '1rem',
                                                marginBottom: '4px'
                                              }}>
                                                {player.name}
                                                {isSelected && <span style={{ marginLeft: '8px', color: '#22c55e', fontSize: '0.85rem' }}>✓ Selected</span>}
                                              </div>
                                              <div style={{
                                                fontSize: '0.85rem',
                                                color: 'rgba(255,255,255,0.7)',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '8px'
                                              }}>
                                                {player.team && (
                                                  <span style={{
                                                    background: 'rgba(220, 38, 38, 0.2)',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.8rem'
                                                  }}>
                                                    {player.team}
                                                  </span>
                                                )}
                                                {player.series && (
                                                  <span style={{
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.8rem'
                                                  }}>
                                                    {player.series}
                                                  </span>
                                                )}
                                              </div>
                                              <a
                                                href={player.profileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                  display: 'inline-block',
                                                  marginTop: '8px',
                                                  fontSize: '0.8rem',
                                                  color: '#dc2626',
                                                  textDecoration: 'none'
                                                }}
                                              >
                                                View CricClubs Profile →
                                              </a>
                                            </div>
                                            <div style={{
                                              fontSize: '0.75rem',
                                              color: isSelected ? '#22c55e' : 'rgba(255,255,255,0.5)',
                                              fontWeight: '600',
                                              textTransform: 'uppercase',
                                              letterSpacing: '0.5px'
                                            }}>
                                              {isSelected ? '✓ SELECTED' : 'TAP TO SELECT'}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {lookupState.selectedProfile && (
                                    <div style={{
                                      marginTop: '12px',
                                      padding: '10px 12px',
                                      background: 'rgba(220, 38, 38, 0.15)',
                                      borderRadius: '8px',
                                      border: '1px solid rgba(220, 38, 38, 0.3)',
                                      color: '#fff',
                                      fontSize: '0.85rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}>
                                      <span style={{ color: '#dc2626' }}>✓</span>
                                      You selected: <strong>{lookupState.selectedProfile.name}</strong> - Your stats will be linked to this profile.
                                    </div>
                                  )}

                                  {!lookupState.selectedProfile && (
                                    <p style={{
                                      marginTop: '12px',
                                      fontSize: '0.85rem',
                                      color: 'rgba(255, 255, 255, 0.6)',
                                      fontStyle: 'italic',
                                      lineHeight: 1.5
                                    }}>
                                      If this is you, select your profile to link your stats. Otherwise, continue with your name as entered.
                                    </p>
                                  )}
                                </div>
                              )}

                              {!lookupState.loading && lookupState.searched && (lookupState.results || []).length === 0 && (entry.playerName || '').trim().length >= 2 && (
                                <div style={{
                                  marginTop: '10px',
                                  padding: '14px',
                                  background: '#0f172a',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(34, 197, 94, 0.4)',
                                  color: '#22c55e',
                                  fontSize: '0.9rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px'
                                }}>
                                  <span style={{ fontSize: '1.2rem' }}>✓</span>
                                  <span>No existing player found - you will be registered as a new player on the Winter League Cricket database.</span>
                                </div>
                              )}
                            </div>

                            {/* Age Group Team — full width */}
                            <div>
                              <label className={styles.kitSizingLabel}>Select Age Group Team *</label>
                              {!selectedTeamId && (
                                <div className={styles.kitSizeChartPlaceholder}>Select a team to choose an age group.</div>
                              )}
                              {selectedTeamId && !hasSubTeams && (
                                <div className={styles.kitSizeChartPlaceholder}>No age group teams found for this team.</div>
                              )}
                              {selectedTeamId && hasSubTeams && (
                                <div
                                  className={styles.selectGlowWrap}
                                  tabIndex={0}
                                  onBlur={(e) => {
                                    const wrapper = e.currentTarget;
                                    setTimeout(() => {
                                      if (wrapper && !wrapper.contains(document.activeElement)) {
                                        setDropdownOpen((prev) => ({
                                          ...prev,
                                          [`player_${index}_subTeam`]: false
                                        }));
                                      }
                                    }, 100);
                                  }}
                                >
                                  <button
                                    type="button"
                                    className={styles.dropdownButton}
                                    onClick={() =>
                                      setDropdownOpen((prev) => ({
                                        ...prev,
                                        [`player_${index}_subTeam`]: !prev[`player_${index}_subTeam`]
                                      }))
                                    }
                                  >
                                    <span className={styles.dropdownButtonText}>
                                      {entry.subTeam
                                        ? (() => {
                                            try {
                                              const parsed = JSON.parse(entry.subTeam);
                                              return `${parsed.teamName} (${parsed.gender} - ${parsed.ageGroup})`;
                                            } catch (error) {
                                              return 'Select age group team...';
                                            }
                                          })()
                                        : 'Select age group team...'}
                                    </span>
                                    <span className={styles.dropdownChevron} aria-hidden="true">▾</span>
                                  </button>
                                  {dropdownOpen[`player_${index}_subTeam`] && (
                                    <div className={styles.dropdownPanel}>
                                      <div className={`${styles.dropdownList} ${subTeams.length > 3 ? styles.dropdownListScroll : ''}`}>
                                        {subTeams.map((subTeam, subIndex) => {
                                          const label = `${subTeam.teamName} (${subTeam.gender} - ${subTeam.ageGroup})`;
                                          const value = JSON.stringify(subTeam);
                                          const isSelected = entry.subTeam === value;
                                          return (
                                            <button
                                              type="button"
                                              key={subIndex}
                                              className={`${styles.dropdownItem} ${isSelected ? styles.dropdownItemActive : ''}`}
                                              onClick={() => {
                                                updatePlayerEntry(index, { subTeam: value });
                                                setDropdownOpen((prev) => ({
                                                  ...prev,
                                                  [`player_${index}_subTeam`]: false
                                                }));
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
                              )}
                              {entryErrors.subTeam && (
                                <div className={styles.fieldErrorText}>{entryErrors.subTeam}</div>
                              )}
                            </div>

                            {/* Date of Birth + Shirt Number — side by side */}
                            <div className={styles.playerTwoCol}>
                              <div>
                                <label className={styles.kitSizingLabel}>Date of Birth *</label>
                                <Flatpickr
                                  value={entry.dob || ''}
                                  options={{
                                    dateFormat: 'Y-m-d',
                                    altInput: true,
                                    altFormat: 'Y/m/d',
                                    allowInput: true,
                                    disableMobile: true,
                                    monthSelectorType: 'dropdown',
                                    maxDate: 'today',
                                    minDate: '1950-01-01'
                                  }}
                                  onChange={(_, dateStr) => updatePlayerEntry(index, { dob: dateStr })}
                                  placeholder="Select date"
                                  className={styles.input}
                                />
                                {entryErrors.dob && (
                                  <div className={styles.fieldErrorText}>{entryErrors.dob}</div>
                                )}
                              </div>
                              <div>
                                <label className={styles.kitSizingLabel}>Shirt Number *</label>
                                <input
                                  type="number"
                                  placeholder="1-99"
                                  value={entry.shirtNumber || ''}
                                  onChange={(e) => updatePlayerEntry(index, { shirtNumber: e.target.value })}
                                  className={styles.input}
                                  min={1}
                                  max={99}
                                />
                                {entryErrors.shirtNumber && (
                                  <div className={styles.fieldErrorText}>{entryErrors.shirtNumber}</div>
                                )}
                              </div>
                            </div>

                            {/* Profile Image + Birth Certificate — side by side */}
                            <div className={styles.playerTwoCol}>
                              <div>
                                <label className={styles.kitSizingLabel}>Player Profile Image *</label>
                                <div className={styles.uploadField}>
                                  <label
                                    className={styles.dropzone}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const file = e.dataTransfer.files?.[0];
                                      handlePlayerFileUpload(file, index, 'profileImage', 'Profile image');
                                    }}
                                  >
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files[0];
                                        handlePlayerFileUpload(file, index, 'profileImage', 'Profile image');
                                      }}
                                      className={styles.uploadInput}
                                    />
                                    <div className={styles.dropzoneIcon}>⤴</div>
                                    <div className={styles.dropzoneText}>Drag & drop profile image</div>
                                    <div className={styles.dropzoneHint}>or click to browse</div>
                                  </label>
                                  <div className={styles.uploadRow}>
                                    {entry.profileImage && (
                                      <button
                                        type="button"
                                        className={styles.uploadRemove}
                                        onClick={() => updatePlayerEntry(index, { profileImage: '' })}
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                  {entry.profileImage && (
                                    <div className={styles.uploadPreview}>
                                      <img src={entry.profileImage} alt="Profile preview" />
                                      <span>Uploaded successfully</span>
                                    </div>
                                  )}
                                  {entryErrors.profileImage && (
                                    <div className={styles.fieldErrorText}>{entryErrors.profileImage}</div>
                                  )}
                                </div>
                              </div>

                              <div>
                                <label className={styles.kitSizingLabel}>Birth Certificate Upload *</label>
                              <div className={styles.uploadField}>
                                <label
                                  className={styles.dropzone}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files?.[0];
                                    handlePlayerFileUpload(file, index, 'birthCertificate', 'Birth certificate');
                                  }}
                                >
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png"
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      handlePlayerFileUpload(file, index, 'birthCertificate', 'Birth certificate');
                                    }}
                                    className={styles.uploadInput}
                                  />
                                  <div className={styles.dropzoneIcon}>⤴</div>
                                  <div className={styles.dropzoneText}>Drag & drop birth certificate here</div>
                                  <div className={styles.dropzoneHint}>or click to browse</div>
                                </label>
                                <div className={styles.uploadRow}>
                                  {entry.birthCertificate && (
                                    <button
                                      type="button"
                                      className={styles.uploadRemove}
                                      onClick={() => updatePlayerEntry(index, { birthCertificate: '' })}
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                                {entry.birthCertificate && (
                                  <div className={styles.uploadPreview}>
                                    <img src={entry.birthCertificate} alt="Birth certificate preview" />
                                    <span>Uploaded successfully</span>
                                  </div>
                                )}
                                {entryErrors.birthCertificate && (
                                  <div className={styles.fieldErrorText}>{entryErrors.birthCertificate}</div>
                                )}
                              </div>
                            </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

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
                  } else if (formData[field.id].length !== numberOfTeams) {
                    const current = formData[field.id];
                    let synced;
                    if (numberOfTeams < current.length) {
                      synced = current.slice(0, numberOfTeams);
                    } else {
                      synced = [...current];
                      for (let i = current.length; i < numberOfTeams; i++) {
                        synced.push({ teamNumber: i + 1, teamName: '', ageGroup: '', gender: '', coachName: '', coachContact: '' });
                      }
                    }
                    handleInputChange(field.id, synced);
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
                      disableMobile: true,
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
                  <div className={styles.imageSelectGrid} style={{ 
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
                      <>
                      {formData[field.id] ? (() => {
                        const selectedDesign = shirtDesigns.find(d => d.name === formData[field.id]);
                        const allFields = isMultiPage
                          ? form.pages.flatMap(page => page.fields || [])
                          : form.fields;
                        const basicKitField = allFields.find(f => f.type === 'product-bundle');
                        const teamPricing = basicKitField ? getSelectedTeamKitPricing(basicKitField) : null;
                        const entries = getPlayerEntries();

                        // Get the admin-uploaded final kit image from the teams table (via /api/teams)
                        const finalKitImageUrl = selectedTeamData?.submissionData?.kitDesignImageUrl || selectedTeamData?.submissionData?.kitDesignImage || '';

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
                                <p className={styles.kitPreviewSubtitle}>
                                  {finalKitImageUrl ? 'Your team\'s kit design with team colours applied.' : 'Preview of the basic kit your team selected.'}
                                </p>
                              </div>
                              {!finalKitImageUrl && (
                                <div className={styles.kitPreviewMeta}>
                                  <span className={styles.kitPreviewMetaLabel}>Gallery</span>
                                  <span className={styles.kitPreviewMetaCount}>{previewImages.length} images</span>
                                </div>
                              )}
                            </div>

                            {/* Show admin-uploaded final kit as the primary image if available */}
                            {finalKitImageUrl ? (
                              <div style={{ marginBottom: '1rem' }}>
                                <button
                                  type="button"
                                  style={{
                                    display: 'block',
                                    width: '100%',
                                    background: 'none',
                                    border: '2px solid rgba(220, 38, 38, 0.3)',
                                    borderRadius: '12px',
                                    padding: '0',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    position: 'relative'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalDesign(selectedDesign);
                                  }}
                                >
                                  <img
                                    src={finalKitImageUrl}
                                    alt={`${selectedDesign.name} - Final kit with team colours`}
                                    style={{
                                      width: '100%',
                                      maxHeight: '400px',
                                      objectFit: 'contain',
                                      display: 'block',
                                      background: '#0b1220'
                                    }}
                                  />
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    left: '0',
                                    right: '0',
                                    background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                                    padding: '2rem 1rem 0.75rem',
                                    color: 'white',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.15rem' }}>
                                      Your Team&apos;s Kit with Team Colours
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>
                                      Tap to view the basic kit design gallery
                                    </div>
                                  </div>
                                </button>
                              </div>
                            ) : (
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
                            )}

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
                                      <small>Basic Kit Price</small>
                                    </div>
                                  )}
                                </div>
                                {entries.length === 0 ? (
                                  <div className={styles.kitSizeChartPlaceholder}>Add players on the previous step to choose kit sizes.</div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {entries.map((entry, index) => {
                                      const shirtSize = entry?.shirtSize || '';
                                      const pantsSize = entry?.pantsSize || '';
                                      const entryErrors = playerEntryErrors[index] || {};
                                      const playerLabel = entry?.playerName ? entry.playerName : `Player ${index + 1}`;
                                      return (
                                        <div key={`kit-player-${index}`} className={styles.playerCard}>
                                          <div className={styles.playerCardHeader}>
                                            <div>
                                              <div className={styles.playerCardTitle}>{playerLabel}</div>
                                              <div className={styles.playerCardSubtitle}>Select kit sizes for this player.</div>
                                            </div>
                                          </div>
                                          <div className={styles.kitSizingGrid}>
                                            <div>
                                              <label className={styles.kitSizingLabel}>Shirt Size *</label>
                                              <div
                                                className={styles.selectGlowWrap}
                                                tabIndex={0}
                                                onBlur={(e) => {
                                                  const wrapper = e.currentTarget;
                                                  requestAnimationFrame(() => {
                                                    if (!wrapper.contains(document.activeElement)) {
                                                      setDropdownOpen((prev) => ({
                                                        ...prev,
                                                        [`player_${index}_shirtSize`]: false
                                                      }));
                                                    }
                                                  });
                                                }}
                                              >
                                                <button
                                                  type="button"
                                                  className={styles.dropdownButton}
                                                  onClick={() =>
                                                    setDropdownOpen((prev) => ({
                                                      ...prev,
                                                      [`player_${index}_shirtSize`]: !prev[`player_${index}_shirtSize`]
                                                    }))
                                                  }
                                                >
                                                  <span className={styles.dropdownButtonText}>
                                                    {shirtSize || 'Select shirt size'}
                                                  </span>
                                                  <span className={styles.dropdownChevron} aria-hidden="true">▾</span>
                                                </button>
                                                {dropdownOpen[`player_${index}_shirtSize`] && (
                                                  <div className={styles.dropdownPanel}>
                                                    <div className={`${styles.dropdownList} ${(basicKitField.shirtSizeOptions || basicKitField.sizeOptions || []).length > 4 ? styles.dropdownListScroll : ''}`}>
                                                      {(basicKitField.shirtSizeOptions || basicKitField.sizeOptions || []).map((size) => {
                                                        const isSelected = size === shirtSize;
                                                        return (
                                                          <button
                                                            type="button"
                                                            key={`player-${index}-shirt-${size}`}
                                                            className={`${styles.dropdownItem} ${isSelected ? styles.dropdownItemActive : ''}`}
                                                            onClick={() => {
                                                              updatePlayerEntry(index, { shirtSize: size });
                                                              setDropdownOpen((prev) => ({
                                                                ...prev,
                                                                [`player_${index}_shirtSize`]: false
                                                              }));
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
                                              {entryErrors.shirtSize && (
                                                <div className={styles.fieldErrorText}>{entryErrors.shirtSize}</div>
                                              )}
                                            </div>
                                            <div>
                                              <label className={styles.kitSizingLabel}>Pants Size *</label>
                                              <div
                                                className={styles.selectGlowWrap}
                                                tabIndex={0}
                                                onBlur={(e) => {
                                                  const wrapper = e.currentTarget;
                                                  requestAnimationFrame(() => {
                                                    if (!wrapper.contains(document.activeElement)) {
                                                      setDropdownOpen((prev) => ({
                                                        ...prev,
                                                        [`player_${index}_pantsSize`]: false
                                                      }));
                                                    }
                                                  });
                                                }}
                                              >
                                                <button
                                                  type="button"
                                                  className={styles.dropdownButton}
                                                  onClick={() =>
                                                    setDropdownOpen((prev) => ({
                                                      ...prev,
                                                      [`player_${index}_pantsSize`]: !prev[`player_${index}_pantsSize`]
                                                    }))
                                                  }
                                                >
                                                  <span className={styles.dropdownButtonText}>
                                                    {pantsSize || 'Select pants size'}
                                                  </span>
                                                  <span className={styles.dropdownChevron} aria-hidden="true">▾</span>
                                                </button>
                                                {dropdownOpen[`player_${index}_pantsSize`] && (
                                                  <div className={styles.dropdownPanel}>
                                                    <div className={`${styles.dropdownList} ${(basicKitField.pantsSizeOptions || basicKitField.sizeOptions || []).length > 4 ? styles.dropdownListScroll : ''}`}>
                                                      {(basicKitField.pantsSizeOptions || basicKitField.sizeOptions || []).map((size) => {
                                                        const isSelected = size === pantsSize;
                                                        return (
                                                          <button
                                                            type="button"
                                                            key={`player-${index}-pants-${size}`}
                                                            className={`${styles.dropdownItem} ${isSelected ? styles.dropdownItemActive : ''}`}
                                                            onClick={() => {
                                                              updatePlayerEntry(index, { pantsSize: size });
                                                              setDropdownOpen((prev) => ({
                                                                ...prev,
                                                                [`player_${index}_pantsSize`]: false
                                                              }));
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
                                              {entryErrors.pantsSize && (
                                                <div className={styles.fieldErrorText}>{entryErrors.pantsSize}</div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        <div className={styles.kitAutofillNotice}>
                          Select your team to view the basic kit preview.
                        </div>
                      )}
                    {isKitPreviewField(field) && renderAdditionalApparelSection()}
                    </>
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
                    const shouldScroll = submissions.length > 3;
                    const selectClasses = [styles.select];
                    if (isTeamSelect) selectClasses.push(styles.selectTeam);
                    if (shouldScroll) selectClasses.push(styles.selectScrollable);
                    const displayFieldId = submissionDropdownData[field.id]?.displayFieldId;

                    if (isTeamSelect) {
                      const currentValue = formData[field.id] || '';
                      if (!displayFieldId) {
                        return (
                          <div className={styles.selectGlowWrap}>
                            <button
                              type="button"
                              className={styles.dropdownButton}
                              disabled={!submissionDropdownData[field.id]?.error}
                              onClick={() => {
                                if (submissionDropdownData[field.id]?.error) {
                                  setSubmissionDropdownData(prev => {
                                    const next = { ...prev };
                                    delete next[field.id];
                                    return next;
                                  });
                                }
                              }}
                            >
                              <span className={styles.dropdownButtonText}>
                                {submissionDropdownData[field.id]?.error
                                  ? 'Failed to load teams — tap to retry'
                                  : 'Loading teams...'}
                              </span>
                              <span className={styles.dropdownChevron} aria-hidden="true">▾</span>
                            </button>
                          </div>
                        );
                      }
                      const currentSelection = submissions.find(
                        (s) => String(s.id) === String(currentValue)
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
                            const wrapper = e.currentTarget;
                            setTimeout(() => {
                              if (wrapper && !wrapper.contains(document.activeElement)) {
                                setDropdownOpen((prev) => ({ ...prev, [field.id]: false }));
                              }
                            }, 100);
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
                              {submissions.length > 5 && (
                                <div className={styles.dropdownSearchWrap}>
                                  <input
                                    type="text"
                                    placeholder="Search team..."
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
                              )}
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
                        >
                          <option value="">Select an option...</option>
                          {submissions.map((submission) => {
                            const dFieldId = displayFieldId || submissionDropdownData[field.id]?.displayFieldId;
                            const displayValue = submission.data[dFieldId];
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
                      const wrapper = e.currentTarget;
                      requestAnimationFrame(() => {
                        if (!wrapper.contains(document.activeElement)) {
                          setDropdownOpen((prev) => ({ ...prev, [field.id]: false }));
                        }
                      });
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
                  <div className={styles.bundleContainer} style={{ 
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
                    <div className={styles.bundleRow} style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                      <div className={styles.bundleImage} style={{ 
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

                        <div className={styles.bundlePriceRow} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                          <div>
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Price
                            </p>
                            <p style={{ margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', fontWeight: '900', color: '#22c55e', letterSpacing: '-1px' }}>
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

                  <div className={styles.upsellGrid} style={{ 
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
                          <div className={styles.upsellCardImage} style={{ 
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
                                  formData[`upsell_${product.id}_size`] || null,
                                  true // auto-open cart on final step
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
                        fontSize: 'clamp(3rem, 8vw, 5rem)',
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
                            <p className={styles.kitPriceAmount} style={{ margin: 0, fontSize: 'clamp(1.1rem, 3.5vw, 1.5rem)', fontWeight: '800', color: '#111827' }}>
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
                                fontSize: 'clamp(1rem, 3vw, 1.3rem)',
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
                          <p className={styles.kitTotalAmount} style={{ margin: 0, fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>
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
                      <p className={styles.entryFeeAmount} style={{ margin: 0, fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>
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

              {field.type === 'supporter-apparel' && renderSupporterApparelSection()}

              {field.type === 'checkout-form' && (
                <div>
                  {/* Order Summary */}
                  {form.id === 2 && cart.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                      padding: '1.5rem',
                      borderRadius: '12px',
                      marginBottom: '1.5rem',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>
                        🛒 Order Summary
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {cart.map((item, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.5rem 0',
                            borderBottom: '1px solid rgba(255,255,255,0.06)'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: '#e5e7eb', fontSize: '0.9rem', fontWeight: '600' }}>
                                {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
                              </div>
                              {item.selectedSize && (
                                <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '2px' }}>
                                  {item.selectedSize}
                                </div>
                              )}
                            </div>
                            <div style={{ color: '#22c55e', fontWeight: '700', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                              R{(item.price * item.quantity).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '1rem',
                        paddingTop: '0.75rem',
                        borderTop: '2px solid rgba(255,255,255,0.15)'
                      }}>
                        <span style={{ color: '#f8fafc', fontWeight: '800', fontSize: '1.1rem' }}>Total</span>
                        <span style={{ color: '#22c55e', fontWeight: '800', fontSize: '1.2rem' }}>R{getCartTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  )}

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
                          style={{ width: '100%', padding: '0.7rem', border: `2px solid ${validationErrors['checkout_email'] ? '#dc2626' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                        {validationErrors['checkout_email'] && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem' }}>Email address is required.</div>}
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
                          style={{ width: '100%', padding: '0.7rem', border: `2px solid ${validationErrors['checkout_password'] ? '#dc2626' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                        {validationErrors['checkout_password'] && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem' }}>Password is required.</div>}
                      </div>

                      <div className={styles.checkoutNameGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                            style={{ width: '100%', padding: '0.7rem', border: `2px solid ${validationErrors['checkout_firstName'] ? '#dc2626' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '0.95rem' }}
                          />
                          {validationErrors['checkout_firstName'] && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem' }}>First name is required.</div>}
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
                            style={{ width: '100%', padding: '0.7rem', border: `2px solid ${validationErrors['checkout_lastName'] ? '#dc2626' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '0.95rem' }}
                          />
                          {validationErrors['checkout_lastName'] && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem' }}>Last name is required.</div>}
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
                          style={{ width: '100%', padding: '0.7rem', border: `2px solid ${validationErrors['checkout_phone'] ? '#dc2626' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                        {validationErrors['checkout_phone'] && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem' }}>Phone number is required.</div>}
                      </div>
                    </div>
                  </div>

                </div>
              )}
                  </div>
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
              {submitting
                ? 'Submitting...'
                : (form?.id === 2 ? 'Checkout' : 'Complete Registration')}
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
