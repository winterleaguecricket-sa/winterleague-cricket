import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

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
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cricket-cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, selectedSize = null, autoOpen = false) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(
        item => item.id === product.id && item.selectedSize === selectedSize
      );

      if (existingItemIndex > -1) {
        // Basic kit is managed by the form effect — never increment its quantity
        if (product.id === 'basic-kit') return prevCart;
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
      setCart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
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
