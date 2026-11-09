const db = require('../src/config/db');

describe('Database Connection & Migrations', () => {
  beforeAll(async () => {
    process.env.USE_PG_MEM = 'true';
  });

  afterAll(async () => {
    await db.close();
  });

  it('initializes tables properly and allows insert/query', async () => {
    const userRes = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email',
      ['Test User', 'test@sweety.com', 'hashedpass']
    );

    expect(userRes.rows.length).toBe(1);
    expect(userRes.rows[0].email).toBe('test@sweety.com');
    const userId = userRes.rows[0].id;

    const readingRes = await db.query(
      'INSERT INTO readings (user_id, date, slot, value) VALUES ($1, $2, $3, $4) RETURNING id, value',
      [userId, '2026-10-15', 'Morning (fasting)', 95]
    );

    expect(readingRes.rows.length).toBe(1);
    expect(readingRes.rows[0].value).toBe(95);
  });

  it('enforces unique constraint on user_id, date, slot', async () => {
    const userRes = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      ['Unique Tester', 'unique@sweety.com', 'hashedpass']
    );
    const userId = userRes.rows[0].id;

    await db.query(
      'INSERT INTO readings (user_id, date, slot, value) VALUES ($1, $2, $3, $4)',
      [userId, '2026-10-15', 'After lunch', 130]
    );

    await expect(
      db.query(
        'INSERT INTO readings (user_id, date, slot, value) VALUES ($1, $2, $3, $4)',
        [userId, '2026-10-15', 'After lunch', 140]
      )
    ).rejects.toThrow();
  });
});
