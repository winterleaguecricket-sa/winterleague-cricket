import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cricket-cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }
    setCartLoaded(true);
  }, []);

  // Save cart to localStorage whenever it changes (only after initial load)
  useEffect(() => {
    if (!cartLoaded) return;
    localStorage.setItem('cricket-cart', JSON.stringify(cart));
  }, [cart, cartLoaded]);

  const addToCart = (product, selectedSize = null, autoOpen = false) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(
        item => item.id === product.id && item.selectedSize === selectedSize
      );

      if (existingItemIndex > -1) {
        // Item exists, increase quantity
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += 1;
        return newCart;
      } else {
        // New item
        return [...prevCart, { ...product, quantity: 1, selectedSize }];
      }
    });
    if (autoOpen) {
      setIsOpen(true); // Only open cart when explicitly requested
    }
  };

  const removeFromCart = (productId, selectedSize = null) => {
    // Basic kit is required and cannot be removed
    if (productId === 'basic-kit') return;
    setCart(prevCart => 
      prevCart.filter(item => !(item.id === productId && item.selectedSize === selectedSize))
    );
  };

  const updateQuantity = (productId, selectedSize = null, newQuantity) => {
    // Basic kit is required — cannot go below 1
    if (productId === 'basic-kit' && newQuantity < 1) return;
    if (newQuantity <= 0) {
      removeFromCart(productId, selectedSize);
      return;
    }

    setCart(prevCart => 
      prevCart.map(item => 
        item.id === productId && item.selectedSize === selectedSize
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const clearCart = () => {
    // Preserve basic kit when clearing cart — it's a required purchase
    setCart(prev => prev.filter(item => item.id === 'basic-kit'));
    setIsOpen(false);
  };

  // Atomically replace all basic-kit items with a new set (used by registration form)
  // Preserves all non-kit items; skips update if kits already match
  const syncKitItems = (desiredKits) => {
    setCart(prevCart => {
      const nonKitItems = prevCart.filter(item => item.id !== 'basic-kit');
      const existingKitItems = prevCart.filter(item => item.id === 'basic-kit');

      // Check if anything actually changed to avoid unnecessary re-renders
      if (existingKitItems.length === desiredKits.length) {
        const allMatch = desiredKits.every(dk =>
          existingKitItems.some(ek =>
            ek.selectedSize === dk.selectedSize && Number(ek.price) === Number(dk.price)
          )
        );
        if (allMatch) return prevCart;
      }

      return [...nonKitItems, ...desiredKits];
    });
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const toggleCart = () => {
    setIsOpen(!isOpen);
  };

  const closeCart = () => {
    setIsOpen(false);
  };

  const openCart = () => {
    setIsOpen(true);
  };

  return (
    <CartContext.Provider value={{
      cart,
      cartLoaded,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      syncKitItems,
      getCartTotal,
      getCartCount,
      isOpen,
      toggleCart,
      closeCart,
      openCart
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
