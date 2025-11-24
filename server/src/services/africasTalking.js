const AfricasTalking = require('africastalking');

// Initialize Africa's Talking
const africasTalking = AfricasTalking({
  apiKey: process.env.AT_API_KEY || 'sandbox_api_key',
  username: process.env.AT_USERNAME || 'sandbox'
});

const payments = africasTalking.PAYMENTS;
const sms = africasTalking.SMS;

/**
 * Initiate mobile money payment
 * @param {string} phoneNumber - Customer phone number
 * @param {number} amount - Amount to charge
 * @param {string} productName - Product name
 * @param {object} metadata - Additional metadata
 * @returns {Promise} Payment response
 */
const initiateMobilePayment = async (phoneNumber, amount, productName, metadata = {}) => {
  try {
    const options = {
      productName: productName || 'KOLO Tombola',
      phoneNumber: phoneNumber,
      currencyCode: 'USD',
      amount: amount,
      metadata: metadata
    };

    console.log('Initiating Africa\'s Talking payment:', options);

    const response = await payments.mobileCheckout(options);
    
    console.log('Africa\'s Talking response:', response);

    return {
      success: response.status === 'PendingConfirmation',
      transactionId: response.transactionId,
      status: response.status,
      description: response.description,
      provider: response.provider
    };

  } catch (error) {
    console.error('Africa\'s Talking payment error:', error);
    
    return {
      success: false,
      error: error.message || 'Payment initiation failed',
      details: error
    };
  }
};

/**
 * Query payment status
 * @param {string} transactionId - Transaction ID to query
 * @returns {Promise} Status response
 */
const queryPaymentStatus = async (transactionId) => {
  try {
    const response = await payments.mobileData({
      transactionId: transactionId
    });

    return {
      success: true,
      status: response.status,
      data: response
    };

  } catch (error) {
    console.error('Query payment status error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Simulate payment for development/testing
 */
const simulatePayment = async (phoneNumber, amount) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 90% success rate for simulation
  const isSuccess = Math.random() > 0.1;
  
  return {
    success: isSuccess,
    transactionId: `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    status: isSuccess ? 'Success' : 'Failed',
    description: isSuccess ? 'Payment successful' : 'Insufficient balance',
    provider: 'SimulatedProvider'
  };
};

/**
 * Send SMS notification
 * @param {string} phoneNumber - Recipient phone number (with country code)
 * @param {string} message - SMS message
 * @returns {Promise} SMS response
 */
const sendSMS = async (phoneNumber, message) => {
  try {
    const options = {
      to: [phoneNumber],
      message: message,
      from: process.env.AT_SENDER_ID || 'KOLO'
    };

    console.log('Sending SMS via Africa\'s Talking:', { to: phoneNumber, message });

    const response = await sms.send(options);
    
    console.log('SMS response:', response);

    return {
      success: response.SMSMessageData.Recipients[0].status === 'Success',
      messageId: response.SMSMessageData.Recipients[0].messageId,
      status: response.SMSMessageData.Recipients[0].status,
      cost: response.SMSMessageData.Recipients[0].cost
    };

  } catch (error) {
    console.error('SMS sending error:', error);
    
    return {
      success: false,
      error: error.message || 'SMS sending failed',
      details: error
    };
  }
};

/**
 * Send purchase confirmation SMS
 * @param {string} phoneNumber - Customer phone number
 * @param {string} userName - Customer name
 * @param {number} ticketCount - Number of tickets
 * @param {array} ticketNumbers - Ticket numbers
 * @returns {Promise} SMS response
 */
const sendPurchaseConfirmationSMS = async (phoneNumber, userName, ticketCount, ticketNumbers) => {
  const message = `Bonjour ${userName}! Votre achat KOLO est confirme. ${ticketCount} ticket(s): ${ticketNumbers.join(', ')}. Bonne chance!`;
  return await sendSMS(phoneNumber, message);
};

/**
 * Send winner notification SMS
 * @param {string} phoneNumber - Winner phone number
 * @param {string} userName - Winner name
 * @param {string} prize - Prize won
 * @param {string} ticketNumber - Winning ticket number
 * @returns {Promise} SMS response
 */
const sendWinnerNotificationSMS = async (phoneNumber, userName, prize, ticketNumber) => {
  const message = `FELICITATIONS ${userName}! Vous avez gagne ${prize} avec le ticket ${ticketNumber}! Contactez-nous: +243841209627`;
  return await sendSMS(phoneNumber, message);
};

module.exports = {
  initiateMobilePayment,
  queryPaymentStatus,
  simulatePayment,
  sendSMS,
  sendPurchaseConfirmationSMS,
  sendWinnerNotificationSMS
};
