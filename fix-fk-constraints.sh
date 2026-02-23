#!/bin/bash
cd /var/www/kolo/server
node -e "
const { Pool } = require('pg');
const p = new Pool({ host:'localhost', user:'kolo', password:'vH3ahOqlCRi5QVUj6cSMfzEh', database:'kolo_db' });
(async () => {
  // Fix promo_code_usage.purchase_id FK to use ON DELETE SET NULL
  try {
    await p.query('ALTER TABLE promo_code_usage DROP CONSTRAINT IF EXISTS promo_code_usage_purchase_id_fkey');
    await p.query('ALTER TABLE promo_code_usage ADD CONSTRAINT promo_code_usage_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL');
    console.log('Fixed: promo_code_usage.purchase_id -> ON DELETE SET NULL');
  } catch(e) { console.error('Error fixing promo_code_usage FK:', e.message); }

  // Fix ticket_reservations.campaign_id FK to use ON DELETE CASCADE
  try {
    await p.query('ALTER TABLE ticket_reservations DROP CONSTRAINT IF EXISTS ticket_reservations_campaign_id_fkey');
    await p.query('ALTER TABLE ticket_reservations ADD CONSTRAINT ticket_reservations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE');
    console.log('Fixed: ticket_reservations.campaign_id -> ON DELETE CASCADE');
  } catch(e) { console.error('Error fixing ticket_reservations FK:', e.message); }

  // Fix purchases.promo_code_id FK to use ON DELETE SET NULL
  try {
    await p.query('ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_promo_code_id_fkey');
    await p.query('ALTER TABLE purchases ADD CONSTRAINT purchases_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL');
    console.log('Fixed: purchases.promo_code_id -> ON DELETE SET NULL');
  } catch(e) { console.error('Error fixing purchases FK:', e.message); }

  console.log('Done fixing FK constraints');
  await p.end();
})();
"
