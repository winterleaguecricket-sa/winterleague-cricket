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
  const { order } = router.query;
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (order) {
      // Clear cart on successful order
      clearCart();
    }
  }, [order]);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      router.push('/');
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
          <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>✅</div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#000000', fontWeight: 900 }}>
            Order Confirmed!
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
          <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '2rem' }}>
            Thank you for your order! We've received your payment and will process your order shortly.
          </p>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            A confirmation email has been sent to your email address.
          </p>
          <p style={{ color: '#dc0000', fontWeight: 700, marginBottom: '2rem' }}>
            Redirecting to home page in {countdown} seconds...
          </p>
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
