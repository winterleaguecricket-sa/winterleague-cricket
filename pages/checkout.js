import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/channel.module.css';
import { siteConfig } from '../data/products';
import { getProfileByEmail, createProfile, updateProfile, addOrderToProfile, verifyCredentials } from '../data/customers';

export default function Checkout() {
  const { cart, getCartTotal, clearCart } = useCart();
  const [step, setStep] = useState('profile'); // profile, shipping, payment, processing
  const [customerProfile, setCustomerProfile] = useState(null);
  const [profileFormData, setProfileFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    idNumber: '',
    dateOfBirth: '',
    company: ''
  });
  const [shippingData, setShippingData] = useState({
    address: '',
    address2: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'South Africa',
    notes: ''
  });
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [error, setError] = useState('');
  const [activeGateway, setActiveGateway] = useState('payfast');

  useEffect(() => {
    fetch('/api/payment-gateway')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.gateway) setActiveGateway(data.gateway);
      })
      .catch(() => {});
  }, []);

  const handleProfileChange = (e) => {
    setProfileFormData({
      ...profileFormData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleShippingChange = (e) => {
    setShippingData({
      ...shippingData,
      [e.target.name]: e.target.value
    });
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setError('');

    const existingProfile = getProfileByEmail(profileFormData.email);
    
    if (existingProfile && !isReturningCustomer) {
      setError('This email is already registered. Please use "Returning Customer" option.');
      return;
    }

    if (isReturningCustomer && !existingProfile) {
      setError('No account found with this email. Please create a new profile.');
      return;
    }

    let profile;
    if (isReturningCustomer) {
      // Verify password for returning customers
      const authResult = verifyCredentials(profileFormData.email, profileFormData.password);
      if (!authResult.authenticated) {
        setError('Invalid email or password. Please try again.');
        return;
      }
      profile = authResult.profile;
      setShippingData({
        address: profile.shippingAddress?.address || '',
        address2: profile.shippingAddress?.address2 || '',
        city: profile.shippingAddress?.city || '',
        province: profile.shippingAddress?.province || '',
        postalCode: profile.shippingAddress?.postalCode || '',
        country: profile.shippingAddress?.country || 'South Africa',
        notes: ''
      });
    } else {
      const result = createProfile(profileFormData);
      if (result.error) {
        setError(result.error);
        return;
      }
      profile = result.profile;
    }

    setCustomerProfile(profile);
    setStep('shipping');
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    updateProfile(customerProfile.id, {
      shippingAddress: shippingData
    });
    setStep('payment');
  };

  const handlePayment = async () => {
    setStep('processing');
    setError('');

    const orderTotal = getCartTotal().toFixed(2);
    const orderId = `ORD${Date.now()}`;

    // Keep in-memory order for backward compatibility
    addOrderToProfile(customerProfile.id, {
      orderId,
      items: cart,
      total: parseFloat(orderTotal),
      shippingAddress: shippingData,
      status: 'pending',
      paymentMethod: activeGateway
    });

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
            orderType: 'product',
            shippingAddress: {
              address: shippingData.address,
              city: shippingData.city,
              province: shippingData.province,
              postalCode: shippingData.postalCode
            },
            notes: ''
          }
        })
      });

      const orderData = await orderRes.json();
      if (!orderData.order) {
        console.error('Failed to create order in DB:', orderData);
        // Continue anyway — payment gateway webhooks may still work
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

        // Redirect to Yoco hosted checkout page
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

        // Create and submit the PayFast form
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

  if (cart.length === 0) {
    return (
      <div className={styles.container}>
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
        <main className={styles.main}>
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Your cart is empty</h1>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Add some products before checking out</p>
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

  return (
    <div className={styles.container}>
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

      <main className={styles.main}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '2rem' }}>Checkout</h1>

        {/* Progress Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem', gap: '1rem' }}>
          <div style={{ 
            padding: '0.5rem 1.5rem', 
            borderRadius: '30px', 
            background: step === 'profile' ? '#dc0000' : '#e5e7eb',
            color: step === 'profile' ? 'white' : '#6b7280',
            fontWeight: 700
          }}>1. Profile</div>
          <div style={{ 
            padding: '0.5rem 1.5rem', 
            borderRadius: '30px', 
            background: step === 'shipping' ? '#dc0000' : '#e5e7eb',
            color: step === 'shipping' ? 'white' : '#6b7280',
            fontWeight: 700
          }}>2. Shipping</div>
          <div style={{ 
            padding: '0.5rem 1.5rem', 
            borderRadius: '30px', 
            background: step === 'payment' || step === 'processing' ? '#dc0000' : '#e5e7eb',
            color: step === 'payment' || step === 'processing' ? 'white' : '#6b7280',
            fontWeight: 700
          }}>3. Payment</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '2rem', alignItems: 'start' }}>
          {/* Main Content */}
          <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            
            {/* PROFILE STEP */}
            {step === 'profile' && (
              <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Customer Profile</h2>
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsReturningCustomer(false)}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      border: !isReturningCustomer ? '2px solid #dc0000' : '2px solid #e5e7eb',
                      background: !isReturningCustomer ? '#fff5f5' : 'white',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    New Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReturningCustomer(true)}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      border: isReturningCustomer ? '2px solid #dc0000' : '2px solid #e5e7eb',
                      background: isReturningCustomer ? '#fff5f5' : 'white',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Returning Customer
                  </button>
                </div>

                {error && (
                  <div style={{ 
                    padding: '1rem', 
                    background: '#fee', 
                    color: '#c00', 
                    borderRadius: '10px', 
                    marginBottom: '1.5rem',
                    fontWeight: 600
                  }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleProfileSubmit}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={profileFormData.email}
                      onChange={handleProfileChange}
                      required
                      style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>
                      Password * {!isReturningCustomer && <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#6b7280' }}>(Create a password to access your orders later)</span>}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={profileFormData.password}
                      onChange={handleProfileChange}
                      required
                      placeholder={isReturningCustomer ? "Enter your password" : "Create a password"}
                      style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                    />
                  </div>

                  {!isReturningCustomer && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                          <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>First Name *</label>
                          <input
                            type="text"
                            name="firstName"
                            value={profileFormData.firstName}
                            onChange={handleProfileChange}
                            required
                            style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Last Name *</label>
                          <input
                            type="text"
                            name="lastName"
                            value={profileFormData.lastName}
                            onChange={handleProfileChange}
                            required
                            style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Phone Number *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={profileFormData.phone}
                          onChange={handleProfileChange}
                          required
                          style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                        />
                      </div>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>ID Number (Optional)</label>
                        <input
                          type="text"
                          name="idNumber"
                          value={profileFormData.idNumber}
                          onChange={handleProfileChange}
                          style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                        />
                      </div>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Date of Birth (Optional)</label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={profileFormData.dateOfBirth}
                          onChange={handleProfileChange}
                          style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                        />
                      </div>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Company (Optional)</label>
                        <input
                          type="text"
                          name="company"
                          value={profileFormData.company}
                          onChange={handleProfileChange}
                          style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                        />
                      </div>
                    </>
                  )}

                  <button 
                    type="submit"
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
                    Continue to Shipping
                  </button>
                </form>
              </>
            )}

            {/* SHIPPING STEP */}
            {step === 'shipping' && (
              <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Shipping Address</h2>
                
                <form onSubmit={handleShippingSubmit}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Street Address *</label>
                    <input
                      type="text"
                      name="address"
                      value={shippingData.address}
                      onChange={handleShippingChange}
                      required
                      style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Apartment, suite, etc. (Optional)</label>
                    <input
                      type="text"
                      name="address2"
                      value={shippingData.address2}
                      onChange={handleShippingChange}
                      style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>City *</label>
                      <input
                        type="text"
                        name="city"
                        value={shippingData.city}
                        onChange={handleShippingChange}
                        required
                        style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Province *</label>
                      <input
                        type="text"
                        name="province"
                        value={shippingData.province}
                        onChange={handleShippingChange}
                        required
                        style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Postal Code *</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={shippingData.postalCode}
                        onChange={handleShippingChange}
                        required
                        style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Country *</label>
                      <input
                        type="text"
                        name="country"
                        value={shippingData.country}
                        onChange={handleShippingChange}
                        required
                        style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Delivery Notes (Optional)</label>
                    <textarea
                      name="notes"
                      value={shippingData.notes}
                      onChange={handleShippingChange}
                      rows="3"
                      style={{ width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '1rem', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      type="button"
                      onClick={() => setStep('profile')}
                      style={{ 
                        flex: 1,
                        padding: '1.25rem', 
                        background: '#e5e7eb',
                        color: '#000',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Back
                    </button>
                    <button 
                      type="submit"
                      style={{ 
                        flex: 2,
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
                      Continue to Payment
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* PAYMENT STEP */}
            {step === 'payment' && (
              <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Payment</h2>
                
                {error && (
                  <div style={{ 
                    padding: '1rem', 
                    background: '#fee', 
                    color: '#c00', 
                    borderRadius: '10px', 
                    marginBottom: '1.5rem',
                    fontWeight: 600
                  }}>
                    {error}
                  </div>
                )}

                <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Customer Details</h3>
                  <p><strong>Name:</strong> {customerProfile.firstName} {customerProfile.lastName}</p>
                  <p><strong>Email:</strong> {customerProfile.email}</p>
                  <p><strong>Phone:</strong> {customerProfile.phone}</p>
                </div>

                <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '10px', marginBottom: '2rem' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Shipping Address</h3>
                  <p>{shippingData.address}</p>
                  {shippingData.address2 && <p>{shippingData.address2}</p>}
                  <p>{shippingData.city}, {shippingData.province} {shippingData.postalCode}</p>
                  <p>{shippingData.country}</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    type="button"
                    onClick={() => setStep('shipping')}
                    style={{ 
                      flex: 1,
                      padding: '1.25rem', 
                      background: '#e5e7eb',
                      color: '#000',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                  <button 
                    type="button"
                    onClick={handlePayment}
                    style={{ 
                      flex: 2,
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
                    Pay with {activeGateway === 'yoco' ? 'Yoco' : 'PayFast'}
                  </button>
                </div>
              </>
            )}

            {/* PROCESSING STEP */}
            {step === 'processing' && (
              <>
                <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Processing Payment</h2>
                  <p style={{ color: '#6b7280' }}>Redirecting to {activeGateway === 'yoco' ? 'Yoco' : 'PayFast'} secure payment gateway...</p>
                </div>
              </>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', position: 'sticky', top: '100px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Order Summary</h2>
            
            {cart.map((item) => (
              <div key={`${item.id}-${item.selectedSize}`} style={{ 
                paddingBottom: '1rem', 
                marginBottom: '1rem', 
                borderBottom: '1px solid #e5e7eb' 
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{item.name}</div>
                {item.selectedSize && (
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Size: {item.selectedSize}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#6b7280' }}>
                  <span>R{item.price.toFixed(2)} × {item.quantity}</span>
                  <span style={{ fontWeight: 700, color: '#000000' }}>
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
              borderTop: '2px solid #e5e7eb'
            }}>
              <span>Total:</span>
              <span style={{ color: '#dc0000' }}>R{getCartTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
