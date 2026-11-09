const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { getPool, close } = require('../config/db');

const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@sweety.com',
  password: 'Demo@1234',
};

const SLOTS_CONFIG = [
  { slot: 'Morning (fasting)', min: 75, max: 105 },
  { slot: 'After breakfast', min: 110, max: 145 },
  { slot: 'After lunch', min: 120, max: 160 },
  { slot: 'After dinner', min: 115, max: 155 },
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function seed(options = {}) {
  console.log('🌱 Starting Sweety database seed...');
  const pool = getPool();

  try {
    // 1. Ensure migrations are applied
    const migrationFile = path.resolve(__dirname, '../migrations/001_init.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    try {
      await pool.query(sql);
    } catch (migErr) {
      // In pg-mem or existing DB, tables might already exist
    }

    // 2. Create or find demo user
    let userId;
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [DEMO_USER.email]);

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      console.log(`ℹ️  Demo user already exists: ${DEMO_USER.email} (ID: ${userId})`);
    } else {
      const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
      const userRes = await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        [DEMO_USER.name, DEMO_USER.email, passwordHash]
      );
      userId = userRes.rows[0].id;
      console.log(`✅ Created demo user: ${DEMO_USER.email} / ${DEMO_USER.password}`);
    }

    // 3. Generate sample readings across the last 60 days
    console.log('📊 Generating sample readings across the last 2 months (60 days)...');
    let insertedCount = 0;
    const today = new Date();

    for (let dayOffset = 60; dayOffset >= 0; dayOffset--) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() - dayOffset);
      const dateStr = formatDate(currentDate);

      // Select 2 to 4 random slots for each day
      const numReadings = getRandomInt(2, 4);
      // Shuffle slots and pick first numReadings
      const shuffledSlots = [...SLOTS_CONFIG].sort(() => 0.5 - Math.random()).slice(0, numReadings);

      for (const slotConfig of shuffledSlots) {
        const glucoseValue = getRandomInt(slotConfig.min, slotConfig.max);

        const res = await pool.query(
          `INSERT INTO readings (user_id, date, slot, value)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, date, slot) DO NOTHING
           RETURNING id`,
          [userId, dateStr, slotConfig.slot, glucoseValue]
        );

        if (res.rows.length > 0) {
          insertedCount++;
        }
      }
    }

    console.log(`🎉 Seed complete! Added ${insertedCount} readings for ${DEMO_USER.email}.`);
    console.log('----------------------------------------------------');
    console.log('Demo Login Credentials:');
    console.log(`Email:    ${DEMO_USER.email}`);
    console.log(`Password: ${DEMO_USER.password}`);
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    if (!options.keepOpen) {
      process.exit(1);
    }
    throw err;
  } finally {
    if (!options.keepOpen) {
      await close();
    }
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed, DEMO_USER };
