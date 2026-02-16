/**
 * Reset database - Keep only admin account
 * This will delete ALL data except the admin user
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('⚠️  ATTENTION: Réinitialisation de la base de données...\n');
    
    // Get admin user info first
    const adminResult = await client.query(
      `SELECT id, email, name FROM users WHERE is_admin = true LIMIT 1`
    );
    
    if (adminResult.rows.length === 0) {
      console.log('❌ Aucun compte admin trouvé!');
      return;
    }
    
    const admin = adminResult.rows[0];
    console.log(`✅ Compte admin trouvé: ${admin.email} (ID: ${admin.id})`);
    
    await client.query('BEGIN');

    // 0. Delete draw results first (foreign key to tickets)
    try {
      const drawResultsDeleted = await client.query('DELETE FROM draw_results');
      console.log(`🗑️  Résultats de tirage supprimés: ${drawResultsDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table draw_results non trouvée');
    }

    // 1. Delete all tickets
    const ticketsDeleted = await client.query('DELETE FROM tickets');
    console.log(`🗑️  Tickets supprimés: ${ticketsDeleted.rowCount}`);
    
    // 2. Delete all purchases
    const purchasesDeleted = await client.query('DELETE FROM purchases');
    console.log(`🗑️  Achats supprimés: ${purchasesDeleted.rowCount}`);
    
    // 3. Delete all payment webhooks
    const webhooksDeleted = await client.query('DELETE FROM payment_webhooks');
    console.log(`🗑️  Webhooks supprimés: ${webhooksDeleted.rowCount}`);
    
    // 4. Delete all ticket reservations
    try {
      const reservationsDeleted = await client.query('DELETE FROM ticket_reservations');
      console.log(`🗑️  Réservations supprimées: ${reservationsDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table ticket_reservations non trouvée');
    }
    
    // 5. Delete all notifications
    try {
      const notificationsDeleted = await client.query('DELETE FROM notifications');
      console.log(`🗑️  Notifications supprimées: ${notificationsDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table notifications non trouvée');
    }
    
    // 6. Delete all promo codes usage
    try {
      const promoUsageDeleted = await client.query('DELETE FROM promo_code_usage');
      console.log(`🗑️  Utilisation codes promo supprimés: ${promoUsageDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table promo_code_usage non trouvée');
    }
    
    // 7. Delete all promo codes
    try {
      const promoDeleted = await client.query('DELETE FROM promo_codes');
      console.log(`🗑️  Codes promo supprimés: ${promoDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table promo_codes non trouvée');
    }
    
    // 8. Delete all wallet transactions
    try {
      const walletTxDeleted = await client.query('DELETE FROM wallet_transactions');
      console.log(`🗑️  Transactions wallet supprimées: ${walletTxDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table wallet_transactions non trouvée');
    }
    
    // 9. Reset wallet balance for admin (check if column exists first)
    try {
      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'wallet_balance'
      `);
      if (colCheck.rows.length > 0) {
        await client.query('UPDATE users SET wallet_balance = 0 WHERE id = $1', [admin.id]);
        console.log(`🗑️  Solde wallet admin réinitialisé`);
      } else {
        console.log('ℹ️  Colonne wallet_balance non présente');
      }
    } catch (e) {
      console.log('ℹ️  Erreur wallet_balance:', e.message);
    }
    
    // 10. Delete all campaigns
    const campaignsDeleted = await client.query('DELETE FROM campaigns');
    console.log(`🗑️  Campagnes supprimées: ${campaignsDeleted.rowCount}`);
    
    // 11. Delete all users except admin
    const usersDeleted = await client.query('DELETE FROM users WHERE is_admin = false');
    console.log(`🗑️  Utilisateurs supprimés: ${usersDeleted.rowCount}`);
    
    // 12. Delete password reset tokens
    try {
      const tokensDeleted = await client.query('DELETE FROM password_reset_tokens');
      console.log(`🗑️  Tokens de reset supprimés: ${tokensDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table password_reset_tokens non trouvée');
    }
    
    // 13. Reset sequences
    console.log('\n🔄 Réinitialisation des séquences...');
    
    const sequences = [
      'tickets_id_seq',
      'purchases_id_seq', 
      'campaigns_id_seq',
      'payment_webhooks_id_seq',
      'notifications_id_seq',
      'promo_codes_id_seq',
      'wallet_transactions_id_seq',
      'ticket_reservations_id_seq'
    ];
    
    for (const seq of sequences) {
      try {
        await client.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
        console.log(`  ✓ ${seq} réinitialisée`);
      } catch (e) {
        // Sequence might not exist
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Base de données réinitialisée avec succès!');
    console.log(`\n📋 État final:`);
    
    // Show final state
    const finalUsers = await client.query('SELECT COUNT(*) as count FROM users');
    const finalCampaigns = await client.query('SELECT COUNT(*) as count FROM campaigns');
    const finalTickets = await client.query('SELECT COUNT(*) as count FROM tickets');
    const finalPurchases = await client.query('SELECT COUNT(*) as count FROM purchases');
    
    console.log(`   - Utilisateurs: ${finalUsers.rows[0].count} (admin uniquement)`);
    console.log(`   - Campagnes: ${finalCampaigns.rows[0].count}`);
    console.log(`   - Tickets: ${finalTickets.rows[0].count}`);
    console.log(`   - Achats: ${finalPurchases.rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Confirmation
console.log('════════════════════════════════════════════════════════════');
console.log('⚠️  ATTENTION: Cette opération va SUPPRIMER TOUTES LES DONNÉES');
console.log('   - Tous les utilisateurs (sauf admin)');
console.log('   - Toutes les campagnes');
console.log('   - Tous les tickets');
console.log('   - Tous les achats');
console.log('   - Tous les webhooks');
console.log('════════════════════════════════════════════════════════════\n');

resetDatabase();
