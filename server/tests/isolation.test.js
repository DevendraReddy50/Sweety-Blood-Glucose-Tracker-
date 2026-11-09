const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Tenant Isolation (User A vs User B)', () => {
  let userAToken, userAId;
  let userBToken, userBId;
  let userAReadingId;

  beforeAll(async () => {
    process.env.USE_PG_MEM = 'true';

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User A',
        email: 'user_a@sweety.com',
        password: 'Password123!',
      });
    userAToken = resA.body.token;
    userAId = resA.body.user.id;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User B',
        email: 'user_b@sweety.com',
        password: 'Password123!',
      });
    userBToken = resB.body.token;
    userBId = resB.body.user.id;

    // User A creates a reading
    const readingRes = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        date: '2026-10-15',
        slot: 'Morning (fasting)',
        value: 110,
      });
    userAReadingId = readingRes.body.reading.id;
  });

  afterAll(async () => {
    await db.close();
  });

  it('User B cannot see User A reading by ID', async () => {
    const res = await request(app)
      .get(`/api/readings/${userAReadingId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Reading not found.');
  });

  it('User B reading list does not include User A readings', async () => {
    const res = await request(app)
      .get('/api/readings')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.readings.length).toBe(0);
    expect(res.body.pagination.total).toBe(0);
  });

  it('User B cannot update User A reading', async () => {
    const res = await request(app)
      .put(`/api/readings/${userAReadingId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        date: '2026-10-15',
        slot: 'Morning (fasting)',
        value: 125,
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Reading not found.');

    // Verify User A reading was not modified
    const checkRes = await request(app)
      .get(`/api/readings/${userAReadingId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(checkRes.body.reading.value).toBe(110);
  });

  it('User B cannot delete User A reading', async () => {
    const res = await request(app)
      .delete(`/api/readings/${userAReadingId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Reading not found.');

    // Verify User A reading still exists
    const checkRes = await request(app)
      .get(`/api/readings/${userAReadingId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(checkRes.status).toBe(200);
  });

  it('User B reports do not include User A readings', async () => {
    const res = await request(app)
      .get('/api/reports?date=2026-10-15')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.daily.count).toBe(0);
    expect(res.body.monthToDate.count).toBe(0);
    expect(res.body.monthly.count).toBe(0);
  });

  it('User B can add the same slot and date without conflict with User A', async () => {
    // Both users can have 'Morning (fasting)' on '2026-10-15'
    const res = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        date: '2026-10-15',
        slot: 'Morning (fasting)',
        value: 95,
      });

    expect(res.status).toBe(201);
    expect(res.body.reading.value).toBe(95);

    // Verify User B's daily report now shows 1 reading
    const reportRes = await request(app)
      .get('/api/reports?date=2026-10-15')
      .set('Authorization', `Bearer ${userBToken}`);
    expect(reportRes.body.daily.count).toBe(1);
    expect(reportRes.body.daily.average).toBe(95);

    // Verify User A's daily report still shows their own 1 reading (value 110)
    const reportResA = await request(app)
      .get('/api/reports?date=2026-10-15')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(reportResA.body.daily.count).toBe(1);
    expect(reportResA.body.daily.average).toBe(110);
  });
});
