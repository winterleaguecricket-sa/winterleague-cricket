import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/channel.module.css';
import { siteConfig } from '../../data/products';
import { useCart } from '../../context/CartContext';

export default function CheckoutSuccess() {
  const router = useRouter();
  const { clearCart } = useCart();
  const { order, gateway } = router.query;
  const [countdown, setCountdown] = useState(8);
  const [verifyStatus, setVerifyStatus] = useState(null); // null = pending, 'verified', 'pending', 'verifying'

  useEffect(() => {
    if (order) {
      clearCart();

      // If Yoco gateway, verify the payment server-side
      if (gateway === 'yoco') {
        setVerifyStatus('verifying');

        // Attempt verification with retry (Yoco may take a moment to update status)
        const verifyPayment = (attempt = 1) => {
          fetch('/api/yoco/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order })
          })
            .then(r => r.json())
            .then(data => {
              if (data.success && data.status === 'paid') {
                setVerifyStatus('verified');
              } else if (data.success && data.status === 'pending' && attempt < 3) {
                // Retry after 2 seconds — payment may still be processing
                setTimeout(() => verifyPayment(attempt + 1), 2000);
              } else {
                setVerifyStatus('pending');
              }
            })
            .catch(() => {
              setVerifyStatus('pending');
            });
        };

        verifyPayment();
      } else {
        // PayFast uses ITN webhook, no client-side verification needed
        setVerifyStatus('verified');
      }
    }
  }, [order, gateway]);

  // Clear form draft now that payment is complete
  useEffect(() => {
    if (order && typeof window !== 'undefined') {
      try { window.localStorage.removeItem('formDraft_2'); } catch (e) {}
    }
  }, [order]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      router.push('/parent-portal');
    }
  }, [countdown, router]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Order Confirmed - {siteConfig.storeName}</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>🏏 {siteConfig.storeName}</h1>
        </div>
      </header>

      <main className={styles.main}>
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>
            {verifyStatus === 'pending' ? '⏳' : '✅'}
          </div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#000000', fontWeight: 900 }}>
            {verifyStatus === 'pending' ? 'Order Received!' : 'Order Confirmed!'}
          </h1>
          {order && (
            <p style={{ 
              color: '#6b7280', 
              fontSize: '1rem', 
              marginBottom: '1rem',
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: '10px'
            }}>
              <strong>Order Number:</strong> {order}
            </p>
          )}

          {verifyStatus === 'verifying' && (
            <p style={{ color: '#6366f1', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>
              ⏳ Verifying payment with {gateway === 'yoco' ? 'Yoco' : 'payment gateway'}...
            </p>
          )}

          {verifyStatus === 'pending' && (
            <p style={{ color: '#f59e0b', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>
              ⏳ Your payment is being processed. You will receive a confirmation email once verified.
            </p>
          )}

          <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '2rem' }}>
            {verifyStatus === 'pending'
              ? 'Thank you for your order! Payment verification is in progress. This usually takes a few moments.'
              : 'Thank you for your order! We\'ve received your payment and will process your order shortly.'}
          </p>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            A confirmation email has been sent to your email address.
          </p>
          <p style={{ color: '#dc0000', fontWeight: 700, marginBottom: '2rem' }}>
            Redirecting to Parent Portal in {countdown} seconds...
          </p>
          <Link href="/parent-portal" style={{ 
            padding: '1rem 2rem', 
            background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
            color: 'white',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 700,
            display: 'inline-block'
          }}>
            Go to Parent Portal
          </Link>
        </div>
      </main>
    </div>
  );
}
