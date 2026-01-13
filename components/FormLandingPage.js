import { useState } from 'react';
import styles from './FormLandingPage.module.css';

export default function FormLandingPage({ landingPage, onStart }) {
  if (!landingPage || !landingPage.enabled) {
    return null;
  }

  const { heroSection, features, benefits, testimonials, stats } = landingPage;

  return (
    <div className={styles.landingPage}>
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
          <p className={styles.heroSubtitle}>{heroSection.subtitle}</p>
          <button 
            onClick={onStart}
            className={styles.ctaButton}
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
        <div className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Features & Benefits</h2>
            <div className={styles.featuresGrid}>
              {features.map((feature, index) => (
                <div key={index} className={styles.featureCard}>
                  <div className={styles.featureIcon}>{feature.icon}</div>
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
        <div className={styles.section} style={{ background: '#f9fafb' }}>
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
      {testimonials && testimonials.length > 0 && (
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
            className={styles.ctaButton}
            style={{ background: heroSection.ctaColor || '#dc0000' }}
          >
            {heroSection.ctaText || 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}
