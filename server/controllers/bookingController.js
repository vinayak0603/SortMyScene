const mongoose = require('mongoose');
const Seat = require('../models/Seat');
const Reservation = require('../models/Reservation');

// POST /api/bookings
const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reservationId } = req.body;
    const userId = req.user.id;

    if (!reservationId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'reservationId is required.' });
    }

    // Find the reservation within the transaction
    const reservation = await Reservation.findOne({
      _id: reservationId,
      userId,
      status: 'active'
    }).session(session);

    if (!reservation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Reservation not found or does not belong to you.' });
    }

    // Check expiry
    if (reservation.expiresAt < new Date()) {
      // Mark as expired and release seats
      await Reservation.findByIdAndUpdate(
        reservationId,
        { status: 'expired' },
        { session }
      );
      await Seat.updateMany(
        { eventId: reservation.eventId, seatNumber: { $in: reservation.seatNumbers } },
        { status: 'available', reservationId: null },
        { session }
      );
      await session.commitTransaction();
      session.endSession();
      return res.status(410).json({ message: 'Reservation has expired. Please reserve again.' });
    }

    // Verify seats are still in reserved status
    const seats = await Seat.find({
      eventId: reservation.eventId,
      seatNumber: { $in: reservation.seatNumbers },
      status: 'reserved',
      reservationId: reservation._id
    }).session(session);

    if (seats.length !== reservation.seatNumbers.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ message: 'Some seats are no longer in reserved status.' });
    }

    // Mark seats as booked
    await Seat.updateMany(
      { eventId: reservation.eventId, seatNumber: { $in: reservation.seatNumbers } },
      { status: 'booked', reservationId: null },
      { session }
    );

    // Mark reservation as completed
    await Reservation.findByIdAndUpdate(
      reservationId,
      { status: 'completed' },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Booking confirmed successfully!',
      booking: {
        reservationId,
        eventId: reservation.eventId,
        seatNumbers: reservation.seatNumbers,
        userId,
        bookedAt: new Date()
      }
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('createBooking error:', err);
    res.status(500).json({ message: 'Failed to complete booking.' });
  }
};

module.exports = { createBooking };
