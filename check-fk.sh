#!/bin/bash
cd /var/www/kolo/server
node -e "
const { Pool } = require('pg');
const pool = new Pool({ host:'localhost', user:'kolo', password:'vH3ahOqlCRi5QVUj6cSMfzEh', database:'kolo_db' });
(async () => {
  const r = await pool.query(\`SELECT tc.table_name, kcu.column_name, rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'campaigns'\`);
  console.log('FK referencing campaigns:');
  r.rows.forEach(r => console.log('  ' + r.table_name + '.' + r.column_name + ' ON DELETE ' + r.delete_rule));

  const r2 = await pool.query(\`SELECT tc.table_name, kcu.column_name, rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'promo_codes'\`);
  console.log('FK referencing promo_codes:');
  r2.rows.forEach(r => console.log('  ' + r.table_name + '.' + r.column_name + ' ON DELETE ' + r.delete_rule));
  
  await pool.end();
})();
"
