/**
 * Script pour créer la table password_reset_tokens
 */
require('dotenv').config();
const db = require('../config/database');

async function createPasswordResetTable() {
  try {
    console.log('🔧 Création de la table password_reset_tokens...');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(createTableQuery);
    console.log('✅ Table password_reset_tokens créée avec succès');

    // Créer les index
    console.log('🔧 Création des index...');
    
    await db.query('CREATE INDEX IF NOT EXISTS idx_token ON password_reset_tokens(token);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_id ON password_reset_tokens(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_expires_at ON password_reset_tokens(expires_at);');
    
    console.log('✅ Index créés avec succès');

    // Afficher les tables existantes
    const [tables] = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Tables existantes:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

createPasswordResetTable();
