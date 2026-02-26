const { query } = require('../server/src/config/database');
(async () => {
  try {
    const r1 = await query('SELECT id, action_type, status, requested_by FROM admin_validations ORDER BY created_at DESC LIMIT 10');
    console.log('VALIDATIONS:', JSON.stringify(r1.rows));
    const r2 = await query('SELECT id, name, admin_level, is_influencer FROM users WHERE is_admin = true OR is_influencer = true');
    console.log('USERS:', JSON.stringify(r2.rows));
    const r3 = await query('SELECT id, code, influencer_name, influencer_id, current_uses FROM promo_codes LIMIT 10');
    console.log('PROMOS:', JSON.stringify(r3.rows));    
    const r4 = await query('SELECT COUNT(*) as cnt FROM promo_code_usage');
    console.log('USAGE_COUNT:', JSON.stringify(r4.rows));
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();
