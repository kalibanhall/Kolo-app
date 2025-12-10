import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

const CART_STORAGE_KEY = 'kolo_cart';

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    // Load cart from localStorage on init
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate cart structure
        if (parsed.campaignId && Array.isArray(parsed.items)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading cart:', e);
    }
    return { campaignId: null, items: [], campaign: null };
  });

  // Persist cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }, [cart]);

  // Add ticket numbers to cart
  const addToCart = (campaignId, campaign, ticketNumbers) => {
    setCart(prev => {
      // If different campaign, start fresh
      if (prev.campaignId && prev.campaignId !== campaignId) {
        return {
          campaignId,
          campaign,
          items: ticketNumbers
        };
      }
      
      // Add new numbers, avoiding duplicates
      const existingSet = new Set(prev.items);
      const newItems = ticketNumbers.filter(num => !existingSet.has(num));
      
      return {
        campaignId,
        campaign,
        items: [...prev.items, ...newItems]
      };
    });
  };

  // Remove a ticket from cart
  const removeFromCart = (ticketNumber) => {
    setCart(prev => ({
      ...prev,
      items: prev.items.filter(num => num !== ticketNumber)
    }));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart({ campaignId: null, items: [], campaign: null });
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  // Get cart total
  const getTotal = () => {
    if (!cart.campaign) return 0;
    return cart.items.length * (cart.campaign.ticket_price || 1);
  };

  // Get cart item count
  const getItemCount = () => cart.items.length;

  // Check if a ticket number is in cart
  const isInCart = (ticketNumber) => cart.items.includes(ticketNumber);

  const value = {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    getTotal,
    getItemCount,
    isInCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
