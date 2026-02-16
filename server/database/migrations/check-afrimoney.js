/**
 * Check Afrimoney payment status and debug
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkAfrimoney() {
  try {
    // Get pending Afrimoney payment
    const purchase = await pool.query(
      `SELECT p.*, c.title as campaign_title 
       FROM purchases p 
       JOIN campaigns c ON p.campaign_id = c.id 
       WHERE p.id = 180`
    );
    console.log('\n💳 Purchase 180:', purchase.rows[0]);
    
    // Check if there's a webhook for this transaction
    const webhook = await pool.query(
      `SELECT id, provider, status, processed, created_at, payload 
       FROM payment_webhooks 
       WHERE transaction_id = $1 OR payload::text LIKE $2
       ORDER BY created_at DESC`,
      ['KOLO-1770196207703-IT81BV', '%KOLO-1770196207703-IT81BV%']
    );
    console.log('\n📨 Webhooks for this transaction:', webhook.rows.length > 0 ? webhook.rows : 'None found');
    
    // Check recent webhooks
    const recentWebhooks = await pool.query(
      `SELECT id, provider, transaction_id, status, processed, created_at 
       FROM payment_webhooks 
       ORDER BY created_at DESC 
       LIMIT 5`
    );
    console.log('\n📨 Recent webhooks:', recentWebhooks.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkAfrimoney();
