const pool = require('../../src/config/database');

(async () => {
  try {
    // Marquer les achats pending de plus de 30 minutes comme expirés
    const result = await pool.query(`
      UPDATE purchases 
      SET payment_status = 'expired' 
      WHERE payment_status = 'pending' 
        AND created_at < NOW() - INTERVAL '30 minutes' 
      RETURNING id, user_id, created_at
    `);
    
    console.log(`Expired ${result.rows.length} purchases:`, result.rows);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
