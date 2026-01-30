/**
 * PayDRC (MOKO Afrika) Payment Gateway Service
 * API documentation: https://paydrc.gofreshbakery.net/api/v5/
 *
 * Supports:
 *  - PayIn (C2B): Debit customer wallet
 *  - PayOut (B2C): Credit customer wallet
 *  - Check Status: Verify transaction
 *  - Callback decryption (AES-256-CBC)
 *  - Static IP proxy support for IP whitelisting
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
const AES_IV = process.env.PAYDRC_AES_IV || null;

// Static IP Proxy configuration (QuotaGuard, Fixie, etc.)
const PROXY_URL = process.env.QUOTAGUARD_URL || process.env.FIXIE_URL || process.env.PROXY_URL || null;

// Log configuration at startup
console.log('🔧 PayDRC Configuration:');
console.log('  - Base URL:', PAYDRC_BASE_URL);
console.log('  - Merchant ID:', MERCHANT_ID ? `${MERCHANT_ID.substring(0, 5)}...` : '❌ NOT SET');
console.log('  - Merchant Secret:', MERCHANT_SECRET ? '✅ Set' : '❌ NOT SET');
console.log('  - AES Key:', AES_KEY ? '✅ Set' : '⚠️ Not set (callbacks won\'t decrypt)');
console.log('  - Proxy URL:', PROXY_URL ? `✅ ${new URL(PROXY_URL).hostname}` : '❌ Not set (direct connection)');

// Validation: Ensure required configuration is present
if (!MERCHANT_ID || !MERCHANT_SECRET) {
  console.error('❌ CRITICAL: PayDRC configuration incomplete!');
  console.error('   Please set PAYDRC_MERCHANT_ID and PAYDRC_MERCHANT_SECRET in your .env file');
}

/**
 * Simple HTTPS POST helper - works without proxy
 */
function postJsonDirect(urlString, payload, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const data = JSON.stringify(payload);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Accept': 'application/json',
          'User-Agent': 'KOLO-Tombola/1.0',
        },
        timeout: timeoutMs,
      };

      console.log('🌐 Direct HTTPS request to:', url.hostname + url.pathname);
      console.log('📤 Request payload:', JSON.stringify({ ...payload, merchant_secrete: '***' }));

      const req = https.request(options, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          console.log('📥 Response status:', res.statusCode);
          console.log('📥 Response headers:', JSON.stringify(res.headers));
          console.log('📥 Response body:', body.substring(0, 1000));
          
          // Handle 403 specifically
          if (res.statusCode === 403) {
            console.error('❌ PayDRC returned 403 Forbidden - Check IP whitelist with PayDRC support');
            resolve({ 
              success: false, 
              statusCode: 403, 
              error: 'IP not whitelisted or access denied by PayDRC',
              raw: body 
            });
            return;
          }
          
          try {
            const parsed = JSON.parse(body);
            resolve({ success: true, statusCode: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ success: false, statusCode: res.statusCode, raw: body });
          }
        });
      });

      req.on('error', (err) => {
        console.error('❌ HTTPS request error:', err.message);
        reject(err);
      });
      
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
 * HTTPS POST through HTTP proxy using CONNECT tunnel
 */
