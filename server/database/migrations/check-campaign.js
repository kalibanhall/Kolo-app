/**
 * Check campaign and tickets data
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function check() {
  try {
    // Check Mutuka campaign (28) - the one shown in screenshot
    const campaign = await pool.query(
      'SELECT id, title, ticket_prefix, total_tickets, sold_tickets FROM campaigns WHERE id = 28'
    );
    console.log('\n📦 Campaign 28 (Mutuka):', campaign.rows[0]);
    
    // Get its tickets
    const tickets = await pool.query(
      'SELECT id, ticket_number, user_id, status FROM tickets WHERE campaign_id = 28'
    );
    console.log('\n🎫 Tickets in DB:', tickets.rows);
    
    // Check what API returns as available
    const prefix = campaign.rows[0]?.ticket_prefix || 'X';
    const total = campaign.rows[0]?.total_tickets || 3;
    const padLen = Math.max(2, String(total).length);
    const used = new Set(tickets.rows.map(r => r.ticket_number));
    
    console.log('\n🔢 Used numbers:', [...used]);
    
    const available = [];
    for (let i = 1; i <= total; i++) {
      const num = 'K' + prefix + '-' + String(i).padStart(padLen, '0');
      if (!used.has(num)) available.push(num);
    }
    console.log('✅ Should be available:', available);
    
    // Check recent Afrimoney/Africell payments
    const payments = await pool.query(
      `SELECT id, user_id, payment_status, payment_provider, transaction_id, created_at 
       FROM purchases 
       WHERE payment_provider ILIKE '%afri%' OR payment_provider ILIKE '%africell%' 
       ORDER BY created_at DESC LIMIT 5`
    );
    console.log('\n💳 Recent Afrimoney purchases:', payments.rows);
    
    // Check pending purchases for campaign 28
    const pending = await pool.query(
      `SELECT id, user_id, payment_status, payment_provider, transaction_id, ticket_count, created_at 
       FROM purchases 
       WHERE campaign_id = 28 
       ORDER BY created_at DESC`
    );
    console.log('\n⏳ All purchases for campaign 28:', pending.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

check();
