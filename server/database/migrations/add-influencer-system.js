/**
 * Migration: Add influencer system
 * 
 * - Add is_influencer column to users table
 * - Add influencer_id FK to promo_codes table (links to user account)
 * - Add commission_rate to promo_codes (for influencer revenue tracking)
 * 
 * Run: node server/database/migrations/add-influencer-system.js
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

    // 1. Add is_influencer column to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_influencer BOOLEAN DEFAULT FALSE
    `);

    // 2. Add influencer_id FK to promo_codes (links promo to influencer user account)
    await client.query(`
      ALTER TABLE promo_codes 
      ADD COLUMN IF NOT EXISTS influencer_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);

    // 3. Add commission_rate to promo_codes (percentage the influencer earns per sale)
    await client.query(`
      ALTER TABLE promo_codes 
      ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0
    `);

    // 4. Create index for efficient influencer lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_influencer ON users(is_influencer) WHERE is_influencer = TRUE
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_promo_codes_influencer_id ON promo_codes(influencer_id)
    `);

    await client.query('COMMIT');
    console.log('Migration successful: influencer system added (is_influencer, influencer_id, commission_rate)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
