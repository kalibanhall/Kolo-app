const pool = require('../../src/config/database');

(async () => {
  try {
    // Liste des tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('Tables:', tables.rows.map(r => r.table_name));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
