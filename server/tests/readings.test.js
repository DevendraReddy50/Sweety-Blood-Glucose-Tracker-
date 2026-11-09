const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Readings CRUD Endpoints', () => {
  let token;
  let userId;

  beforeAll(async () => {
    process.env.USE_PG_MEM = 'true';

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'CRUD Tester',
        email: 'crudtester@sweety.com',
        password: 'Password123!',
      });

    token = res.body.token;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    await db.close();
  });

  let createdId;

  it('creates a reading successfully', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-10-01',
        slot: 'Morning (fasting)',
        value: 105,
      });

    expect(res.status).toBe(201);
    expect(res.body.reading).toHaveProperty('id');
    expect(res.body.reading.value).toBe(105);
    expect(res.body.reading.slot).toBe('Morning (fasting)');
    expect(res.body.reading.date).toBe('2026-10-01');
    createdId = res.body.reading.id;
  });

  it('fetches reading by id', async () => {
    const res = await request(app)
      .get(`/api/readings/${createdId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.reading.id).toBe(createdId);
    expect(res.body.reading.value).toBe(105);
  });

  it('returns 404 for nonexistent reading id', async () => {
    const res = await request(app)
      .get('/api/readings/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('updates reading value', async () => {
    const res = await request(app)
      .put(`/api/readings/${createdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-10-01',
        slot: 'Morning (fasting)',
        value: 112,
      });

    expect(res.status).toBe(200);
    expect(res.body.reading.value).toBe(112);
  });

  it('supports pagination on GET /api/readings', async () => {
    // Add 2 more readings
    await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-10-02', slot: 'Morning (fasting)', value: 98 });

    await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-10-03', slot: 'Morning (fasting)', value: 102 });

    const page1Res = await request(app)
      .get('/api/readings?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(page1Res.status).toBe(200);
    expect(page1Res.body.readings.length).toBe(2);
    expect(page1Res.body.pagination.total).toBe(3);
    expect(page1Res.body.pagination.page).toBe(1);
    expect(page1Res.body.pagination.totalPages).toBe(2);
    expect(page1Res.body.pagination.hasNext).toBe(true);

    const page2Res = await request(app)
      .get('/api/readings?page=2&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(page2Res.status).toBe(200);
    expect(page2Res.body.readings.length).toBe(1);
    expect(page2Res.body.pagination.page).toBe(2);
    expect(page2Res.body.pagination.hasPrev).toBe(true);
    expect(page2Res.body.pagination.hasNext).toBe(false);
  });

  it('deletes reading by id', async () => {
    const res = await request(app)
      .delete(`/api/readings/${createdId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const checkRes = await request(app)
      .get(`/api/readings/${createdId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(checkRes.status).toBe(404);
  });
});
