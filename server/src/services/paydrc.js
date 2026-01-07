/**
 * PayDRC (MOKO Afrika) Payment Gateway Service
 * API documentation: https://paydrc.gofreshbakery.net/api/v5/
 *
 * Supports:
 *  - PayIn (C2B): Debit customer wallet
 *  - PayOut (B2C): Credit customer wallet
 *  - Check Status: Verify transaction
 *  - Callback decryption (AES-256-CBC) and signature verification (HMAC-SHA256)
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

// Environment configuration
const PAYDRC_BASE_URL = process.env.PAYDRC_BASE_URL || 'https://paydrc.gofreshbakery.net/api/v5/';
const MERCHANT_ID = process.env.PAYDRC_MERCHANT_ID || '';
const MERCHANT_SECRET = process.env.PAYDRC_MERCHANT_SECRET || '';
const AES_KEY = process.env.PAYDRC_AES_KEY || '';
const AES_IV = process.env.PAYDRC_AES_IV || null; // If not set, key is used as IV (doc example)
const HMAC_KEY = process.env.PAYDRC_HMAC_KEY || '';

/**
 * Generic HTTPS/HTTP POST JSON helper
 */
function postJson(urlString, payload, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const data = JSON.stringify(payload);
      const isHttps = url.protocol === 'https:';

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          Accept: 'application/json',
        },
        timeout: timeoutMs,
      };

      const lib = isHttps ? https : http;

      const req = lib.request(options, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ success: true, statusCode: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ success: false, statusCode: res.statusCode, raw: body });
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(data);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Determine AES algorithm based on key length
 */
function determineAesAlgo(keyBuffer) {
  const len = keyBuffer.length;
  if (len === 32) return 'aes-256-cbc';
  if (len === 24) return 'aes-192-cbc';
  return 'aes-128-cbc'; // 16 bytes
}

/**
 * Decrypt AES-encrypted callback data from PayDRC
 * @param {string} encryptedBase64 - Base64 encoded encrypted payload
 * @returns {object|string} Decrypted JSON object or raw string
 */
function decryptCallbackData(encryptedBase64) {
  if (!AES_KEY) {
    throw new Error('PAYDRC_AES_KEY not configured');
  }

  const encrypted = Buffer.from(encryptedBase64, 'base64');
  const keyBuf = Buffer.from(AES_KEY, 'utf8');
  // IV: use provided AES_IV or first 16 bytes of key (per PayDRC doc example)
  const iv = AES_IV ? Buffer.from(AES_IV, 'utf8').slice(0, 16) : keyBuf.slice(0, 16);
  const algo = determineAesAlgo(keyBuf);

  const decipher = crypto.createDecipheriv(algo, keyBuf, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  // Trim padding/null bytes
  const str = decrypted
    .toString('utf8')
    .replace(/[\x00-\x1f]+$/g, '')
    .trim();
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

/**
 * Verify HMAC-SHA256 signature of callback
 * @param {string} encryptedMessage - The encrypted data string
 * @param {string} receivedSignature - Signature from X-Signature header
 * @returns {boolean}
 */
function verifyCallbackSignature(encryptedMessage, receivedSignature) {
  if (!HMAC_KEY || !receivedSignature) return false;

  const hmac = crypto.createHmac('sha256', Buffer.from(HMAC_KEY, 'utf8'));
  hmac.update(encryptedMessage);
  const calculated = hmac.digest('hex');

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculated, 'utf8'),
      Buffer.from(receivedSignature, 'utf8')
    );
  } catch (e) {
    return false;
  }
}

/**
 * Initiate a PayIn (C2B) transaction - debit customer wallet
 * @param {object} options
 * @param {number|string} options.amount
 * @param {string} options.currency - CDF or USD
 * @param {string} options.customerNumber - Phone number (e.g., 0972148867)
 * @param {string} options.firstName
 * @param {string} options.lastName
 * @param {string} options.email
 * @param {string} options.reference - Unique merchant reference
 * @param {string} options.method - airtel, vodacom, orange, africell
 * @param {string} [options.callbackUrl]
 * @returns {Promise<object>}
 */
