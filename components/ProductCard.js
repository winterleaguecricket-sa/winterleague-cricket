import { useState } from 'react';
import { useCart } from '../context/CartContext';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState('');
  const [showSizeError, setShowSizeError] = useState(false);

  const handleAddToCart = () => {
    // If product has sizes and none selected, show error
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setShowSizeError(true);
      setTimeout(() => setShowSizeError(false), 3000);
      return;
    }

    addToCart(product, selectedSize || null);
    setShowSizeError(false);
  };

  const isSoldOut = product.soldOut || product.sold_out;
  const isDisabled = product.stock === 0 || isSoldOut;

  return (
    <div className={`${styles.card} ${isSoldOut ? styles.soldOutCard : ''}`}>
      <div className={styles.imageContainer}>
        {isSoldOut && (
          <div className={styles.soldOutBadge}>SOLD OUT</div>
        )}
        <div className={styles.imagePlaceholder}>
          <span>🏏</span>
        </div>
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{product.name}</h3>
        <p className={styles.description}>{product.description}</p>
        
        {product.sizes && product.sizes.length > 0 && (
          <div className={styles.sizeSelector}>
            <label className={styles.sizeLabel}>Size:</label>
            <select 
              value={selectedSize} 
              onChange={(e) => {
                setSelectedSize(e.target.value);
                setShowSizeError(false);
              }}
              className={`${styles.sizeSelect} ${showSizeError ? styles.error : ''}`}
            >
              <option value="">Select size</option>
              {product.sizes.map((size, index) => (
                <option key={index} value={size}>{size}</option>
              ))}
            </select>
            {showSizeError && (
              <span className={styles.errorMessage}>Please select a size</span>
            )}
          </div>
        )}
        
        <div className={styles.footer}>
          <span className={styles.price}>R{product.price}</span>
          <span className={styles.stock}>
            {isSoldOut ? 'Sold Out' : product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </span>
        </div>
        <button 
          className={styles.addButton}
          onClick={handleAddToCart}
          disabled={isDisabled}
        >
          {isSoldOut ? 'Sold Out' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
