const mongoose = require('mongoose');
const Seat = require('../models/Seat');
const Reservation = require('../models/Reservation');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

const generateBookingReference = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'SMS-';
  for (let i = 0; i < 4; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  ref += '-';
  for (let i = 0; i < 4; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
};

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

    // Fetch the event to calculate pricePaid
    const event = await Event.findById(reservation.eventId).session(session);
    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Associated event not found.' });
    }

    // Generate unique booking reference
    let bookingReference;
    let isUnique = false;
    while (!isUnique) {
      bookingReference = generateBookingReference();
      const existing = await Ticket.findOne({ bookingReference }).session(session);
      if (!existing) {
        isUnique = true;
      }
    }

    // Create permanent Ticket document
    const [ticket] = await Ticket.create(
      [{
        userId,
        eventId: reservation.eventId,
        seatNumbers: reservation.seatNumbers,
        bookingReference,
        pricePaid: (event.price || 0) * reservation.seatNumbers.length,
        status: 'booked'
      }],
      { session }
    );

    // Mark seats as booked (and clear their temporary reservationId pointer)
    await Seat.updateMany(
      { eventId: reservation.eventId, seatNumber: { $in: reservation.seatNumbers } },
      { status: 'booked', reservationId: null },
      { session }
    );

    // Delete the temporary reservation since it is successfully converted to a Ticket
    await Reservation.deleteOne({ _id: reservationId }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Booking confirmed successfully!',
      booking: {
        id: ticket._id,
        bookingReference: ticket.bookingReference,
        reservationId: reservation._id, // Fallback for backward compatibility
        eventId: ticket.eventId,
        seatNumbers: ticket.seatNumbers,
        userId,
        bookedAt: ticket.createdAt
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