function postJsonViaProxy(urlString, payload, proxyUrl, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    try {
      const targetUrl = new URL(urlString);
      const proxy = new URL(proxyUrl);
      const data = JSON.stringify(payload);

      console.log(`🔌 Using proxy: ${proxy.hostname}:${proxy.port}`);
      console.log(`🎯 Target: ${targetUrl.hostname}`);

      const connectOptions = {
        host: proxy.hostname,
        port: parseInt(proxy.port) || 80,
        method: 'CONNECT',
        path: `${targetUrl.hostname}:443`,
        headers: {
          'Host': `${targetUrl.hostname}:443`,
        },
        timeout: timeoutMs,
      };

      // Add proxy authentication if provided
      if (proxy.username && proxy.password) {
        const auth = Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString('base64');
        connectOptions.headers['Proxy-Authorization'] = `Basic ${auth}`;
      }

      const proxyReq = http.request(connectOptions);

      proxyReq.on('connect', (res, socket, head) => {
        console.log('🔗 Proxy CONNECT response:', res.statusCode);
        
        if (res.statusCode !== 200) {
          reject(new Error(`Proxy CONNECT failed with status ${res.statusCode}`));
          return;
        }

        // Create TLS connection over the tunnel
        const tlsOptions = {
          socket: socket,
          servername: targetUrl.hostname,
        };

        const tlsSocket = require('tls').connect(tlsOptions, () => {
          console.log('🔒 TLS connection established');
          
          // Build HTTP request
          const requestLines = [
            `POST ${targetUrl.pathname}${targetUrl.search || ''} HTTP/1.1`,
            `Host: ${targetUrl.hostname}`,
            'Content-Type: application/json',
            `Content-Length: ${Buffer.byteLength(data)}`,
            'Accept: application/json',
            'Connection: close',
            '',
            data
          ];
          
          tlsSocket.write(requestLines.join('\r\n'));
        });

        let responseData = '';
        
        tlsSocket.on('data', (chunk) => {
          responseData += chunk.toString();
        });

        tlsSocket.on('end', () => {
          // Parse HTTP response
          const headerEndIndex = responseData.indexOf('\r\n\r\n');
          if (headerEndIndex === -1) {
            resolve({ success: false, raw: responseData });
            return;
          }

          const headers = responseData.substring(0, headerEndIndex);
          let body = responseData.substring(headerEndIndex + 4);

          // Extract status code
          const statusMatch = headers.match(/HTTP\/[\d.]+ (\d+)/);
          const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;

          // Handle chunked encoding
          if (headers.toLowerCase().includes('transfer-encoding: chunked')) {
            body = parseChunkedBody(body);
          }

          console.log('📥 Proxy response status:', statusCode);
          console.log('📥 Proxy response body:', body.substring(0, 500));

          try {
            const parsed = JSON.parse(body);
            resolve({ success: true, statusCode, data: parsed });
          } catch (e) {
            resolve({ success: false, statusCode, raw: body });
          }
        });

        tlsSocket.on('error', (err) => {
          console.error('❌ TLS socket error:', err.message);
          reject(err);
        });
      });

      proxyReq.on('error', (err) => {
        console.error('❌ Proxy request error:', err.message);
        reject(err);
      });

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        reject(new Error('Proxy connection timeout'));
      });

      proxyReq.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Main POST function - uses proxy if configured, otherwise direct
 */
async function postJson(urlString, payload, timeoutMs = 30000) {
  if (PROXY_URL) {
    return postJsonViaProxy(urlString, payload, PROXY_URL, timeoutMs);
  }
  return postJsonDirect(urlString, payload, timeoutMs);
}

/**
 * Parse chunked transfer encoding body
 */
