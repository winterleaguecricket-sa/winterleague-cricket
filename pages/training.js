import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/channel.module.css'
import ProductCard from '../components/ProductCard'
import FormDisplay from '../components/FormDisplay'
import Cart from '../components/Cart'
import { useCart } from '../context/CartContext'
import { getProductsByCategory, siteConfig, getMenuItems, getSubMenuItems } from '../data/products'
import { getFormTemplatesByCategory } from '../data/forms'

export default function Training() {
  const products = getProductsByCategory('training');
  const [forms, setForms] = useState([]);
  const { toggleCart, getCartCount } = useCart();
  const menuItems = getMenuItems();

  useEffect(() => {
    // Category ID 2 = Training Gear
    const categoryForms = getFormTemplatesByCategory(2);
    // Only show forms that have 'category' in their displayLocations
    setForms(categoryForms.filter(form => form.displayLocations?.includes('category')));
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Training Gear - {siteConfig.storeName}</title>
      </Head>

      <Cart />

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>🏏 {siteConfig.storeName}</h1>
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
            <button onClick={toggleCart} className={styles.cartButton}>
              🛒 Cart
              {getCartCount() > 0 && (
                <span className={styles.cartBadge}>{getCartCount()}</span>
              )}
            </button>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.breadcrumb}>
          <Link href="/">Home</Link> / <span>Training Gear</span>
        </div>

        <section className={styles.hero}>
          <div className={styles.heroIcon}>🎯</div>
          <h1 className={styles.title}>Training Gear</h1>
          <p className={styles.subtitle}>
            Essential training equipment for practice sessions and coaching
          </p>
        </section>

        <div className={styles.productGrid}>
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.length === 0 && (
          <p className={styles.emptyMessage}>No products available in this category yet.</p>
        )}

        {forms.length > 0 && (
          <section className={styles.formsSection}>
            <h2 className={styles.sectionTitle}>Book a Session or Inquiry</h2>
            <p className={styles.sectionSubtitle}>Complete a form to book training sessions or get more information</p>
            {forms.map(form => (
              <FormDisplay key={form.id} form={form} />
            ))}
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2025 {siteConfig.storeName}. All rights reserved.</p>
      </footer>
    </div>
  );
}
