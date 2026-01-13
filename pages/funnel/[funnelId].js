import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/funnel.module.css';
import ProductCard from '../../components/ProductCard';
import FormDisplay from '../../components/FormDisplay';
import Cart from '../../components/Cart';
import { useCart } from '../../context/CartContext';
import { 
  getFunnelById, 
  getNextStep, 
  getPreviousStep, 
  getFunnelProgress 
} from '../../data/funnels';
import { getCategoryBySlug, getCategories } from '../../data/categories';
import { getProductsByCategory, siteConfig } from '../../data/products';
import { getFormTemplateById } from '../../data/forms';
import { getPageBySlug } from '../../data/categories';

export default function FunnelPage() {
  const router = useRouter();
  const { funnelId, step } = router.query;
  const [funnel, setFunnel] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [currentStepNumber, setCurrentStepNumber] = useState(1);
  const [content, setContent] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const { toggleCart, getCartCount } = useCart();

  useEffect(() => {
    if (funnelId) {
      const funnelData = getFunnelById(Number(funnelId));
      if (funnelData && funnelData.active) {
        setFunnel(funnelData);
        
        // Determine which step to show
        const stepNum = step ? Number(step) : 1;
        const stepToShow = funnelData.steps.find(s => s.order === stepNum);
        
        if (stepToShow) {
          setCurrentStep(stepToShow);
          setCurrentStepNumber(stepNum);
          setProgress(getFunnelProgress(funnelData.id, stepToShow.id));
          loadStepContent(stepToShow);
        }
      }
    }
  }, [funnelId, step]);

  const loadStepContent = (step) => {
    const categories = getCategories();
    
    switch (step.type) {
      case 'category':
        const category = categories.find(c => c.id === Number(step.targetId));
        if (category) {
          const products = getProductsByCategory(category.slug);
          setContent({ type: 'category', category, products });
        }
        break;
      case 'form':
        const form = getFormTemplateById(Number(step.targetId));
        if (form) {
          setContent({ type: 'form', form });
        }
        break;
      case 'page':
        const page = getPageBySlug(step.targetId);
        if (page) {
          setContent({ type: 'page', page });
        }
        break;
      case 'checkout':
        setContent({ type: 'checkout' });
        break;
      default:
        setContent(null);
    }
  };

  const handleNext = () => {
    if (!funnel || !currentStep) return;
    
    const nextStep = getNextStep(funnel.id, currentStep.id);
    if (nextStep) {
      router.push(`/funnel/${funnelId}?step=${nextStep.order}`);
    }
  };

  const handlePrevious = () => {
    if (!funnel || !currentStep) return;
    
    const prevStep = getPreviousStep(funnel.id, currentStep.id);
    if (prevStep) {
      router.push(`/funnel/${funnelId}?step=${prevStep.order}`);
    } else {
      router.push('/');
    }
  };

  const handleFormSubmitSuccess = () => {
    // Auto-advance to next step after form submission
    setTimeout(() => {
      handleNext();
    }, 2000);
  };

  if (!funnel || !currentStep) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading funnel...</div>
      </div>
    );
  }

  return (
    <div className={styles.container} style={{ fontFamily: siteConfig.fontFamily }}>
      <Head>
        <title>{funnel.name} - {siteConfig.storeName}</title>
      </Head>

      <Cart hideCheckout={currentStep.type !== 'checkout'} />

      <header className={styles.header} style={{ 
        background: `linear-gradient(135deg, ${siteConfig.primaryColor} 0%, ${siteConfig.secondaryColor} 100%)`
      }}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>🏏 {siteConfig.storeName}</h1>
          <nav className={styles.nav}>
            <Link href="/" className={styles.navLink}>Exit Funnel</Link>
            <button onClick={toggleCart} className={styles.cartButton}>
              🛒 Cart
              {getCartCount() > 0 && (
                <span className={styles.cartBadge}>{getCartCount()}</span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Progress Bar */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <div className={styles.progressText}>
          Step {progress.current} of {progress.total}
        </div>
      </div>

      <main className={styles.main}>
        {/* Step Header */}
        <div className={styles.stepHeader}>
          <h1>{currentStep.title || 'Funnel Step'}</h1>
          {currentStep.description && (
            <p className={styles.stepDescription}>{currentStep.description}</p>
          )}
        </div>

        {/* Step Content */}
        <div className={styles.stepContent}>
          {content?.type === 'category' && (
            <div className={styles.categoryContent}>
              <h2>{content.category.icon} {content.category.name}</h2>
              <p>{content.category.description}</p>
              <div className={styles.productGrid}>
                {content.products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}

          {content?.type === 'form' && (
            <div className={styles.formContent}>
              <FormDisplay 
                form={content.form} 
                onSubmitSuccess={handleFormSubmitSuccess}
              />
            </div>
          )}

          {content?.type === 'page' && (
            <div className={styles.pageContent}>
              <h2>{content.page.title}</h2>
              <div className={styles.pageBody}>
                {content.page.content}
              </div>
            </div>
          )}

          {content?.type === 'checkout' && (
            <div className={styles.checkoutContent}>
              <h2>Complete Your Order</h2>
              <div className={styles.checkoutPlaceholder}>
                <p>You've completed the funnel! Click below to proceed to checkout.</p>
                <Link 
                  href="/checkout" 
                  style={{
                    display: 'inline-block',
                    marginTop: '1rem',
                    padding: '1rem 2rem',
                    background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                    color: 'white',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontWeight: 700
                  }}
                >
                  Proceed to Checkout
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className={styles.navigationButtons}>
          <button 
            onClick={handlePrevious}
            className={styles.prevButton}
          >
            ← Previous
          </button>
          
          {getNextStep(funnel.id, currentStep.id) && (
            <button 
              onClick={handleNext}
              className={styles.nextButton}
            >
              Next →
            </button>
          )}
          
          {!getNextStep(funnel.id, currentStep.id) && currentStep.type !== 'checkout' && (
            <button 
              onClick={() => router.push('/')}
              className={styles.finishButton}
            >
              Finish
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