async function initiatePayIn(options) {
  const {
    amount,
    currency = 'CDF',
    customerNumber,
    firstName,
    lastName,
    email,
    reference,
    method,
    callbackUrl,
  } = options;

  const payload = {
    merchant_id: MERCHANT_ID,
    merchant_secrete: MERCHANT_SECRET,
    amount: String(amount),
    currency,
    action: 'debit',
    customer_number: customerNumber,
    firstname: firstName,
    lastname: lastName,
    'e-mail': email,
    reference,
    method: method.toLowerCase(),
    callback_url: callbackUrl || process.env.PAYDRC_CALLBACK_URL || '',
  };

  console.log('📤 PayDRC PayIn request:', { ...payload, merchant_secrete: '***' });

  try {
    const result = await postJson(PAYDRC_BASE_URL, payload);
    console.log('📥 PayDRC PayIn response:', result);

    if (result.success && result.data) {
      return {
        success: result.data.Status === 'Success',
        transactionId: result.data.Transaction_id,
        reference: result.data.Reference,
        status: result.data.Status,
        comment: result.data.Comment,
        amount: result.data.Amount,
        currency: result.data.Currency,
        customerNumber: result.data.Customer_Number,
        createdAt: result.data.Created_At,
        raw: result.data,
      };
    }

    return { success: false, error: 'Invalid response', raw: result };
  } catch (error) {
    console.error('❌ PayDRC PayIn error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initiate a PayOut (B2C) transaction - credit customer wallet
 * @param {object} options - Same as initiatePayIn
 * @returns {Promise<object>}
 */
async function initiatePayOut(options) {
  const {
    amount,
    currency = 'CDF',
    customerNumber,
    firstName,
    lastName,
    email,
    reference,
    method,
    callbackUrl,
  } = options;

  const payload = {
    merchant_id: MERCHANT_ID,
    merchant_secrete: MERCHANT_SECRET,
    amount: String(amount),
    currency,
    action: 'credit',
    customer_number: customerNumber,
    firstname: firstName,
    lastname: lastName,
    'e-mail': email,
    reference,
    method: method.toLowerCase(),
    callback_url: callbackUrl || process.env.PAYDRC_CALLBACK_URL || '',
  };

  console.log('📤 PayDRC PayOut request:', { ...payload, merchant_secrete: '***' });

  try {
    const result = await postJson(PAYDRC_BASE_URL, payload);
    console.log('📥 PayDRC PayOut response:', result);

    if (result.success && result.data) {
      return {
        success: result.data.Status === 'Success',
        transactionId: result.data.Transaction_id,
        reference: result.data.Reference,
        status: result.data.Status,
        comment: result.data.Comment,
        amount: result.data.Amount,
        currency: result.data.Currency,
        customerNumber: result.data.Customer_Number,
        createdAt: result.data.Created_At,
        raw: result.data,
      };
    }

    return { success: false, error: 'Invalid response', raw: result };
  } catch (error) {
    console.error('❌ PayDRC PayOut error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check transaction status
 * @param {string} reference - Transaction reference (can be Transaction_id or merchant reference)
 * @returns {Promise<object>}
 */
async function checkTransactionStatus(reference) {
  const payload = {
    merchant_id: MERCHANT_ID,
    merchant_secrete: MERCHANT_SECRET,
    action: 'verify',
    reference,
  };

  console.log('📤 PayDRC Status Check:', { reference });

  try {
    const result = await postJson(PAYDRC_BASE_URL, payload);
    console.log('📥 PayDRC Status response:', result);

    if (result.success && result.data) {
      return {
        success: result.data.Status === 'Success',
        found: result.data.Comment === 'Transaction Found',
        transactionId: result.data.Transaction_id,
        reference: result.data.Reference,
        transStatus: result.data.Trans_Status,
        transStatusDescription: result.data.Trans_Status_Description,
        action: result.data.Action,
        amount: result.data.Amount,
        currency: result.data.Currency,
        method: result.data.Method,
        customerDetails: result.data.Customer_Details,
        financialInstitutionId: result.data.Financial_Institution_id,
        createdAt: result.data.Created_at,
        updatedAt: result.data.Updated_at,
        raw: result.data,
      };
    }

    return { success: false, error: 'Invalid response', raw: result };
  } catch (error) {
    console.error('❌ PayDRC Status Check error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Detect mobile money provider from phone number
 * @param {string} phoneNumber
 * @returns {string} - vodacom, airtel, orange, africell
 */
function detectMobileProvider(phoneNumber) {
  // Normalize phone number
  let normalized = phoneNumber.replace(/[^0-9]/g, '');
  if (normalized.startsWith('243')) normalized = '0' + normalized.slice(3);
  if (!normalized.startsWith('0')) normalized = '0' + normalized;

  const prefix = normalized.slice(0, 3);

  // Vodacom: 081, 082, 083
  if (['081', '082', '083'].includes(prefix)) return 'vodacom';

  // Airtel: 097, 099
  if (['097', '099'].includes(prefix)) return 'airtel';

  // Orange: 084, 085, 089
  if (['084', '085', '089'].includes(prefix)) return 'orange';

  // Africell: 090, 091
  if (['090', '091'].includes(prefix)) return 'africell';

  // Default to airtel if unknown
  return 'airtel';
}

/**
 * Normalize phone number for PayDRC API
 * @param {string} phoneNumber
 * @returns {string}
 */
function normalizePhoneNumber(phoneNumber) {
  let normalized = phoneNumber.replace(/[^0-9]/g, '');
  // Remove country code if present
  if (normalized.startsWith('243')) normalized = '0' + normalized.slice(3);
  // Ensure starts with 0
  if (!normalized.startsWith('0') && normalized.length === 9) normalized = '0' + normalized;
  return normalized;
}

module.exports = {
  // Core functions
  initiatePayIn,
  initiatePayOut,
  checkTransactionStatus,

  // Callback handlers
  decryptCallbackData,
  verifyCallbackSignature,

  // Utilities
  detectMobileProvider,
  normalizePhoneNumber,

  // Constants for external use
  PAYDRC_BASE_URL,
};
