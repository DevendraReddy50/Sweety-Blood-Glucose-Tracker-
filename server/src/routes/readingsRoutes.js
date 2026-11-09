const express = require('express');
const router = express.Router();
const readingsController = require('../controllers/readingsController');
const { authenticateToken } = require('../middleware/auth');

// All reading routes are protected
router.use(authenticateToken);

router.get('/', readingsController.getReadings);
router.get('/:id', readingsController.getReadingById);
router.post('/', readingsController.createReading);
router.put('/:id', readingsController.updateReading);
router.delete('/:id', readingsController.deleteReading);

module.exports = router;
