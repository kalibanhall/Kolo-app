/**
 * Reset database with Admin L3 account
 * This will delete ALL data and ensure only one admin L3 account exists
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function resetDatabaseWithAdminL3() {
  const client = await pool.connect();
  
  try {
    console.log('⚠️  ATTENTION: Réinitialisation complète de la base de données...\n');
    
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
    
    // 9. Delete all admin validations
    try {
      const adminValidationsDeleted = await client.query('DELETE FROM admin_validations');
      console.log(`🗑️  Données validations admin supprimées: ${adminValidationsDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table admin_validations non trouvée');
    }
    
    // 10. Delete all admin logs
    try {
      const adminLogsDeleted = await client.query('DELETE FROM admin_logs');
      console.log(`🗑️  Données logs admin supprimés: ${adminLogsDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table admin_logs non trouvée');
    }
    
    // 11. Delete invoices
    try {
      const invoicesDeleted = await client.query('DELETE FROM invoices');
      console.log(`🗑️  Factures supprimées: ${invoicesDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table invoices non trouvée');
    }
    
    // 12. Delete FCM tokens
    try {
      const fcmDeleted = await client.query('DELETE FROM fcm_tokens');
      console.log(`🗑️  Tokens FCM supprimés: ${fcmDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table fcm_tokens non trouvée');
    }
    
    // 13. Delete email verification tokens
    try {
      const emailTokensDeleted = await client.query('DELETE FROM email_verification_tokens');
      console.log(`🗑️  Tokens de vérification email supprimés: ${emailTokensDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table email_verification_tokens non trouvée');
    }
    
    // 14. Delete wallets
    try {
      const walletsDeleted = await client.query('DELETE FROM wallets');
      console.log(`🗑️  Wallets supprimés: ${walletsDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table wallets non trouvée');
    }
    
    // 15. Reset app_settings.updated_by to NULL
    try {
      const settingsReset = await client.query('UPDATE app_settings SET updated_by = NULL');
      console.log(`🔄  Références app_settings réinitialisées: ${settingsReset.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table app_settings non trouvée');
    }
    
    // 16. Delete all campaigns
    const campaignsDeleted = await client.query('DELETE FROM campaigns');
    console.log(`🗑️  Campagnes supprimées: ${campaignsDeleted.rowCount}`);
    
    // 17. Delete ALL users
    const usersDeleted = await client.query('DELETE FROM users');
    console.log(`🗑️  Utilisateurs supprimés: ${usersDeleted.rowCount}`);
    
    // 18. Delete password reset tokens
    try {
      const tokensDeleted = await client.query('DELETE FROM password_reset_tokens');
      console.log(`🗑️  Tokens de reset supprimés: ${tokensDeleted.rowCount}`);
    } catch (e) {
      console.log('ℹ️  Table password_reset_tokens non trouvée');
    }
    
    // 19. Reset sequences
    console.log('\n🔄 Réinitialisation des séquences...');
    
    const sequences = [
      'users_id_seq',
      'tickets_id_seq',
      'purchases_id_seq', 
      'campaigns_id_seq',
      'payment_webhooks_id_seq',
      'notifications_id_seq',
      'promo_codes_id_seq',
      'wallet_transactions_id_seq',
      'ticket_reservations_id_seq',
      'admin_validations_id_seq',
      'admin_logs_id_seq',
      'invoices_id_seq',
      'fcm_tokens_id_seq',
      'wallets_id_seq'
    ];
    
    for (const seq of sequences) {
      try {
        await client.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
        console.log(`  ✓ ${seq} réinitialisée`);
      } catch (e) {
        // Sequence might not exist
      }
    }
    
    // 20. Create fresh Admin L3 account
    console.log('\n👤 Création du compte Admin L3...');
    
    const adminEmail = 'admin@kolo.com';
    const adminPassword = 'Admin@2025';
    const adminName = 'Administrateur L3';
    const adminPhone = '+243000000000';
    
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const adminResult = await client.query(
      `INSERT INTO users (email, password_hash, name, phone, is_admin, admin_level, email_verified, is_active)
       VALUES ($1, $2, $3, $4, true, 3, true, true)
       RETURNING id, email, name, admin_level`,
      [adminEmail, hashedPassword, adminName, adminPhone]
    );
    
    const admin = adminResult.rows[0];
    console.log(`✅ Admin L3 créé: ${admin.email} (ID: ${admin.id}, Niveau: ${admin.admin_level})`);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Base de données réinitialisée avec succès!');
    console.log(`\n📋 État final:`);
    
    // Show final state
    const finalUsers = await client.query('SELECT COUNT(*) as count FROM users');
    const finalCampaigns = await client.query('SELECT COUNT(*) as count FROM campaigns');
    const finalTickets = await client.query('SELECT COUNT(*) as count FROM tickets');
    const finalPurchases = await client.query('SELECT COUNT(*) as count FROM purchases');
    
    console.log(`   - Utilisateurs: ${finalUsers.rows[0].count}`);
    console.log(`   - Campagnes: ${finalCampaigns.rows[0].count}`);
    console.log(`   - Tickets: ${finalTickets.rows[0].count}`);
    console.log(`   - Achats: ${finalPurchases.rows[0].count}`);
    
    console.log('\n🔐 Identifiants Admin L3:');
    console.log('   Email: admin@kolo.com');
    console.log('   Password: Admin@2025');
    console.log('   Niveau: 3 (Accès complet)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Confirmation
console.log('════════════════════════════════════════════════════════════');
console.log('⚠️  ATTENTION: Cette opération va SUPPRIMER TOUTES LES DONNÉES');
console.log('   - TOUS les utilisateurs');
console.log('   - Toutes les campagnes');
console.log('   - Tous les tickets');
console.log('   - Tous les achats');
console.log('   - Tous les webhooks');
console.log('   ');
console.log('   ✅ Un nouveau compte Admin L3 sera créé');
console.log('════════════════════════════════════════════════════════════\n');

resetDatabaseWithAdminL3().catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
