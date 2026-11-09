const db = require('../config/db');
const { validateReading } = require('../services/validationService');

// Format date to YYYY-MM-DD
function formatDate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatReading(r) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    date: formatDate(r.date),
    slot: r.slot,
    value: r.value,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function getReadings(req, res, next) {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { date, startDate, endDate } = req.query;

    const conditions = ['user_id = $1'];
    const params = [userId];

    if (date) {
      params.push(date);
      conditions.push(`date = $${params.length}`);
    } else {
      if (startDate) {
        params.push(startDate);
        conditions.push(`date >= $${params.length}`);
      }
      if (endDate) {
        params.push(endDate);
        conditions.push(`date <= $${params.length}`);
      }
    }

    const whereClause = conditions.join(' AND ');

    // Total count query
    const countRes = await db.query(
      `SELECT COUNT(*)::int AS total FROM readings WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].total, 10);

    // Readings query with slot chronological ordering
    const queryParams = [...params, limit, offset];
    const readingsQuery = `
      SELECT 
        id, 
        user_id, 
        date, 
        slot, 
        value, 
        created_at, 
        updated_at
      FROM readings
      WHERE ${whereClause}
      ORDER BY 
        date DESC,
        CASE slot
          WHEN 'Morning (fasting)' THEN 1
          WHEN 'After breakfast' THEN 2
          WHEN 'After lunch' THEN 3
          WHEN 'After dinner' THEN 4
          ELSE 5
        END ASC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const result = await db.query(readingsQuery, queryParams);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      readings: result.rows.map(formatReading),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getReadingById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      `SELECT id, user_id, date, slot, value, created_at, updated_at
       FROM readings
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reading not found.' });
    }

    return res.status(200).json({
      reading: formatReading(result.rows[0]),
    });
  } catch (err) {
    next(err);
  }
}

async function createReading(req, res, next) {
  try {
    const userId = req.user.id;
    const { date, slot, value } = req.body;

    const validation = await validateReading({
      userId,
      date,
      slot,
      value,
    });

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { date: validDate, slot: validSlot, value: validValue } = validation.data;

    try {
      const insertRes = await db.query(
        `INSERT INTO readings (user_id, date, slot, value)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, date, slot, value, created_at, updated_at`,
        [userId, validDate, validSlot, validValue]
      );

      return res.status(201).json({
        message: 'Reading added successfully.',
        reading: formatReading(insertRes.rows[0]),
      });
    } catch (dbErr) {
      // Check for unique constraint violation in case of concurrent requests
      if (dbErr.code === '23505' || (dbErr.message && dbErr.message.includes('unique_user_date_slot'))) {
        const article = /^[aeiou]/i.test(validSlot) ? 'an' : 'a';
        return res.status(400).json({
          error: `You already have ${article} ${validSlot} reading for this date.`,
        });
      }
      throw dbErr;
    }
  } catch (err) {
    next(err);
  }
}

async function updateReading(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { date, slot, value } = req.body;

    // Check if reading exists and belongs to user
    const existing = await db.query(
      'SELECT id, date, slot, value FROM readings WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Reading not found.' });
    }

    // Re-run validation excluding this reading
    const validation = await validateReading({
      userId,
      date,
      slot,
      value,
      excludeReadingId: id,
    });

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { date: validDate, slot: validSlot, value: validValue } = validation.data;

    const updateRes = await db.query(
      `UPDATE readings
       SET date = $1, slot = $2, value = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING id, user_id, date, slot, value, created_at, updated_at`,
      [validDate, validSlot, validValue, id, userId]
    );

    return res.status(200).json({
      message: 'Reading updated successfully.',
      reading: formatReading(updateRes.rows[0]),
    });
  } catch (err) {
    next(err);
  }
}

async function deleteReading(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      'DELETE FROM readings WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reading not found.' });
    }

    return res.status(200).json({
      message: 'Reading deleted successfully.',
      id,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReadings,
  getReadingById,
  createReading,
  updateReading,
  deleteReading,
};
