const Reservation = require('../models/Reservation');
const Seat = require('../models/Seat');
const Event = require('../models/Event');
const mongoose = require('mongoose');

// GET /api/my-tickets
const getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all reservations for this user, newest first
    const reservations = await Reservation.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    // Auto-expire any reservations that have passed their expiresAt
    const now = new Date();
    const expiredIds = reservations
      .filter(r => r.status === 'active' && r.expiresAt < now)
      .map(r => r._id);

    if (expiredIds.length > 0) {
      // Release seats back to available
      const expiredReservations = reservations.filter(r =>
        expiredIds.some(id => id.toString() === r._id.toString())
      );
      for (const r of expiredReservations) {
        await Seat.updateMany(
          { eventId: r.eventId, seatNumber: { $in: r.seatNumbers } },
          { status: 'available', reservationId: null }
        );
      }
      await Reservation.updateMany(
        { _id: { $in: expiredIds } },
        { status: 'expired' }
      );
    }

    // Re-fetch after expiry updates
    const updatedReservations = await Reservation.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    // Attach event details to each reservation
    const eventIds = [...new Set(updatedReservations.map(r => r.eventId.toString()))];
    const events = await Event.find({ _id: { $in: eventIds } }).lean();
    const eventMap = {};
    events.forEach(e => { eventMap[e._id.toString()] = e; });

    const tickets = updatedReservations.map(r => ({
      ...r,
      event: eventMap[r.eventId.toString()] || null
    }));

    // Split into categories
    const active    = tickets.filter(t => t.status === 'active');
    const booked    = tickets.filter(t => t.status === 'completed');
    const expired   = tickets.filter(t => t.status === 'expired');

    res.json({ active, booked, expired });
  } catch (err) {
    console.error('getMyTickets error:', err);
    res.status(500).json({ message: 'Failed to fetch your tickets.' });
  }
};

module.exports = { getMyTickets };