function parseChunkedBody(body) {
  let result = '';
  let remaining = body;
  
  while (remaining.length > 0) {
    const lineEnd = remaining.indexOf('\r\n');
    if (lineEnd === -1) break;
    
    const chunkSize = parseInt(remaining.substring(0, lineEnd), 16);
    if (isNaN(chunkSize) || chunkSize === 0) break;
    
    const chunkStart = lineEnd + 2;
    const chunkEnd = chunkStart + chunkSize;
    if (chunkEnd > remaining.length) break;
    
    result += remaining.substring(chunkStart, chunkEnd);
    remaining = remaining.substring(chunkEnd + 2);
  }
  
  return result || body;
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
  // Validate configuration
  if (!MERCHANT_ID || !MERCHANT_SECRET) {
    console.error('❌ PayDRC configuration missing!');
    return { 
      success: false, 
      error: 'PayDRC not configured. Missing MERCHANT_ID or MERCHANT_SECRET',
      comment: 'Configuration error - contact administrator'
    };
  }

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
    description = 'Achat tickets KOLO Koma Propriétaire',
  } = options;

  const payload = {
    merchant_id: MERCHANT_ID,
    merchant_secrete: MERCHANT_SECRET,
    amount: currency === 'CDF' ? String(Math.round(Number(amount))) : String(amount),
    currency,
    action: 'debit',
    customer_number: customerNumber,
    firstname: firstName,
    lastname: lastName,
    'e-mail': email,
    reference,
    method: method.toLowerCase(),
    callback_url: callbackUrl || process.env.PAYDRC_CALLBACK_URL || '',
    label: description,
    description: description,
  };

  console.log('📤 PayDRC PayIn request:', { ...payload, merchant_secrete: '***' });

  try {
    const result = await postJson(PAYDRC_BASE_URL, payload);
    console.log('📥 PayDRC PayIn response:', result);

    if (result.success && result.data) {
      // Check if PayDRC returned an error within a successful HTTP response
      if (result.data.Status === 'Error' || result.data.resultCodeError) {
        console.error('❌ PayDRC returned error:', {
          status: result.data.Status,
          comment: result.data.Comment,
          resultCodeError: result.data.resultCodeError,
          resultCodeErrorDescription: result.data.resultCodeErrorDescription,
          requestPayload: { ...payload, merchant_secrete: '***' }
        });
        return {
          success: false,
          error: result.data.resultCodeErrorDescription || result.data.Comment || 'PayDRC error',
          comment: result.data.Comment,
          statusCode: result.data.resultCodeError || result.statusCode,
          raw: result.data,
        };
      }
      
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

    // Handle specific error cases
    if (result.statusCode === 403) {
      return { 
        success: false, 
        error: 'Accès refusé par PayDRC (403) - IP non autorisée',
        comment: 'Contactez le support PayDRC pour vérifier le whitelist IP',
        statusCode: 403,
        raw: result 
      };
    }

    return { 
      success: false, 
      error: result.error || 'Réponse invalide de PayDRC', 
      statusCode: result.statusCode,
      raw: result 
    };
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
      // Normalize transaction status for easier handling
      const transStatus = result.data.Trans_Status || '';
      const normalizedStatus = normalizeTransactionStatus(transStatus);
      
      return {
        success: result.data.Status === 'Success',
        found: result.data.Comment === 'Transaction Found',
        transactionId: result.data.Transaction_id,
        reference: result.data.Reference,
        transStatus: result.data.Trans_Status,
        normalizedStatus: normalizedStatus,
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
 * Normalize PayDRC transaction status to our internal status
 * PayDRC Status values: Successful, Failed, Pending, Cancelled, Submitted, etc.
 * @param {string} transStatus - PayDRC Trans_Status value
 * @returns {string} - 'completed', 'failed', 'submitted', or 'pending'
 */
function normalizeTransactionStatus(transStatus) {
  const status = (transStatus || '').toLowerCase().trim();
  
  // Success states
  if (['successful', 'success', 'completed', 'approved'].includes(status)) {
    return 'completed';
  }
  
  // Failure states  
  if (['failed', 'rejected', 'declined', 'error', 'cancelled', 'expired', 'timeout'].includes(status)) {
    return 'failed';
  }
  
  // Submitted = waiting for user to validate on phone
  if (['submitted', 'processing', 'initiated'].includes(status)) {
    return 'submitted';
  }
  
  // Pending states
  return 'pending';
}

/**
 * Detect mobile money provider from phone number
 * @param {string} phoneNumber
 * @returns {string} - mpesa, airtel, orange, afrimoney (PayDRC method values)
 */
function detectMobileProvider(phoneNumber) {
  // Normalize phone number first
  const normalized = normalizePhoneNumber(phoneNumber);
  const prefix = normalized.slice(0, 3);

  console.log(`📱 detectMobileProvider: input="${phoneNumber}" normalized="${normalized}" prefix="${prefix}"`);

  // Vodacom M-Pesa: 081, 082, 083 -> method: "mpesa"
  if (['081', '082', '083'].includes(prefix)) return 'mpesa';

  // Airtel Money: 097, 098, 099 -> method: "airtel"
  if (['097', '098', '099'].includes(prefix)) return 'airtel';

  // Orange Money: 084, 085, 089 -> method: "orange"
  if (['084', '085', '089'].includes(prefix)) return 'orange';

  // Africell: 090, 091 -> method: "afrimoney"
  if (['090', '091'].includes(prefix)) return 'afrimoney';

  // Log unknown prefix for debugging
  console.warn(`⚠️ Unknown phone prefix: ${prefix} for number: ${phoneNumber}, defaulting to mpesa`);
  
  // Default to mpesa if unknown (should rarely happen)
  return 'mpesa';
}

/**
 * Normalize phone number for PayDRC API
 * Handles various input formats:
 * - 972148867 (9 digits, no leading 0)
 * - 0972148867 (10 digits with leading 0)
 * - 243972148867 (with country code)
 * - +243972148867 (with + and country code)
 * - 81234567 (8 digits for Vodacom)
 * 
 * @param {string} phoneNumber
 * @returns {string} - Normalized format: 0XXXXXXXXX (10 digits)
 */
function normalizePhoneNumber(phoneNumber) {
  // Remove all non-numeric characters
  let normalized = phoneNumber.replace(/[^0-9]/g, '');
  
  // Remove country code 243 if present
  if (normalized.startsWith('243')) {
    normalized = normalized.slice(3);
  }
  
  // Now we should have 8-10 digits
  // Add leading 0 if missing
  if (!normalized.startsWith('0')) {
    normalized = '0' + normalized;
  }
  
  console.log(`📱 normalizePhoneNumber: input="${phoneNumber}" output="${normalized}"`);
  
  return normalized;
}

module.exports = {
  // Core functions
  initiatePayIn,
  initiatePayOut,
  checkTransactionStatus,

  // Callback handlers
  decryptCallbackData,

  // Utilities
  detectMobileProvider,
  normalizePhoneNumber,
  normalizeTransactionStatus,

  // Constants for external use
  PAYDRC_BASE_URL,
};
