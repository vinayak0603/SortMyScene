const express = require('express');
const router = express.Router();
const { reserveSeats } = require('../controllers/reservationController');
const authMiddleware = require('../middleware/auth');

router.post('/reserve', authMiddleware, reserveSeats);

module.exports = router;
