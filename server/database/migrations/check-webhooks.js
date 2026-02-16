/**
 * Process unprocessed webhooks and check Afrimoney status
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function processWebhooks() {
  try {
    // Check purchase for webhook 119
    const purchase119 = await pool.query(
      `SELECT id, transaction_id, payment_status, created_at, selected_numbers, payment_provider, campaign_id 
       FROM purchases 
       WHERE transaction_id = 'KOLO-1770196789721-JABNAU'`
    );
    console.log('\n💳 Purchase for webhook 119 (M-Pesa):', purchase119.rows.length > 0 ? purchase119.rows : 'Not found');

    // Check the Afrimoney purchase (180)
    const purchase180 = await pool.query(
      `SELECT id, transaction_id, payment_status, phone_number, campaign_id, selected_numbers
       FROM purchases WHERE id = 180`
    );
    console.log('\n💳 Afrimoney purchase 180:', purchase180.rows[0]);

    // Look for any webhooks related to phone number 0902632851 or Afrimoney
    const afrimoneySimilar = await pool.query(
      `SELECT id, payload->>'Method' as method, payload->>'Reference' as reference, 
              payload->>'Customer_Details' as phone, payload->>'Status' as status,
              processed, created_at
       FROM payment_webhooks 
       WHERE payload->>'Method' = 'afrimoney' OR payload->>'Customer_Details' LIKE '%902632851%'
       ORDER BY created_at DESC`
    );
    console.log('\n📨 Afrimoney webhooks:', afrimoneySimilar.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

processWebhooks();
