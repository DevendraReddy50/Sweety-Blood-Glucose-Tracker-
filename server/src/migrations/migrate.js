const fs = require('fs');
const path = require('path');
const { getPool, close } = require('../config/db');

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  const pool = getPool();
  const migrationFile = path.resolve(__dirname, '001_init.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');

  try {
    await pool.query(sql);
    console.log('✅ Migrations applied successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await close();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
