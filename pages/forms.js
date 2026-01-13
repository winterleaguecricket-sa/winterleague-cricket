import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/channel.module.css';
import FormDisplay from '../components/FormDisplay';
import Cart from '../components/Cart';
import { getFormTemplates } from '../data/forms';
import { siteConfig } from '../data/products';

export default function Forms() {
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);

  useEffect(() => {
    const allForms = getFormTemplates().filter(form => 
      form.active && form.displayLocations?.includes('forms-page')
    );
    setForms(allForms);
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Forms & Inquiries - {siteConfig.storeName}</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>🏏 {siteConfig.storeName}</h1>
          <nav className={styles.nav}>
            <Link href="/" className={styles.navLink}>Home</Link>
            <Link href="/premium" className={styles.navLink}>Premium</Link>
            <Link href="/training" className={styles.navLink}>Training</Link>
            <Link href="/admin" className={styles.navLink}>Admin</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {!selectedForm && forms.length > 0 && (
          <div className={styles.formsList}>
            <div className={styles.formsGrid}>
              {forms.map(form => (
                <div key={form.id} className={styles.formCard}>
                  <h3>{form.name}</h3>
                  <p>{form.description}</p>
                  <button 
                    onClick={() => setSelectedForm(form)}
                    className={styles.formButton}
                  >
                    Fill Out Form →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedForm && (
          <div className={styles.selectedFormContainer}>
            <FormDisplay 
              form={selectedForm} 
              onSubmitSuccess={() => setSelectedForm(null)}
            />
          </div>
        )}

        {forms.length === 0 && (
          <p className={styles.emptyMessage}>No forms available at the moment.</p>
        )}
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2025 {siteConfig.storeName}. All rights reserved.</p>
      </footer>

      <Cart />
    </div>
  );
}
