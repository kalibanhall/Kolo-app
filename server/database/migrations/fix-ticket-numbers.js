/**
 * Migration script to fix ticket numbers format
 * Run with: node server/database/migrations/fix-ticket-numbers.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixTicketNumbers() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting ticket number migration...\n');
    
    // Get all campaigns with their prefixes
    const campaignsResult = await client.query(
      `SELECT id, title, ticket_prefix, total_tickets, sold_tickets 
       FROM campaigns 
       ORDER BY id`
    );
    
    console.log(`📋 Found ${campaignsResult.rows.length} campaigns\n`);
    
    for (const campaign of campaignsResult.rows) {
      console.log(`\n📦 Campaign ${campaign.id}: ${campaign.title}`);
      console.log(`   Prefix: K${campaign.ticket_prefix || 'X'}`);
      
      // Get tickets for this campaign that need fixing
      const ticketsResult = await client.query(
        `SELECT id, ticket_number 
         FROM tickets 
         WHERE campaign_id = $1
         ORDER BY id`,
        [campaign.id]
      );
      
      console.log(`   Total tickets: ${ticketsResult.rows.length}`);
      
      const prefix = campaign.ticket_prefix || 'X';
      const padLength = Math.max(2, String(campaign.total_tickets).length);
      const expectedPattern = new RegExp(`^K${prefix}-\\d+$`);
      
      let fixedCount = 0;
      
      await client.query('BEGIN');
      
      for (const ticket of ticketsResult.rows) {
        const oldNumber = ticket.ticket_number;
        
        // Skip if already correct format
        if (expectedPattern.test(oldNumber)) {
          continue;
        }
        
        // Skip TEMP tickets
        if (oldNumber.startsWith('TEMP')) {
          continue;
        }
        
        let newNumber = null;
        
        // Case 1: Just a number (e.g., "1", "01", "001")
        if (/^\d+$/.test(oldNumber)) {
          const num = parseInt(oldNumber, 10);
          newNumber = `K${prefix}-${String(num).padStart(padLength, '0')}`;
        }
        // Case 2: Format "K-XX" (missing prefix)
        else if (/^K-\d+$/.test(oldNumber)) {
          const num = oldNumber.replace('K-', '');
          newNumber = `K${prefix}-${num}`;
        }
        // Case 3: Format "KX-XX" with wrong prefix
        else if (/^K[A-Z]-\d+$/.test(oldNumber)) {
          const num = oldNumber.replace(/^K[A-Z]-/, '');
          newNumber = `K${prefix}-${num}`;
        }
        
        if (newNumber && newNumber !== oldNumber) {
          // Check if the new number already exists
          const existsResult = await client.query(
            `SELECT id FROM tickets 
             WHERE ticket_number = $1 AND campaign_id = $2 AND id != $3`,
            [newNumber, campaign.id, ticket.id]
          );
          
          if (existsResult.rows.length > 0) {
            console.log(`   ⚠️  Skipping ${oldNumber} -> ${newNumber} (already exists)`);
            continue;
          }
          
          await client.query(
            `UPDATE tickets SET ticket_number = $1 WHERE id = $2`,
            [newNumber, ticket.id]
          );
          
          console.log(`   ✅ Fixed: ${oldNumber} -> ${newNumber}`);
          fixedCount++;
        }
      }
      
      // Sync sold_tickets count
      const actualCountResult = await client.query(
        `SELECT COUNT(*) as count FROM tickets 
         WHERE campaign_id = $1 AND ticket_number NOT LIKE 'TEMP%'`,
        [campaign.id]
      );
      const actualCount = parseInt(actualCountResult.rows[0].count);
      
      if (actualCount !== campaign.sold_tickets) {
        await client.query(
          `UPDATE campaigns SET sold_tickets = $1 WHERE id = $2`,
          [actualCount, campaign.id]
        );
        console.log(`   📊 Synced sold_tickets: ${campaign.sold_tickets} -> ${actualCount}`);
      }
      
      await client.query('COMMIT');
      
      console.log(`   📝 Fixed ${fixedCount} ticket(s) in campaign ${campaign.id}`);
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
fixTicketNumbers().catch(console.error);
