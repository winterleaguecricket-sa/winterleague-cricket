// Checkout page — merges registration-flow UX with secure payment backend
// Dark theme matching registration form, auto-populated from form data, no shipping
// DB order creation, dynamic PayFast/Yoco gateway, server-side payment APIs
import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/channel.module.css';
import { siteConfig } from '../data/products';

export default function Checkout() {
  const { cart, cartLoaded, getCartTotal, clearCart } = useCart();
  const [step, setStep] = useState('payment'); // payment, processing
  const [customerProfile, setCustomerProfile] = useState(null);
  const [profileFormData, setProfileFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [formBackground, setFormBackground] = useState('');
  const [activeGateway, setActiveGateway] = useState('payfast');
  const [formSubmissionVerified, setFormSubmissionVerified] = useState(false);

  // Load active payment gateway
  useEffect(() => {
    fetch('/api/payment-gateway')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.gateway) setActiveGateway(data.gateway);
      })
      .catch(() => {});
  }, []);

  // Load customer data from localStorage and create/verify DB profile
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadAndCreateProfile = async () => {
      try {
        const savedFormData = localStorage.getItem('formDraft_2');
        if (savedFormData) {
          const parsed = JSON.parse(savedFormData);
          const formData = parsed?.formData || {};

          // Map registration form fields to checkout profile
          const parentName = String(formData[37] || (formData['checkout_firstName'] ? formData['checkout_firstName'] + ' ' + formData['checkout_lastName'] : '') || '').trim();
          const parentEmail = String(formData[38] || formData['checkout_email'] || '').trim();
          const parentPassword = String(formData[39] || formData['checkout_password'] || '').trim();
          const parentPhone = String(formData[40] || formData['checkout_phone'] || '').trim();

          let firstName = formData['checkout_firstName'] || '';
          let lastName = formData['checkout_lastName'] || '';

          if (!firstName && !lastName && parentName) {
            const parts = parentName.split(/\s+/).filter(Boolean);
            firstName = parts.shift() || '';
            lastName = parts.join(' ') || '';
          }

          if (parentEmail && firstName) {
            // Check if profile exists in DB
            let profile = null;
            try {
              const lookupRes = await fetch(`/api/customers?email=${encodeURIComponent(parentEmail)}`);
              const lookupData = await lookupRes.json();
              if (lookupData && lookupData.id) {
                profile = lookupData;
              }
            } catch (lookupErr) {
              console.error('Error looking up customer profile:', lookupErr);
            }

            // Create profile in DB if it doesn't exist
            if (!profile) {
              try {
                const createRes = await fetch('/api/customers', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'create',
                    email: parentEmail,
                    firstName: firstName,
                    lastName: lastName,
                    phone: parentPhone,
                    password: parentPassword
                  })
                });
                const createData = await createRes.json();
                if (createData.profile) {
                  profile = createData.profile;
                } else if (createData.id) {
                  profile = createData;
                }
              } catch (createErr) {
                console.error('Error creating customer profile:', createErr);
              }
            }

            if (profile) {
              setCustomerProfile({
                id: profile.id,
                email: profile.email || parentEmail,
                firstName: profile.first_name || profile.firstName || firstName,
                lastName: profile.last_name || profile.lastName || lastName,
                phone: profile.phone || parentPhone,
                password: parentPassword
              });
            } else {
              // Fallback: use local data for UI (but profile won't persist)
              setCustomerProfile({
                id: `local-${Date.now()}`,
                email: parentEmail,
                firstName: firstName,
                lastName: lastName,
                phone: parentPhone,
                password: parentPassword
              });
            }

            setProfileFormData({
              email: parentEmail,
              firstName: firstName,
              lastName: lastName,
              phone: parentPhone,
              password: parentPassword
            });

            // Also verify/create the form submission if it's missing
            try {
              const subRes = await fetch(`/api/form-submissions?formId=2`);
              const subData = await subRes.json();
              const submissions = subData.submissions || subData || [];
              const hasSubmission = Array.isArray(submissions) && submissions.some(s => 
                s.customer_email === parentEmail || 
                (s.data && (s.data[38] === parentEmail || s.data['38'] === parentEmail))
              );
              
              if (!hasSubmission && formData) {
                // Create the missing form submission
                const submissionPayload = {
                  formId: 2,
                  data: formData
                };
                if (cart && cart.length > 0) {
                  submissionPayload.cartItems = cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    selectedSize: item.selectedSize || null
                  }));
                  submissionPayload.cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                }
                const createSubRes = await fetch('/api/form-submissions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(submissionPayload)
                });
                if (createSubRes.ok) {
                  console.log('Created missing form submission from checkout');
                  setFormSubmissionVerified(true);
                } else {
                  console.error('Failed to create form submission from checkout');
                }
              } else {
                setFormSubmissionVerified(true);
              }
            } catch (subErr) {
              console.error('Error verifying form submission:', subErr);
            }
          }
        }
      } catch (e) {
        console.error('Error loading checkout data:', e);
      }

      setIsLoading(false);
    };

    loadAndCreateProfile();
  }, [cart]);

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

  const persistCheckoutDraft = (nextProfile) => {
    if (typeof window === 'undefined') return;
    const existingDraft = localStorage.getItem('formDraft_2');
    let parsed = {};
    try {
      parsed = existingDraft ? JSON.parse(existingDraft) : {};
    } catch (draftError) {
      parsed = {};
    }

    const formData = parsed?.formData || {};
    formData[37] = `${nextProfile.firstName} ${nextProfile.lastName}`.trim();
    formData[38] = nextProfile.email || '';
    formData[39] = nextProfile.password || '';
    formData[40] = nextProfile.phone || '';
    formData.checkout_firstName = nextProfile.firstName || '';
    formData.checkout_lastName = nextProfile.lastName || '';
    formData.checkout_email = nextProfile.email || '';
    formData.checkout_password = nextProfile.password || '';
    formData.checkout_phone = nextProfile.phone || '';

    const nextDraft = { ...parsed, formData };
    localStorage.setItem('formDraft_2', JSON.stringify(nextDraft));
  };

  const handleProfileSave = async () => {
    setProfileMessage('');
    setError('');

    const nextProfile = {
      email: profileFormData.email.trim(),
      firstName: profileFormData.firstName.trim(),
      lastName: profileFormData.lastName.trim(),
      phone: profileFormData.phone.trim(),
      password: profileFormData.password.trim()
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
            phone: p.phone || nextProfile.phone,
            password: nextProfile.password
          });
        } else {
          setCustomerProfile({ ...customerProfile, ...nextProfile });
        }
      } else {
        // Create new DB profile
        const createRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            ...nextProfile
          })
        });
        const createData = await createRes.json();
        if (createData?.profile || createData?.id) {
          const p = createData.profile || createData;
          setCustomerProfile({
            id: p.id,
            email: p.email || nextProfile.email,
            firstName: p.first_name || p.firstName || nextProfile.firstName,
            lastName: p.last_name || p.lastName || nextProfile.lastName,
            phone: p.phone || nextProfile.phone,
            password: nextProfile.password
          });
        } else {
          setCustomerProfile({ ...nextProfile, id: `local-${Date.now()}` });
        }
      }
    } catch (saveErr) {
      console.error('Error saving profile:', saveErr);
      setCustomerProfile({ ...customerProfile, ...nextProfile });
    }

    persistCheckoutDraft(nextProfile);
    setProfileMessage('Details updated. Your checkout info is saved.');
    setIsEditingProfile(false);
  };

  const handlePayment = async () => {
    if (!customerProfile) {
      setError('Customer profile not found. Please go back and complete the registration form.');
      return;
    }

    setStep('processing');
    setError('');

    const orderTotal = getCartTotal().toFixed(2);
    const orderId = `ORD${Date.now()}`;

    try {
      // ===== CREATE ORDER IN DATABASE =====
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          orderData: {
            orderNumber: orderId,
            customerEmail: customerProfile.email,
            customerName: `${customerProfile.firstName} ${customerProfile.lastName}`,
            customerPhone: customerProfile.phone || '',
            items: cart,
            subtotal: parseFloat(orderTotal),
            shipping: 0,
            total: parseFloat(orderTotal),
            status: 'pending',
            paymentMethod: activeGateway,
            paymentStatus: 'pending',
            orderType: 'registration',
            shippingAddress: null,
            notes: ''
          }
        })
      });

      const orderData = await orderRes.json();
      if (!orderData.order) {
        console.error('Failed to create order in DB:', orderData);
      } else {
        console.log('Order saved to database:', orderId);
      }

      if (activeGateway === 'yoco') {
        // ===== YOCO FLOW =====
        const response = await fetch('/api/yoco/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            amount: orderTotal,
            itemName: `Order #${orderId}`,
            itemDescription: `${cart.length} item(s)`,
            firstName: customerProfile.firstName,
            lastName: customerProfile.lastName,
            email: customerProfile.email,
            phone: customerProfile.phone,
            customerId: customerProfile.id.toString()
          })
        });

        const data = await response.json();

        if (!data.success || !data.redirectUrl) {
          setError(data.error || 'Failed to initiate Yoco payment. Please try again.');
          setStep('payment');
          return;
        }

        window.location.href = data.redirectUrl;
      } else {
        // ===== PAYFAST FLOW =====
        const response = await fetch('/api/payfast/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            amount: orderTotal,
            itemName: `Order #${orderId}`,
            itemDescription: `${cart.length} item(s)`,
            firstName: customerProfile.firstName,
            lastName: customerProfile.lastName,
            email: customerProfile.email,
            phone: customerProfile.phone,
            customerId: customerProfile.id.toString()
          })
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
  if (cartLoaded && cart.length === 0) {
    return (
      <div className={styles.container} style={{ background: 'transparent' }}>
        <Head>
          <title>Checkout - {siteConfig.storeName}</title>
        </Head>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.logo}>🏏 {siteConfig.storeName}</h1>
            <nav className={styles.nav}>
              <Link href="/" className={styles.navLink}>Home</Link>
            </nav>
          </div>
        </header>
        <main className={styles.main} style={{ color: '#e5e7eb' }}>
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#f9fafb' }}>Your cart is empty</h1>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Add some products before checking out</p>
            <Link href="/" style={{ 
              padding: '1rem 2rem', 
              background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
              color: 'white',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 700,
              display: 'inline-block'
            }}>
              Continue Shopping
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
          <title>Checkout - {siteConfig.storeName}</title>
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
        <title>Checkout - {siteConfig.storeName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </Head>
      
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>🏏 {siteConfig.storeName}</h1>
          <nav className={styles.nav}>
            <Link href="/" className={styles.navLink}>Home</Link>
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
                      </div>
                      <p style={{ color: '#e5e7eb' }}><strong>Name:</strong> {customerProfile.firstName} {customerProfile.lastName}</p>
                      <p style={{ color: '#e5e7eb' }}><strong>Email:</strong> {customerProfile.email}</p>
                      <p style={{ color: '#e5e7eb' }}><strong>Phone:</strong> {customerProfile.phone}</p>

                      {isEditingProfile && (
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
                      style={{ 
                        width: '100%',
                        padding: '1.25rem', 
                        background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Pay with {activeGateway === 'yoco' ? 'Yoco' : 'PayFast'} — R{getCartTotal().toFixed(2)}
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
                      Please complete the player registration form first to proceed with checkout.
                    </p>
                    <Link href="/forms/player-registration" style={{ 
                      padding: '1rem 2rem', 
                      background: '#dc0000',
                      color: 'white',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontWeight: 700,
                      display: 'inline-block'
                    }}>
                      Go to Registration
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
            
            {cart.map((item) => (
              <div key={`${item.id}-${item.selectedSize}`} style={{ 
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
                  <span>R{item.price.toFixed(2)} × {item.quantity}</span>
                  <span style={{ fontWeight: 700, color: '#f9fafb' }}>
                    R{(item.price * item.quantity).toFixed(2)}
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
