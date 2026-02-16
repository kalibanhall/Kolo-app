const pool = require('../../src/config/database');

(async () => {
  try {
    // Vérifier les achats Afrimoney
    const purchases = await pool.query(`
      SELECT * FROM purchases 
      WHERE payment_provider ILIKE '%afrimoney%' 
      ORDER BY created_at DESC LIMIT 5
    `);
    console.log('=== ACHATS AFRIMONEY ===');
    console.log(JSON.stringify(purchases.rows, null, 2));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
