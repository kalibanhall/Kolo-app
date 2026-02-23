#!/bin/bash
cd /var/www/kolo/server
node -e "
const { Pool } = require('pg');
const p = new Pool({ host:'localhost', user:'kolo', password:'vH3ahOqlCRi5QVUj6cSMfzEh', database:'kolo_db' });
(async () => {
  const r = await p.query('SELECT id, title, image_url IS NOT NULL as has_image, prize_images IS NOT NULL as has_prize_images, CASE WHEN prize_images IS NOT NULL THEN length(prize_images::text) ELSE 0 END as prize_images_length FROM campaigns');
  r.rows.forEach(c => console.log(JSON.stringify(c)));
  await p.end();
})();
"
