const app = require('./app');
const { getPool } = require('./config/db');

const PORT = process.env.PORT || 5000;

// Verify DB connection on startup
const pool = getPool();
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Connected to database successfully.');
    app.listen(PORT, () => {
      console.log(`🚀 Sweety backend server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  });
