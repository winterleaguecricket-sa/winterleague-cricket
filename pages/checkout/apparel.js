// Coach Apparel Checkout — exact duplicate of player registration checkout
// Only difference: customer data comes from team details, not registration form
// Dark theme matching registration form, auto-populated from team data, no shipping
// DB order creation, dynamic PayFast/Yoco gateway, server-side payment APIs
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/channel.module.css';
import { siteConfig } from '../../data/products';
import { trackCheckoutView, trackPaymentStart } from '../../lib/analytics';

export default function ApparelCheckout() {
  const [cart, setCart] = useState([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [step, setStep] = useState('payment'); // payment, processing
  const [customerProfile, setCustomerProfile] = useState(null);
  const [profileFormData, setProfileFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [formBackground, setFormBackground] = useState('');
  const [activeGateway, setActiveGateway] = useState(null);
  const [isParentStore, setIsParentStore] = useState(false);
  const orderIdRef = useRef(null);

  // Load active payment gateway
  useEffect(() => {
    fetch('/api/payment-gateway')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.gateway) setActiveGateway(data.gateway);
      })
      .catch(() => {});
  }, []);

  // Load cart from localStorage and customer data from team API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadCartAndProfile = async () => {
      try {
        // Load cart items from cricket-cart (coach apparel items added by team portal)
        const raw = localStorage.getItem('cricket-cart');
        const allItems = raw ? JSON.parse(raw) : [];
        // Check for parent-store items first
        const parentItems = allItems.filter(item => item.source === 'parent-store');
        const coachItems = allItems.filter(item => item.source !== 'parent-store' && (item.teamId || item.category === 'coach-apparel'));
        if (parentItems.length > 0) {
          setCart(parentItems);
          setIsParentStore(true);
        } else {
          setCart(coachItems.length > 0 ? coachItems : allItems);
        }
        setCartLoaded(true);

        // Load auto-fill data — parent profile or team manager details
        const parentProfile = localStorage.getItem('parentProfile');
        const teamId = localStorage.getItem('teamId');

        if (parentProfile) {
          // Parent store: use parent customer profile
          try {
            const pp = JSON.parse(parentProfile);
            const firstName = (pp.firstName || pp.first_name || '').trim();
            const lastName = (pp.lastName || pp.last_name || '').trim();
            const email = (pp.email || '').trim();
            const phone = (pp.phone || '').trim();

            let profile = null;
            if (email) {
              try {
                const lookupRes = await fetch('/api/customers', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'lookup', email })
                });
                const lookupData = await lookupRes.json();
                if (lookupData?.found && lookupData?.profile?.id) {
                  profile = lookupData.profile;
                }
              } catch (lookupErr) {}
            }

            if (profile) {
              setCustomerProfile({
                id: profile.id,
                email: profile.email || email,
                firstName: profile.first_name || profile.firstName || firstName,
                lastName: profile.last_name || profile.lastName || lastName,
                phone: profile.phone || phone
              });
            } else {
              setCustomerProfile({
                id: `local-${Date.now()}`,
                email, firstName, lastName, phone
              });
            }
            setProfileFormData({ email, firstName, lastName, phone });
            if (!email || !firstName) setIsEditingProfile(true);
          } catch (e) {
            console.error('Error parsing parent profile:', e);
          }
        } else if (teamId) {
          try {
            const res = await fetch(`/api/teams?id=${encodeURIComponent(teamId)}`);
            if (res.ok) {
              const data = await res.json();
              const team = data.team || data;

              // Parse manager name into first/last
              const managerName = String(team.managerName || team.manager_name || team.coachName || team.coach_name || '').trim();
              const parts = managerName.split(/\s+/).filter(Boolean);
              const firstName = parts.shift() || '';
              const lastName = parts.join(' ') || '';
              const email = String(team.email || '').trim();
              const phone = String(team.managerPhone || team.manager_phone || team.phone || '').trim();

              // Check if profile already exists in DB (if we have an email)
              let profile = null;
              if (email) {
                try {
                  const lookupRes = await fetch('/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'lookup', email })
                  });
                  const lookupData = await lookupRes.json();
                  if (lookupData?.found && lookupData?.profile?.id) {
                    profile = lookupData.profile;
                  }
                } catch (lookupErr) {
                  // Network error — continue with local profile
                }
              }

              if (profile) {
                setCustomerProfile({
                  id: profile.id,
                  email: profile.email || email,
                  firstName: profile.first_name || profile.firstName || firstName,
                  lastName: profile.last_name || profile.lastName || lastName,
                  phone: profile.phone || phone
                });
              } else {
                // Local-only profile — DB record created at payment time
                setCustomerProfile({
                  id: `local-${Date.now()}`,
                  email: email || '',
                  firstName: firstName || '',
                  lastName: lastName || '',
                  phone: phone || ''
                });
              }

              setProfileFormData({ email, firstName, lastName, phone });
              // Auto-open edit form if required fields are missing
              if (!email || !firstName) {
                setIsEditingProfile(true);
              }
            }
          } catch (e) {
            console.error('Error loading team data:', e);
          }
        }
      } catch (e) {
        console.error('Error loading checkout data:', e);
      }

      // If no team data was loaded, still create an empty profile so user can fill it in
      // (setCustomerProfile may not have been called if teamId was missing or fetch failed)
      setCustomerProfile(prev => prev || {
        id: `local-${Date.now()}`,
        email: '',
        firstName: '',
        lastName: '',
        phone: ''
      });
      // Auto-open edit mode if profile is empty
      setIsEditingProfile(prev => {
        // Only auto-open if profile wasn't already set with valid data
        return prev;
      });

      setIsLoading(false);

      // GA4: Track checkout page view
      const raw2 = localStorage.getItem('cricket-cart');
      const items2 = raw2 ? JSON.parse(raw2) : [];
      const coachItems2 = items2.filter(item => item.teamId || item.category === 'coach-apparel');
      const trackItems = coachItems2.length > 0 ? coachItems2 : items2;
      if (trackItems.length > 0) {
        const total = trackItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        trackCheckoutView(total, trackItems.length);
      }
    };

    loadCartAndProfile();
  }, []);

  // Load form background image to match the registration form theme
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isMounted = true;

    const loadFormBackground = async () => {
      try {
        const res = await fetch('/api/form-background?formId=2');
        const data = await res.json();
        if (!isMounted) return;
        if (data?.success && data?.background) {
          const imageUrl = typeof data.background === 'string'
            ? data.background
            : data.background.imageUrl;
          if (imageUrl) {
            setFormBackground(imageUrl);
          }
        }
      } catch (fetchError) {
        console.error('Error loading checkout background:', fetchError);
      }
    };

    loadFormBackground();
    return () => { isMounted = false; };
  }, []);

  // Apply background to body
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
  }, [formBackground]);

  // Sync profile form data when profile is loaded
  useEffect(() => {
    if (!customerProfile || isEditingProfile) return;
    setProfileFormData((prev) => ({
      ...prev,
      email: customerProfile.email || '',
      firstName: customerProfile.firstName || '',
      lastName: customerProfile.lastName || '',
      phone: customerProfile.phone || ''
    }));
  }, [customerProfile, isEditingProfile]);

  const handleProfileFieldChange = (field, value) => {
    setProfileFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getCartTotal = () => cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  const handleProfileSave = async () => {
    setProfileMessage('');
    setError('');

    const nextProfile = {
      email: profileFormData.email.trim(),
      firstName: profileFormData.firstName.trim(),
      lastName: profileFormData.lastName.trim(),
      phone: profileFormData.phone.trim()
    };

    if (!nextProfile.email || !nextProfile.firstName || !nextProfile.lastName) {
      setError('Please provide email, first name, and last name.');
      return;
    }

    try {
      if (customerProfile?.id && !String(customerProfile.id).startsWith('local-')) {
        // Update existing DB profile
        const updateRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            id: customerProfile.id,
            ...nextProfile
          })
        });
        const updateData = await updateRes.json();
        if (updateData && (updateData.profile || updateData.id)) {
          const p = updateData.profile || updateData;
          setCustomerProfile({
            id: p.id || customerProfile.id,
            email: p.email || nextProfile.email,
            firstName: p.first_name || p.firstName || nextProfile.firstName,
            lastName: p.last_name || p.lastName || nextProfile.lastName,
            phone: p.phone || nextProfile.phone
          });
        } else {
          setCustomerProfile({ ...customerProfile, ...nextProfile });
        }
      } else {
        // No DB profile yet — just update local state (DB record created at payment time)
        setCustomerProfile({ ...nextProfile, id: customerProfile?.id || `local-${Date.now()}` });
      }
    } catch (saveErr) {
      console.error('Error saving profile:', saveErr);
      setCustomerProfile({ ...customerProfile, ...nextProfile });
    }

    setProfileMessage('Details updated. Your checkout info is saved.');
    setIsEditingProfile(false);
  };

  const handlePayment = async () => {
    if (!activeGateway) {
      setError('Payment gateway is still loading. Please wait a moment and try again.');
      return;
    }
    if (!profileFormData.email || !profileFormData.firstName || !profileFormData.lastName) {
      setError('Please provide your name and email to continue.');
      setIsEditingProfile(true);
      return;
    }
    // Sync profileFormData into customerProfile before payment
    const currentProfile = {
      ...customerProfile,
      email: profileFormData.email.trim(),
      firstName: profileFormData.firstName.trim(),
      lastName: profileFormData.lastName.trim(),
      phone: profileFormData.phone.trim()
    };
    setCustomerProfile(currentProfile);

    setStep('processing');
    setError('');

    const orderTotal = getCartTotal().toFixed(2);
    // Reuse the same orderId on retry — prevents duplicate pending orders
    if (!orderIdRef.current) {
      orderIdRef.current = `CA-${Date.now()}`;
    }
    const orderId = orderIdRef.current;

    // GA4: Track payment initiation
    trackPaymentStart(orderId, parseFloat(orderTotal), activeGateway);

    try {
      // Customer profile creation is handled server-side (in create-checkout / create-payment)
      // to ensure it only happens when a payment session is actually created.

      // Order + gateway checkout are created atomically server-side.
      // No order is created until payment gateway session is confirmed.
      const orderPayload = {
        orderId,
        amount: orderTotal,
        itemName: `Order #${orderId}`,
        itemDescription: `${cart.length} item(s)`,
        firstName: profileFormData.firstName.trim(),
        lastName: profileFormData.lastName.trim(),
        email: profileFormData.email.trim(),
        phone: (profileFormData.phone || '').trim(),
        customerId: (customerProfile?.id || '').toString(),
        // Order creation data — server creates order atomically with gateway checkout
        orderData: {
          orderNumber: orderId,
          customerEmail: profileFormData.email.trim(),
          customerName: `${profileFormData.firstName.trim()} ${profileFormData.lastName.trim()}`,
          customerPhone: (profileFormData.phone || '').trim(),
          items: cart,
          subtotal: parseFloat(orderTotal),
          shipping: 0,
          total: parseFloat(orderTotal),
          paymentMethod: activeGateway,
          orderType: isParentStore ? 'parent-apparel' : 'product'
        }
      };

      if (activeGateway === 'yoco') {
        // ===== YOCO FLOW — order created server-side with checkout =====
        const response = await fetch('/api/yoco/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });

        const data = await response.json();

        if (!data.success || !data.redirectUrl) {
          setError(data.error || 'Failed to initiate Yoco payment. Please try again.');
          setStep('payment');
          return;
        }

        window.location.href = data.redirectUrl;
      } else {
        // ===== PAYFAST FLOW — order created server-side with payment =====
        const response = await fetch('/api/payfast/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Failed to initiate payment. Please try again.');
          setStep('payment');
          return;
        }

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.payfastUrl;

        for (const key in data.paymentData) {
          if (data.paymentData.hasOwnProperty(key)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = data.paymentData[key];
            form.appendChild(input);
          }
        }

        document.body.appendChild(form);
        form.submit();
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to connect to payment gateway. Please try again.');
      setStep('payment');
    }
  };

  // ===== EMPTY CART =====
  const backUrl = isParentStore ? '/parent-portal?tab=apparel-store' : '/team-portal?preview=coachstore&tab=coach-store';
  const backLabel = isParentStore ? 'Back to Apparel Store' : 'Back to Coach Store';
  const pageTitle = isParentStore ? 'Apparel Checkout' : 'Coach Apparel Checkout';

  if (cartLoaded && cart.length === 0) {
    return (
      <div className={styles.container} style={{ background: 'transparent' }}>
        <Head>
          <title>{pageTitle} - {siteConfig.storeName}</title>
        </Head>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.logo}>🏏 {siteConfig.storeName}</h1>
            <nav className={styles.nav}>
              <Link href={backUrl} className={styles.navLink}>{backLabel}</Link>
            </nav>
          </div>
        </header>
        <main className={styles.main} style={{ color: '#e5e7eb' }}>
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#f9fafb' }}>Your cart is empty</h1>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Add some products before checking out</p>
            <Link href={backUrl} style={{ 
              padding: '1rem 2rem', 
              background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
              color: 'white',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 700,
              display: 'inline-block'
            }}>
              {backLabel}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ===== LOADING =====
  if (isLoading) {
    return (
      <div className={styles.container} style={{ background: 'transparent' }}>
        <Head>
          <title>{pageTitle} - {siteConfig.storeName}</title>
        </Head>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.logo}>🏏 {siteConfig.storeName}</h1>
          </div>
        </header>
        <main className={styles.main} style={{ color: '#e5e7eb' }}>
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#f9fafb' }}>Loading checkout...</h1>
          </div>
        </main>
      </div>
    );
  }

  // ===== MAIN CHECKOUT =====
  return (
    <div className={styles.container} style={{ background: 'transparent' }}>
      <Head>
        <title>{pageTitle} - {siteConfig.storeName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </Head>
      
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>🏏 {siteConfig.storeName}</h1>
          <nav className={styles.nav}>
            <Link href={backUrl} className={styles.navLink}>{backLabel}</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main} style={{ color: '#e5e7eb' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '2rem', color: '#f9fafb' }}>Checkout</h1>

        {/* Progress Indicator - Single step: Payment */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem', gap: '1rem' }}>
          <div style={{ 
            padding: '0.5rem 1.5rem', 
            borderRadius: '30px', 
            background: 'rgba(220, 0, 0, 0.9)',
            color: 'white',
            fontWeight: 700,
            border: '1px solid rgba(239, 68, 68, 0.5)'
          }}>Payment</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '2rem', alignItems: 'start' }}>
          {/* Main Content */}
          <div style={{ background: '#0f172a', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
            
            {/* PAYMENT STEP */}
            {step === 'payment' && (
              <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#f9fafb' }}>Payment</h2>
                
                {error && (
                  <div style={{ 
                    padding: '1rem', 
                    background: 'rgba(239, 68, 68, 0.2)', 
                    color: '#fecaca', 
                    borderRadius: '10px', 
                    marginBottom: '1.5rem',
                    fontWeight: 600,
                    border: '1px solid rgba(239, 68, 68, 0.4)'
                  }}>
                    {error}
                  </div>
                )}

                {profileMessage && (
                  <div style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(16, 185, 129, 0.18)',
                    color: '#d1fae5',
                    borderRadius: '10px',
                    marginBottom: '1.5rem',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    fontWeight: 600
                  }}>
                    {profileMessage}
                  </div>
                )}

                {customerProfile ? (
                  <>
                    <div style={{ background: '#0b1220', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <h3 style={{ fontWeight: 700, margin: 0, color: '#f9fafb' }}>Customer Details</h3>
                        {profileFormData.firstName && profileFormData.email && (
                          <button
                            type="button"
                            onClick={() => setIsEditingProfile((prev) => !prev)}
                            style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '8px',
                              border: '1px solid rgba(148, 163, 184, 0.35)',
                              background: 'rgba(148, 163, 184, 0.15)',
                              color: '#e5e7eb',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {isEditingProfile ? 'Cancel' : 'Edit'}
                          </button>
                        )}
                      </div>
                      
                      {(!profileFormData.firstName || !profileFormData.email) && (
                        <div style={{
                          padding: '0.85rem 1rem', borderRadius: '8px',
                          background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)',
                          marginBottom: '1rem', fontSize: '0.9rem', color: '#fde68a'
                        }}>
                          Please fill in your details below to proceed with payment.
                        </div>
                      )}

                      {!isEditingProfile && profileFormData.firstName && (
                        <>
                          <p style={{ color: '#e5e7eb' }}><strong>Name:</strong> {profileFormData.firstName} {profileFormData.lastName}</p>
                          <p style={{ color: '#e5e7eb' }}><strong>Email:</strong> {profileFormData.email}</p>
                          <p style={{ color: '#e5e7eb' }}><strong>Phone:</strong> {profileFormData.phone || '—'}</p>
                        </>
                      )}

                      {(isEditingProfile || !profileFormData.firstName || !profileFormData.email) && (
                        <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
                          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <label style={{ display: 'grid', gap: '0.4rem', color: '#cbd5f5', fontWeight: 600 }}>
                              First name
                              <input
                                value={profileFormData.firstName}
                                onChange={(e) => handleProfileFieldChange('firstName', e.target.value)}
                                style={{
                                  padding: '0.75rem',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(148, 163, 184, 0.35)',
                                  background: '#0f172a',
                                  color: '#f9fafb',
                                  fontSize: '1rem'
                                }}
                              />
                            </label>
                            <label style={{ display: 'grid', gap: '0.4rem', color: '#cbd5f5', fontWeight: 600 }}>
                              Last name
                              <input
                                value={profileFormData.lastName}
                                onChange={(e) => handleProfileFieldChange('lastName', e.target.value)}
                                style={{
                                  padding: '0.75rem',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(148, 163, 184, 0.35)',
                                  background: '#0f172a',
                                  color: '#f9fafb',
                                  fontSize: '1rem'
                                }}
                              />
                            </label>
                            <label style={{ display: 'grid', gap: '0.4rem', color: '#cbd5f5', fontWeight: 600 }}>
                              Email
                              <input
                                value={profileFormData.email}
                                onChange={(e) => handleProfileFieldChange('email', e.target.value)}
                                style={{
                                  padding: '0.75rem',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(148, 163, 184, 0.35)',
                                  background: '#0f172a',
                                  color: '#f9fafb',
                                  fontSize: '1rem'
                                }}
                              />
                            </label>
                            <label style={{ display: 'grid', gap: '0.4rem', color: '#cbd5f5', fontWeight: 600 }}>
                              Phone
                              <input
                                value={profileFormData.phone}
                                onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                                style={{
                                  padding: '0.75rem',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(148, 163, 184, 0.35)',
                                  background: '#0f172a',
                                  color: '#f9fafb',
                                  fontSize: '1rem'
                                }}
                              />
                            </label>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={handleProfileSave}
                              style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                                color: 'white',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Save details
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      type="button"
                      onClick={handlePayment}
                      disabled={!activeGateway}
                      style={{ 
                        width: '100%',
                        padding: '1.25rem', 
                        background: !activeGateway
                          ? '#6b7280'
                          : 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        cursor: !activeGateway ? 'wait' : 'pointer',
                        opacity: !activeGateway ? 0.7 : 1
                      }}
                    >
                      {!activeGateway
                        ? 'Loading payment gateway...'
                        : `Pay with ${activeGateway === 'yoco' ? 'Yoco' : 'PayFast'} — R${getCartTotal().toFixed(2)}`
                      }
                    </button>
                  </>
                ) : (
                  <div style={{ 
                    padding: '1.5rem', 
                    background: 'rgba(220, 0, 0, 0.12)', 
                    border: '1px solid rgba(239, 68, 68, 0.6)',
                    borderRadius: '12px', 
                    textAlign: 'center'
                  }}>
                    <p style={{ fontWeight: 600, marginBottom: '1rem', color: '#fecaca' }}>
                      Customer information not found.
                    </p>
                    <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
                      Please log in to the team portal first to proceed with checkout.
                    </p>
                    <Link href={backUrl} style={{ 
                      padding: '1rem 2rem', 
                      background: '#dc0000',
                      color: 'white',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontWeight: 700,
                      display: 'inline-block'
                    }}>
                      {backLabel}
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* PROCESSING STEP */}
            {step === 'processing' && (
              <>
                <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: '#f9fafb' }}>Processing Payment</h2>
                  <p style={{ color: '#94a3b8' }}>Redirecting to {activeGateway === 'yoco' ? 'Yoco' : 'PayFast'} secure payment gateway...</p>
                </div>
              </>
            )}
          </div>

          {/* Order Summary Sidebar — Dark theme */}
          <div style={{ background: '#0f172a', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', position: 'sticky', top: '100px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#f9fafb' }}>Order Summary</h2>
            
            {cart.map((item, idx) => (
              <div key={`${item.id}-${item.selectedSize}-${idx}`} style={{ 
                paddingBottom: '1rem', 
                marginBottom: '1rem', 
                borderBottom: '1px solid rgba(148, 163, 184, 0.2)' 
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#f9fafb' }}>{item.name}</div>
                {item.selectedSize && (
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                    Size: {item.selectedSize}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#94a3b8' }}>
                  <span>R{item.price.toFixed(2)} × {item.quantity || 1}</span>
                  <span style={{ fontWeight: 700, color: '#f9fafb' }}>
                    R{(item.price * (item.quantity || 1)).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '1.5rem', 
              fontWeight: 900,
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '2px solid rgba(148, 163, 184, 0.3)',
              color: '#f9fafb'
            }}>
              <span>Total:</span>
              <span style={{ color: '#f87171' }}>R{getCartTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
