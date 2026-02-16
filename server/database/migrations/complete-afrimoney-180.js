/**
 * Complete Afrimoney payment manually since PayDRC never sent the callback
 * Purchase ID: 180, Transaction: KOLO-1770196207703-IT81BV
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function completePayment() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get purchase details
    const purchaseResult = await client.query(
      `SELECT p.*, c.ticket_prefix, c.title 
       FROM purchases p 
       JOIN campaigns c ON p.campaign_id = c.id 
       WHERE p.id = 180`
    );
    
    if (purchaseResult.rows.length === 0) {
      throw new Error('Purchase not found');
    }
    
    const purchase = purchaseResult.rows[0];
    console.log('\n📋 Purchase to complete:', {
      id: purchase.id,
      campaign: purchase.title,
      amount: purchase.total_amount,
      status: purchase.payment_status,
      selected_numbers: purchase.selected_numbers
    });
    
    if (purchase.payment_status === 'completed') {
      console.log('⚠️ Payment already completed!');
      await client.query('ROLLBACK');
      return;
    }
    
    // Generate ticket number
    const selectedNumber = purchase.selected_numbers[0];
    const ticketNumber = `K${purchase.ticket_prefix}-${String(selectedNumber).padStart(2, '0')}`;
    
    console.log(`\n🎫 Generating ticket: ${ticketNumber}`);
    
    // Check if ticket already exists
    const existingTicket = await client.query(
      `SELECT id, ticket_number FROM tickets WHERE campaign_id = $1 AND ticket_number = $2`,
      [purchase.campaign_id, ticketNumber]
    );
    
    if (existingTicket.rows.length > 0) {
      console.log(`⚠️ Ticket ${ticketNumber} already exists! Checking if we need to update purchase...`);
      
      // Just update the purchase status
      await client.query(
        `UPDATE purchases 
         SET payment_status = 'completed', 
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [purchase.id]
      );
    } else {
      // Create ticket
      await client.query(
        `INSERT INTO tickets (campaign_id, purchase_id, user_id, ticket_number, status, created_at)
         VALUES ($1, $2, $3, $4, 'active', NOW())`,
        [purchase.campaign_id, purchase.id, purchase.user_id, ticketNumber]
      );
      
      // Update purchase
      await client.query(
        `UPDATE purchases 
         SET payment_status = 'completed', 
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [purchase.id]
      );
    }
    
    // Log as webhook for audit trail
    await client.query(
      `INSERT INTO payment_webhooks (provider, payload, transaction_id, status, processed, processed_at, created_at)
       VALUES ($1, $2, $3, 'success', true, NOW(), NOW())`,
      [
        'PayDRC-Manual',
        JSON.stringify({
          Action: 'debit',
          Amount: parseFloat(purchase.total_amount),
          Method: 'afrimoney',
          Status: 'Success',
          Reference: purchase.transaction_id,
          Trans_Status: 'Successful',
          Note: 'Completed manually - PayDRC callback never received'
        }),
        purchase.transaction_id
      ]
    );
    
    await client.query('COMMIT');
    
    // Verify
    const verifyPurchase = await client.query(
      `SELECT payment_status, completed_at FROM purchases WHERE id = 180`
    );
    const verifyTicket = await client.query(
      `SELECT ticket_number, status FROM tickets WHERE purchase_id = 180`
    );
    
    console.log('\n✅ Payment completed successfully!');
    console.log('Purchase status:', verifyPurchase.rows[0]);
    console.log('Ticket:', verifyTicket.rows[0]);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

completePayment();
