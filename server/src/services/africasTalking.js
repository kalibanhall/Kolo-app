const AfricasTalking = require('africastalking');

// Initialize Africa's Talking
const africasTalking = AfricasTalking({
  apiKey: process.env.AT_API_KEY || 'sandbox_api_key',
  username: process.env.AT_USERNAME || 'sandbox'
});

const payments = africasTalking.PAYMENTS;

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

module.exports = {
  initiateMobilePayment,
  queryPaymentStatus,
  simulatePayment
};
