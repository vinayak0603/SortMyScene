const express = require('express');
const router = express.Router();
const { createBooking } = require('../controllers/bookingController');
const authMiddleware = require('../middleware/auth');

router.post('/bookings', authMiddleware, createBooking);

module.exports = router;
