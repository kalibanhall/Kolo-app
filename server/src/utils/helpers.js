// Generate unique ticket number
const generateTicketNumber = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ticket = '#';
  for (let i = 0; i < 5; i++) {
    ticket += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ticket;
};

// Generate invoice number
const generateInvoiceNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${timestamp}-${random}`;
};

// Format currency
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Validate phone number (simplified for DRC numbers)
const validatePhoneNumber = (phone) => {
  // Remove spaces and special characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check if it's a valid DRC number
  const drcPattern = /^(\+?243|0)?[0-9]{9}$/;
  return drcPattern.test(cleaned);
};

// Normalize phone number
const normalizePhoneNumber = (phone) => {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Add country code if missing
  if (cleaned.startsWith('0')) {
    cleaned = '+243' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+243' + cleaned;
  }
  
  return cleaned;
};

// Detect mobile money provider from phone number
const detectProvider = (phone) => {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.includes('81') || cleaned.includes('82')) {
    return 'Vodacom M-Pesa';
  } else if (cleaned.includes('84') || cleaned.includes('85')) {
    return 'Orange Money';
  } else if (cleaned.includes('89') || cleaned.includes('90') || cleaned.includes('97') || cleaned.includes('99')) {
    return 'Airtel Money';
  }
  
  return 'Mobile Money';
};

// Generate random winners
const selectRandomWinners = (tickets, count = 1) => {
  const shuffled = [...tickets].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

module.exports = {
  generateTicketNumber,
  generateInvoiceNumber,
  formatCurrency,
  validatePhoneNumber,
  normalizePhoneNumber,
  detectProvider,
  selectRandomWinners
};
