const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Auth Endpoints & Security', () => {
  beforeAll(async () => {
    process.env.USE_PG_MEM = 'true';
  });

  afterAll(async () => {
    await db.close();
  });

  const testUser = {
    name: 'Alice Springs',
    email: 'alice@sweety.com',
    password: 'Password123!',
  };

  it('registers a new user successfully and returns a JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.name).toBe(testUser.name);
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user).not.toHaveProperty('password');
    expect(res.body.user).not.toHaveProperty('password_hash');

    // Verify password is encrypted in database
    const dbUser = await db.query('SELECT password_hash FROM users WHERE email = $1', [testUser.email]);
    expect(dbUser.rows.length).toBe(1);
    expect(dbUser.rows[0].password_hash).not.toBe(testUser.password);
    expect(dbUser.rows[0].password_hash.startsWith('$2')).toBe(true);
  });

  it('rejects registration with duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Duplicate',
        email: testUser.email,
        password: 'AnotherPassword456',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('rejects registration with invalid or missing fields', async () => {
    const res1 = await request(app).post('/api/auth/register').send({ email: 'bad@test.com', password: '123' });
    expect(res1.status).toBe(400);

    const res2 = await request(app).post('/api/auth/register').send({ name: 'Bob', email: 'not-an-email', password: 'Password123' });
    expect(res2.status).toBe(400);

    const res3 = await request(app).post('/api/auth/register').send({ name: 'Bob', email: 'bob@test.com', password: '123' });
    expect(res3.status).toBe(400);
  });

  it('logs in successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('rejects login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password.');
  });

  it('rejects login with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@sweety.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password.');
  });

  it('allows access to /api/auth/me with valid Bearer token', async () => {
    // First login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(testUser.email);
  });

  it('rejects /api/auth/me when token is missing or malformed', async () => {
    const res1 = await request(app).get('/api/auth/me');
    expect(res1.status).toBe(401);

    const res2 = await request(app).get('/api/auth/me').set('Authorization', 'InvalidFormatToken');
    expect(res2.status).toBe(401);

    const res3 = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid.jwt.token');
    expect(res3.status).toBe(401);
  });
});
