import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/channel.module.css';
import FormDisplay from '../components/FormDisplay';
import Cart from '../components/Cart';
import { getFormTemplates, getFormTemplateById } from '../data/forms';
import { getLandingPageByFormId } from '../data/landingPages';
import { siteConfig } from '../data/products';

export default function Forms() {
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [formNotFound, setFormNotFound] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    const allForms = getFormTemplates().filter(form => 
      form.active && form.displayLocations?.includes('forms-page')
    );
    setForms(allForms);

    // Check if a specific form is requested via URL parameter
    const { formId } = router.query;
    if (formId) {
      const form = getFormTemplateById(parseInt(formId));
      if (form && form.active) {
        setSelectedForm(form);
        setFormNotFound(false);
      } else {
        setSelectedForm(null);
        setFormNotFound(true);
      }
    } else {
      setSelectedForm(null);
      setFormNotFound(false);
    }
  }, [router.isReady, router.query]);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://winterleaguecricket.co.za';
  const formIdValue = router.query?.formId ? parseInt(router.query.formId) : null;
  const dedicatedPathMap = {
    1: '/forms/team-registration',
    2: '/forms/player-registration'
  };
  const canonicalUrl = `${baseUrl}${dedicatedPathMap[formIdValue] || router.asPath.split('#')[0]}`;
  const pageTitle = selectedForm
    ? `${selectedForm.name} - ${siteConfig.storeName}`
    : `Forms & Inquiries - ${siteConfig.storeName}`;
  const pageDescription = selectedForm
    ? `${selectedForm.name}: ${selectedForm.description || 'Submit your registration or inquiry online.'}`
    : `Browse and submit official ${siteConfig.storeName} forms, registrations, and inquiries.`;
  const landingPage = formIdValue ? getLandingPageByFormId(formIdValue) : null;
  const heroImage = landingPage?.heroSection?.backgroundImage || siteConfig.heroMediaUrl || '';
  const ogImageUrl = heroImage
    ? heroImage.startsWith('http')
      ? heroImage
      : `${baseUrl}${heroImage.startsWith('/') ? '' : '/'}${heroImage}`
    : `${baseUrl}/uploads/og-default.jpg`;

  return (
    <div className={styles.container}>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {ogImageUrl && <meta property="og:image" content={ogImageUrl} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {ogImageUrl && <meta name="twitter:image" content={ogImageUrl} />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  name: siteConfig.storeName,
                  url: baseUrl
                },
                {
                  '@type': 'WebPage',
                  name: pageTitle,
                  url: canonicalUrl,
                  description: pageDescription,
                  isPartOf: {
                    '@type': 'WebSite',
                    name: siteConfig.storeName,
                    url: baseUrl
                  }
                }
              ]
            })
          }}
        />
      </Head>

      <header className={`${styles.header} ${styles.formsHeader}`}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo} style={{ color: '#ffffff' }}>{siteConfig.storeName}</h1>
        </div>
      </header>

      <main className={styles.main}>
        {formNotFound && (
          <p className={styles.emptyMessage}>Form not found. Please choose a form below.</p>
        )}
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
            <h1 className={styles.srOnly}>
              {selectedForm.name}
            </h1>
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
        <p>&copy; {new Date().getFullYear()} {siteConfig.storeName}. All rights reserved.</p>
      </footer>

      <Cart />
    </div>
  );
}

export async function getServerSideProps({ query }) {
  const formId = query?.formId ? parseInt(query.formId) : null;
  if (formId === 1) {
    return {
      redirect: {
        destination: '/forms/team-registration',
        permanent: false
      }
    };
  }
  if (formId === 2) {
    return {
      redirect: {
        destination: '/forms/player-registration',
        permanent: false
      }
    };
  }
  return { props: {} };
}
