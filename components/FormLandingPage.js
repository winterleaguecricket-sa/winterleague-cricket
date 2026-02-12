import { useState } from 'react';
import styles from './FormLandingPage.module.css';

export default function FormLandingPage({ landingPage, onStart, useFormBackground = false }) {
  if (!landingPage || !landingPage.enabled) {
    return null;
  }

  const { heroSection, features, benefits, testimonials, testimonialsVisible, stats } = landingPage;

  const featureIconMap = {
    teams: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 19v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1" />
        <path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M22 19v-1a3 3 0 0 0-2-2.83" />
        <path d="M18 3a3 3 0 0 1 0 6" />
      </svg>
    ),
    palette: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a9 9 0 1 0 0 18c1.66 0 3-1.34 3-3 0-1.1-.9-2-2-2h-1a2 2 0 0 1 0-4h1a2 2 0 0 0 2-2c0-3.31-2.69-6-6-6Z" />
        <circle cx="8.5" cy="10.5" r="0.9" />
        <circle cx="7" cy="14.5" r="0.9" />
        <circle cx="11.5" cy="7.5" r="0.9" />
      </svg>
    ),
    trending: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 17 6-6 4 4 7-7" />
        <path d="M14 8h7v7" />
      </svg>
    ),
    compass: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="m10 10 6-2-2 6-6 2 2-6Z" />
      </svg>
    )
  };

  return (
    <div className={`${styles.landingPage} ${useFormBackground ? styles.landingPageWithBackground : ''}`}>
      {/* Hero Section */}
      <div 
        className={styles.hero}
        style={{
          background: heroSection.overlayColor 
            ? `linear-gradient(${heroSection.overlayColor}, ${heroSection.overlayColor}), url(${heroSection.backgroundImage})`
            : heroSection.overlayColor || '#dc0000'
        }}
      >
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{heroSection.title}</h1>
          {heroSection.subtitle && (
            <p className={styles.heroSubtitle}>{heroSection.subtitle}</p>
          )}
          <button 
            onClick={onStart}
            className={`${styles.ctaButton} ${styles.ctaButtonGlow}`}
            style={{ background: heroSection.ctaColor || '#dc0000' }}
          >
            {heroSection.ctaText || 'Get Started'}
          </button>
        </div>
      </div>

      {/* Stats Section */}
      {stats && stats.length > 0 && (
        <div className={styles.statsSection}>
          <div className={styles.statsGrid}>
            {stats.map((stat, index) => (
              <div key={index} className={styles.statCard}>
                <div className={styles.statNumber}>{stat.number}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features Section */}
      {features && features.length > 0 && (
        <div className={`${styles.section} ${styles.darkSection}`}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Features & Benefits</h2>
            <div className={styles.featuresGrid}>
              {features.map((feature, index) => (
                <div key={index} className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    {featureIconMap[feature.icon] || feature.icon}
                  </div>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureDescription}>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Benefits List */}
      {benefits && benefits.items && benefits.items.length > 0 && (
        <div className={`${styles.section} ${styles.darkSection}`}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>{benefits.title || 'Benefits'}</h2>
            <div className={styles.benefitsGrid}>
              {benefits.items.map((item, index) => (
                <div key={index} className={styles.benefitItem}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Testimonials Section */}
      {testimonialsVisible !== false && testimonials && testimonials.length > 0 && (
        <div className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>What Others Say</h2>
            <div className={styles.testimonialsGrid}>
              {testimonials.map((testimonial, index) => (
                <div key={index} className={styles.testimonialCard}>
                  <div className={styles.quoteIcon}>"</div>
                  <p className={styles.quote}>{testimonial.quote}</p>
                  <div className={styles.author}>
                    <div className={styles.authorName}>{testimonial.author}</div>
                    <div className={styles.authorRole}>{testimonial.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Final CTA */}
      <div className={styles.finalCta}>
        <div className={styles.container}>
          <h2 className={styles.finalCtaTitle}>Ready to Get Started?</h2>
          <button 
            onClick={onStart}
            className={`${styles.ctaButton} ${styles.ctaButtonGlow}`}
            style={{ background: heroSection.ctaColor || '#dc0000' }}
          >
            {heroSection.ctaText || 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}
