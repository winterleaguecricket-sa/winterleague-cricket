import Head from 'next/head';
import styles from '../../styles/channel.module.css';
import FormDisplay from '../../components/FormDisplay';
import Cart from '../../components/Cart';
import { getFormTemplateById } from '../../data/forms';
import { siteConfig } from '../../data/products';
import { getLandingPageByFormId } from '../../data/landingPages';
import { query } from '../../lib/db';

export default function PlayerRegistrationFormPage({ landingPage: landingPageProp }) {
  const formId = 2;
  const selectedForm = getFormTemplateById(formId);
  const landingPage = landingPageProp || getLandingPageByFormId(formId);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://winterleaguecricket.co.za';
  const canonicalUrl = `${baseUrl}/forms/player-registration`;
  const pageTitle = selectedForm
    ? `${selectedForm.name} - ${siteConfig.storeName}`
    : `Player Registration - ${siteConfig.storeName}`;
  const pageDescription = selectedForm
    ? `${selectedForm.name}: ${selectedForm.description || 'Submit your player registration online.'}`
    : `Register as a player with ${siteConfig.storeName} online.`;
  const heroImage = landingPage?.heroSection?.backgroundImage || siteConfig.heroMediaUrl || '';
  // Use compressed OG image for WhatsApp/social sharing (original is >2MB PNG)
  const ogHeroImage = heroImage ? heroImage.replace(/\.(png|PNG)$/, '-og.jpg') : '';
  const ogImageUrl = ogHeroImage
    ? ogHeroImage.startsWith('http')
      ? ogHeroImage
      : `${baseUrl}${ogHeroImage.startsWith('/') ? '' : '/'}${ogHeroImage}`
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
        {ogImageUrl && <meta property="og:image:width" content="1200" />}
        {ogImageUrl && <meta property="og:image:height" content="630" />}
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
        {selectedForm ? (
          <div className={styles.selectedFormContainer}>
            <h1 className={styles.srOnly}>{selectedForm.name}</h1>
            <FormDisplay
              form={selectedForm}
              landingPage={landingPage}
              onSubmitSuccess={() => {}}
            />
          </div>
        ) : (
          <p className={styles.emptyMessage}>Form not found.</p>
        )}
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} {siteConfig.storeName}. All rights reserved.</p>
      </footer>

      <Cart />
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const result = await query('SELECT content FROM landing_pages WHERE slug = $1', ['form-2']);
    if (result.rows.length > 0) {
      return {
        props: {
          landingPage: result.rows[0].content || null
        }
      };
    }
  } catch (error) {
    console.error('Failed to load landing page for form-2:', error.message);
  }
  return { props: { landingPage: null } };
}
