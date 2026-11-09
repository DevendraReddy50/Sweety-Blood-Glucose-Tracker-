const app = require('./app');
const { getPool, setupPgMem } = require('./config/db');
const { seed } = require('./seeds/seed');

const PORT = process.env.PORT || 5000;

async function start() {
  let pool = getPool();
  try {
    // Attempt connecting to real PostgreSQL
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL database successfully.');
  } catch (err) {
    console.warn(`⚠️ PostgreSQL connection failed (${err.message}).`);
    console.log('💡 Switching to in-memory PostgreSQL (pg-mem) for immediate testing...');
    process.env.USE_PG_MEM = 'true';
    pool = setupPgMem();
    console.log('🌱 Pre-seeding in-memory database with demo data (demo@sweety.com / Demo@1234)...');
    try {
      await seed();
      console.log('✅ In-memory database ready with 2 months sample readings.');
    } catch (seedErr) {
      console.error('Seed warning:', seedErr.message);
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 Sweety backend server running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });
}

start();

