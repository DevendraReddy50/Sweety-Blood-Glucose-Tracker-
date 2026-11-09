const db = require('../config/db');

const ALLOWED_SLOTS = [
  'Morning (fasting)',
  'After breakfast',
  'After lunch',
  'After dinner',
];

/**
 * Validates glucose reading inputs and business rules.
 * 
 * Rules enforced:
 * 1. Value required -> "Please enter a glucose value."
 * 2. Whole number 40-600 -> "Value must be between 40 and 600 mg/dl."
 * 3. Date not in the future -> "Date cannot be in the future."
 * 4. One reading per slot per day -> "You already have an <Slot> reading for this date."
 * 5. Max 4 readings per day -> "You can add only 4 readings per day."
 */
async function validateReading({ userId, date, slot, value, excludeReadingId = null, clientToday = null }) {
  // 1. Value required validation
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return { valid: false, error: 'Please enter a glucose value.' };
  }

  // 2. Whole number 40-600 validation
  const numValue = Number(value);
  if (isNaN(numValue) || !Number.isInteger(numValue) || numValue < 40 || numValue > 600) {
    return { valid: false, error: 'Value must be between 40 and 600 mg/dl.' };
  }

  // 3. Slot validation
  if (!slot || !ALLOWED_SLOTS.includes(slot)) {
    return { valid: false, error: 'Please select a valid time slot.' };
  }

  // 4. Date required and format validation
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { valid: false, error: 'A valid date in YYYY-MM-DD format is required.' };
  }

  // Date not in future validation
  // Get today's date in YYYY-MM-DD (support clientToday or server local/UTC)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const serverToday = `${year}-${month}-${day}`;
  const effectiveToday = clientToday || serverToday;

  if (date > effectiveToday) {
    return { valid: false, error: 'Date cannot be in the future.' };
  }

  // 5. Max 4 readings per day validation
  let countQuery = 'SELECT COUNT(*)::int as count FROM readings WHERE user_id = $1 AND date = $2';
  const countParams = [userId, date];

  if (excludeReadingId) {
    countQuery += ' AND id != $3';
    countParams.push(excludeReadingId);
  }

  const countRes = await db.query(countQuery, countParams);
  const existingCount = parseInt(countRes.rows[0].count, 10);

  if (existingCount >= 4) {
    return { valid: false, error: 'You can add only 4 readings per day.' };
  }

  // 6. One reading per slot per day validation
  let slotCheckQuery = 'SELECT id FROM readings WHERE user_id = $1 AND date = $2 AND slot = $3';
  const slotCheckParams = [userId, date, slot];

  if (excludeReadingId) {
    slotCheckQuery += ' AND id != $4';
    slotCheckParams.push(excludeReadingId);
  }

  const existingSlotRes = await db.query(slotCheckQuery, slotCheckParams);
  if (existingSlotRes.rows.length > 0) {
    const article = /^[aeiou]/i.test(slot) ? 'an' : 'a';
    return {
      valid: false,
      error: `You already have ${article} ${slot} reading for this date.`,
    };
  }

  return {
    valid: true,
    data: {
      userId,
      date,
      slot,
      value: numValue,
    },
  };
}

module.exports = {
  validateReading,
  ALLOWED_SLOTS,
};
