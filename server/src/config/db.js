const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

let pool;
let isPgMem = false;
let memDb = null;

function setupPgMem() {
  const { newDb, DataType } = require('pg-mem');
  memDb = newDb();

  // Register gen_random_uuid for pgcrypto as impure (random) function
  memDb.registerExtension('pgcrypto', (schema) => {
    schema.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.text,
      impure: true,
      implementation: () => crypto.randomUUID(),
    });
  });

  // Also support default gen_random_uuid in public schema
  memDb.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.text,
    impure: true,
    implementation: () => crypto.randomUUID(),
  });

  // Support to_char function
  memDb.public.registerFunction({
    name: 'to_char',
    args: [DataType.date, DataType.text],
    returns: DataType.text,
    implementation: (d, fmt) => {
      if (!d) return null;
      if (typeof d === 'string') return d.slice(0, 10);
      const dateObj = new Date(d);
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    },
  });

  // Apply initial migration
  const migrationPath = path.resolve(__dirname, '../migrations/001_init.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  memDb.public.none(migrationSql);

  const adapter = memDb.adapters.createPg();
  pool = new adapter.Pool();
  isPgMem = true;
  return pool;
}

function getPool() {
  if (pool) {
    return pool;
  }

  // Use pg-mem if explicitly requested, or if running in test environment without a real PG database URL
  if (process.env.USE_PG_MEM === 'true' || (process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL_TEST)) {
    return setupPgMem();
  }

  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sweety_db';
  pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  return pool;
}

async function query(text, params) {
  const currentPool = getPool();
  return currentPool.query(text, params);
}

async function getClient() {
  const currentPool = getPool();
  return currentPool.connect();
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

async function resetDb() {
  if (isPgMem) {
    setupPgMem();
  } else {
    await query('TRUNCATE TABLE readings, users RESTART IDENTITY CASCADE;');
  }
}

module.exports = {
  getPool,
  query,
  getClient,
  close,
  resetDb,
  setupPgMem,
};
