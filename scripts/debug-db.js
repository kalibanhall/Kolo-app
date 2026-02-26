require('/var/www/kolo/server/node_modules/dotenv').config({ path: '/var/www/kolo/server/.env' });
const { query } = require('/var/www/kolo/server/src/config/database');
(async () => {
  // Check users referenced in validations entity_id
  const missing = await query('SELECT id, name, email, is_influencer, influencer_uid, is_active FROM users WHERE id IN (5, 8, 15)');
  console.log('MISSING_USERS:', JSON.stringify(missing.rows));
  // Check all users 
  const all = await query('SELECT id, name, email, is_influencer, influencer_uid FROM users ORDER BY id');
  console.log('ALL_USERS:', JSON.stringify(all.rows));
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
