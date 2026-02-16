/**
 * Fix ticket numbers to proper format K{PREFIX}-XX
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixTickets() {
  try {
    // Get tickets with wrong format
    const tickets = await pool.query(`
      SELECT t.id, t.ticket_number, c.ticket_prefix, c.total_tickets 
      FROM tickets t 
      JOIN campaigns c ON t.campaign_id = c.id
    `);
    
    console.log(`Found ${tickets.rows.length} tickets to check`);
    
    for (const t of tickets.rows) {
      const padLength = Math.max(2, String(t.total_tickets).length);
      
      // Check if ticket_number is just a number or wrong format
      const num = parseInt(t.ticket_number);
      if (!isNaN(num) && !t.ticket_number.startsWith('K')) {
        const newNumber = `K${t.ticket_prefix}-${String(num).padStart(padLength, '0')}`;
        console.log(`Fixing: ${t.ticket_number} -> ${newNumber}`);
        await pool.query('UPDATE tickets SET ticket_number = $1 WHERE id = $2', [newNumber, t.id]);
      } else {
        console.log(`OK: ${t.ticket_number}`);
      }
    }
    
    // Verify
    const fixed = await pool.query('SELECT id, ticket_number FROM tickets ORDER BY id');
    console.log('\nTickets après correction:', fixed.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixTickets();
