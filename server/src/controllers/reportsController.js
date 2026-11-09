const { generateReports } = require('../services/reportsService');

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getReports(req, res, next) {
  try {
    const userId = req.user.id;
    let selectedDate = req.query.date || getTodayString();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return res.status(400).json({ error: 'Date must be formatted as YYYY-MM-DD.' });
    }

    const reports = await generateReports(userId, selectedDate);
    return res.status(200).json(reports);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReports,
};
