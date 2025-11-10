const { pool } = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Starting database migration...\n');

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'src', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📝 Executing schema.sql...');
    
    // Execute schema
    await pool.query(schema);

    console.log('✅ Schema created successfully!\n');

    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📊 Tables created:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check initial data
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const campaignsCount = await pool.query('SELECT COUNT(*) FROM campaigns');

    console.log('\n📈 Initial data:');
    console.log(`  - Users: ${usersCount.rows[0].count}`);
    console.log(`  - Campaigns: ${campaignsCount.rows[0].count}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n👤 Default admin account:');
    console.log('   Email: admin@kolo.com');
    console.log('   Password: Admin@2025');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
