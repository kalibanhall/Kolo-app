import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { campaignsAPI } from '../services/api';

const CartContext = createContext(null);

// Alias pour le compositeur
export const useComposer = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useComposer must be used within a CartProvider');
  }
  return context;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

const CART_STORAGE_KEY = 'kolo_composer';

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

  // Vérifier la disponibilité des tickets dans le compositeur
  const verifyAvailability = useCallback(async () => {
    if (!cart.campaignId || cart.items.length === 0) {
      return { available: [], unavailable: [] };
    }

    try {
      const response = await campaignsAPI.getAvailableNumbers(cart.campaignId);
      const availableNumbers = new Set(response.numbers || []);
      
      const available = cart.items.filter(num => availableNumbers.has(num));
      const unavailable = cart.items.filter(num => !availableNumbers.has(num));
      
      // Retirer automatiquement les tickets non disponibles
      if (unavailable.length > 0) {
        setCart(prev => ({
          ...prev,
          items: available
        }));
      }
      
      return { available, unavailable };
    } catch (error) {
      console.error('Error verifying ticket availability:', error);
      return { available: cart.items, unavailable: [], error };
    }
  }, [cart.campaignId, cart.items]);

  const value = {
    cart,
    composer: cart, // Alias
    addToCart,
    addToComposer: addToCart, // Alias
    removeFromCart,
    removeFromComposer: removeFromCart, // Alias
    clearCart,
    clearComposer: clearCart, // Alias
    getTotal,
    getItemCount,
    getComposerCount: getItemCount, // Alias
    isInCart,
    isInComposer: isInCart, // Alias
    verifyAvailability,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
