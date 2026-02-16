require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

(async () => {
  try {
    // Fix ticket 157
    await pool.query(
      "UPDATE tickets SET ticket_number = 'KVU-03' WHERE id = 157"
    );
    console.log('✅ Fixed ticket 157: 1 -> KVU-03');
    
    // Verify
    const result = await pool.query(
      'SELECT id, ticket_number, user_id FROM tickets WHERE campaign_id = 28 ORDER BY ticket_number'
    );
    console.log('📝 Final tickets:', result.rows);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
})();
