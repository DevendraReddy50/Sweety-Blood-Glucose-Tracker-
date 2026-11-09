const db = require('../config/db');

function calculateStats(values) {
  if (!values || values.length === 0) {
    return {
      highest: null,
      lowest: null,
      average: null,
      count: 0,
    };
  }

  const count = values.length;
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const average = Math.round((sum / count) * 10) / 10;

  return {
    highest,
    lowest,
    average,
    count,
  };
}

function formatDate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Computes date ranges for Daily, Month-to-Date (MTD), and Previous Month reports.
 * 
 * Example for 2026-10-15:
 * - Daily: 2026-10-15
 * - MTD: 2026-10-01 to 2026-10-15
 * - Previous Month: 2026-09-01 to 2026-09-30
 * 
 * January edge case (e.g. 2026-01-15):
 * - Previous Month: 2025-12-01 to 2025-12-31
 */
function getReportDateRanges(selectedDateStr) {
  const parts = selectedDateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1]; // 1-12
  const day = parts[2];

  // Daily
  const dailyDate = selectedDateStr;

  // Month-to-Date (MTD)
  const mtdStartDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const mtdEndDate = selectedDateStr;

  // Previous Month
  let prevMonthYear;
  let prevMonthNum;

  if (month === 1) {
    prevMonthYear = year - 1;
    prevMonthNum = 12;
  } else {
    prevMonthYear = year;
    prevMonthNum = month - 1;
  }

  // Days in previous month (Day 0 of next month is last day of desired month)
  const lastDayOfPrevMonth = new Date(Date.UTC(prevMonthYear, prevMonthNum, 0)).getUTCDate();
  const prevMonthStartDate = `${prevMonthYear}-${String(prevMonthNum).padStart(2, '0')}-01`;
  const prevMonthEndDate = `${prevMonthYear}-${String(prevMonthNum).padStart(2, '0')}-${String(lastDayOfPrevMonth).padStart(2, '0')}`;
  const prevMonthLabel = `${MONTH_NAMES[prevMonthNum - 1]} ${prevMonthYear}`;

  return {
    dailyDate,
    mtd: {
      startDate: mtdStartDate,
      endDate: mtdEndDate,
    },
    previousMonth: {
      startDate: prevMonthStartDate,
      endDate: prevMonthEndDate,
      label: prevMonthLabel,
    },
  };
}

async function generateReports(userId, selectedDateStr) {
  const ranges = getReportDateRanges(selectedDateStr);

  // 1. Fetch Daily readings
  const dailyRes = await db.query(
    `SELECT 
       id, 
       user_id, 
       date, 
       slot, 
       value, 
       created_at
     FROM readings
     WHERE user_id = $1 AND date = $2
     ORDER BY 
       CASE slot
         WHEN 'Morning (fasting)' THEN 1
         WHEN 'After breakfast' THEN 2
         WHEN 'After lunch' THEN 3
         WHEN 'After dinner' THEN 4
         ELSE 5
       END ASC`,
    [userId, ranges.dailyDate]
  );

  const dailyReadings = dailyRes.rows.map(r => ({
    id: r.id,
    slot: r.slot,
    value: r.value,
    date: formatDate(r.date),
    createdAt: r.created_at,
  }));

  const dailyValues = dailyReadings.map(r => r.value);
  const dailyStats = calculateStats(dailyValues);

  // 2. Fetch Month-to-Date readings
  const mtdRes = await db.query(
    `SELECT value FROM readings
     WHERE user_id = $1 AND date >= $2 AND date <= $3`,
    [userId, ranges.mtd.startDate, ranges.mtd.endDate]
  );
  const mtdValues = mtdRes.rows.map(r => r.value);
  const mtdStats = calculateStats(mtdValues);

  // 3. Fetch Previous Month readings
  const prevMonthRes = await db.query(
    `SELECT value FROM readings
     WHERE user_id = $1 AND date >= $2 AND date <= $3`,
    [userId, ranges.previousMonth.startDate, ranges.previousMonth.endDate]
  );
  const prevMonthValues = prevMonthRes.rows.map(r => r.value);
  const prevMonthStats = calculateStats(prevMonthValues);

  return {
    selectedDate: selectedDateStr,
    daily: {
      date: ranges.dailyDate,
      ...dailyStats,
      readings: dailyReadings,
    },
    monthToDate: {
      startDate: ranges.mtd.startDate,
      endDate: ranges.mtd.endDate,
      ...mtdStats,
    },
    monthly: {
      startDate: ranges.previousMonth.startDate,
      endDate: ranges.previousMonth.endDate,
      label: ranges.previousMonth.label,
      ...prevMonthStats,
    },
  };
}

module.exports = {
  calculateStats,
  getReportDateRanges,
  generateReports,
};
