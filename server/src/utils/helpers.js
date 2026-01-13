// Generate unique ticket number (simple incremental format)
const generateTicketNumber = (ticketId = null) => {
  if (ticketId) {
    // Format: KOLO-01, KOLO-02, etc. (zero-padded to 2 digits minimum)
    return `KOLO-${ticketId.toString().padStart(2, '0')}`;
  }
  // Fallback for temporary tickets before DB insertion
  return `KOLO-TEMP-${Date.now()}`;
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
// Préfixes RDC:
// - Vodacom (M-Pesa): 81, 82, 83
// - Orange Money: 84, 85, 89
// - Airtel Money: 97, 99, 90
// - Africell: 91
const detectProvider = (phone) => {
  // Nettoyer le numéro
  let cleaned = phone.replace(/[\s\-\(\)+]/g, '');
  
  // Retirer le préfixe 243 si présent
  if (cleaned.startsWith('243')) {
    cleaned = cleaned.substring(3);
  }
  
  // Prendre les 2 premiers chiffres (préfixe opérateur)
  const prefix = cleaned.substring(0, 2);
  
  // Vodacom M-Pesa: 81, 82, 83
  if (['81', '82', '83'].includes(prefix)) {
    return 'Vodacom M-Pesa';
  }
  // Orange Money: 84, 85, 89
  else if (['84', '85', '89'].includes(prefix)) {
    return 'Orange Money';
  }
  // Airtel Money: 97, 99, 90
  else if (['97', '99', '90'].includes(prefix)) {
    return 'Airtel Money';
  }
  // Africell: 91
  else if (prefix === '91') {
    return 'Africell';
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
