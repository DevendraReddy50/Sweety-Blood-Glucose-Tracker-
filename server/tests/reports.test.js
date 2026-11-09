const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { getReportDateRanges, calculateStats } = require('../src/services/reportsService');

describe('Reports Calculations & Edge Cases', () => {
  let token;
  let userId;

  beforeAll(async () => {
    process.env.USE_PG_MEM = 'true';

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Reports Tester',
        email: 'reportstester@sweety.com',
        password: 'Password123!',
      });

    token = res.body.token;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    await db.close();
  });

  describe('calculateStats unit tests', () => {
    it('returns empty stats for empty array', () => {
      const stats = calculateStats([]);
      expect(stats).toEqual({
        highest: null,
        lowest: null,
        average: null,
        count: 0,
      });
    });

    it('calculates highest, lowest, and rounds average to 1 decimal place', () => {
      // 100, 105, 110 -> sum 315 / 3 = 105.0
      expect(calculateStats([100, 105, 110])).toEqual({
        highest: 110,
        lowest: 100,
        average: 105,
        count: 3,
      });

      // 100, 101, 103 -> sum 304 / 3 = 101.333... -> 101.3
      expect(calculateStats([100, 101, 103])).toEqual({
        highest: 103,
        lowest: 100,
        average: 101.3,
        count: 3,
      });

      // 100, 100, 105 -> sum 305 / 3 = 101.666... -> 101.7
      expect(calculateStats([100, 100, 105])).toEqual({
        highest: 105,
        lowest: 100,
        average: 101.7,
        count: 3,
      });
    });
  });

  describe('getReportDateRanges edge cases', () => {
    it('handles standard month (e.g. 15 Oct 2026)', () => {
      const ranges = getReportDateRanges('2026-10-15');
      expect(ranges.dailyDate).toBe('2026-10-15');
      expect(ranges.mtd).toEqual({
        startDate: '2026-10-01',
        endDate: '2026-10-15',
      });
      expect(ranges.previousMonth).toEqual({
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        label: 'September 2026',
      });
    });

    it('handles January edge case: previous month is December of prior year', () => {
      const ranges = getReportDateRanges('2026-01-15');
      expect(ranges.dailyDate).toBe('2026-01-15');
      expect(ranges.mtd).toEqual({
        startDate: '2026-01-01',
        endDate: '2026-01-15',
      });
      expect(ranges.previousMonth).toEqual({
        startDate: '2025-12-01',
        endDate: '2025-12-31',
        label: 'December 2025',
      });
    });

    it('handles leap year edge case (March 2024 -> Feb 29 days)', () => {
      const ranges = getReportDateRanges('2024-03-10');
      expect(ranges.previousMonth).toEqual({
        startDate: '2024-02-01',
        endDate: '2024-02-29',
        label: 'February 2024',
      });
    });
  });

  describe('GET /api/reports endpoint integration', () => {
    it('returns empty state when no readings exist for given date', async () => {
      const res = await request(app)
        .get('/api/reports?date=2026-05-10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.daily.count).toBe(0);
      expect(res.body.daily.highest).toBeNull();
      expect(res.body.daily.lowest).toBeNull();
      expect(res.body.daily.average).toBeNull();
      expect(res.body.daily.readings).toEqual([]);

      expect(res.body.monthToDate.count).toBe(0);
      expect(res.body.monthToDate.average).toBeNull();

      expect(res.body.monthly.count).toBe(0);
      expect(res.body.monthly.average).toBeNull();
    });

    it('accurately calculates Daily, MTD, and Previous Month stats', async () => {
      const targetDate = '2026-10-15';

      // 1. Previous Month (September 2026): 2 readings
      await request(app).post('/api/readings').set('Authorization', `Bearer ${token}`).send({
        date: '2026-09-05',
        slot: 'Morning (fasting)',
        value: 100,
      });
      await request(app).post('/api/readings').set('Authorization', `Bearer ${token}`).send({
        date: '2026-09-25',
        slot: 'After dinner',
        value: 150,
      });

      // 2. MTD prior to target date (Oct 1 to Oct 14): 1 reading
      await request(app).post('/api/readings').set('Authorization', `Bearer ${token}`).send({
        date: '2026-10-05',
        slot: 'Morning (fasting)',
        value: 90,
      });

      // 3. Target Date (Oct 15): 2 readings
      await request(app).post('/api/readings').set('Authorization', `Bearer ${token}`).send({
        date: targetDate,
        slot: 'Morning (fasting)',
        value: 95,
      });
      await request(app).post('/api/readings').set('Authorization', `Bearer ${token}`).send({
        date: targetDate,
        slot: 'After lunch',
        value: 135,
      });

      // 4. Later in same month (Oct 20) -> should NOT be included in MTD up to Oct 15
      await request(app).post('/api/readings').set('Authorization', `Bearer ${token}`).send({
        date: '2026-10-20',
        slot: 'Morning (fasting)',
        value: 200,
      });

      const res = await request(app)
        .get(`/api/reports?date=${targetDate}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // Daily Report: 95 and 135
      // highest: 135, lowest: 95, sum: 230 / 2 = 115.0
      expect(res.body.daily.count).toBe(2);
      expect(res.body.daily.highest).toBe(135);
      expect(res.body.daily.lowest).toBe(95);
      expect(res.body.daily.average).toBe(115);
      expect(res.body.daily.readings.length).toBe(2);
      expect(res.body.daily.readings[0].slot).toBe('Morning (fasting)');
      expect(res.body.daily.readings[1].slot).toBe('After lunch');

      // Month-to-Date Report (Oct 1 to Oct 15): 90, 95, 135
      // highest: 135, lowest: 90, sum: 320 / 3 = 106.666... -> 106.7
      expect(res.body.monthToDate.count).toBe(3);
      expect(res.body.monthToDate.highest).toBe(135);
      expect(res.body.monthToDate.lowest).toBe(90);
      expect(res.body.monthToDate.average).toBe(106.7);

      // Previous Month Report (Sep 1 to Sep 30): 100, 150
      // highest: 150, lowest: 100, sum: 250 / 2 = 125.0
      expect(res.body.monthly.count).toBe(2);
      expect(res.body.monthly.highest).toBe(150);
      expect(res.body.monthly.lowest).toBe(100);
      expect(res.body.monthly.average).toBe(125);
      expect(res.body.monthly.label).toBe('September 2026');
    });
  });
});
