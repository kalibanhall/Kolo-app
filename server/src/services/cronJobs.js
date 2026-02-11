const cron = require('node-cron');
const { query } = require('../config/database');
const { logAdminAction } = require('../utils/logger');

/**
 * Auto-open scheduled campaigns when start_date is reached
 * Runs every 5 minutes
 */
const openScheduledCampaigns = cron.schedule('*/5 * * * *', async () => {
  try {
    console.log('🔄 Checking for scheduled campaigns to open...');

    const result = await query(
      `SELECT id, title, start_date
       FROM campaigns 
       WHERE status = 'scheduled' 
       AND start_date <= NOW()`
    );

    const campaignsToOpen = result.rows || [];

    if (campaignsToOpen.length === 0) {
      return;
    }

    console.log(`📌 Found ${campaignsToOpen.length} scheduled campaign(s) to open:`,
      campaignsToOpen.map(c => c.title).join(', ')
    );

    const campaignIds = campaignsToOpen.map(c => c.id);
    const placeholders = campaignIds.map((_, i) => `$${i + 1}`).join(',');

    await query(
      `UPDATE campaigns 
       SET status = 'open', 
           updated_at = NOW() 
       WHERE id IN (${placeholders})`,
      campaignIds
    );

    // Send notifications for newly opened campaigns
    try {
      const { isInitialized } = require('./firebaseNotifications');

      for (const campaign of campaignsToOpen) {
        logAdminAction(
          null,
          'CAMPAIGN_OPENED',
          `Campaign "${campaign.title}" (ID: ${campaign.id}) automatically opened by scheduler (start_date: ${campaign.start_date})`
        );
      }
    } catch (notifError) {
      console.error('⚠️ Error logging scheduled campaign open:', notifError);
    }

    console.log(`✅ Successfully opened ${campaignsToOpen.length} scheduled campaign(s).`);
  } catch (error) {
    console.error('❌ Error opening scheduled campaigns:', error);
  }
});

/**
 * Update campaign status based on end_date
 * Runs every hour at minute 0
 */
const updateCampaignStatus = cron.schedule('0 * * * *', async () => {
  try {
    console.log('🔄 Running campaign status update cron job...');

    // Find campaigns that should be closed
    // Close if: 1) end_date has passed OR 2) all tickets sold (sold_tickets >= total_tickets)
    const result = await query(
      `SELECT id, title, end_date, sold_tickets, total_tickets,
              CASE 
                WHEN end_date < NOW() THEN 'date_expired'
                WHEN sold_tickets >= total_tickets THEN 'sold_out'
                ELSE 'other'
              END as close_reason
       FROM campaigns 
       WHERE status = 'open' 
       AND (end_date < NOW() OR sold_tickets >= total_tickets)`
    );

    const campaignsToClose = result.rows || [];

    if (campaignsToClose.length === 0) {
      console.log('✅ No campaigns to close.');
      return;
    }

    console.log(`📌 Found ${campaignsToClose.length} campaign(s) to close:`, 
      campaignsToClose.map(c => `${c.title} (${c.close_reason})`).join(', ')
    );

    // Update campaigns to 'closed' status
    const campaignIds = campaignsToClose.map(c => c.id);
    const placeholders = campaignIds.map((_, i) => `$${i + 1}`).join(',');
    
    await query(
      `UPDATE campaigns 
       SET status = 'closed', 
           updated_at = NOW() 
       WHERE id IN (${placeholders})`,
      campaignIds
    );

    // Send notifications to all participants of closed campaigns
    try {
      const { 
        notifyCampaignClosed, 
        createParticipantNotifications,
        isInitialized 
      } = require('./firebaseNotifications');

      for (const campaign of campaignsToClose) {
        const campaignName = campaign.title;
        
        // Create database notifications for all participants
        await createParticipantNotifications(
          campaign.id,
          'campaign_closed',
          '🔒 Campagne clôturée !',
          `La tombola "${campaignName}" est terminée. Le tirage sera effectué dans les 48 heures qui suivent. Restez connecté !`,
          { close_reason: campaign.close_reason }
        );

        // Send push notifications if Firebase is initialized
        if (isInitialized()) {
          await notifyCampaignClosed(campaign.id, campaignName);
        }

        console.log(`📧 Notifications sent for closed campaign: ${campaignName}`);
      }
    } catch (notifError) {
      console.error('⚠️ Error sending campaign close notifications:', notifError);
      // Don't fail the cron job if notifications fail
    }

    // Log the action
    for (const campaign of campaignsToClose) {
      const reason = campaign.close_reason === 'sold_out' 
        ? `all tickets sold (${campaign.sold_tickets}/${campaign.total_tickets})`
        : `end date reached (${campaign.end_date})`;
      
      logAdminAction(
        null, // No specific admin user for cron jobs
        'CAMPAIGN_CLOSED',
        `Campaign "${campaign.title}" (ID: ${campaign.id}) automatically closed by cron job: ${reason}`
      );
    }

    console.log(`✅ Successfully closed ${campaignsToClose.length} campaign(s).`);
  } catch (error) {
    console.error('❌ Error updating campaign status:', error);
  }
});

