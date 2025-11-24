import ReactGA from 'react-ga4';

// Initialize Google Analytics
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
  if (measurementId && import.meta.env.PROD) {
    ReactGA.initialize(measurementId, {
      gaOptions: {
        siteSpeedSampleRate: 100,
      },
    });
    console.log('✅ Google Analytics initialized');
  } else {
    console.log('⚠️  Google Analytics not initialized (development mode)');
  }
};

// Track page views
export const trackPageView = (path, title) => {
  if (import.meta.env.PROD) {
    ReactGA.send({ 
      hitType: "pageview", 
      page: path,
      title: title || document.title
    });
  }
};

// Track events
export const trackEvent = (category, action, label = null, value = null) => {
  if (import.meta.env.PROD) {
    const eventData = {
      category,
      action,
    };
    
    if (label) eventData.label = label;
    if (value) eventData.value = value;
    
    ReactGA.event(eventData);
  }
};

// Specific event trackers

// User events
export const trackUserRegistration = (method = 'email') => {
  trackEvent('User', 'Registration', method);
};

export const trackUserLogin = (method = 'email') => {
  trackEvent('User', 'Login', method);
};

export const trackUserLogout = () => {
  trackEvent('User', 'Logout');
};

// Ticket purchase events
export const trackTicketView = (campaignId) => {
  trackEvent('Ticket', 'View Campaign', `Campaign ${campaignId}`);
};

export const trackTicketPurchaseStart = (ticketCount, amount) => {
  trackEvent('Ticket', 'Purchase Started', `${ticketCount} tickets`, amount);
};

export const trackTicketPurchaseComplete = (ticketCount, amount) => {
  trackEvent('Ticket', 'Purchase Completed', `${ticketCount} tickets`, amount);
};

export const trackTicketPurchaseFailed = (reason) => {
  trackEvent('Ticket', 'Purchase Failed', reason);
};

// Campaign events
export const trackCampaignView = (campaignId, campaignName) => {
  trackEvent('Campaign', 'View', campaignName, campaignId);
};

export const trackCampaignShare = (campaignId, platform) => {
  trackEvent('Campaign', 'Share', platform, campaignId);
};

// Navigation events
export const trackNavigation = (destination) => {
  trackEvent('Navigation', 'Click', destination);
};

export const trackButtonClick = (buttonName, location) => {
  trackEvent('Button', 'Click', `${buttonName} - ${location}`);
};

// Form events
export const trackFormStart = (formName) => {
  trackEvent('Form', 'Started', formName);
};

export const trackFormComplete = (formName) => {
  trackEvent('Form', 'Completed', formName);
};

export const trackFormError = (formName, errorMessage) => {
  trackEvent('Form', 'Error', `${formName} - ${errorMessage}`);
};

// Error tracking
export const trackError = (errorMessage, errorLocation) => {
  trackEvent('Error', errorMessage, errorLocation);
};

// Payment events
export const trackPaymentMethod = (method) => {
  trackEvent('Payment', 'Method Selected', method);
};

export const trackPaymentConfirmed = (amount, method) => {
  trackEvent('Payment', 'Confirmed', method, amount);
};

// Search events
export const trackSearch = (query) => {
  trackEvent('Search', 'Query', query);
};

// Social events
export const trackSocialClick = (network, action) => {
  trackEvent('Social', action, network);
};

// Timing events
export const trackTiming = (category, variable, value, label = null) => {
  if (import.meta.env.PROD) {
    ReactGA.send({
      hitType: 'timing',
      timingCategory: category,
      timingVar: variable,
      timingValue: value,
      ...(label && { timingLabel: label })
    });
  }
};

// User properties
export const setUserProperties = (userId, properties = {}) => {
  if (import.meta.env.PROD) {
    ReactGA.set({
      userId,
      ...properties
    });
  }
};

export const setUserRole = (role) => {
  if (import.meta.env.PROD) {
    ReactGA.set({ dimension1: role });
  }
};

// E-commerce tracking
export const trackPurchase = (transactionId, items, total) => {
  if (import.meta.env.PROD) {
    ReactGA.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: total,
      currency: 'USD',
      items: items
    });
  }
};

export const trackAddToCart = (item) => {
  if (import.meta.env.PROD) {
    ReactGA.gtag('event', 'add_to_cart', {
      items: [item]
    });
  }
};

// Custom dimensions
export const trackWithCustomDimension = (eventName, dimensions = {}) => {
  if (import.meta.env.PROD) {
    ReactGA.gtag('event', eventName, dimensions);
  }
};

export default {
  initGA,
  trackPageView,
  trackEvent,
  trackUserRegistration,
  trackUserLogin,
  trackUserLogout,
  trackTicketView,
  trackTicketPurchaseStart,
  trackTicketPurchaseComplete,
  trackTicketPurchaseFailed,
  trackCampaignView,
  trackCampaignShare,
  trackNavigation,
  trackButtonClick,
  trackFormStart,
  trackFormComplete,
  trackFormError,
  trackError,
  trackPaymentMethod,
  trackPaymentConfirmed,
  trackSearch,
  trackSocialClick,
  trackTiming,
  setUserProperties,
  setUserRole,
  trackPurchase,
  trackAddToCart,
  trackWithCustomDimension
};
