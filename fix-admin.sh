#!/bin/bash
cd /var/www/kolo/server
DB_URL=$(grep DATABASE_URL .env | cut -d= -f2-)

echo "=== Current users ==="
psql "$DB_URL" -c "SELECT id, email, name, is_admin, admin_level FROM users;"

echo ""
echo "=== Resetting admin password ==="
node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: '$DB_URL' });

(async () => {
  const hash = await bcrypt.hash('Admin@2025', 10);
  
  // Update existing admin or create new one
  const existing = await pool.query('SELECT id FROM users WHERE email = \$1', ['admin@kolo.com']);
  
  if (existing.rows.length > 0) {
    await pool.query('UPDATE users SET password_hash = \$1, is_admin = true, admin_level = 3, is_active = true, email_verified = true WHERE email = \$2', [hash, 'admin@kolo.com']);
    console.log('Admin password updated');
  } else {
    await pool.query('INSERT INTO users (email, password_hash, name, phone, is_admin, admin_level, is_active, email_verified) VALUES (\$1, \$2, \$3, \$4, true, 3, true, true)', ['admin@kolo.com', hash, 'Administrateur L3', '+243000000000']);
    console.log('Admin created');
  }
  
  const user = await pool.query('SELECT id, email, name, is_admin, admin_level, is_active, email_verified FROM users WHERE email = \$1', ['admin@kolo.com']);
  console.log('Admin account:', JSON.stringify(user.rows[0], null, 2));
  
  await pool.end();
})();
"

echo ""
echo "=== DONE ==="
