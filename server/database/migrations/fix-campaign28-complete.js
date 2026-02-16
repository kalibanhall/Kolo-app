/**
 * Fix campaign 28 tickets to match selected_numbers
 * And handle the duplicate purchase (180/181 both selected number 2)
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixCampaign28() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('=== État actuel ===');
    
    // Get all purchases
    const purchases = await client.query(
      `SELECT id, user_id, payment_status, selected_numbers, transaction_id, created_at
       FROM purchases WHERE campaign_id = 28 ORDER BY id`
    );
    console.log('Purchases:', purchases.rows);
    
    // Get all tickets
    const tickets = await client.query(
      `SELECT id, ticket_number, purchase_id, user_id FROM tickets WHERE campaign_id = 28 ORDER BY id`
    );
    console.log('Tickets:', tickets.rows);
    
    // La campagne a 3 tickets max (total_tickets = 3)
    // Les numéros sélectionnés par les achats sont : 1, 2, 2, 3
    // Problème: 180 et 181 ont tous les deux choisi le numéro 2
    // 181 a reçu le ticket KVU-02, mais 180 n'a pas de ticket
    
    // Solution: Purchase 180 (premier à choisir le 2) devrait avoir un remboursement
    // Comme le numéro 2 est déjà pris par 181, on marque 180 comme "refunded"
    
    console.log('\n=== Corrections ===');
    
    // 1. Corriger ticket 157 (purchase 179, selected 1) : KVU-03 → KVU-01
    // Le ticket 159 a déjà KVU-01, donc on échange
    
    // D'abord, vérifions l'état attendu:
    // Purchase 179 (selected 1) devrait avoir KVU-01
    // Purchase 181 (selected 2) devrait avoir KVU-02 ✓ (déjà correct)  
    // Purchase 182 (selected 3) devrait avoir KVU-03
    // Purchase 180 est un doublon de 181
    
    // Échangeons les tickets 157 et 159:
    // Ticket 157 actuellement: KVU-03 (purchase 179, devrait être KVU-01)
    // Ticket 159 actuellement: KVU-01 (purchase 182, devrait être KVU-03)
    
    console.log('Échange ticket 157 et 159...');
    
    // Mise à jour temporaire avec un nom unique pour éviter les conflits
    await client.query(
      `UPDATE tickets SET ticket_number = 'TEMP-01' WHERE id = 157`
    );
    await client.query(
      `UPDATE tickets SET ticket_number = 'KVU-03' WHERE id = 159`
    );
    await client.query(
      `UPDATE tickets SET ticket_number = 'KVU-01' WHERE id = 157`
    );
    
    console.log('✅ Tickets 157 et 159 échangés');
    
    // 2. Marquer le purchase 180 comme remboursé (doublon)
    console.log('\nMarquage purchase 180 comme remboursé (doublon du numéro 2)...');
    await client.query(
      `UPDATE purchases 
       SET payment_status = 'refunded', 
           updated_at = NOW()
       WHERE id = 180`
    );
    console.log('✅ Purchase 180 marqué comme remboursé');
    
    await client.query('COMMIT');
    
    // Vérification finale
    console.log('\n=== État final ===');
    const finalPurchases = await client.query(
      `SELECT id, payment_status, selected_numbers FROM purchases WHERE campaign_id = 28 ORDER BY id`
    );
    console.log('Purchases:', finalPurchases.rows);
    
    const finalTickets = await client.query(
      `SELECT id, ticket_number, purchase_id FROM tickets WHERE campaign_id = 28 ORDER BY ticket_number`
    );
    console.log('Tickets:', finalTickets.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixCampaign28();
