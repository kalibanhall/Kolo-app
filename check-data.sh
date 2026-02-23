#!/bin/bash
cd /var/www/kolo/server
node -e "
const { Pool } = require('pg');
const p = new Pool({ host:'localhost', user:'kolo', password:'vH3ahOqlCRi5QVUj6cSMfzEh', database:'kolo_db' });
(async () => {
  // List campaigns
  const c = await p.query('SELECT id, title, status FROM campaigns ORDER BY id');
  console.log('=== CAMPAIGNS ===');
  c.rows.forEach(r => console.log('  id=' + r.id + ' title=' + r.title + ' status=' + r.status));

  // List promo codes
  const pc = await p.query('SELECT id, code, influencer_id, current_uses FROM promo_codes ORDER BY id');
  console.log('=== PROMO CODES ===');
  pc.rows.forEach(r => console.log('  id=' + r.id + ' code=' + r.code + ' influencer_id=' + r.influencer_id + ' uses=' + r.current_uses));

  // Check purchases referencing campaigns
  const pu = await p.query('SELECT campaign_id, COUNT(*) as cnt FROM purchases GROUP BY campaign_id');
  console.log('=== PURCHASES PER CAMPAIGN ===');
  pu.rows.forEach(r => console.log('  campaign_id=' + r.campaign_id + ' count=' + r.cnt));

  // Check promo_code_usage
  const u = await p.query('SELECT promo_code_id, COUNT(*) as cnt FROM promo_code_usage GROUP BY promo_code_id');
  console.log('=== PROMO USAGE ===');
  u.rows.forEach(r => console.log('  promo_code_id=' + r.promo_code_id + ' count=' + r.cnt));

  // Get admin token for API testing
  const bcrypt = require('bcryptjs');
  const admin = await p.query(\"SELECT id, email, password_hash, admin_level FROM users WHERE is_admin = TRUE ORDER BY admin_level DESC LIMIT 1\");
  if (admin.rows.length > 0) {
    console.log('=== ADMIN ===');
    console.log('  id=' + admin.rows[0].id + ' email=' + admin.rows[0].email + ' level=' + admin.rows[0].admin_level);
  }

  await p.end();
})();
"
