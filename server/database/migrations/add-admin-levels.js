/**
 * Migration: Add admin_level column and admin_validations table
 * 
 * Admin Levels:
 *   1 - Operateur: Campagnes + Promos (creation avec validation)
 *   2 - Superviseur: Transactions + Tirages (consultation, lancement avec validation)
 *   3 - Administrateur General: Full Access
 * 
 * Run: node server/database/migrations/add-admin-levels.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add admin_level column to users table (default 3 for existing admins)
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT NULL
      CHECK (admin_level IS NULL OR admin_level IN (1, 2, 3))
    `);

    // 2. Set existing admins to level 3 (full access)
    await client.query(`
      UPDATE users SET admin_level = 3 WHERE is_admin = TRUE AND admin_level IS NULL
    `);

    // 3. Create admin_validations table for approval workflows
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_validations (
        id SERIAL PRIMARY KEY,
        requested_by INTEGER NOT NULL REFERENCES users(id),
        validated_by INTEGER REFERENCES users(id),
        action_type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER,
        payload JSONB,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        validated_at TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_validations_status ON admin_validations(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_validations_requested_by ON admin_validations(requested_by)
    `);

    await client.query('COMMIT');
    console.log('Migration successful: admin_level + admin_validations added');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
