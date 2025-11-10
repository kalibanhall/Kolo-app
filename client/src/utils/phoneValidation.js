/**
 * Validation des numéros de téléphone congolais
 */

// Préfixes des opérateurs congolais
const OPERATORS = {
  VODACOM: {
    name: 'Vodacom (M-Pesa)',
    prefixes: ['081', '082', '083', '084', '085'],
    regex: /^(\+243|243|0)?8[1-5]\d{7}$/
  },
  AIRTEL: {
    name: 'Airtel',
    prefixes: ['089', '090', '091', '092', '093', '094', '097', '098', '099'],
    regex: /^(\+243|243|0)?(89|9[0-4789])\d{7}$/
  },
  ORANGE: {
    name: 'Orange',
    prefixes: ['080', '084', '085', '086', '087', '088', '089'],
    regex: /^(\+243|243|0)?8[0-9]\d{7}$/
  },
  AFRICELL: {
    name: 'Africell',
    prefixes: ['095'],
    regex: /^(\+243|243|0)?95\d{7}$/
  }
};

/**
 * Normalise un numéro de téléphone au format international
 * @param {string} phone - Numéro de téléphone
 * @returns {string} - Numéro normalisé (+243XXXXXXXXX)
 */
export const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Supprimer les espaces et caractères spéciaux
  let normalized = phone.replace(/[\s\-\(\)]/g, '');
  
  // Si commence par 0, remplacer par +243
  if (normalized.startsWith('0')) {
    normalized = '+243' + normalized.substring(1);
  }
  // Si commence par 243, ajouter +
  else if (normalized.startsWith('243')) {
    normalized = '+' + normalized;
  }
  // Si ne commence pas par +, ajouter +243
  else if (!normalized.startsWith('+')) {
    normalized = '+243' + normalized;
  }
  
  return normalized;
};

/**
 * Détecte l'opérateur à partir du numéro
 * @param {string} phone - Numéro de téléphone
 * @returns {string|null} - Nom de l'opérateur ou null
 */
export const detectOperator = (phone) => {
  const normalized = normalizePhoneNumber(phone);
  
  for (const [key, operator] of Object.entries(OPERATORS)) {
    if (operator.regex.test(normalized)) {
      return operator.name;
    }
  }
  
  return null;
};

/**
 * Valide un numéro de téléphone congolais
 * @param {string} phone - Numéro de téléphone
 * @returns {object} - { valid: boolean, operator: string|null, message: string }
 */
export const validatePhoneNumber = (phone) => {
  if (!phone || phone.trim() === '') {
    return {
      valid: false,
      operator: null,
      message: 'Le numéro de téléphone est requis'
    };
  }
  
  const normalized = normalizePhoneNumber(phone);
  
  // Vérifier la longueur (doit être +243XXXXXXXXX = 13 caractères)
  if (normalized.length !== 13) {
    return {
      valid: false,
      operator: null,
      message: 'Le numéro doit contenir 9 chiffres après l\'indicatif (+243)'
    };
  }
  
  // Détecter l'opérateur
  const operator = detectOperator(normalized);
  
  if (!operator) {
    return {
      valid: false,
      operator: null,
      message: 'Numéro invalide. Veuillez vérifier l\'opérateur (Vodacom, Airtel, Orange, Africell)'
    };
  }
  
  return {
    valid: true,
    operator,
    message: `Numéro ${operator} valide`
  };
};

/**
 * Formate un numéro pour l'affichage
 * @param {string} phone - Numéro de téléphone
 * @returns {string} - Numéro formaté (+243 XX XXX XX XX)
 */
export const formatPhoneDisplay = (phone) => {
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length !== 13) return phone;
  
  // +243 XX XXX XX XX
  return normalized.replace(/(\+243)(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
};
