import { useCart } from '../context/CartContext';
import Link from 'next/link';
import styles from './Cart.module.css';

export default function Cart({ hideCheckout = false }) {
  const { 
    cart, 
    removeFromCart, 
    updateQuantity, 
    getCartTotal, 
    getCartCount, 
    isOpen, 
    closeCart,
    clearCart 
  } = useCart();

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={closeCart} />
      <div className={styles.cart}>
        <div className={styles.header}>
          <h2>Shopping Cart ({getCartCount()})</h2>
          <button onClick={closeCart} className={styles.closeButton}>
            ✕
          </button>
        </div>

        <div className={styles.items}>
          {cart.length === 0 ? (
            <div className={styles.empty}>
              <p>Your cart is empty</p>
              <span className={styles.emptyIcon}>🛒</span>
            </div>
          ) : (
            cart.map((item) => (
              <div key={`${item.id}-${item.selectedSize}`} className={styles.item}>
                <div className={styles.itemInfo}>
                  <h4>{item.name}</h4>
                  {item.selectedSize && (
                    <span className={styles.size}>Size: {item.selectedSize}</span>
                  )}
                  <p className={styles.itemPrice}>R{item.price.toFixed(2)}</p>
                </div>
                
                <div className={styles.itemActions}>
                  <div className={styles.quantity}>
                    <button 
                      onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity - 1)}
                      className={styles.quantityButton}
                    >
                      −
                    </button>
                    <span className={styles.quantityValue}>{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity + 1)}
                      className={styles.quantityButton}
                    >
                      +
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => removeFromCart(item.id, item.selectedSize)}
                    className={styles.removeButton}
                  >
                    Remove
                  </button>
                </div>
                
                <div className={styles.itemTotal}>
                  R{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.total}>
              <span>Total:</span>
              <span className={styles.totalAmount}>R{getCartTotal().toFixed(2)}</span>
            </div>
            
            {!hideCheckout && (
              <div className={styles.actions}>
                <button onClick={clearCart} className={styles.clearButton}>
                  Clear Cart
                </button>
                <Link href="/checkout" className={styles.checkoutButton} onClick={closeCart}>
                  Checkout
                </Link>
              </div>
            )}
            
            {hideCheckout && (
              <div className={styles.funnelNote}>
                <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', padding: '1rem' }}>
                  Complete all funnel steps to checkout
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
