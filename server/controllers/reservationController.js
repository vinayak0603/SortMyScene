const mongoose = require('mongoose');
const Seat = require('../models/Seat');
const Reservation = require('../models/Reservation');

// POST /api/reserve
const reserveSeats = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { eventId, seatNumbers } = req.body;
    const userId = req.user.id;

    if (!eventId || !seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'eventId and seatNumbers[] are required.' });
    }

    // Atomically find and lock only the requested available seats
    const seats = await Seat.find({
      eventId,
      seatNumber: { $in: seatNumbers },
      status: 'available'
    }).session(session);

    if (seats.length !== seatNumbers.length) {
      const foundNumbers = seats.map(s => s.seatNumber);
      const unavailable = seatNumbers.filter(n => !foundNumbers.includes(n));
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        message: `Seats already taken or unavailable: ${unavailable.join(', ')}`,
        unavailableSeats: unavailable
      });
    }

    // Check for an existing active reservation by this user that hasn't expired
    const existingReservation = await Reservation.findOne({
      userId,
      eventId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).session(session);

    if (existingReservation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        message: 'You already have an active reservation for this event. Please complete or wait for it to expire.',
        reservation: existingReservation
      });
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create reservation
    const [reservation] = await Reservation.create(
      [{ userId, eventId, seatNumbers, expiresAt }],
      { session }
    );

    // Update seat statuses atomically
    await Seat.updateMany(
      { eventId, seatNumber: { $in: seatNumbers } },
      { status: 'reserved', reservationId: reservation._id },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Seats reserved successfully.',
      reservation
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('reserveSeats error:', err);
    res.status(500).json({ message: 'Failed to reserve seats.' });
  }
};

module.exports = { reserveSeats };
