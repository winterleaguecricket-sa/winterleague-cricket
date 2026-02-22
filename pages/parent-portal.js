import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function ParentPortal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminViewTab, setAdminViewTab] = useState('directory');
  const [allCustomers, setAllCustomers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showDirectory, setShowDirectory] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previousProfile, setPreviousProfile] = useState(null);
  const [previousOrders, setPreviousOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState('email');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [team, setTeam] = useState(null);
  const [ageGroupTab, setAgeGroupTab] = useState(null);
  const [parentPlayers, setParentPlayers] = useState([]);
  const [parentPlayersLoaded, setParentPlayersLoaded] = useState(false);
  const [parentTeams, setParentTeams] = useState({});

  // Recovery state for incomplete registrations
  const [recoveryData, setRecoveryData] = useState(null);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryCart, setRecoveryCart] = useState([]); // Additional products cart
  const [recoveryForm, setRecoveryForm] = useState({
    teamFormSubmissionUuid: '',
    selectedTeam: null,
    subTeam: null,
    playerName: '',
    dob: '',
    shirtNumber: '',
    shirtSize: '',
    pantsSize: '',
    profileImage: '',
    birthCertificate: '',
    parentPhoneSecondary: ''
  });

  // Age verification / correction state
  const [ageFlaggedPlayers, setAgeFlaggedPlayers] = useState([]);
  const [ageIncomplete, setAgeIncomplete] = useState([]);
  const [ageTeams, setAgeTeams] = useState([]);
  const [showAgeCorrectionForm, setShowAgeCorrectionForm] = useState(null); // submissionId or null
  const [ageCorrectionMode, setAgeCorrectionMode] = useState(''); // 'correct_dob' | 'correct_age_group'
  const [ageCorrectionData, setAgeCorrectionData] = useState({ dob: '', ageGroup: '', teamName: '', gender: 'Male', coachName: '', coachContact: '', birthCertificate: '', teamFormSubmissionUuid: '', playerName: '' });
  const [ageCorrectionSubmitting, setAgeCorrectionSubmitting] = useState(false);
  const [ageCorrectionSuccess, setAgeCorrectionSuccess] = useState(null); // submissionId that was fixed
  const [ageCorrectionError, setAgeCorrectionError] = useState('');
  // Incomplete registration correction state
  const [showIncompleteForm, setShowIncompleteForm] = useState(null); // submissionId
  const [incompleteFormData, setIncompleteFormData] = useState({ dob: '', ageGroup: '', teamName: '', gender: 'Male', coachName: '', coachContact: '', birthCertificate: '', profileImage: '', teamFormSubmissionUuid: '', selectedTeam: null, subTeam: null, playerName: '', shirtNumber: '', parentPhone: '' });
  const [incompleteSubmitting, setIncompleteSubmitting] = useState(false);
  const [incompleteSuccess, setIncompleteSuccess] = useState(null);
  const [incompleteError, setIncompleteError] = useState('');

  const statusColors = {
    pending: '#f59e0b',
    confirmed: '#3b82f6',
    in_production: '#8b5cf6',
    delivered_to_manager: '#10b981',
    cancelled: '#ef4444',
    // Legacy fallbacks
    processing: '#3b82f6',
    shipped: '#8b5cf6',
    delivered: '#10b981'
  };

  const statusColorsOnDark = {
    pending: { bg: 'rgba(245,158,11,0.18)', text: '#fcd34d' },
    confirmed: { bg: 'rgba(59,130,246,0.15)', text: '#93c5fd' },
    in_production: { bg: 'rgba(139,92,246,0.15)', text: '#c4b5fd' },
    delivered_to_manager: { bg: 'rgba(16,185,129,0.15)', text: '#6ee7b7' },
    cancelled: { bg: 'rgba(239,68,68,0.2)', text: '#fca5a5' },
    // Legacy fallbacks
    processing: { bg: 'rgba(59,130,246,0.15)', text: '#93c5fd' },
    shipped: { bg: 'rgba(139,92,246,0.15)', text: '#c4b5fd' },
    delivered: { bg: 'rgba(16,185,129,0.15)', text: '#6ee7b7' }
  };

  const formatStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      in_production: 'In Production',
      delivered_to_manager: 'Delivered to Team Manager',
      cancelled: 'Cancelled',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered'
    };
    return labels[status] || status;
  };

  // Portal icons (matching team-portal SVG style)
  const portalIcons = {
    profile: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    ),
    orders: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    ),
    tracking: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
        <rect x="1" y="6" width="22" height="12" rx="2" />
        <path d="M1 10h22M8 6v12" />
      </svg>
    ),
    players: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0" />
        <circle cx="19" cy="7" r="3" />
        <path d="M22 21a5 5 0 0 0-6-4.9" />
      </svg>
    )
  };

  // Dashboard card hover effect (matching team-portal)
  const applyDashboardCardHover = (e) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.7)';
    e.currentTarget.style.boxShadow = '0 14px 32px rgba(220,0,0,0.35), 0 0 22px rgba(255,255,255,0.25)';
    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(3,7,18,0.98) 55%, rgba(220,0,0,0.35) 100%)';
    e.currentTarget.style.filter = 'saturate(1.15) brightness(1.08)';
    const shine = e.currentTarget.querySelector('[data-card-shine]');
    if (shine) shine.style.left = '140%';
  };
  const removeDashboardCardHover = (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
    e.currentTarget.style.background = '#111827';
    e.currentTarget.style.filter = 'none';
    const shine = e.currentTarget.querySelector('[data-card-shine]');
    if (shine) shine.style.left = '-120%';
  };

  // Handle recovery form file uploads
  const handleRecoveryFileUpload = (field, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRecoveryForm(prev => ({ ...prev, [field]: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // Handle recovery form submission
  const handleRecoverySubmit = async () => {
    setRecoveryError('');
    setRecoverySubmitting(true);
    
    try {
      if (!recoveryForm.teamFormSubmissionUuid) {
        throw new Error('Please select your team');
      }
      if (!recoveryForm.subTeam) {
        throw new Error('Please select the age group team');
      }
      if (!recoveryForm.playerName) {
        throw new Error('Player name is required');
      }

      const res = await fetch('/api/complete-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.email,
          parentName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
          parentPhone: profile.phone || '',
          parentPhoneSecondary: recoveryForm.parentPhoneSecondary,
          password: '',
          teamFormSubmissionUuid: recoveryForm.teamFormSubmissionUuid,
          playerName: recoveryForm.playerName,
          subTeam: recoveryForm.subTeam,
          dob: recoveryForm.dob,
          shirtNumber: recoveryForm.shirtNumber,
          shirtSize: recoveryForm.shirtSize,
          pantsSize: recoveryForm.pantsSize,
          profileImage: recoveryForm.profileImage,
          birthCertificate: recoveryForm.birthCertificate,
          additionalItems: recoveryCart.length > 0 ? recoveryCart : undefined
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to complete registration');
      }

      // If additional products need payment, redirect to Yoco
      if (result.paymentRequired && result.paymentUrl) {
        // Registration is complete — now redirect to pay for additional items
        window.location.href = result.paymentUrl;
        return;
      }

      setRecoverySuccess(true);
      setRecoveryData(null);
      
      // Refresh parent players data
      setTimeout(async () => {
        try {
          const playersRes = await fetch(`/api/team-players?email=${encodeURIComponent(profile.email)}`);
          if (playersRes.ok) {
            const playersData = await playersRes.json();
            setParentPlayers(playersData.players || []);
          }
        } catch (e) { /* ignore */ }
      }, 1000);
      
    } catch (err) {
      setRecoveryError(err.message);
    } finally {
      setRecoverySubmitting(false);
    }
  };

  // Helper: get team's kit number from shirt_design (e.g., "Kit 17" → "17")
  const getTeamKitNumber = (team) => {
    if (!team?.shirtDesign) return null;
    const match = team.shirtDesign.match(/Kit\s*(\d+)/i);
    return match ? match[1] : null;
  };

  // Helper: get products matching the selected team's kit
  const getTeamProducts = () => {
    if (!recoveryData?.availableProducts || !recoveryForm.selectedTeam) return [];
    const kitNum = getTeamKitNumber(recoveryForm.selectedTeam);
    if (!kitNum) return [];
    // Match products by kit number in name (e.g., "Kit 17" or "Kits 17")
    const kitPattern = new RegExp(`Kits?\\s+${kitNum}\\b`, 'i');
    return recoveryData.availableProducts.filter(p => kitPattern.test(p.name));
  };

  // Helper: get generic products (no kit-specific design)
  const getGenericProducts = () => {
    if (!recoveryData?.availableProducts) return [];
    // Generic products: Cap, Beanie, Limited Hoodie — they don't have "Kit X" in name
    return recoveryData.availableProducts.filter(p => !/Kits?\s+\d+/i.test(p.name));
  };

  // Helper: add product to recovery cart
  const addToRecoveryCart = (product, selectedSize) => {
    setRecoveryCart(prev => {
      const existing = prev.find(p => p.id === product.id && p.selectedSize === selectedSize);
      if (existing) {
        return prev.map(p => p.id === product.id && p.selectedSize === selectedSize
          ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, image: product.image, selectedSize, quantity: 1 }];
    });
  };

  // Helper: remove product from recovery cart
  const removeFromRecoveryCart = (productId, selectedSize) => {
    setRecoveryCart(prev => prev.filter(p => !(p.id === productId && p.selectedSize === selectedSize)));
  };

  // Helper: get recovery cart total
  const getRecoveryCartTotal = () => {
    return recoveryCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });
      const result = await res.json();
      if (result.authenticated) {
        setProfile(result.profile);
        const ordersRes = await fetch(`/api/orders?email=${encodeURIComponent(email)}`);
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
        setActiveTab('dashboard');
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    }
  };

  // Fetch team data when profile.teamId is available
  useEffect(() => {
    if (!profile?.teamId) {
      setTeam(null);
      return;
    }
    const fetchTeam = async () => {
      try {
        const res = await fetch(`/api/teams?id=${profile.teamId}`);
        if (res.ok) {
          const data = await res.json();
          setTeam(data.team || null);
        }
      } catch (err) {
        console.error('Failed to fetch team:', err);
      }
    };
    fetchTeam();
  }, [profile?.teamId]);

  // Fetch parent's players by email (across all teams)
  useEffect(() => {
    if (!profile?.email) {
      setParentPlayers([]);
      setParentPlayersLoaded(false);
      setParentTeams({});
      return;
    }
    const fetchParentPlayers = async () => {
      try {
        const res = await fetch(`/api/team-players?email=${encodeURIComponent(profile.email)}`);
        if (res.ok) {
          const data = await res.json();
          const players = data.players || [];
          setParentPlayers(players);

          // For each unique teamId, fetch the full team (so we get all players in those teams)
          const uniqueTeamIds = [...new Set(players.map(p => p.teamId).filter(Boolean))];
          const teamsMap = {};
          await Promise.all(uniqueTeamIds.map(async (tid) => {
            try {
              const tRes = await fetch(`/api/teams?id=${tid}`);
              if (tRes.ok) {
                const tData = await tRes.json();
                teamsMap[tid] = tData.team || null;
              }
            } catch (e) { /* skip */ }
          }));
          setParentTeams(teamsMap);
        }
      } catch (err) {
        console.error('Failed to fetch parent players:', err);
      } finally {
        setParentPlayersLoaded(true);
      }
    };
    fetchParentPlayers();
  }, [profile?.email]);

  // Check for incomplete registration (paid order but no form_submission/team_player)
  useEffect(() => {
    if (!profile?.email) {
      setRecoveryData(null);
      return;
    }
    const checkRecovery = async () => {
      try {
        const res = await fetch(`/api/complete-registration?email=${encodeURIComponent(profile.email)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.needsRecovery) {
            setRecoveryData(data);
            // Pre-fill known data
            setRecoveryForm(prev => ({
              ...prev,
              playerName: data.knownData.playerNames?.[0] || '',
              shirtSize: data.knownData.sizes?.shirtSize || '',
              pantsSize: data.knownData.sizes?.pantsSize || ''
            }));
          }
        }
      } catch (err) {
        console.error('Failed to check registration recovery:', err);
      }
    };
    checkRecovery();
  }, [profile?.email]);

  // Check for age verification issues
  useEffect(() => {
    if (!profile?.email) return;
    const checkAgeVerification = async () => {
      try {
        const res = await fetch(`/api/player-age-correction?email=${encodeURIComponent(profile.email)}`);
        if (res.ok) {
          const data = await res.json();
          setAgeFlaggedPlayers(data.flaggedPlayers || []);
          setAgeIncomplete(data.incompleteRegistrations || []);
          setAgeTeams(data.teams || []);
        }
      } catch (err) {
        console.error('Failed to check age verification:', err);
      }
    };
    checkAgeVerification();
  }, [profile?.email]);

  // Handle age correction file upload
  const handleAgeCorrectionFileUpload = (stateKey, setter, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setter(prev => ({ ...prev, birthCertificate: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // Submit age correction (for flagged players)
  const handleAgeCorrectionSubmit = async (submissionId) => {
    setAgeCorrectionError('');
    setAgeCorrectionSubmitting(true);
    try {
      const payload = {
        submissionId,
        action: ageCorrectionMode,
        dob: ageCorrectionData.dob || undefined,
        ageGroup: ageCorrectionData.ageGroup || undefined,
        teamName: ageCorrectionData.teamName || undefined,
        gender: ageCorrectionData.gender || undefined,
        coachName: ageCorrectionData.coachName || undefined,
        coachContact: ageCorrectionData.coachContact || undefined,
        birthCertificate: ageCorrectionData.birthCertificate || undefined,
        playerName: ageCorrectionData.playerName || undefined,
      };
      if (ageCorrectionMode === 'correct_dob' && !payload.dob) throw new Error('Please enter the correct date of birth');
      if (ageCorrectionMode === 'correct_age_group' && !payload.ageGroup) throw new Error('Please select an age group');
      if (!ageCorrectionData.birthCertificate) throw new Error('Birth certificate upload is required');

      const res = await fetch('/api/player-age-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to submit correction');
      setAgeCorrectionSuccess(submissionId);
      setShowAgeCorrectionForm(null);
      setAgeFlaggedPlayers(prev => prev.filter(p => p.submissionId !== submissionId));
    } catch (err) {
      setAgeCorrectionError(err.message);
    } finally {
      setAgeCorrectionSubmitting(false);
    }
  };

  // Submit incomplete registration correction (for Odis-type cases)
  const handleIncompleteSubmit = async (submissionId) => {
    setIncompleteError('');
    setIncompleteSubmitting(true);
    try {
      if (!incompleteFormData.dob) throw new Error('Date of birth is required');
      if (!incompleteFormData.subTeam) throw new Error('Please select a team and age group');

      const payload = {
        submissionId,
        action: 'complete_registration',
        dob: incompleteFormData.dob,
        ageGroup: incompleteFormData.subTeam?.ageGroup || '',
        teamName: incompleteFormData.subTeam?.teamName || '',
        gender: incompleteFormData.subTeam?.gender || 'Male',
        coachName: incompleteFormData.subTeam?.coachName || '',
        coachContact: incompleteFormData.subTeam?.coachContact || '',
        birthCertificate: incompleteFormData.birthCertificate || undefined,
        profileImage: incompleteFormData.profileImage || undefined,
        teamFormSubmissionUuid: incompleteFormData.teamFormSubmissionUuid || undefined,
        playerName: incompleteFormData.playerName || undefined,
        shirtNumber: incompleteFormData.shirtNumber || undefined,
        parentPhone: incompleteFormData.parentPhone || undefined,
      };

      const res = await fetch('/api/player-age-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to complete registration');
      setIncompleteSuccess(submissionId);
      setShowIncompleteForm(null);
      setAgeIncomplete(prev => prev.filter(p => p.submissionId !== submissionId));
    } catch (err) {
      setIncompleteError(err.message);
    } finally {
      setIncompleteSubmitting(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const adminBypass = urlParams.get('admin') === 'true';

    if (adminBypass) {
      setIsAdminMode(true);
      setShowDirectory(true);
      setAdminViewTab('directory');
      const loadCustomers = async () => {
        try {
          const [custRes, teamsRes] = await Promise.all([
            fetch('/api/customers'),
            fetch('/api/teams?linkedOnly=true')
          ]);
          if (custRes.ok) {
            const data = await custRes.json();
            const list = Array.isArray(data.customers) ? data.customers : [];
            setAllCustomers(list);
          }
          if (teamsRes.ok) {
            const teamsData = await teamsRes.json();
            const list = Array.isArray(teamsData) ? teamsData : (teamsData.teams || []);
            setAllTeams(list);
          }
        } catch (err) {
          console.error('Failed to load customers:', err);
        }
      };
      loadCustomers();
    }
  }, []);

  const handleCustomerSelect = async (customer) => {
    setIsPreviewMode(false);
    setSelectedCustomerId(customer.id);
    setProfile(customer);
    try {
      const ordersRes = await fetch(`/api/orders?email=${encodeURIComponent(customer.email)}`);
      const ordersData = await ordersRes.json();
      setOrders(ordersData.orders || []);
    } catch (err) {
      console.error('Error loading orders:', err);
      setOrders([]);
    }
    setShowDirectory(false);
    setAdminViewTab('profile');
    setActiveTab('dashboard');
  };

  const previewProfile = {
    id: null,
    firstName: 'Preview',
    lastName: 'Customer',
    email: 'preview@winterleaguecricket.co.za',
    phone: '0800000000',
    createdAt: new Date().toISOString()
  };

  const enterPreviewMode = () => {
    if (!isPreviewMode) {
      setPreviousProfile(profile);
      setPreviousOrders(orders);
    }
    setIsPreviewMode(true);
    setProfile(previewProfile);
    setOrders([]);
    setSelectedCustomerId(null);
  };

  const exitPreviewMode = () => {
    if (isPreviewMode) {
      setIsPreviewMode(false);
      setProfile(previousProfile);
      setOrders(previousOrders);
      if (previousProfile?.id) {
        setSelectedCustomerId(previousProfile.id);
      }
    }
  };

  const handleAdminTabChange = (tab) => {
    if (tab === 'profile' && !selectedCustomerId && !previousProfile) return;
    setAdminViewTab(tab);
    if (tab === 'preview') {
      enterPreviewMode();
      setShowDirectory(false);
      setActiveTab('dashboard');
    } else if (tab === 'directory') {
      exitPreviewMode();
      setShowDirectory(true);
    } else {
      exitPreviewMode();
      setShowDirectory(false);
      setActiveTab('dashboard');
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    
    if (resetStep === 'email') {
      try {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate-reset-code', email: resetEmail })
        });
        const result = await res.json();
        if (!result.success) {
          setResetError(result.error);
          return;
        }
        setGeneratedCode(result.code);
        setResetMessage(`A 6-digit verification code has been sent to ${resetEmail}. Please check your email.`);
        setResetStep('verification');
      } catch (err) {
        setResetError('An error occurred. Please try again.');
      }
    } else if (resetStep === 'verification') {
      if (verificationCode.length !== 6) {
        setResetError('Please enter the 6-digit verification code.');
        return;
      }
      setResetMessage('');
      setResetStep('newPassword');
    } else if (resetStep === 'newPassword') {
      if (newPassword !== confirmPassword) {
        setResetError('Passwords do not match.');
        return;
      }
      if (newPassword.length < 6) {
        setResetError('Password must be at least 6 characters long.');
        return;
      }
      try {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset-password', email: resetEmail, newPassword, verificationCode })
        });
        const result = await res.json();
        if (result.success) {
          setResetMessage('Password reset successful! You can now login with your new password.');
          setTimeout(() => {
            setShowForgotPassword(false);
            setResetStep('email');
            setResetEmail('');
            setVerificationCode('');
            setNewPassword('');
            setConfirmPassword('');
            setResetMessage('');
            setResetError('');
            setGeneratedCode('');
          }, 3000);
        } else {
          setResetError(result.error);
        }
      } catch (err) {
        setResetError('An error occurred. Please try again.');
      }
    }
  };

  const cancelForgotPassword = () => {
    setShowForgotPassword(false);
    setResetStep('email');
    setResetEmail('');
    setVerificationCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetMessage('');
    setResetError('');
    setGeneratedCode('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `R ${amount.toFixed(2)}`;
  };

  // Shine Effect Component (matching team-portal)
  const ShineEffect = () => (
    <span data-card-shine="true" style={{
      position: 'absolute',
      top: 0,
      left: '-120%',
      width: '60%',
      height: '100%',
      background: 'linear-gradient(120deg, transparent, rgba(255,255,255,0.45), transparent)',
      transform: 'skewX(-20deg)',
      transition: 'left 0.5s ease',
      pointerEvents: 'none',
      zIndex: 1
    }} />
  );

  // ========================================
  // LOGIN SCREEN (not logged in, not admin)
  // ========================================
  if (!profile && !isAdminMode) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #dc0000 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <Head>
          <title>Parent Portal - Winter League Cricket</title>
        </Head>

        <div style={{
          background: 'white',
          padding: '2.5rem',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          maxWidth: '450px',
          width: '100%'
        }}>
          <h2 style={{
            marginTop: 0,
            fontSize: '2rem',
            fontWeight: 900,
            marginBottom: '0.25rem',
            background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            WL Parent Portal
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Access your profile and order history
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#374151', fontSize: '0.9rem' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your.email@example.com"
                onFocus={(e) => e.target.style.borderColor = '#dc0000'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#374151', fontSize: '0.9rem' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                onFocus={(e) => e.target.style.borderColor = '#dc0000'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '1rem',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '6px',
                marginBottom: '1rem',
                border: '1px solid #fca5a5',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
            >
              Login
            </button>
          </form>

          <button
            onClick={() => setShowForgotPassword(true)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            style={{
              width: '100%',
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'transparent',
              color: '#dc0000',
              border: '2px solid #dc0000',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
          >
            Forgot Password?
          </button>

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f3f4f6',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.8rem' }}>
              Your account is created automatically when you register a player.
            </p>
            <a
              href="/team-portal"
              style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                color: '#059669',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none'
              }}
            >
              Looking for the Team Portal? →
            </a>
          </div>
        </div>

        {showForgotPassword && renderForgotPasswordModal()}

        <style jsx global>{`
          body { margin: 0; }
        `}</style>
      </div>
    );
  }

  // ========================================
  // ADMIN DIRECTORY VIEW
  // ========================================
  if (isAdminMode && adminViewTab === 'directory') {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0b0b' }}>
        <Head>
          <title>Parent Portal - Admin Preview</title>
        </Head>

        <div className="parentPortalHeader" style={{
          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
          color: 'white',
          padding: '1rem 2rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>WL Parent Portal</h1>
              <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>
                Admin Mode
                <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0.15rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, marginLeft: '0.75rem' }}>ADMIN</span>
              </p>
            </div>
            <a
              href="/admin/profile"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '0.9rem'
              }}
            >
              ← Back to Admin
            </a>
          </div>
        </div>

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
          <div style={{
            background: '#0f0f0f',
            borderRadius: '16px',
            padding: '1rem 1.75rem',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[
                { key: 'directory', label: 'Directory' },
                { key: 'preview', label: 'Preview' },
                { key: 'profile', label: 'Selected Customer' }
              ].map((tab) => {
                const isDisabled = tab.key === 'profile' && !selectedCustomerId;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleAdminTabChange(tab.key)}
                    disabled={isDisabled}
                    style={{
                      padding: '0.55rem 1.2rem',
                      background: adminViewTab === tab.key ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' : 'rgba(255,255,255,0.08)',
                      color: adminViewTab === tab.key ? '#ffffff' : '#e5e7eb',
                      border: 'none',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.5 : 1
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{
            background: '#0b0b0b',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            overflow: 'hidden',
            border: '1px solid rgba(220,0,0,0.3)'
          }}>
            <div style={{
              padding: '1.5rem 1.75rem',
              background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
              color: '#ffffff',
              fontWeight: '900',
              fontSize: '1.4rem',
              borderBottom: '1px solid rgba(255,255,255,0.2)'
            }}>
              Customer Directory
              <span style={{
                fontSize: '0.85rem',
                fontWeight: '700',
                color: '#ffffff',
                marginLeft: '0.75rem',
                background: 'rgba(0,0,0,0.4)',
                padding: '0.3rem 0.85rem',
                borderRadius: '999px'
              }}>
                {allCustomers.length} customers
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Customer', 'Email', 'Phone', 'Team', 'Member Since', 'Orders'].map((label) => (
                      <th key={label} style={{
                        background: '#111827',
                        padding: '1.25rem',
                        textAlign: 'left',
                        fontWeight: '800',
                        color: '#ffffff',
                        borderBottom: '1px solid rgba(220,0,0,0.4)',
                        textTransform: 'uppercase',
                        fontSize: '0.85rem',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allCustomers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '1.5rem', color: '#9ca3af', textAlign: 'center' }}>
                        No customers found.
                      </td>
                    </tr>
                  )}
                  {allCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220,0,0,0.12)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#f3f4f6', fontWeight: '700' }}>
                        {customer.firstName || 'Customer'} {customer.lastName || ''}
                      </td>
                      <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                        {customer.email || '\u2014'}
                      </td>
                      <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                        {customer.phone || '\u2014'}
                      </td>
                      <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {(() => {
                          if (!customer.teamId) return <span style={{ color: '#6b7280' }}>\u2014</span>;
                          const t = allTeams.find(t => t.id === customer.teamId);
                          return t ? (
                            <span style={{
                              display: 'inline-block',
                              background: 'rgba(239,68,68,0.12)',
                              color: '#f87171',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              border: '1px solid rgba(239,68,68,0.25)',
                              whiteSpace: 'nowrap'
                            }}>
                              {t.teamName || t.team_name || 'Team #' + customer.teamId}
                            </span>
                          ) : <span style={{ color: '#6b7280' }}>Team #{customer.teamId}</span>;
                        })()}
                      </td>
                      <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                        {customer.createdAt ? formatDate(customer.createdAt) : '\u2014'}
                      </td>
                      <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                        {customer.orderCount || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {renderResponsiveStyles()}
      </div>
    );
  }

  // ========================================
  // WAIT FOR PLAYER DATA BEFORE SHOWING PORTAL
  // ========================================
  if (profile && !isAdminMode && !isPreviewMode && !parentPlayersLoaded) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #dc0000 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Head>
          <title>Loading - Winter League Cricket</title>
        </Head>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1s linear infinite' }}>🏏</div>
          <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>Loading your portal...</p>
        </div>
        <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ========================================
  // PAYMENT REQUIRED GATE (logged in but unpaid)
  // ========================================
  const allUnpaid = parentPlayers.filter(p => p.paymentStatus === 'pending_payment' && p.teamId);
  if (!isAdminMode && !isPreviewMode && allUnpaid.length > 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #dc0000 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <Head>
          <title>Payment Required - Winter League Cricket</title>
        </Head>
        <div style={{
          background: '#0f0f13',
          borderRadius: '16px',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          padding: '2.5rem',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#fbbf24', fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.75rem 0' }}>
            Payment Required
          </h2>
          <p style={{ color: '#d4a574', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            You have {allUnpaid.length} player registration{allUnpaid.length !== 1 ? 's' : ''} awaiting payment.
            Please complete your payment to access the parent portal and for your {allUnpaid.length !== 1 ? 'children' : 'child'} to appear on the team roster.
          </p>
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}>
            {allUnpaid.map((p, i) => (
              <div key={p.id || i} style={{
                padding: '0.5rem 0',
                borderBottom: i < allUnpaid.length - 1 ? '1px solid rgba(245,158,11,0.15)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: '#fbbf24', fontWeight: '600', fontSize: '0.9rem' }}>
                  {p.playerName || p.name}
                </span>
                <span style={{ color: '#b45309', fontSize: '0.8rem' }}>
                  {p.teamName || 'Team assigned'}
                </span>
              </div>
            ))}
          </div>
          <a
            href="/checkout"
            style={{
              display: 'inline-block',
              padding: '0.85rem 2rem',
              background: 'linear-gradient(135deg, #dc0000 0%, #b30000 100%)',
              color: 'white',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: '700',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(220, 0, 0, 0.4)',
              marginBottom: '1rem'
            }}
          >
            Complete Payment →
          </a>
          <div style={{ marginTop: '1rem' }}>
            <button
              onClick={() => { setProfile(null); setParentPlayers([]); setParentTeams({}); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // MAIN PORTAL (logged in OR admin profile)
  // ========================================
  return (
    <div style={{ minHeight: '100vh', background: '#0b0b0b' }}>
      <Head>
        <title>{isAdminMode ? 'Parent Portal - Admin' : 'My Profile'} - Winter League Cricket</title>
      </Head>

      <div className="parentPortalHeader" style={{
        background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
        color: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>
              WL Parent Portal {profile ? ('\u00B7 ' + profile.firstName) : ''}
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>
              {profile ? profile.email : ''}
              {isAdminMode && (
                <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0.15rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, marginLeft: '0.75rem' }}>ADMIN</span>
              )}
              {isPreviewMode && (
                <span style={{ background: 'rgba(255,255,255,0.25)', padding: '0.25rem 0.85rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, marginLeft: '0.5rem' }}>PREVIEW</span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {isAdminMode && (
              <select
                value={selectedCustomerId || ''}
                onChange={(e) => {
                  const cust = allCustomers.find(c => c.id == e.target.value);
                  if (cust) handleCustomerSelect(cust);
                }}
                style={{
                  background: '#111827',
                  color: '#f9fafb',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  minWidth: '220px'
                }}
              >
                <option value="">Select Customer...</option>
                {allCustomers.map(c => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.email}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => {
                if (isAdminMode) {
                  setShowDirectory(true);
                  setAdminViewTab('directory');
                  setProfile(null);
                  setOrders([]);
                  setSelectedCustomerId(null);
                  setActiveTab('dashboard');
                  return;
                }
                setProfile(null);
                setOrders([]);
                setEmail('');
                setPassword('');
                setError('');
                setActiveTab('dashboard');
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              {isAdminMode ? '\u2190 Directory' : 'Logout'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {isAdminMode && (
          <div style={{
            background: '#0f0f0f',
            borderRadius: '16px',
            padding: '1rem 1.75rem',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[
                { key: 'directory', label: 'Directory' },
                { key: 'preview', label: 'Preview' },
                { key: 'profile', label: 'Selected Customer' }
              ].map((tab) => {
                const isDisabled = tab.key === 'profile' && !selectedCustomerId && !previousProfile;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleAdminTabChange(tab.key)}
                    disabled={isDisabled}
                    style={{
                      padding: '0.55rem 1.2rem',
                      background: adminViewTab === tab.key ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' : 'rgba(255,255,255,0.08)',
                      color: adminViewTab === tab.key ? '#ffffff' : '#e5e7eb',
                      border: 'none',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.5 : 1
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="parentBanner" style={{
          background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(3,7,18,0.95) 55%, rgba(220,0,0,0.25) 100%)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '1.5rem',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          {(() => {
            const logoUrl = team?.teamLogo || team?.submissionData?.teamLogo || team?.submissionData?.['22'] || team?.submissionData?.[22] || '';
            return logoUrl ? (
              <img
                src={logoUrl}
                alt={team?.teamName || 'Team logo'}
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(239,68,68,0.6)',
                  boxShadow: '0 6px 18px rgba(239,68,68,0.35)',
                  flexShrink: 0,
                  background: '#111827'
                }}
              />
            ) : (
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #dc0000 0%, #b30000 100%)',
                border: '2px solid rgba(239,68,68,0.6)',
                boxShadow: '0 6px 18px rgba(239,68,68,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                flexShrink: 0
              }}>
                👤
              </div>
            );
          })()}
          <div>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#f9fafb' }}>
              Welcome back, {profile.firstName}!
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#9ca3af', fontSize: '0.95rem' }}>
              {team?.teamName ? `${team.teamName} · ${profile.email}` : profile.email}
            </p>
            {isPreviewMode && (
              <span style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                padding: '0.3rem 0.85rem',
                background: 'rgba(245,158,11,0.18)',
                color: '#fcd34d',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'uppercase'
              }}>
                Preview Mode
              </span>
            )}
          </div>
        </div>

        {/* Back to Dashboard */}
        {activeTab !== 'dashboard' && (
          <button
            onClick={() => setActiveTab('dashboard')}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(220,0,0,0.5)'; e.currentTarget.style.background = 'rgba(220,0,0,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'transparent'; }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.2rem',
              background: 'transparent',
              color: '#f9fafb',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              marginBottom: '1.5rem',
              transition: 'all 0.2s'
            }}
          >
            ← Back to Dashboard
          </button>
        )}

        {/* DASHBOARD (card navigation) */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Pending Payment Warning Banner */}
            {(() => {
              const unpaidPlayers = parentPlayers.filter(p => p.paymentStatus === 'pending_payment' && p.teamId);
              if (unpaidPlayers.length === 0) return null;
              return (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.08))',
                  border: '1px solid rgba(245,158,11,0.4)',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                    <div>
                      <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '1rem' }}>
                        Payment Required
                      </div>
                      <div style={{ color: '#fbbf24', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>
                        {unpaidPlayers.length} {unpaidPlayers.length === 1 ? 'player has' : 'players have'} not completed payment. 
                        Players will only be added to their team roster once payment is confirmed.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {unpaidPlayers.map(p => (
                      <span key={p.id} style={{
                        background: 'rgba(245,158,11,0.2)',
                        color: '#fbbf24',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}>
                        {p.playerName}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => { window.location.href = '/checkout'; }}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#000',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      alignSelf: 'flex-start',
                      transition: 'all 0.2s'
                    }}
                  >
                    Complete Payment →
                  </button>
                </div>
              );
            })()}

            {/* Registration Recovery Banner */}
            {recoveryData && !recoverySuccess && !showRecoveryForm && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🔔</span>
                  <div>
                    <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '1rem' }}>
                      Action Required — Complete Your Registration
                    </div>
                    <div style={{ color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>
                      We experienced a technical issue during your registration and need a few details to finalise your player registration.
                      Your payment of R{recoveryData.knownData.totalPaid.toFixed(0)} has been received — thank you!
                      Please complete the short form below so we can add {recoveryData.knownData.playerNames[0] || 'your player'} to their team.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowRecoveryForm(true)}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                    transition: 'all 0.2s'
                  }}
                >
                  Complete Registration →
                </button>
              </div>
            )}

            {/* Recovery Success Message */}
            {recoverySuccess && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))',
                border: '1px solid rgba(16,185,129,0.4)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>
                      Registration Complete!
                    </div>
                    <div style={{ color: '#6ee7b7', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>
                      Your player has been successfully registered and added to their team. You can view their details in the Team Portal tab.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Age Verification Warning Banner — for players whose DOB fails age group cutoff */}
            {ageFlaggedPlayers.length > 0 && !showAgeCorrectionForm && ageFlaggedPlayers.map(fp => (
              ageCorrectionSuccess === fp.submissionId ? (
                <div key={fp.submissionId} style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))',
                  border: '1px solid rgba(16,185,129,0.4)',
                  borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>Correction Submitted</div>
                      <div style={{ color: '#6ee7b7', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>
                        Thank you for updating {fp.playerName}&apos;s details. Our team will review and verify the information shortly.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={fp.submissionId} style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.05))',
                  border: '1px solid rgba(239,68,68,0.5)',
                  borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                    <div>
                      <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '1rem' }}>
                        Age Verification Required — {fp.playerName}
                      </div>
                      <div style={{ color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.35rem', lineHeight: 1.6 }}>
                        Our records indicate that <strong>{fp.playerName}</strong>&apos;s date of birth ({fp.dob}) does not align with the <strong>{fp.ageGroup}</strong> age group. 
                        Players in {fp.ageGroup} must be born in <strong>{fp.cutoffYear} or later</strong>, however {fp.playerName} is recorded as born in <strong>{fp.birthYear}</strong>.
                      </div>
                      <div style={{ color: '#f87171', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.5rem', lineHeight: 1.6 }}>
                        To proceed with your registration, please either <strong>correct the date of birth</strong> or <strong>select the appropriate age group</strong> below. 
                        A <strong>birth certificate</strong> must be uploaded as proof of age. We are unable to approve this player&apos;s profile until this has been resolved.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    <button onClick={() => {
                      setShowAgeCorrectionForm(fp.submissionId);
                      setAgeCorrectionMode('correct_dob');
                      setAgeCorrectionData({ dob: '', ageGroup: fp.ageGroup, teamName: fp.teamName, gender: 'Male', coachName: '', coachContact: '', birthCertificate: '', teamFormSubmissionUuid: '', playerName: fp.playerName });
                      setAgeCorrectionError('');
                    }} style={{
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none',
                      padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                    }}>
                      Correct Date of Birth
                    </button>
                    <button onClick={() => {
                      setShowAgeCorrectionForm(fp.submissionId);
                      setAgeCorrectionMode('correct_age_group');
                      setAgeCorrectionData({ dob: fp.dob, ageGroup: '', teamName: '', gender: 'Male', coachName: '', coachContact: '', birthCertificate: '', teamFormSubmissionUuid: '', playerName: fp.playerName });
                      setAgeCorrectionError('');
                    }} style={{
                      background: 'rgba(255,255,255,0.1)', color: '#f9fafb', border: '1px solid rgba(255,255,255,0.2)',
                      padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                    }}>
                      Change Age Group
                    </button>
                  </div>
                </div>
              )
            ))}

            {/* Age Correction Form (inline) */}
            {showAgeCorrectionForm && (() => {
              const fp = ageFlaggedPlayers.find(p => p.submissionId === showAgeCorrectionForm);
              if (!fp) return null;
              return (
                <div style={{
                  background: '#111827', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px',
                  padding: '2rem', marginBottom: '1.5rem', position: 'relative'
                }}>
                  <button onClick={() => { setShowAgeCorrectionForm(null); setAgeCorrectionError(''); }} style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    background: 'rgba(255,255,255,0.1)', border: 'none', color: '#9ca3af',
                    width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>×</button>

                  <h3 style={{ margin: '0 0 0.25rem 0', color: '#f9fafb', fontSize: '1.2rem', fontWeight: 800 }}>
                    {ageCorrectionMode === 'correct_dob' ? '📅 Correct Date of Birth' : '🏏 Change Age Group'} — {fp.playerName}
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                    {ageCorrectionMode === 'correct_dob'
                      ? 'Please enter the correct date of birth and upload a birth certificate as verification.'
                      : `The date of birth on record is ${fp.dob}. Please select the correct age group for this player and upload a birth certificate.`}
                  </p>

                  {ageCorrectionError && (
                    <div style={{
                      background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
                      color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600
                    }}>{ageCorrectionError}</div>
                  )}

                  {ageCorrectionMode === 'correct_dob' && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                        Correct Date of Birth *
                      </label>
                      <input type="date" value={ageCorrectionData.dob} onChange={e => setAgeCorrectionData(prev => ({ ...prev, dob: e.target.value }))}
                        style={{
                          width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
                          background: '#1e293b', color: '#f9fafb', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                        }} />
                      <div style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                        Currently on record: {fp.dob} (born {fp.birthYear})
                      </div>
                    </div>
                  )}

                  {ageCorrectionMode === 'correct_age_group' && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                        Select Correct Age Group *
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {['U9', 'U11', 'U13', 'U15', 'U17', 'Senior'].map(ag => (
                          <button key={ag} onClick={() => setAgeCorrectionData(prev => ({ ...prev, ageGroup: ag, teamName: fp.teamName }))}
                            style={{
                              padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                              background: ageCorrectionData.ageGroup === ag ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.08)',
                              color: ageCorrectionData.ageGroup === ag ? '#c7d2fe' : '#9ca3af',
                              outline: ageCorrectionData.ageGroup === ag ? '2px solid #6366f1' : 'none'
                            }}>
                            {ag}
                          </button>
                        ))}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                        Current: {fp.ageGroup} (requires born {fp.cutoffYear}+) — Player born: {fp.birthYear}
                      </div>
                    </div>
                  )}

                  {/* Birth Certificate Upload */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      Birth Certificate Upload *
                    </label>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleAgeCorrectionFileUpload('ageCorrectionData', setAgeCorrectionData, e)}
                      style={{ color: '#9ca3af', fontSize: '0.85rem' }} />
                    {ageCorrectionData.birthCertificate && (
                      <div style={{ color: '#6ee7b7', fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 600 }}>✓ File uploaded</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => handleAgeCorrectionSubmit(fp.submissionId)} disabled={ageCorrectionSubmitting}
                      style={{
                        background: ageCorrectionSubmitting ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px',
                        fontWeight: 800, fontSize: '0.9rem', cursor: ageCorrectionSubmitting ? 'not-allowed' : 'pointer'
                      }}>
                      {ageCorrectionSubmitting ? 'Submitting...' : 'Submit Correction'}
                    </button>
                    <button onClick={() => { setShowAgeCorrectionForm(null); setAgeCorrectionError(''); }}
                      style={{
                        background: 'rgba(255,255,255,0.08)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)',
                        padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer'
                      }}>
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Incomplete Registration Recovery Banner (Odis Naidoo type — missing DOB + age group) */}
            {ageIncomplete.length > 0 && !showIncompleteForm && ageIncomplete.map(ip => (
              incompleteSuccess === ip.submissionId ? (
                <div key={ip.submissionId} style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))',
                  border: '1px solid rgba(16,185,129,0.4)',
                  borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>Registration Details Updated</div>
                      <div style={{ color: '#6ee7b7', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>
                        Thank you for completing {ip.playerName}&apos;s registration details. Our team will review and confirm shortly.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={ip.submissionId} style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.05))',
                  border: '1px solid rgba(245,158,11,0.5)',
                  borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🔔</span>
                    <div>
                      <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '1rem' }}>
                        Action Required — Complete {ip.playerName}&apos;s Registration
                      </div>
                      <div style={{ color: '#fbbf24', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.35rem', lineHeight: 1.6 }}>
                        We experienced a technical issue during registration and some of <strong>{ip.playerName}</strong>&apos;s details were not captured correctly. 
                        Your payment has been received — thank you! Please complete the information below so we can finalise the registration and add {ip.playerName} to the correct team.
                      </div>
                    </div>
                  </div>
                  <button onClick={() => {
                    setShowIncompleteForm(ip.submissionId);
                    setIncompleteFormData({ dob: '', ageGroup: '', teamName: '', gender: 'Male', coachName: '', coachContact: '', birthCertificate: '', profileImage: '', teamFormSubmissionUuid: '', selectedTeam: null, subTeam: null, playerName: ip.playerName, shirtNumber: ip.shirtNumber || '', parentPhone: ip.parentPhone || '' });
                    setIncompleteError('');
                  }} style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', border: 'none',
                    padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer'
                  }}>
                    Complete Registration Details →
                  </button>
                </div>
              )
            ))}

            {/* Incomplete Registration Form (inline — team + DOB + birth cert) */}
            {showIncompleteForm && (() => {
              const ip = ageIncomplete.find(p => p.submissionId === showIncompleteForm);
              if (!ip) return null;
              return (
                <div style={{
                  background: '#111827', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '16px',
                  padding: '2rem', marginBottom: '1.5rem', position: 'relative'
                }}>
                  <button onClick={() => { setShowIncompleteForm(null); setIncompleteError(''); }} style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    background: 'rgba(255,255,255,0.1)', border: 'none', color: '#9ca3af',
                    width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>×</button>

                  <h3 style={{ margin: '0 0 0.25rem 0', color: '#f9fafb', fontSize: '1.2rem', fontWeight: 800 }}>
                    📋 Complete Registration — {ip.playerName}
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                    Please provide the following details so we can complete {ip.playerName}&apos;s registration.
                  </p>

                  {incompleteError && (
                    <div style={{
                      background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
                      color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600
                    }}>{incompleteError}</div>
                  )}

                  {/* Player Name (pre-filled, editable) */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Player Full Name *</label>
                    <input type="text" value={incompleteFormData.playerName} onChange={e => setIncompleteFormData(prev => ({ ...prev, playerName: e.target.value }))}
                      style={{
                        width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
                        background: '#1e293b', color: '#f9fafb', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                      }} />
                  </div>

                  {/* Date of Birth */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Date of Birth *</label>
                    <input type="date" value={incompleteFormData.dob} onChange={e => setIncompleteFormData(prev => ({ ...prev, dob: e.target.value }))}
                      style={{
                        width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
                        background: '#1e293b', color: '#f9fafb', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                      }} />
                  </div>

                  {/* Team Selection */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Select Team *</label>
                    <select value={incompleteFormData.teamFormSubmissionUuid} onChange={e => {
                      const team = ageTeams.find(t => t.formSubmissionUuid === e.target.value);
                      setIncompleteFormData(prev => ({ ...prev, teamFormSubmissionUuid: e.target.value, selectedTeam: team || null, subTeam: null }));
                    }} style={{
                      width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
                      background: '#1e293b', color: '#f9fafb', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                    }}>
                      <option value="">— Select a team —</option>
                      {ageTeams.map(t => (
                        <option key={t.id} value={t.formSubmissionUuid}>{t.teamName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sub-team / Age Group Selection */}
                  {incompleteFormData.selectedTeam && incompleteFormData.selectedTeam.ageGroups.length > 0 && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Select Age Group *</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {incompleteFormData.selectedTeam.ageGroups.map((ag, i) => (
                          <button key={i} onClick={() => setIncompleteFormData(prev => ({ ...prev, subTeam: ag }))}
                            style={{
                              padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                              textAlign: 'left', fontWeight: 600, fontSize: '0.85rem',
                              background: incompleteFormData.subTeam === ag ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                              color: incompleteFormData.subTeam === ag ? '#c7d2fe' : '#9ca3af',
                              outline: incompleteFormData.subTeam === ag ? '2px solid #6366f1' : 'none'
                            }}>
                            {ag.teamName} — {ag.gender} {ag.ageGroup} {ag.coachName ? `(Coach: ${ag.coachName})` : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shirt / Jersey Number */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Preferred Shirt Number</label>
                    <input type="text" placeholder="e.g. 7" value={incompleteFormData.shirtNumber} onChange={e => setIncompleteFormData(prev => ({ ...prev, shirtNumber: e.target.value }))}
                      style={{
                        width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
                        background: '#1e293b', color: '#f9fafb', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                      }} />
                  </div>

                  {/* Parent / Emergency Contact Phone */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Parent / Emergency Contact Number *</label>
                    <input type="tel" placeholder="e.g. 082 123 4567" value={incompleteFormData.parentPhone} onChange={e => setIncompleteFormData(prev => ({ ...prev, parentPhone: e.target.value }))}
                      style={{
                        width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
                        background: '#1e293b', color: '#f9fafb', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                      }} />
                  </div>

                  {/* Kit Sizes (read-only if already captured) */}
                  {(ip.shirtSize || ip.pantsSize) && (
                    <div style={{
                      background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                      borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem'
                    }}>
                      <div style={{ color: '#93c5fd', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>KIT SIZES (ALREADY ON FILE)</div>
                      <div style={{ display: 'flex', gap: '1.5rem', color: '#e2e8f0', fontSize: '0.9rem' }}>
                        {ip.shirtSize && <span>Shirt: <strong>{ip.shirtSize}</strong></span>}
                        {ip.pantsSize && <span>Pants: <strong>{ip.pantsSize}</strong></span>}
                      </div>
                    </div>
                  )}

                  {/* Profile Photo Upload */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Player Profile Photo</label>
                    <input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) { alert('File too large. Maximum 5MB.'); return; }
                      const reader = new FileReader();
                      reader.onload = (ev) => setIncompleteFormData(prev => ({ ...prev, profileImage: ev.target.result }));
                      reader.readAsDataURL(file);
                    }}
                      style={{ color: '#9ca3af', fontSize: '0.85rem' }} />
                    {incompleteFormData.profileImage && (
                      <div style={{ color: '#6ee7b7', fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 600 }}>✓ Photo uploaded</div>
                    )}
                  </div>

                  {/* Birth Certificate */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Birth Certificate Upload</label>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleAgeCorrectionFileUpload('incompleteFormData', setIncompleteFormData, e)}
                      style={{ color: '#9ca3af', fontSize: '0.85rem' }} />
                    {incompleteFormData.birthCertificate && (
                      <div style={{ color: '#6ee7b7', fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 600 }}>✓ Certificate uploaded</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => handleIncompleteSubmit(ip.submissionId)} disabled={incompleteSubmitting}
                      style={{
                        background: incompleteSubmitting ? 'rgba(245,158,11,0.3)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px',
                        fontWeight: 800, fontSize: '0.9rem', cursor: incompleteSubmitting ? 'not-allowed' : 'pointer'
                      }}>
                      {incompleteSubmitting ? 'Submitting...' : 'Complete Registration'}
                    </button>
                    <button onClick={() => { setShowIncompleteForm(null); setIncompleteError(''); }}
                      style={{
                        background: 'rgba(255,255,255,0.08)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)',
                        padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer'
                      }}>
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Registration Recovery Form (fullscreen overlay) */}
            {showRecoveryForm && recoveryData && (
              <div style={{
                background: '#111827',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '16px',
                padding: '2rem',
                marginBottom: '1.5rem',
                position: 'relative'
              }}>
                <button
                  onClick={() => { setShowRecoveryForm(false); setRecoveryStep(1); setRecoveryError(''); }}
                  style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    background: 'rgba(255,255,255,0.1)', border: 'none', color: '#9ca3af',
                    width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >×</button>

                <h3 style={{ margin: '0 0 0.25rem 0', color: '#f9fafb', fontSize: '1.3rem', fontWeight: 800 }}>
                  Complete Your Player Registration
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '0 0 1.5rem 0' }}>
                  We already have some of your details from your order. Please fill in the remaining information below.
                </p>

                {recoveryError && (
                  <div style={{
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
                    color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600
                  }}>
                    {recoveryError}
                  </div>
                )}

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {[1, 2, 3, 4].map(step => (
                    <div key={step} style={{
                      flex: 1, height: '4px', borderRadius: '2px',
                      background: step <= recoveryStep ? 'linear-gradient(90deg, #ef4444, #f97316)' : 'rgba(255,255,255,0.1)'
                    }} />
                  ))}
                </div>

                {/* Step 1: Team Selection */}
                {recoveryStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ color: '#f9fafb', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                      Step 1: Select Your Team
                    </h4>

                    {/* Pre-filled info display */}
                    <div style={{
                      background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                      borderRadius: '8px', padding: '1rem',
                    }}>
                      <div style={{ color: '#93c5fd', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        INFORMATION WE HAVE
                      </div>
                      <div style={{ color: '#d1d5db', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        <strong>Parent:</strong> {recoveryData.knownData.parentName}<br />
                        <strong>Player:</strong> {recoveryData.knownData.playerNames[0] || 'N/A'}<br />
                        <strong>Kit Sizes:</strong> Shirt: {recoveryData.knownData.sizes.shirtSize || 'N/A'} / Pants: {recoveryData.knownData.sizes.pantsSize || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        Select Your Team *
                      </label>
                      <select
                        value={recoveryForm.teamFormSubmissionUuid}
                        onChange={(e) => {
                          const uuid = e.target.value;
                          const team = recoveryData.teams.find(t => t.formSubmissionUuid === uuid);
                          setRecoveryForm(prev => ({ ...prev, teamFormSubmissionUuid: uuid, selectedTeam: team, subTeam: null }));
                        }}
                        style={{
                          width: '100%', padding: '0.75rem', background: '#1f2937', color: '#f9fafb',
                          border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.95rem'
                        }}
                      >
                        <option value="">— Choose a team —</option>
                        {recoveryData.teams.map(t => (
                          <option key={t.formSubmissionUuid} value={t.formSubmissionUuid}>
                            {t.teamName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Age Group / Sub-Team Selection */}
                    {recoveryForm.selectedTeam && recoveryForm.selectedTeam.ageGroups.length > 0 && (
                      <div>
                        <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                          Select Age Group Team *
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {recoveryForm.selectedTeam.ageGroups.map((ag, idx) => (
                            <label key={idx} style={{
                              display: 'flex', alignItems: 'center', gap: '0.75rem',
                              padding: '0.75rem 1rem', background: recoveryForm.subTeam === ag ? 'rgba(239,68,68,0.15)' : '#1f2937',
                              border: `1px solid ${recoveryForm.subTeam === ag ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                              borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s'
                            }}>
                              <input
                                type="radio"
                                name="ageGroup"
                                checked={recoveryForm.subTeam === ag}
                                onChange={() => setRecoveryForm(prev => ({ ...prev, subTeam: ag }))}
                                style={{ accentColor: '#ef4444' }}
                              />
                              <div>
                                <div style={{ color: '#f9fafb', fontWeight: 700, fontSize: '0.95rem' }}>
                                  {ag.teamName} ({ag.gender} - {ag.ageGroup})
                                </div>
                                {ag.coachName && (
                                  <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                                    Coach: {ag.coachName} {ag.coachContact ? `(${ag.coachContact})` : ''}
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* If team has no age groups, just select the team directly */}
                    {recoveryForm.selectedTeam && recoveryForm.selectedTeam.ageGroups.length === 0 && (
                      <div style={{
                        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: '8px', padding: '0.75rem 1rem',
                        color: '#fbbf24', fontSize: '0.85rem'
                      }}>
                        This team has no specific age group sub-teams. Your player will be registered directly under {recoveryForm.selectedTeam.teamName}.
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (!recoveryForm.teamFormSubmissionUuid) {
                          setRecoveryError('Please select a team');
                          return;
                        }
                        if (recoveryForm.selectedTeam?.ageGroups?.length > 0 && !recoveryForm.subTeam) {
                          setRecoveryError('Please select an age group team');
                          return;
                        }
                        // If no age groups, set subTeam to a simple object with team name
                        if (!recoveryForm.subTeam && recoveryForm.selectedTeam) {
                          setRecoveryForm(prev => ({
                            ...prev,
                            subTeam: { teamName: recoveryForm.selectedTeam.teamName, gender: '', ageGroup: '' }
                          }));
                        }
                        setRecoveryError('');
                        setRecoveryStep(2);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                        border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px',
                        fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', alignSelf: 'flex-end'
                      }}
                    >
                      Next: Player Details →
                    </button>
                  </div>
                )}

                {/* Step 2: Player Details */}
                {recoveryStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ color: '#f9fafb', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                      Step 2: Player Details
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                          Player Full Name *
                        </label>
                        <input
                          type="text"
                          value={recoveryForm.playerName}
                          onChange={(e) => setRecoveryForm(prev => ({ ...prev, playerName: e.target.value }))}
                          style={{
                            width: '100%', padding: '0.75rem', background: '#1f2937', color: '#f9fafb',
                            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.95rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={recoveryForm.dob}
                          onChange={(e) => setRecoveryForm(prev => ({ ...prev, dob: e.target.value }))}
                          style={{
                            width: '100%', padding: '0.75rem', background: '#1f2937', color: '#f9fafb',
                            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.95rem'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                          Shirt Number
                        </label>
                        <input
                          type="number"
                          value={recoveryForm.shirtNumber}
                          onChange={(e) => setRecoveryForm(prev => ({ ...prev, shirtNumber: e.target.value }))}
                          placeholder="e.g. 7"
                          style={{
                            width: '100%', padding: '0.75rem', background: '#1f2937', color: '#f9fafb',
                            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.95rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                          Shirt Size
                        </label>
                        <input
                          type="text"
                          value={recoveryForm.shirtSize}
                          readOnly
                          style={{
                            width: '100%', padding: '0.75rem', background: '#0f172a', color: '#9ca3af',
                            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '0.95rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                          Pants Size
                        </label>
                        <input
                          type="text"
                          value={recoveryForm.pantsSize}
                          readOnly
                          style={{
                            width: '100%', padding: '0.75rem', background: '#0f172a', color: '#9ca3af',
                            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '0.95rem'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        Secondary Emergency Contact Number (Optional)
                      </label>
                      <input
                        type="tel"
                        value={recoveryForm.parentPhoneSecondary}
                        onChange={(e) => setRecoveryForm(prev => ({ ...prev, parentPhoneSecondary: e.target.value }))}
                        placeholder="0821234567"
                        style={{
                          width: '100%', padding: '0.75rem', background: '#1f2937', color: '#f9fafb',
                          border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.95rem'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between' }}>
                      <button
                        onClick={() => { setRecoveryStep(1); setRecoveryError(''); }}
                        style={{
                          background: 'transparent', color: '#9ca3af',
                          border: '1px solid rgba(255,255,255,0.15)', padding: '0.75rem 1.5rem',
                          borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer'
                        }}
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => {
                          if (!recoveryForm.playerName.trim()) {
                            setRecoveryError('Player name is required');
                            return;
                          }
                          setRecoveryError('');
                          setRecoveryStep(3);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                          border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px',
                          fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer'
                        }}
                      >
                        Next: Documents →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Documents */}
                {recoveryStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ color: '#f9fafb', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                      Step 3: Documents
                    </h4>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
                      Upload your player&apos;s profile photo and birth certificate. These are optional but recommended.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                          Player Profile Photo
                        </label>
                        <div style={{
                          border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '8px',
                          padding: '1.5rem', textAlign: 'center', cursor: 'pointer',
                          background: recoveryForm.profileImage ? 'rgba(16,185,129,0.1)' : 'transparent',
                          borderColor: recoveryForm.profileImage ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'
                        }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleRecoveryFileUpload('profileImage', e)}
                            style={{ display: 'none' }}
                            id="recovery-profile-img"
                          />
                          <label htmlFor="recovery-profile-img" style={{ cursor: 'pointer', color: '#9ca3af', fontSize: '0.85rem' }}>
                            {recoveryForm.profileImage ? '✅ Photo uploaded' : '📷 Click to upload'}
                          </label>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                          Birth Certificate
                        </label>
                        <div style={{
                          border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '8px',
                          padding: '1.5rem', textAlign: 'center', cursor: 'pointer',
                          background: recoveryForm.birthCertificate ? 'rgba(16,185,129,0.1)' : 'transparent',
                          borderColor: recoveryForm.birthCertificate ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'
                        }}>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleRecoveryFileUpload('birthCertificate', e)}
                            style={{ display: 'none' }}
                            id="recovery-birth-cert"
                          />
                          <label htmlFor="recovery-birth-cert" style={{ cursor: 'pointer', color: '#9ca3af', fontSize: '0.85rem' }}>
                            {recoveryForm.birthCertificate ? '✅ Document uploaded' : '📄 Click to upload'}
                          </label>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between' }}>
                      <button
                        onClick={() => { setRecoveryStep(2); setRecoveryError(''); }}
                        style={{
                          background: 'transparent', color: '#9ca3af',
                          border: '1px solid rgba(255,255,255,0.15)', padding: '0.75rem 1.5rem',
                          borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer'
                        }}
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => { setRecoveryError(''); setRecoveryStep(4); }}
                        style={{
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                          border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px',
                          fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer'
                        }}
                      >
                        Next: Additional Products →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Additional Products & Submit */}
                {recoveryStep === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ color: '#f9fafb', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                      Step 4: Additional Products & Submit
                    </h4>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
                      Would you like to purchase any additional team apparel? This is optional — you can skip and complete your registration.
                    </p>

                    {/* Team-specific products */}
                    {(() => {
                      const teamProducts = getTeamProducts();
                      const genericProducts = getGenericProducts();
                      const kitNum = getTeamKitNumber(recoveryForm.selectedTeam);

                      return (
                        <>
                          {kitNum && teamProducts.length > 0 && (
                            <div>
                              <div style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                                Your Team Apparel (Kit {kitNum})
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                {teamProducts.map(product => (
                                  <div key={product.id} style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                  }}>
                                    {product.image && (
                                      <img src={product.image} alt={product.name} style={{
                                        width: '100%', height: '120px', objectFit: 'contain', borderRadius: '6px',
                                        background: 'rgba(255,255,255,0.08)'
                                      }} />
                                    )}
                                    <div style={{ color: '#f9fafb', fontSize: '0.85rem', fontWeight: 700 }}>{product.name}</div>
                                    <div style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 800 }}>R{product.price.toFixed(2)}</div>
                                    {product.sizes && product.sizes.length > 0 ? (
                                      <select
                                        id={`prod-size-${product.id}`}
                                        onChange={() => {}}
                                        defaultValue=""
                                        style={{
                                          background: '#1e293b', color: '#f9fafb', border: '1px solid rgba(255,255,255,0.15)',
                                          borderRadius: '6px', padding: '0.4rem', fontSize: '0.8rem'
                                        }}
                                      >
                                        <option value="" disabled>Select size</option>
                                        {product.sizes.map(sz => (
                                          <option key={sz} value={sz}>{sz}</option>
                                        ))}
                                      </select>
                                    ) : null}
                                    <button
                                      onClick={() => {
                                        const sizeEl = document.getElementById(`prod-size-${product.id}`);
                                        const size = sizeEl ? sizeEl.value : null;
                                        if (product.sizes && product.sizes.length > 0 && !size) {
                                          setRecoveryError('Please select a size for ' + product.name);
                                          return;
                                        }
                                        setRecoveryError('');
                                        addToRecoveryCart(product, size);
                                      }}
                                      style={{
                                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
                                        border: 'none', padding: '0.5rem', borderRadius: '6px',
                                        fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                                      }}
                                    >
                                      + Add to Cart
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Generic products */}
                          {genericProducts.length > 0 && (
                            <div style={{ marginTop: teamProducts.length > 0 ? '0.5rem' : 0 }}>
                              <div style={{ color: '#93c5fd', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                                General Merchandise
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                {genericProducts.map(product => (
                                  <div key={product.id} style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                  }}>
                                    {product.image && (
                                      <img src={product.image} alt={product.name} style={{
                                        width: '100%', height: '120px', objectFit: 'contain', borderRadius: '6px',
                                        background: 'rgba(255,255,255,0.08)'
                                      }} />
                                    )}
                                    <div style={{ color: '#f9fafb', fontSize: '0.85rem', fontWeight: 700 }}>{product.name}</div>
                                    <div style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 800 }}>R{product.price.toFixed(2)}</div>
                                    {product.sizes && product.sizes.length > 0 ? (
                                      <select
                                        id={`gen-size-${product.id}`}
                                        onChange={() => {}}
                                        defaultValue=""
                                        style={{
                                          background: '#1e293b', color: '#f9fafb', border: '1px solid rgba(255,255,255,0.15)',
                                          borderRadius: '6px', padding: '0.4rem', fontSize: '0.8rem'
                                        }}
                                      >
                                        <option value="" disabled>Select size</option>
                                        {product.sizes.map(sz => (
                                          <option key={sz} value={sz}>{sz}</option>
                                        ))}
                                      </select>
                                    ) : null}
                                    <button
                                      onClick={() => {
                                        const sizeEl = document.getElementById(`gen-size-${product.id}`);
                                        const size = sizeEl ? sizeEl.value : null;
                                        if (product.sizes && product.sizes.length > 0 && !size) {
                                          setRecoveryError('Please select a size for ' + product.name);
                                          return;
                                        }
                                        setRecoveryError('');
                                        addToRecoveryCart(product, size);
                                      }}
                                      style={{
                                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
                                        border: 'none', padding: '0.5rem', borderRadius: '6px',
                                        fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                                      }}
                                    >
                                      + Add to Cart
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Cart */}
                          {recoveryCart.length > 0 && (
                            <div style={{
                              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                              borderRadius: '10px', padding: '1rem', marginTop: '0.5rem'
                            }}>
                              <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                Your Additional Items
                              </div>
                              {recoveryCart.map((item, idx) => (
                                <div key={idx} style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  padding: '0.4rem 0', borderBottom: idx < recoveryCart.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                                }}>
                                  <div style={{ color: '#d1d5db', fontSize: '0.85rem' }}>
                                    {item.name} {item.selectedSize ? `(${item.selectedSize})` : ''} × {item.quantity}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>R{(item.price * item.quantity).toFixed(2)}</span>
                                    <button
                                      onClick={() => removeFromRecoveryCart(item.id, item.selectedSize)}
                                      style={{
                                        background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)',
                                        borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <div style={{
                                display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem',
                                paddingTop: '0.5rem', borderTop: '1px solid rgba(16,185,129,0.3)'
                              }}>
                                <span style={{ color: '#f9fafb', fontWeight: 800, fontSize: '0.95rem' }}>Total Additional</span>
                                <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1.1rem' }}>R{getRecoveryCartTotal().toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Summary */}
                    <div style={{
                      background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                      borderRadius: '8px', padding: '1rem', marginTop: '0.5rem'
                    }}>
                      <div style={{ color: '#93c5fd', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        REGISTRATION SUMMARY
                      </div>
                      <div style={{ color: '#d1d5db', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        <strong>Player:</strong> {recoveryForm.playerName}<br />
                        <strong>Team:</strong> {recoveryForm.selectedTeam?.teamName || 'N/A'}<br />
                        {recoveryForm.subTeam && recoveryForm.subTeam.ageGroup && (
                          <><strong>Age Group:</strong> {recoveryForm.subTeam.teamName} ({recoveryForm.subTeam.gender} - {recoveryForm.subTeam.ageGroup})<br /></>
                        )}
                        {recoveryForm.dob && <><strong>DOB:</strong> {recoveryForm.dob}<br /></>}
                        {recoveryForm.shirtNumber && <><strong>Shirt #:</strong> {recoveryForm.shirtNumber}<br /></>}
                        <strong>Kit:</strong> Shirt: {recoveryForm.shirtSize || 'N/A'} / Pants: {recoveryForm.pantsSize || 'N/A'}
                        {recoveryCart.length > 0 && (
                          <><br /><strong>Additional Items:</strong> {recoveryCart.length} item{recoveryCart.length > 1 ? 's' : ''} — R{getRecoveryCartTotal().toFixed(2)}</>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between' }}>
                      <button
                        onClick={() => { setRecoveryStep(3); setRecoveryError(''); }}
                        style={{
                          background: 'transparent', color: '#9ca3af',
                          border: '1px solid rgba(255,255,255,0.15)', padding: '0.75rem 1.5rem',
                          borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer'
                        }}
                      >
                        ← Back
                      </button>
                      <button
                        onClick={handleRecoverySubmit}
                        disabled={recoverySubmitting}
                        style={{
                          background: recoverySubmitting ? '#374151' : 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px',
                          fontWeight: 800, fontSize: '0.95rem', cursor: recoverySubmitting ? 'not-allowed' : 'pointer',
                          opacity: recoverySubmitting ? 0.7 : 1
                        }}
                      >
                        {recoverySubmitting ? 'Submitting...' : (
                          recoveryCart.length > 0 
                            ? `Complete Registration & Pay R${getRecoveryCartTotal().toFixed(2)} →`
                            : 'Complete Registration ✓'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          <div className="parentDashboardGrid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* My Profile Card */}
            <div
              className="parentDashboardCard"
              onClick={() => setActiveTab('profile')}
              onMouseEnter={applyDashboardCardHover}
              onMouseLeave={removeDashboardCardHover}
              style={{
                background: '#111827',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <ShineEffect />
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(96,165,250,0.14)',
                border: '1px solid rgba(96,165,250,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                color: '#60a5fa'
              }}>
                {portalIcons.profile}
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#f9fafb' }}>
                My Profile
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', fontWeight: 600 }}>
                View your personal details and account info
              </p>
            </div>

            {/* My Orders Card */}
            <div
              className="parentDashboardCard"
              onClick={() => setActiveTab('orders')}
              onMouseEnter={applyDashboardCardHover}
              onMouseLeave={removeDashboardCardHover}
              style={{
                background: '#111827',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <ShineEffect />
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(248,113,113,0.14)',
                border: '1px solid rgba(248,113,113,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                color: '#f87171'
              }}>
                {portalIcons.orders}
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#f9fafb' }}>
                My Orders
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', fontWeight: 600 }}>
                View order history & kit status
              </p>
              {orders.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(248,113,113,0.2)',
                  color: '#f87171',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  {orders.length}
                </span>
              )}
            </div>

            {/* Team Portal Card */}
            {(() => {
              const myPlayers = parentPlayers.filter(p => p.teamId && p.subTeam);
              const mySubTeams = [...new Set(myPlayers.map(p => p.subTeam).filter(Boolean))];
              return (
                <div
                  className="parentDashboardCard"
                  onClick={() => {
                    setAgeGroupTab(mySubTeams[0] || null);
                    setActiveTab('teamView');
                  }}
                  onMouseEnter={applyDashboardCardHover}
                  onMouseLeave={removeDashboardCardHover}
                  style={{
                    background: '#111827',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <ShineEffect />
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(52,211,153,0.14)',
                    border: '1px solid rgba(52,211,153,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    color: '#34d399'
                  }}>
                    {portalIcons.players}
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#f9fafb' }}>
                    Team Portal
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', fontWeight: 600 }}>
                    View your players & their team rosters
                  </p>
                  {mySubTeams.length > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      background: 'rgba(52,211,153,0.2)',
                      color: '#34d399',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '999px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      {mySubTeams.length} {mySubTeams.length === 1 ? 'team' : 'teams'}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
          </div>
        )}

        {/* TEAM PORTAL VIEW */}
        {activeTab === 'teamView' && (() => {
          const myPlayers = parentPlayers.filter(p => p.teamId && p.subTeam);
          const mySubTeams = [...new Set(myPlayers.map(p => (p.subTeam || '').trim()).filter(Boolean))];

          // Helper to build composite key from age group team object
          const buildKey = (ag) => {
            const name = (ag.teamName || '').trim();
            const gender = (ag.gender || '').trim();
            const age = (ag.ageGroup || '').trim();
            if (name && gender && age) return `${name} (${gender} - ${age})`;
            if (name && age) return `${name} (${age})`;
            return name || age || gender || '';
          };

          // Build grouped data for ALL sub-teams the parent's children are in
          const groups = mySubTeams.map(stName => {
            const playerInSt = myPlayers.find(p => (p.subTeam || '').trim() === stName);
            const teamData = playerInSt ? parentTeams[playerInSt.teamId] : null;
            const ageGroupTeams = teamData?.ageGroupTeams || teamData?.subTeams || playerInSt?.ageGroupTeams || [];
            // Match by composite key (new format) or legacy teamName
            const info = ageGroupTeams.find(ag => buildKey(ag) === stName) 
              || ageGroupTeams.find(ag => (ag.teamName || '').trim() === stName) 
              || {};
            const allTeamPlayers = teamData?.players || teamData?.teamPlayers || [];
            const players = allTeamPlayers.filter(p => (p.subTeam || '').trim() === stName);
            return { name: stName, info, players, teamName: teamData?.teamName || playerInSt?.teamName || '' };
          });

          if (myPlayers.length === 0) {
            return (
              <div style={{
                background: '#111827',
                borderRadius: '12px',
                padding: '3rem',
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#f9fafb' }}>
                  No Players Registered Yet
                </p>
                <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                  Once your players are registered and assigned to a team, their roster will appear here.
                </p>
              </div>
            );
          }

          return (
            <div>
              {/* Pending payment banner in team view */}
              {(() => {
                const unpaid = myPlayers.filter(p => p.paymentStatus === 'pending_payment');
                if (unpaid.length === 0) return null;
                return (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.08))',
                    border: '1px solid rgba(245,158,11,0.4)',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                      <div>
                        <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.95rem' }}>
                          {unpaid.length} {unpaid.length === 1 ? 'player' : 'players'} awaiting payment
                        </div>
                        <div style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
                          {unpaid.map(p => p.playerName).join(', ')} — not visible to coach until paid
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => { window.location.href = '/checkout'; }}
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#000',
                        border: 'none',
                        padding: '0.6rem 1.25rem',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Complete Payment →
                    </button>
                  </div>
                );
              })()}
              {/* Player sub-tabs - one per child */}
              {myPlayers.length > 1 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  {myPlayers.map((player, idx) => {
                    const isActive = ageGroupTab === player.subTeam;
                    const teamData = player.teamId ? parentTeams[player.teamId] : null;
                    const logoUrl = teamData?.teamLogo || teamData?.submissionData?.teamLogo || teamData?.submissionData?.['22'] || teamData?.submissionData?.[22] || '';
                    return (
                      <button
                        key={player.id || idx}
                        type="button"
                        onClick={() => setAgeGroupTab(player.subTeam)}
                        style={{
                          background: '#111827',
                          padding: '1.5rem',
                          borderRadius: '12px',
                          border: isActive
                            ? '1px solid rgba(248, 113, 113, 0.7)'
                            : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: isActive
                            ? '0 12px 24px rgba(220, 0, 0, 0.25)'
                            : '0 1px 3px rgba(0,0,0,0.4)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                          overflow: 'hidden',
                          color: '#ffffff'
                        }}
                        onMouseEnter={applyDashboardCardHover}
                        onMouseLeave={removeDashboardCardHover}
                      >
                        <span
                          data-card-shine="true"
                          style={{
                            position: 'absolute',
                            top: '-50%',
                            left: '-120%',
                            width: '60%',
                            height: '200%',
                            background: 'linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
                            transform: 'skewX(-20deg)',
                            transition: 'left 0.5s ease',
                            pointerEvents: 'none'
                          }}
                        />
                        <div style={{
                          width: '48px',
                          height: '48px',
                          marginBottom: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '2px solid rgba(239,68,68,0.5)',
                          background: '#1f2937',
                          flexShrink: 0
                        }}>
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt="Team logo"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '1.4rem' }}>🏏</span>
                          )}
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f9fafb', marginBottom: '0.25rem' }}>
                          {player.playerName || player.name || 'Player'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: '600' }}>
                          {player.subTeam}
                        </div>
                        {player.paymentStatus === 'pending_payment' && (
                          <div style={{
                            marginTop: '0.5rem',
                            background: 'rgba(245,158,11,0.15)',
                            border: '1px solid rgba(245,158,11,0.4)',
                            color: '#f59e0b',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}>
                            ⚠️ Payment Pending — Not on team roster yet
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Stacked sub-team sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {groups
                  .filter(g => !ageGroupTab || g.name === ageGroupTab)
                  .map(group => (
                  <div key={group.name} style={{
                    background: '#111827',
                    borderRadius: '12px',
                    border: '2px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden'
                  }}>
                    {/* Red gradient header */}
                    <div className="teamGroupHeader" style={{
                      background: 'linear-gradient(135deg, #dc0000 0%, #b30000 100%)',
                      padding: '1rem 1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h3 style={{
                          fontSize: '1.15rem',
                          fontWeight: '700',
                          color: 'white',
                          margin: 0,
                          marginBottom: '0.25rem'
                        }}>
                          {group.info.teamName || group.name}
                        </h3>
                        {(group.info.gender || group.info.ageGroup) && (
                          <div style={{
                            fontSize: '0.85rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            display: 'flex',
                            gap: '1rem'
                          }}>
                            {group.info.gender && <span>👤 {group.info.gender}</span>}
                            {group.info.ageGroup && <span>📋 {group.info.ageGroup}</span>}
                          </div>
                        )}
                        {group.teamName && (
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.25rem' }}>
                            🏏 {group.teamName}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          color: 'white'
                        }}>
                          {group.players.length} {group.players.length === 1 ? 'Player' : 'Players'}
                        </div>
                        {group.players.length < 15 && (
                          <div style={{
                            background: '#fbbf24',
                            padding: '0.4rem 0.85rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            color: '#78350f',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            ⚠️ {15 - group.players.length} more needed
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Warning alert if less than 15 */}
                    {group.players.length < 15 && (
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.45) 0%, rgba(76, 5, 25, 0.55) 100%)',
                        borderLeft: '4px solid #f87171',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <div style={{ fontSize: '1.25rem', lineHeight: 1 }}>⚠️</div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fee2e2' }}>
                            Minimum 15 players required •
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#fecaca', marginLeft: '0.5rem' }}>
                            Currently <strong>{group.players.length}</strong> registered • <strong>{15 - group.players.length} more</strong> needed
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Players table (read-only) */}
                    {/* Desktop table */}
                    <div className="teamPlayersTable" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#0f172a' }}>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>#</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>Name</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>Roles</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>Shirt No.</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.players.length === 0 ? (
                            <tr>
                              <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.95rem' }}>
                                No players registered yet
                              </td>
                            </tr>
                          ) : (
                            group.players.map((player, index) => {
                              const isMyPlayer = (player.playerEmail || '').toLowerCase() === (profile?.email || '').toLowerCase();
                              return (
                                <tr key={player.id || index} style={{
                                  borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                                  background: isMyPlayer ? 'rgba(220, 0, 0, 0.08)' : 'transparent',
                                  borderLeft: isMyPlayer ? '3px solid rgba(220, 0, 0, 0.6)' : '3px solid transparent'
                                }}>
                                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                                    {index + 1}
                                  </td>
                                  <td style={{ padding: '0.75rem', fontSize: '0.95rem', color: isMyPlayer ? '#fca5a5' : '#f9fafb', fontWeight: '600' }}>
                                    {player.name || player.playerName || '-'}
                                  </td>
                                  <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#e2e8f0' }}>
                                    {(player.roles || player.registrationData?.roles) ? (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {(Array.isArray(player.roles || player.registrationData?.roles)
                                          ? (player.roles || player.registrationData?.roles)
                                          : [player.roles || player.registrationData?.roles]
                                        ).map((role, idx) => (
                                          <span key={idx} style={{
                                            display: 'inline-block',
                                            background: 'rgba(59, 130, 246, 0.2)',
                                            color: '#bfdbfe',
                                            border: '1px solid rgba(59, 130, 246, 0.35)',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                          }}>
                                            {role}
                                          </span>
                                        ))}
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      background: '#1f2937',
                                      padding: '0.25rem 0.75rem',
                                      borderRadius: '6px',
                                      fontWeight: '700',
                                      color: '#f9fafb',
                                      border: '1px solid rgba(255,255,255,0.08)'
                                    }}>
                                      #{player.shirtNumber || player.jerseyNumber || '-'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                                    {player.addedAt || player.createdAt ? new Date(player.addedAt || player.createdAt).toLocaleDateString() : '-'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile stacked cards */}
                    <div className="teamPlayersMobile" style={{ display: 'none', padding: '0.75rem' }}>
                      {group.players.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.95rem' }}>
                          No players registered yet
                        </div>
                      ) : (
                        group.players.map((player, index) => {
                          const isMyPlayer = (player.playerEmail || '').toLowerCase() === (profile?.email || '').toLowerCase();
                          return (
                            <div key={player.id || index} style={{
                              background: isMyPlayer ? 'rgba(220, 0, 0, 0.08)' : 'rgba(255,255,255,0.03)',
                              border: isMyPlayer ? '1px solid rgba(220, 0, 0, 0.35)' : '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '10px',
                              padding: '0.85rem',
                              marginBottom: '0.6rem'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#94a3b8',
                                    width: '24px', height: '24px',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                                  }}>{index + 1}</span>
                                  <span style={{ fontWeight: 700, color: isMyPlayer ? '#fca5a5' : '#f9fafb', fontSize: '0.95rem' }}>
                                    {player.name || player.playerName || '-'}
                                  </span>
                                  {isMyPlayer && <span style={{ fontSize: '0.65rem', background: 'rgba(220,0,0,0.3)', color: '#fca5a5', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>YOU</span>}
                                </div>
                                <span style={{
                                  background: '#1f2937',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  color: '#f9fafb',
                                  fontSize: '0.8rem',
                                  border: '1px solid rgba(255,255,255,0.08)'
                                }}>#{player.shirtNumber || player.jerseyNumber || '-'}</span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                                {(player.roles || player.registrationData?.roles) ? (
                                  (Array.isArray(player.roles || player.registrationData?.roles)
                                    ? (player.roles || player.registrationData?.roles)
                                    : [player.roles || player.registrationData?.roles]
                                  ).map((role, idx) => (
                                    <span key={idx} style={{
                                      display: 'inline-block',
                                      background: 'rgba(59, 130, 246, 0.2)',
                                      color: '#bfdbfe',
                                      border: '1px solid rgba(59, 130, 246, 0.35)',
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '4px',
                                      fontSize: '0.7rem',
                                      fontWeight: 600
                                    }}>{role}</span>
                                  ))
                                ) : <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>No roles</span>}
                                {(player.addedAt || player.createdAt) && (
                                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 'auto' }}>
                                    {new Date(player.addedAt || player.createdAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* PROFILE VIEW */}
        {activeTab === 'profile' && (
          <div style={{
            background: '#111827',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.4rem', fontWeight: 900, color: '#f9fafb' }}>
              Profile Information
            </h3>
            <div className="parentInfoGrid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              {[
                { label: 'Full Name', value: (profile.firstName || '') + ' ' + (profile.lastName || '') },
                { label: 'Email Address', value: profile.email },
                { label: 'Phone Number', value: profile.phone || '\u2014' },
                { label: 'Member Since', value: profile.createdAt ? formatDate(profile.createdAt) : '\u2014' }
              ].map((item, idx) => (
                <div key={idx} style={{
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700 }}>
                    {item.label}
                  </strong>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f9fafb' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDERS VIEW */}
        {activeTab === 'orders' && (
          <div style={{
            background: '#111827',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.4rem', fontWeight: 900, color: '#f9fafb' }}>
              My Orders ({orders.length})
            </h3>

            {/* Kit Production Info Banner */}
            <div style={{
              padding: '1rem 1.25rem',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              lineHeight: '1.6',
              color: '#a5b4fc'
            }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#c7d2fe', fontSize: '1rem' }}>
                ℹ️ How Kit Production Works
              </strong>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                Kits will only go into production once a <strong style={{ color: '#e0e7ff' }}>minimum of 12 players</strong> have registered and paid for your team.
                Once production begins, kits will be delivered directly to your <strong style={{ color: '#e0e7ff' }}>team manager</strong> for distribution — there is no individual shipping.
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#818cf8' }}>
                You will be notified when your kit goes into production and again when it has been delivered to your team manager.
              </p>
            </div>

            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                  You haven't placed any orders yet.
                </p>
                <a href="/premium" style={{
                  display: 'inline-block',
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  transition: 'transform 0.2s'
                }}>
                  Start Shopping
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {orders.map(order => (
                  <div
                    key={order.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(220,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 900, color: '#f9fafb' }}>
                          Order #{order.orderNumber}
                        </h4>
                        <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>
                          Placed on {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '0.4rem 0.85rem',
                          background: (statusColorsOnDark[order.status] || { bg: 'rgba(255,255,255,0.1)' }).bg,
                          color: (statusColorsOnDark[order.status] || { text: '#e5e7eb' }).text,
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          marginBottom: '0.5rem'
                        }}>
                          {formatStatusLabel(order.status)}
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f87171' }}>
                          {formatCurrency(order.total)}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      padding: '1rem',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e7eb' }}>
                        Items ({order.items.length})
                      </strong>
                      {order.items.map((item, idx) => (
                        <div key={idx} style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                          {item.quantity}x {item.name} {(item.selectedSize || item.size) ? '(' + (item.selectedSize || item.size) + ')' : ''}
                        </div>
                      ))}
                    </div>

                    {/* Refund Status Banner */}
                    {order.refundStatus && (
                      <div style={{
                        padding: '1rem 1.25rem',
                        background: order.refundStatus === 'completed'
                          ? 'rgba(16,185,129,0.12)'
                          : 'rgba(245,158,11,0.12)',
                        border: `2px solid ${order.refundStatus === 'completed' ? 'rgba(16,185,129,0.5)' : 'rgba(245,158,11,0.5)'}`,
                        borderRadius: '10px',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>
                            {order.refundStatus === 'completed' ? '✅' : '⏳'}
                          </span>
                          <div>
                            <div style={{
                              fontSize: '1rem',
                              fontWeight: 900,
                              color: order.refundStatus === 'completed' ? '#6ee7b7' : '#fcd34d',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              {order.refundStatus === 'completed' ? 'REFUND PAID' : 'REFUND PENDING'}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                              {order.refundStatus === 'completed'
                                ? 'Your refund has been processed successfully.'
                                : 'A refund for this order is being processed. You will be notified once complete.'}
                            </div>
                          </div>
                        </div>
                        {(isAdminMode || isPreviewMode) && order.refundStatus === 'pending' && (
                          <button
                            onClick={async () => {
                              if (!confirm('Mark this refund as PAID? This will update the status visible to the parent.')) return;
                              try {
                                const res = await fetch('/api/orders', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'update-refund-status', orderId: order.id, refundStatus: 'completed' })
                                });
                                if (res.ok) {
                                  setOrders(prev => prev.map(o => o.id === order.id ? { ...o, refundStatus: 'completed' } : o));
                                } else {
                                  alert('Failed to update refund status');
                                }
                              } catch (err) {
                                alert('Error: ' + err.message);
                              }
                            }}
                            style={{
                              padding: '0.5rem 1.25rem',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                            }}
                          >
                            ✅ Mark Refund Paid
                          </button>
                        )}
                      </div>
                    )}

                    {/* Kit Status Progress */}
                    {(() => {
                      const steps = [
                        { key: 'confirmed', label: 'Payment Confirmed', icon: '✅' },
                        { key: 'in_production', label: 'In Production', icon: '🏭' },
                        { key: 'delivered_to_manager', label: 'Delivered to Team Manager', icon: '🤝' }
                      ];
                      const statusOrder = ['pending', 'confirmed', 'in_production', 'delivered_to_manager'];
                      const currentIdx = statusOrder.indexOf(order.status);
                      
                      if (order.status === 'cancelled') {
                        return (
                          <div style={{
                            padding: '1rem',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            fontSize: '0.9rem',
                            color: '#fca5a5'
                          }}>
                            This order has been cancelled.
                          </div>
                        );
                      }
                      
                      return (
                        <div style={{
                          padding: '1rem',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          marginBottom: '1rem'
                        }}>
                          <strong style={{ display: 'block', marginBottom: '0.75rem', color: '#e5e7eb', fontSize: '0.9rem' }}>
                            Kit Progress
                          </strong>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {steps.map((step, idx) => {
                              const stepIdx = statusOrder.indexOf(step.key);
                              const isComplete = currentIdx >= stepIdx;
                              const isCurrent = order.status === step.key;
                              return (
                                <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {idx > 0 && (
                                    <div style={{
                                      width: '24px', height: '2px',
                                      background: isComplete ? '#6ee7b7' : 'rgba(255,255,255,0.1)'
                                    }} />
                                  )}
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.35rem 0.7rem',
                                    borderRadius: '6px',
                                    background: isCurrent ? (statusColorsOnDark[step.key] || {bg:'rgba(255,255,255,0.1)'}).bg : isComplete ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isCurrent ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
                                    opacity: isComplete ? 1 : 0.4
                                  }}>
                                    <span style={{ fontSize: '0.85rem' }}>{step.icon}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isComplete ? '#e5e7eb' : '#6b7280' }}>
                                      {step.label}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {order.status === 'pending' && (
                            <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#fcd34d' }}>
                              ⏳ Your payment is being verified. Once confirmed, your kit order will be queued for production.
                            </p>
                          )}
                          {order.status === 'confirmed' && (
                            <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#93c5fd' }}>
                              Your payment has been confirmed. Kits go into production once a minimum of 12 players have registered and paid for your team.
                            </p>
                          )}
                          {order.status === 'in_production' && (
                            <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#c4b5fd' }}>
                              🏭 Your team's kits are now being manufactured! They will be delivered to your team manager once ready.
                            </p>
                          )}
                          {order.status === 'delivered_to_manager' && (
                            <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#6ee7b7' }}>
                              🤝 Your kit has been delivered to your team manager for collection. Please contact them to arrange pick-up.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    <button
                      onClick={() => setSelectedOrder(order)}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        transition: 'transform 0.2s'
                      }}
                    >
                      View Full Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <>
          <div
            onClick={() => setSelectedOrder(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)', zIndex: 999, backdropFilter: 'blur(5px)'
            }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%', maxWidth: '800px', maxHeight: '90vh',
            overflowY: 'auto', zIndex: 1000
          }}>
            <div style={{
              background: '#111827',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div className="orderModalHeader" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.5rem 2rem',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: 'white',
                borderRadius: '16px 16px 0 0'
              }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                  Order #{selectedOrder.orderNumber}
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                    fontSize: '1.5rem', width: '36px', height: '36px', borderRadius: '8px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="orderModalBody" style={{ padding: '2rem' }}>
                <section style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900, color: '#f9fafb' }}>
                    Order Items
                  </h3>
                  {/* Desktop table */}
                  <div className="orderItemsTable" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Product', 'Size', 'Qty', 'Price', 'Total'].map((h, i) => (
                            <th key={h} style={{
                              padding: '0.75rem',
                              textAlign: i >= 2 ? (i === 2 ? 'center' : 'right') : 'left',
                              fontWeight: 700,
                              color: '#94a3b8',
                              borderBottom: '1px solid rgba(255,255,255,0.1)',
                              fontSize: '0.85rem',
                              textTransform: 'uppercase'
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.75rem', color: '#f9fafb' }}>{item.name}</td>
                            <td style={{ padding: '0.75rem', color: '#9ca3af' }}>{item.selectedSize || item.size || '-'}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: '#9ca3af' }}>{item.quantity}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#9ca3af' }}>{formatCurrency(item.price)}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#f9fafb' }}>
                              {formatCurrency(item.price * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          <td colSpan="4" style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#94a3b8' }}>Subtotal:</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#f9fafb' }}>{formatCurrency(selectedOrder.subtotal)}</td>
                        </tr>
                        <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <td colSpan="4" style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: '#f9fafb' }}>Total:</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 900, fontSize: '1.1rem', color: '#f87171' }}>{formatCurrency(selectedOrder.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {/* Mobile stacked cards */}
                  <div className="orderItemsMobile" style={{ display: 'none' }}>
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '1rem',
                        marginBottom: '0.75rem'
                      }}>
                        <div style={{ fontWeight: 700, color: '#f9fafb', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                          {item.name}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Size</span>
                            <div style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600 }}>{item.selectedSize || item.size || '-'}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Qty</span>
                            <div style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600 }}>{item.quantity}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Price</span>
                            <div style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600 }}>{formatCurrency(item.price)}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total</span>
                            <div style={{ color: '#f9fafb', fontSize: '0.9rem', fontWeight: 700 }}>{formatCurrency(item.price * item.quantity)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '0.5rem'
                    }}>
                      <span style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.9rem' }}>Subtotal:</span>
                      <span style={{ fontWeight: 600, color: '#f9fafb', fontSize: '0.95rem' }}>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(220,0,0,0.15) 0%, rgba(220,0,0,0.08) 100%)',
                      border: '1px solid rgba(248,113,113,0.3)',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '0.5rem'
                    }}>
                      <span style={{ fontWeight: 700, color: '#f9fafb', fontSize: '1.05rem' }}>Total:</span>
                      <span style={{ fontWeight: 900, color: '#f87171', fontSize: '1.15rem' }}>{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </section>



                {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                  <section>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900, color: '#f9fafb' }}>
                      Order Status History
                    </h3>
                    <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                      <div style={{
                        position: 'absolute', left: '8px', top: 0, bottom: 0,
                        width: '2px', background: 'rgba(255,255,255,0.1)'
                      }} />
                      {selectedOrder.statusHistory.map((history, idx) => (
                        <div key={idx} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                          <div style={{
                            position: 'absolute', left: '-2rem', top: '4px',
                            width: '20px', height: '20px',
                            background: statusColors[history.status],
                            border: '3px solid #111827',
                            borderRadius: '50%',
                            boxShadow: '0 0 0 3px rgba(255,255,255,0.1)'
                          }} />
                          <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.06)'
                          }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.3rem 0.75rem',
                                background: (statusColorsOnDark[history.status] || { bg: 'rgba(255,255,255,0.1)' }).bg,
                                color: (statusColorsOnDark[history.status] || { text: '#e5e7eb' }).text,
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}>
                                {formatStatusLabel(history.status)}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                              {formatDate(history.timestamp)}
                            </div>
                            {history.notes && (
                              <div style={{ fontSize: '0.9rem', color: '#d1d5db', fontStyle: 'italic' }}>
                                {history.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showForgotPassword && renderForgotPasswordModal()}

      {renderResponsiveStyles()}
    </div>
  );

  // ========================================
  // FORGOT PASSWORD MODAL (dark themed)
  // ========================================
  function renderForgotPasswordModal() {
    return (
      <>
        <div
          onClick={cancelForgotPassword}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 999, backdropFilter: 'blur(5px)'
          }}
        />
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%', maxWidth: '500px', zIndex: 1000
        }}>
          <div style={{
            background: '#111827',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.5rem 2rem',
              background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
              color: 'white'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Reset Password</h2>
              <button
                onClick={cancelForgotPassword}
                style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                  fontSize: '1.5rem', width: '36px', height: '36px', borderRadius: '8px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '2rem' }}>
              {resetMessage ? (
                <div style={{
                  padding: '1.5rem',
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                  <p style={{ margin: 0, color: '#6ee7b7', fontWeight: 700, fontSize: '1.1rem' }}>
                    {resetMessage}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit}>
                  {resetStep === 'email' ? (
                    <>
                      <p style={{ marginTop: 0, marginBottom: '1.5rem', color: '#9ca3af' }}>
                        Enter your email address and we'll help you reset your password.
                      </p>
                      {resetError && (
                        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600 }}>
                          {resetError}
                        </div>
                      )}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.85rem' }}>Email Address</label>
                        <input
                          type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required
                          placeholder="your.email@example.com"
                          style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontSize: '1rem', fontFamily: 'inherit', color: '#f9fafb', boxSizing: 'border-box' }}
                        />
                      </div>
                      <button type="submit" style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
                        Continue
                      </button>
                    </>
                  ) : resetStep === 'verification' ? (
                    <>
                      <p style={{ marginTop: 0, marginBottom: '1rem', color: '#9ca3af' }}>
                        Enter the verification code sent to <strong style={{ color: '#f9fafb' }}>{resetEmail}</strong>
                      </p>
                      {generatedCode && (
                        <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.85rem', color: '#93c5fd', fontWeight: 600, marginBottom: '0.5rem' }}>DEMO MODE - Your verification code:</div>
                          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#60a5fa', letterSpacing: '0.3rem' }}>{generatedCode}</div>
                          <div style={{ fontSize: '0.75rem', color: '#93c5fd', marginTop: '0.5rem', fontStyle: 'italic' }}>Valid for 15 minutes</div>
                        </div>
                      )}
                      {resetError && (
                        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600 }}>
                          {resetError}
                        </div>
                      )}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.85rem' }}>Verification Code</label>
                        <input
                          type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} required
                          placeholder="Enter 6-digit code" maxLength="6" pattern="[0-9]{6}"
                          style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontSize: '1.5rem', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.5rem', color: '#f9fafb', boxSizing: 'border-box' }}
                        />
                      </div>
                      <button type="submit" style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginBottom: '0.75rem' }}>
                        Verify Code
                      </button>
                      <button type="button" onClick={() => { setResetStep('email'); setVerificationCode(''); setGeneratedCode(''); setResetError(''); }}
                        style={{ width: '100%', padding: '0.75rem', background: 'transparent', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                        ← Back to Email
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={{ marginTop: 0, marginBottom: '1.5rem', color: '#9ca3af' }}>
                        Create a new password for <strong style={{ color: '#f9fafb' }}>{resetEmail}</strong>
                      </p>
                      {resetError && (
                        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600 }}>
                          {resetError}
                        </div>
                      )}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.85rem' }}>New Password</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Enter new password (min. 6 characters)"
                          style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontSize: '1rem', fontFamily: 'inherit', color: '#f9fafb', boxSizing: 'border-box' }} />
                      </div>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.85rem' }}>Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Re-enter new password"
                          style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontSize: '1rem', fontFamily: 'inherit', color: '#f9fafb', boxSizing: 'border-box' }} />
                      </div>
                      <button type="submit" style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginBottom: '0.75rem' }}>
                        Reset Password
                      </button>
                      <button type="button" onClick={() => { setResetStep('email'); setNewPassword(''); setConfirmPassword(''); setVerificationCode(''); setGeneratedCode(''); setResetError(''); }}
                        style={{ width: '100%', padding: '0.75rem', background: 'transparent', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                        ← Back to Email
                      </button>
                    </>
                  )}
                  <button type="button" onClick={cancelForgotPassword}
                    style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: 'transparent', color: '#6b7280', border: 'none', fontSize: '0.9rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ========================================
  // RESPONSIVE STYLES (matching team-portal)
  // ========================================
  function renderResponsiveStyles() {
    return (
      <style jsx global>{`
        body { margin: 0; }

        @media (max-width: 900px) {
          .parentPortalHeader { padding: 1rem !important; }
        }

        @media (max-width: 768px) {
          .parentPortalHeader {
            padding: 1rem !important;
          }
          .parentPortalHeader > div {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .parentPortalHeader h1 {
            font-size: 1.25rem !important;
          }
          .parentBanner {
            flex-direction: column !important;
            text-align: center !important;
          }
          .parentBanner > div:first-child {
            width: 64px !important;
            height: 64px !important;
            font-size: 1.5rem !important;
          }
          .parentBanner h2 {
            font-size: 1.4rem !important;
          }
          .parentDashboardGrid {
            grid-template-columns: 1fr !important;
          }
          .parentInfoGrid {
            grid-template-columns: 1fr !important;
          }
          /* Order modal mobile */
          .orderModalBody {
            padding: 1rem !important;
          }
          .orderModalHeader {
            padding: 1rem 1.25rem !important;
          }
          .orderModalHeader h2 {
            font-size: 1.15rem !important;
          }
          .orderItemsTable {
            display: none !important;
          }
          .orderItemsMobile {
            display: block !important;
          }
          /* Team players table mobile */
          .teamPlayersTable {
            display: none !important;
          }
          .teamPlayersMobile {
            display: block !important;
          }
          /* Team group header mobile */
          .teamGroupHeader {
            flex-direction: column !important;
            gap: 0.75rem !important;
            padding: 0.85rem 1rem !important;
          }
        }

        @media (max-width: 600px) {
          .parentDashboardCard {
            background: linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(3,7,18,0.98) 60%, rgba(220,0,0,0.45) 100%) !important;
            border: 1px solid rgba(239,68,68,0.55) !important;
            box-shadow: 0 14px 34px rgba(220,0,0,0.35), 0 0 20px rgba(255,255,255,0.2) !important;
          }
          .parentDashboardCard:active {
            transform: translateY(-2px) scale(0.99) !important;
          }
        }

        @keyframes mobileCardGlow {
          0% { opacity: 0.65; }
          100% { opacity: 1; }
        }
      `}</style>
    );
  }
}
