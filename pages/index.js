import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/home.module.css'
import FormDisplay from '../components/FormDisplay'
import Cart from '../components/Cart'
import { useCart } from '../context/CartContext'
import { siteConfig, getButtonsByLocation, getMenuItems, getSubMenuItems } from '../data/products'
import { getFormTemplates } from '../data/forms'
import { getHomepageConfig } from '../data/homepage'

function Home() {
  const [titleAnimationComplete, setTitleAnimationComplete] = useState(false);
  const audioRef = useRef(null);
  const [homepageConfig, setHomepageConfig] = useState(null);
  const [homepageForms, setHomepageForms] = useState([]);
  const [latestTikTokVideo, setLatestTikTokVideo] = useState(null);
  const [tiktokLoading, setTiktokLoading] = useState(false);
  const { toggleCart, getCartCount } = useCart();
  const heroPrimaryButtons = getButtonsByLocation('hero-primary');
  const heroSecondaryButtons = getButtonsByLocation('hero-secondary');
  const channelButtons = [
    ...getButtonsByLocation('channel-premium'),
    ...getButtonsByLocation('channel-training')
  ].sort((a, b) => a.order - b.order);
  const menuItems = getMenuItems();

  useEffect(() => {
    const config = getHomepageConfig();
    setHomepageConfig(config);
    
    const forms = getFormTemplates().filter(form => 
      form.active && form.displayLocations?.includes('homepage')
    );
    setHomepageForms(forms);

    // Fetch latest TikTok video if auto-latest is enabled
    if (config.channels.showTikTok && config.channels.tiktokAutoLatest) {
      if (config.channels.tiktokVideoUrl) {
        // Fetch specific video URL
        fetchTikTokVideo(config.channels.tiktokVideoUrl);
      } else if (config.channels.tiktokUsername) {
        // Fallback to username only
        fetchLatestTikTokVideo(config.channels.tiktokUsername);
      }
    }

    // Play rumble sound effect
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(e => console.log('Audio autoplay prevented'));
    }

    // Mark animation as complete after 3 seconds
    const timer = setTimeout(() => setTitleAnimationComplete(true), 3000);
    
    // Load TikTok embed script if needed
    if (config.channels.showTikTok && (config.channels.tiktokEmbedCode || config.channels.tiktokAutoLatest)) {
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
      
      return () => {
        clearTimeout(timer);
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
    
    return () => clearTimeout(timer);
  }, []);

  const fetchTikTokVideo = async (videoUrl) => {
    setTiktokLoading(true);
    try {
      const response = await fetch(`/api/tiktok-latest?videoUrl=${encodeURIComponent(videoUrl)}`);
      const data = await response.json();
      
      if (data.success && data.embedHtml) {
        setLatestTikTokVideo(data.embedHtml);
      } else {
        console.log('TikTok fetch result:', data.message || 'No video available');
        setLatestTikTokVideo(null);
      }
    } catch (error) {
      console.error('Error fetching TikTok video:', error);
      setLatestTikTokVideo(null);
    } finally {
      setTiktokLoading(false);
    }
  };

  const fetchLatestTikTokVideo = async (username) => {
    setTiktokLoading(true);
    try {
      // Remove @ if present
      const cleanUsername = username.replace('@', '');
      
      // Call our API route instead of directly calling TikTok
      const response = await fetch(`/api/tiktok-latest?username=${encodeURIComponent(cleanUsername)}`);
      const data = await response.json();
      
      if (data.success && data.embedHtml) {
        setLatestTikTokVideo(data.embedHtml);
      } else {
        console.log('TikTok fetch result:', data.message || 'No video available');
        setLatestTikTokVideo(null);
      }
    } catch (error) {
      console.error('Error fetching TikTok video:', error);
      setLatestTikTokVideo(null);
    } finally {
      setTiktokLoading(false);
    }
  };

  if (!homepageConfig) return null;

  return (
    <div className={styles.container} style={{ fontFamily: siteConfig.fontFamily }}>
      <Head>
        <title>{siteConfig.storeName} - Premium Cricket Equipment</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Cart />

      <header className={styles.header} style={{ 
        background: `linear-gradient(135deg, ${siteConfig.primaryColor} 0%, ${siteConfig.secondaryColor} 100%)`
      }}>
        <div className={styles.headerContent}>
          <div className={styles.logoContainer}>
            {siteConfig.logoUrl ? (
              <img src={siteConfig.logoUrl} alt={siteConfig.storeName} className={styles.logoImage} />
            ) : (
              <h1 className={styles.logo}>🏏 {siteConfig.storeName}</h1>
            )}
          </div>
          <nav className={styles.nav}>
            {menuItems.map(item => {
              const subItems = getSubMenuItems(item.id);
              
              if (subItems.length > 0) {
                return (
                  <div key={item.id} className={styles.dropdown}>
                    <Link href={item.href} className={styles.navLink}>
                      {item.label}
                    </Link>
                    <div className={styles.dropdownMenu}>
                      {subItems.map(subItem => (
                        <Link key={subItem.id} href={subItem.href} className={styles.dropdownItem}>
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }
              
              return (
                <Link key={item.id} href={item.href} className={styles.navLink}>
                  {item.label}
                </Link>
              );
            })}
            <Link href="/profile" className={styles.loginButton}>
              👤 Login
            </Link>
            <button onClick={toggleCart} className={styles.cartButton}>
              🛒 Cart
              {getCartCount() > 0 && (
                <span className={styles.cartBadge}>{getCartCount()}</span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {homepageConfig.banner.enabled && (
        <div className={styles.banner} style={{ background: siteConfig.accentColor }}>
          <p>{homepageConfig.banner.text}</p>
        </div>
      )}

      <main className={styles.main}>
        {/* Hero Section */}
        {siteConfig.heroMediaUrl && (
          <section className={styles.heroMedia}>
            {siteConfig.heroMediaType === 'video' ? (
              <video 
                autoPlay 
                loop 
                muted 
                playsInline
                className={styles.heroVideo}
              >
                <source src={siteConfig.heroMediaUrl} type="video/mp4" />
              </video>
            ) : (
              <img 
                src={siteConfig.heroMediaUrl} 
                alt="Hero" 
                className={styles.heroImage}
              />
            )}
            <div className={styles.heroOverlay}>
              <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE6i9rz0H4qBSJxvvDakUQME1iz6NygWhQMS6PiKAgHJHfI8N2RQAoUXrTp66hVFApGn+Dy" />
              <h2 className={styles.heroOverlayTitle}>
                {homepageConfig.hero.title}
              </h2>
              <p className={styles.heroOverlaySubtitle}>{homepageConfig.hero.subtitle}</p>
              <div className={styles.heroButtons}>
                {heroPrimaryButtons.map(button => (
                  <Link 
                    key={button.id}
                    href={button.funnelId ? `/funnel/${button.funnelId}?step=1` : (button.href || '#')} 
                    className={styles.heroCta}
                  >
                    {button.icon && <span>{button.icon} </span>}
                    {button.name}
                  </Link>
                ))}
                
                {heroSecondaryButtons.map(button => (
                  <Link 
                    key={button.id}
                    href={button.funnelId ? `/funnel/${button.funnelId}?step=1` : (button.href || '#')} 
                    className={styles.heroCtaSecondary}
                  >
                    {button.icon && <span>{button.icon} </span>}
                    {button.name}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className={styles.hero}>
          {homepageConfig.channels.enabled && (
            <>
              <h2 className={styles.heroTitle}>{homepageConfig.channels.title}</h2>
              <p className={styles.heroSubtitle}>
                {homepageConfig.channels.subtitle}
              </p>
              
              <div className={styles.channelButtons}>
                {channelButtons.map(button => (
                  <Link 
                    key={button.id}
                    href={button.funnelId ? `/funnel/${button.funnelId}?step=1` : (button.href || '#')} 
                    className={styles.channelButton} 
                    style={{
                      borderColor: siteConfig.primaryColor
                    }}
                  >
                    {button.icon && <div className={styles.channelIcon}>{button.icon}</div>}
                    <h3>{button.name}</h3>
                    {button.description && <p>{button.description}</p>}
                  </Link>
                ))}
              </div>

              {homepageConfig.channels.showTikTok && (
                <div className={styles.tiktokWidget}>
                  <h3 className={styles.tiktokTitle}>
                    🎵 Follow us on TikTok
                  </h3>
                  {homepageConfig.channels.tiktokAutoLatest ? (
                    <div className={styles.tiktokEmbed}>
                      {tiktokLoading ? (
                        <div style={{ color: 'white', padding: '2rem' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                          Loading latest video...
                        </div>
                      ) : latestTikTokVideo ? (
                        <div dangerouslySetInnerHTML={{ __html: latestTikTokVideo }} />
                      ) : (
                        <div className={styles.tiktokProfile}>
                          <div className={styles.tiktokIcon}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="60" height="60">
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                            </svg>
                          </div>
                          <p className={styles.tiktokUsername}>
                            {homepageConfig.channels.tiktokUsername}
                          </p>
                          <a 
                            href={`https://www.tiktok.com/${homepageConfig.channels.tiktokUsername.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.tiktokButton}
                          >
                            View on TikTok
                          </a>
                          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginTop: '1rem' }}>
                            Unable to fetch latest video
                          </p>
                        </div>
                      )}
                    </div>
                  ) : homepageConfig.channels.tiktokEmbedCode ? (
                    <div 
                      className={styles.tiktokEmbed}
                      dangerouslySetInnerHTML={{ __html: homepageConfig.channels.tiktokEmbedCode }}
                    />
                  ) : homepageConfig.channels.tiktokUsername ? (
                    <div className={styles.tiktokProfile}>
                      <div className={styles.tiktokIcon}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="60" height="60">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                        </svg>
                      </div>
                      <p className={styles.tiktokUsername}>
                        {homepageConfig.channels.tiktokUsername}
                      </p>
                      <a 
                        href={`https://www.tiktok.com/${homepageConfig.channels.tiktokUsername.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.tiktokButton}
                      >
                        View on TikTok
                      </a>
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', color: '#6b7280' }}>
                      Configure TikTok settings in the admin panel
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {homepageConfig.gallery.enabled && (
          <section className={styles.gallerySection}>
            <h2 className={styles.sectionTitle}>{homepageConfig.gallery.title}</h2>
            <p className={styles.sectionSubtitle}>{homepageConfig.gallery.subtitle}</p>
            
            <div className={styles.galleryContainer}>
              <div className={styles.galleryTrack}>
                {/* First set of images */}
                {homepageConfig.gallery.images.map(image => (
                  <div key={`${image.id}-1`} className={styles.galleryItem}>
                    <img src={image.url} alt={image.alt} />
                    <div className={styles.galleryOverlay}>
                      <span>{image.alt}</span>
                    </div>
                  </div>
                ))}
                {/* Duplicate set for seamless loop */}
                {homepageConfig.gallery.images.map(image => (
                  <div key={`${image.id}-2`} className={styles.galleryItem}>
                    <img src={image.url} alt={image.alt} />
                    <div className={styles.galleryOverlay}>
                      <span>{image.alt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {homepageForms.length > 0 && (
          <section className={styles.formsSection}>
            <h2 className={styles.sectionTitle}>Get in Touch</h2>
            <p className={styles.sectionSubtitle}>
              Fill out a form to get started or inquire about our services
            </p>
            {homepageForms.map(form => (
              <FormDisplay key={form.id} form={form} />
            ))}
          </section>
        )}
      </main>

      <footer className={styles.footer} style={{
        background: siteConfig.primaryColor
      }}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h3 className={styles.footerHeading}>Company</h3>
            <ul className={styles.footerLinks}>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/careers">Careers</Link></li>
              <li><Link href="/press">Press & Media</Link></li>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/contact">Contact Us</Link></li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h3 className={styles.footerHeading}>Customer Service</h3>
            <ul className={styles.footerLinks}>
              <li><Link href="/help">Help Center</Link></li>
              <li><Link href="/shipping">Shipping Information</Link></li>
              <li><Link href="/returns">Returns & Exchanges</Link></li>
              <li><Link href="/track-order">Track Order</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h3 className={styles.footerHeading}>Legal</h3>
            <ul className={styles.footerLinks}>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/cookies">Cookie Policy</Link></li>
              <li><Link href="/accessibility">Accessibility</Link></li>
              <li><Link href="/disclaimer">Disclaimer</Link></li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h3 className={styles.footerHeading}>Connect</h3>
            <ul className={styles.footerLinks}>
              <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a></li>
              <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a></li>
              <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              <li><a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a></li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h3 className={styles.footerHeading}>Resources</h3>
            <ul className={styles.footerLinks}>
              <li><Link href="/sitemap">Sitemap</Link></li>
              <li><Link href="/partners">Partners</Link></li>
              <li><Link href="/affiliates">Affiliate Program</Link></li>
              <li><Link href="/developers">Developers</Link></li>
              <li><Link href="/sustainability">Sustainability</Link></li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>&copy; 2025 {siteConfig.storeName}. All rights reserved.</p>
          <div className={styles.footerPayment}>
            <span>We accept:</span>
            <span className={styles.paymentIcons}>💳 Visa • Mastercard • PayPal</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home
