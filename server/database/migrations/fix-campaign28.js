/**
 * Fix tickets with wrong format in specific campaigns
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fix() {
  try {
    // Fix tickets with wrong format in campaign 28 (Mutuka)
    const campaign = await pool.query(
      'SELECT id, ticket_prefix, total_tickets FROM campaigns WHERE id = 28'
    );
    const prefix = campaign.rows[0].ticket_prefix;
    const padLen = Math.max(2, String(campaign.rows[0].total_tickets).length);
    
    console.log(`\n📦 Campaign 28: prefix=${prefix}, padLen=${padLen}`);
    
    // Get tickets that need fixing (just numbers like "1", "2")
    const tickets = await pool.query(
      'SELECT id, ticket_number FROM tickets WHERE campaign_id = 28'
    );
    
    console.log('\n🎫 Current tickets:', tickets.rows);
    
    for (const t of tickets.rows) {
      if (/^\d+$/.test(t.ticket_number)) {
        const num = parseInt(t.ticket_number);
        const newNumber = `K${prefix}-${String(num).padStart(padLen, '0')}`;
        
        // Check if new number already exists
        const exists = await pool.query(
          'SELECT id FROM tickets WHERE ticket_number = $1 AND campaign_id = $2',
          [newNumber, 28]
        );
        
        if (exists.rows.length === 0) {
          await pool.query(
            'UPDATE tickets SET ticket_number = $1 WHERE id = $2',
            [newNumber, t.id]
          );
          console.log(`✅ Fixed: ${t.ticket_number} -> ${newNumber}`);
        } else {
          console.log(`⚠️ Cannot fix ${t.ticket_number} - target ${newNumber} already exists`);
        }
      }
    }
    
    // Verify result
    const result = await pool.query(
      'SELECT id, ticket_number, user_id FROM tickets WHERE campaign_id = 28 ORDER BY ticket_number'
    );
    console.log('\n📝 Final tickets:', result.rows);
    
    // Also fix sold_tickets count
    const actualCount = result.rows.length;
    await pool.query('UPDATE campaigns SET sold_tickets = $1 WHERE id = 28', [actualCount]);
    console.log(`\n📊 Updated sold_tickets to ${actualCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fix();
