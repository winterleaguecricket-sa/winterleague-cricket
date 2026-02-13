// Test payment page — for verifying live payment gateway integration
// Access at: /test-payment
// This page adds a R5 test item to cart and takes you straight to checkout
import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const TEST_PRODUCT = {
  id: 999,
  name: 'Payment Test Item',
  price: 5.00,
  image: '/images/ball-training.jpg',
  description: 'R5 test product for verifying live payment gateway.'
};

export default function TestPayment() {
  const { cart, addToCart, clearCart, getCartTotal } = useCart();
  const [status, setStatus] = useState('ready');
  const [configInfo, setConfigInfo] = useState(null);
  const [activeGateway, setActiveGateway] = useState(null);
  const router = useRouter();

  // Check active gateway and its config on load
  useEffect(() => {
    // Fetch active gateway first
    fetch('/api/payment-gateway')
      .then(res => res.json())
      .then(data => {
        const gw = data.success ? (data.gateway || 'payfast') : 'payfast';
        setActiveGateway(gw);

        // Then fetch the config for whichever gateway is active
        const configUrl = gw === 'yoco' ? '/api/yoco/config' : '/api/payfast/config';
        return fetch(configUrl).then(r => r.json());
      })
      .then(data => {
        if (data.success && data.config) {
          setConfigInfo(data.config);
        } else {
          setConfigInfo({ error: 'Could not fetch config' });
        }
      })
      .catch(() => setConfigInfo({ error: 'Could not fetch config' }));
  }, []);

  const handleStartTest = () => {
    clearCart();
    setTimeout(() => {
      addToCart(TEST_PRODUCT);
      setStatus('added');
    }, 100);
  };

  const handleGoToCheckout = () => {
    router.push('/checkout');
  };

  const gwName = activeGateway === 'yoco' ? 'Yoco' : 'PayFast';
  const isLiveMode = configInfo && !configInfo.testMode;
  const isConfigured = configInfo && configInfo.isConfigured;

  return (
    <>
      <Head>
        <title>Payment Test | Winter League Cricket</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div style={{
        maxWidth: 600,
        margin: '60px auto',
        padding: 30,
        fontFamily: 'Arial, sans-serif',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Live Payment Test</h1>
        <p style={{ color: '#666', marginBottom: 24 }}>
          This page lets you test a real R5.00 card payment through {gwName}.
        </p>

        {/* Config Status */}
        <div style={{
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
          background: isConfigured ? (isLiveMode ? '#e8f5e9' : '#fff3e0') : '#ffebee'
        }}>
          <strong>{gwName} Status:</strong>{' '}
          {!configInfo || !activeGateway ? 'Loading...' :
           configInfo.error ? `Error: ${configInfo.error}` :
           !isConfigured ? `❌ Not configured — go to /admin/payment` :
           isLiveMode ? `✅ LIVE MODE — real payments will be processed via ${gwName}` :
           `⚠️ TEST MODE — switch to live in /admin/payment`}
          {activeGateway === 'yoco' && configInfo?.secretKey && (
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
              Secret Key: {configInfo.secretKey}
            </div>
          )}
          {activeGateway !== 'yoco' && configInfo?.merchantId && (
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
              Merchant ID: {configInfo.merchantId}
            </div>
          )}
          <div style={{ fontSize: 13, color: '#007bff', marginTop: 4 }}>
            Active Gateway: <strong>{gwName}</strong>
          </div>
        </div>

        {/* Test Steps */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Test Checklist:</h3>
          <ol style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li style={{ color: isConfigured ? 'green' : 'red' }}>
              {gwName} credentials configured {isConfigured ? '✓' : '✗'}
            </li>
            <li style={{ color: isLiveMode ? 'green' : 'orange' }}>
              Live mode enabled {isLiveMode ? '✓' : '(test mode)'}
            </li>
            <li style={{ color: status === 'added' ? 'green' : '#333' }}>
              Add R5 test item to cart {status === 'added' ? '✓' : ''}
            </li>
            <li>Complete checkout &amp; pay with card</li>
            <li>Verify order status updates to &quot;paid&quot; in /admin</li>
            <li>Refund R5 from {gwName} dashboard</li>
          </ol>
        </div>

        {/* Action Buttons */}
        {status === 'ready' && (
          <button
            onClick={handleStartTest}
            disabled={!isConfigured}
            style={{
              width: '100%',
              padding: '14px 24px',
              fontSize: 16,
              fontWeight: 'bold',
              border: 'none',
              borderRadius: 8,
              cursor: isConfigured ? 'pointer' : 'not-allowed',
              background: isConfigured ? '#1a7f37' : '#ccc',
              color: '#fff'
            }}
          >
            Add R5.00 Test Item to Cart
          </button>
        )}

        {status === 'added' && (
          <div>
            <div style={{
              padding: 16,
              background: '#f5f5f5',
              borderRadius: 8,
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>{TEST_PRODUCT.name}</strong>
                <div style={{ color: '#666', fontSize: 14 }}>{TEST_PRODUCT.description}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1a7f37' }}>
                R {TEST_PRODUCT.price.toFixed(2)}
              </div>
            </div>

            <button
              onClick={handleGoToCheckout}
              style={{
                width: '100%',
                padding: '14px 24px',
                fontSize: 16,
                fontWeight: 'bold',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                background: isLiveMode ? '#dc0000' : '#f57c00',
                color: '#fff'
              }}
            >
              {isLiveMode ? `Proceed to Checkout (LIVE — R5.00 will be charged via ${gwName})` : `Proceed to Checkout (TEST MODE via ${gwName})`}
            </button>

            <p style={{ fontSize: 12, color: '#999', marginTop: 12, textAlign: 'center' }}>
              {isLiveMode
                ? `This will charge R5.00 to your card via ${gwName}. Refund from ${gwName} dashboard after testing.`
                : `Test mode — no real money will be charged.`}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