/**
 * Send reminders for campaigns ending soon
 * Runs every day at 9:00 AM
 */
const sendCampaignReminders = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('🔔 Running campaign reminder cron job...');

    // Find campaigns ending in the next 24 hours (PostgreSQL syntax)
    const upcomingCampaigns = await query(
      `SELECT id, title, end_date, ticket_price
       FROM campaigns 
       WHERE status = 'open' 
       AND end_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'`
    );

    if (upcomingCampaigns.length === 0) {
      console.log('✅ No campaigns ending soon.');
      return;
    }

    console.log(`📌 Found ${upcomingCampaigns.length} campaign(s) ending soon:`, 
      upcomingCampaigns.map(c => c.title).join(', ')
    );

    // TODO: Send notifications to users who haven't participated yet
    // This would require additional logic to:
    // 1. Get list of active users
    // 2. Check if they've purchased tickets for these campaigns
    // 3. Send push notifications or emails

    console.log('✅ Campaign reminder job completed.');
  } catch (error) {
    console.error('❌ Error sending campaign reminders:', error);
  }
});

/**
 * Clean up old data (optional)
 * Runs every Sunday at 2:00 AM
 */
const cleanupOldData = cron.schedule('0 2 * * 0', async () => {
  try {
    console.log('🧹 Running data cleanup cron job...');

    // Delete old logs older than 90 days (PostgreSQL syntax)
    const logsDeleted = await query(
      `DELETE FROM admin_logs 
       WHERE created_at < NOW() - INTERVAL '90 days'`
    );

    console.log(`✅ Deleted ${logsDeleted.rowCount || 0} old log entries.`);

    // Delete old password reset tokens older than 7 days
    try {
      const tokensDeleted = await query(
        `DELETE FROM password_reset_tokens 
         WHERE created_at < NOW() - INTERVAL '7 days'`
      );
      console.log(`✅ Deleted ${tokensDeleted.rowCount || 0} old password reset tokens.`);
    } catch (err) {
      // Table might not exist, skip silently
      console.log('⚠️ password_reset_tokens table not found, skipping.');
    }

    // Delete old notifications older than 30 days and marked as read
    try {
      const notificationsDeleted = await query(
        `DELETE FROM notifications 
         WHERE read = TRUE 
         AND created_at < NOW() - INTERVAL '30 days'`
      );
      console.log(`✅ Deleted ${notificationsDeleted.rowCount || 0} old read notifications.`);
    } catch (err) {
      console.log('⚠️ Could not clean notifications:', err.message);
    }

    console.log('✅ Data cleanup completed.');
  } catch (error) {
    console.error('❌ Error during data cleanup:', error);
  }
});

/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
  console.log('⏰ Initializing cron jobs...');

  // Start cron jobs
  openScheduledCampaigns.start();
  updateCampaignStatus.start();
  sendCampaignReminders.start();
  cleanupOldData.start();

  console.log('✅ Cron jobs initialized:');
  console.log('   - Scheduled campaigns auto-open: Every 5 minutes');
  console.log('   - Campaign status update: Every hour at :00');
  console.log('   - Campaign reminders: Daily at 9:00 AM');
  console.log('   - Data cleanup: Weekly on Sunday at 2:00 AM');
};

/**
 * Stop all cron jobs (useful for testing or graceful shutdown)
 */
const stopCronJobs = () => {
  console.log('🛑 Stopping cron jobs...');
  openScheduledCampaigns.stop();
  updateCampaignStatus.stop();
  sendCampaignReminders.stop();
  cleanupOldData.stop();
  console.log('✅ Cron jobs stopped.');
};

module.exports = {
  initializeCronJobs,
  stopCronJobs,
  openScheduledCampaigns,
  updateCampaignStatus,
  sendCampaignReminders,
  cleanupOldData,
};
