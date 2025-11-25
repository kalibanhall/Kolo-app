const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let initialized = false;

/**
 * Initialize Firebase Admin SDK
 * Requires firebase-admin-key.json in config folder
 */
function initializeFirebase() {
  if (initialized) {
    return;
  }

  try {
    const serviceAccountPath = path.join(__dirname, 'firebase-admin-key.json');
    
    // Check if service account key exists
    if (!fs.existsSync(serviceAccountPath)) {
      console.warn('⚠️  Firebase Admin key not found. Push notifications disabled.');
      console.warn('   Place firebase-admin-key.json in server/src/config/');
      return;
    }

    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    initialized = true;
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
  }
}

/**
 * Send push notification to a single user
 * @param {string} fcmToken - User's FCM token
 * @param {Object} notification - { title, body }
 * @param {Object} data - Additional data payload
 * @returns {Promise<string>} - Message ID
 */
async function sendNotification(fcmToken, notification, data = {}) {
  if (!initialized) {
    throw new Error('Firebase not initialized');
  }

  if (!fcmToken) {
    throw new Error('FCM token is required');
  }

  const message = {
    notification: {
      title: notification.title,
      body: notification.body
    },
    data: {
      ...data,
      click_action: data.url || '/',
      timestamp: new Date().toISOString()
    },
    token: fcmToken,
    webpush: {
      fcmOptions: {
        link: data.url || '/'
      },
      notification: {
        icon: '/logo-kolo-192.png',
        badge: '/logo-kolo-96.png',
        tag: data.type || 'default',
        requireInteraction: data.requireInteraction || false
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Push notification sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    
    // Handle invalid tokens
    if (error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token') {
      console.warn('⚠️  Invalid FCM token, should be removed from database');
    }
    
    throw error;
  }
}

/**
 * Send push notifications to multiple users
 * @param {string[]} fcmTokens - Array of FCM tokens
 * @param {Object} notification - { title, body }
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} - { successCount, failureCount, responses }
 */
async function sendBulkNotification(fcmTokens, notification, data = {}) {
  if (!initialized) {
    throw new Error('Firebase not initialized');
  }

  if (!fcmTokens || fcmTokens.length === 0) {
    throw new Error('FCM tokens array is required');
  }

  // Filter out null/undefined tokens
  const validTokens = fcmTokens.filter(token => token && typeof token === 'string');

  if (validTokens.length === 0) {
    throw new Error('No valid FCM tokens provided');
  }

  const message = {
    notification: {
      title: notification.title,
      body: notification.body
    },
    data: {
      ...data,
      click_action: data.url || '/',
      timestamp: new Date().toISOString()
    },
    webpush: {
      fcmOptions: {
        link: data.url || '/'
      },
      notification: {
        icon: '/logo-kolo-192.png',
        badge: '/logo-kolo-96.png',
        tag: data.type || 'default'
      }
    }
  };

  try {
    const response = await admin.messaging().sendEachForMulticast({
      ...message,
      tokens: validTokens
    });

    console.log(`✅ Bulk notifications sent: ${response.successCount} success, ${response.failureCount} failures`);

    // Log failed tokens for cleanup
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push({
            token: validTokens[idx],
            error: resp.error.code
          });
        }
      });
      console.warn('⚠️  Failed tokens:', failedTokens);
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses
    };
  } catch (error) {
    console.error('❌ Error sending bulk notifications:', error);
    throw error;
  }
}

/**
 * Send notification to all users of a campaign
 * @param {number} campaignId - Campaign ID
 * @param {Object} notification - { title, body }
 * @param {Object} data - Additional data
 */
async function notifyCampaignParticipants(campaignId, notification, data = {}) {
  const { query } = require('../config/database');
  
  try {
    // Get all FCM tokens of users who bought tickets for this campaign
    const result = await query(
      `SELECT DISTINCT u.fcm_token 
       FROM users u 
       INNER JOIN tickets t ON u.id = t.user_id 
       WHERE t.campaign_id = $1 AND u.fcm_token IS NOT NULL`,
      [campaignId]
    );

    if (result.rows.length === 0) {
      console.log('⚠️  No users with FCM tokens found for campaign', campaignId);
      return { successCount: 0, failureCount: 0 };
    }

    const tokens = result.rows.map(row => row.fcm_token);
    
    return await sendBulkNotification(tokens, notification, {
      ...data,
      campaign_id: campaignId.toString()
    });
  } catch (error) {
    console.error('Error notifying campaign participants:', error);
    throw error;
  }
}

/**
 * Send notification after successful ticket purchase
 */
async function notifyTicketPurchase(userId, ticketCount, campaignName) {
  const { query } = require('../config/database');
  
  try {
    const result = await query(
      'SELECT fcm_token FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].fcm_token) {
      return;
    }

    await sendNotification(
      result.rows[0].fcm_token,
      {
        title: '🎉 Achat confirmé !',
        body: `Vos ${ticketCount} ticket(s) pour "${campaignName}" ont été générés avec succès`
      },
      {
        type: 'purchase_confirmation',
        ticket_count: ticketCount.toString(),
        url: '/dashboard'
      }
    );
  } catch (error) {
    console.error('Error sending purchase notification:', error);
  }
}

/**
 * Send notification when lottery is drawn
 */
async function notifyLotteryDrawn(campaignId, campaignName, winnerCount) {
  try {
    await notifyCampaignParticipants(
      campaignId,
      {
        title: '🎊 Tirage effectué !',
        body: `Les ${winnerCount} gagnant(s) de "${campaignName}" ont été tirés au sort`
      },
      {
        type: 'lottery_drawn',
        campaign_id: campaignId.toString(),
        url: `/campaigns/${campaignId}/results`
      }
    );
  } catch (error) {
    console.error('Error sending lottery notification:', error);
  }
}

/**
 * Send notification to winner
 */
async function notifyWinner(userId, campaignName, prizeAmount) {
  const { query } = require('../config/database');
  
  try {
    const result = await query(
      'SELECT fcm_token FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].fcm_token) {
      return;
    }

    await sendNotification(
      result.rows[0].fcm_token,
      {
        title: '🏆 Félicitations, vous avez gagné !',
        body: `Vous avez remporté ${prizeAmount} CDF dans la tombola "${campaignName}"`
      },
      {
        type: 'winner',
        prize_amount: prizeAmount.toString(),
        url: '/dashboard',
        requireInteraction: true
      }
    );
  } catch (error) {
    console.error('Error sending winner notification:', error);
  }
}

/**
 * Send notification when campaign is about to end
 */
async function notifyCampaignEnding(campaignId, campaignName, hoursRemaining) {
  try {
    await notifyCampaignParticipants(
      campaignId,
      {
        title: '⏰ Dernière chance !',
        body: `La tombola "${campaignName}" se termine dans ${hoursRemaining}h`
      },
      {
        type: 'campaign_ending',
        campaign_id: campaignId.toString(),
        hours_remaining: hoursRemaining.toString(),
        url: `/campaigns/${campaignId}`
      }
    );
  } catch (error) {
    console.error('Error sending campaign ending notification:', error);
  }
}

module.exports = {
  initializeFirebase,
  sendNotification,
  sendBulkNotification,
  notifyCampaignParticipants,
  notifyTicketPurchase,
  notifyLotteryDrawn,
  notifyWinner,
  notifyCampaignEnding,
  isInitialized: () => initialized
};
