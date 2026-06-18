const express = require('express');
const router = express.Router();
const { getMyTickets } = require('../controllers/myTicketsController');
const authMiddleware = require('../middleware/auth');

router.get('/my-tickets', authMiddleware, getMyTickets);

module.exports = router;
