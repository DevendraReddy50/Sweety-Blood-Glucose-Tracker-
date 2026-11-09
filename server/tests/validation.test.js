const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Readings Validation Rules (All 5 Rules)', () => {
  let token;
  let userId;
  const testDate = '2026-10-15';

  beforeAll(async () => {
    process.env.USE_PG_MEM = 'true';

    // Register test user
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Validation Tester',
        email: 'valtester@sweety.com',
        password: 'Password123!',
      });

    token = res.body.token;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    await db.close();
  });

  // Rule 1: Value required -> "Please enter a glucose value."
  it('Rule 1: rejects when value is missing, null, or empty string', async () => {
    const res1 = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: testDate, slot: 'Morning (fasting)' });

    expect(res1.status).toBe(400);
    expect(res1.body.error).toBe('Please enter a glucose value.');

    const res2 = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: testDate, slot: 'Morning (fasting)', value: null });

    expect(res2.status).toBe(400);
    expect(res2.body.error).toBe('Please enter a glucose value.');

    const res3 = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: testDate, slot: 'Morning (fasting)', value: '   ' });

    expect(res3.status).toBe(400);
    expect(res3.body.error).toBe('Please enter a glucose value.');
  });

  // Rule 2: Whole number 40-600 -> "Value must be between 40 and 600 mg/dl."
  it('Rule 2: rejects values below 40, above 600, decimals, or non-numeric', async () => {
    const resBelow = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: testDate, slot: 'Morning (fasting)', value: 39 });

    expect(resBelow.status).toBe(400);
    expect(resBelow.body.error).toBe('Value must be between 40 and 600 mg/dl.');

    const resAbove = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: testDate, slot: 'Morning (fasting)', value: 601 });

    expect(resAbove.status).toBe(400);
    expect(resAbove.body.error).toBe('Value must be between 40 and 600 mg/dl.');

    const resDecimal = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: testDate, slot: 'Morning (fasting)', value: 120.5 });

    expect(resDecimal.status).toBe(400);
    expect(resDecimal.body.error).toBe('Value must be between 40 and 600 mg/dl.');

    const resString = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: testDate, slot: 'Morning (fasting)', value: 'high' });

    expect(resString.status).toBe(400);
    expect(resString.body.error).toBe('Value must be between 40 and 600 mg/dl.');
  });

  // Rule 3: Date not in the future -> "Date cannot be in the future."
  it('Rule 3: rejects dates in the future', async () => {
    // 2099-12-31 is definitely in the future
    const resFuture = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2099-12-31', slot: 'Morning (fasting)', value: 110 });

    expect(resFuture.status).toBe(400);
    expect(resFuture.body.error).toBe('Date cannot be in the future.');
  });

  // Rule 4: One reading per slot per day -> "You already have an After lunch reading for this date."
  it('Rule 4: rejects duplicate slot on the same day with exact slot name', async () => {
    const slot = 'After lunch';

    // Add first reading
    const firstRes = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: testDate, slot, value: 140 });

    expect(firstRes.status).toBe(201);

    // Try adding duplicate slot
    const dupRes = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: testDate, slot, value: 145 });

    expect(dupRes.status).toBe(400);
    expect(dupRes.body.error).toBe(`You already have an ${slot} reading for this date.`);
  });

  // Rule 5: Max 4 readings per day -> "You can add only 4 readings per day."
  it('Rule 5: rejects adding a 5th reading on the same day with max 4 message', async () => {
    // Add the remaining 3 slots for testDate: Morning (fasting), After breakfast, After dinner
    await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: testDate, slot: 'Morning (fasting)', value: 95 });

    await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: testDate, slot: 'After breakfast', value: 125 });

    await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: testDate, slot: 'After dinner', value: 135 });

    // Now all 4 slots are filled for testDate (4 readings total)
    // Attempting to add a 5th reading on this date must trigger max 4 rule
    const fifthRes = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: testDate, slot: 'Morning (fasting)', value: 100 });

    expect(fifthRes.status).toBe(400);
    expect(fifthRes.body.error).toBe('You can add only 4 readings per day.');
  });

  it('Editing re-runs validation excluding the reading being edited', async () => {
    const editDate = '2026-10-10';

    const createRes = await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: editDate, slot: 'After lunch', value: 135 });

    expect(createRes.status).toBe(201);
    const readingId = createRes.body.reading.id;

    // Updating value on the same slot and date should succeed (not conflict with itself)
    const updateRes = await request(app)
      .put(`/api/readings/${readingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: editDate, slot: 'After lunch', value: 142 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.reading.value).toBe(142);

    // Add a second reading on that date
    await request(app)
      .post('/api/readings')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: editDate, slot: 'Morning (fasting)', value: 98 });

    // Try editing readingId to 'Morning (fasting)', which already exists on editDate
    const conflictRes = await request(app)
      .put(`/api/readings/${readingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: editDate, slot: 'Morning (fasting)', value: 105 });

    expect(conflictRes.status).toBe(400);
    expect(conflictRes.body.error).toBe('You already have a Morning (fasting) reading for this date.');
  });
});
