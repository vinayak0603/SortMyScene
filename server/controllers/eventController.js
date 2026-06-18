const Event = require('../models/Event');
const Seat = require('../models/Seat');

// GET /api/events
const getEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ dateTime: 1 });

    // Attach available seat count for each event
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const availableSeats = await Seat.countDocuments({
          eventId: event._id,
          status: 'available'
        });
        return { ...event.toObject(), availableSeats };
      })
    );

    res.json(eventsWithCounts);
  } catch (err) {
    console.error('getEvents error:', err);
    res.status(500).json({ message: 'Failed to fetch events.' });
  }
};

// GET /api/events/:id
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    const seats = await Seat.find({ eventId: event._id }).sort({ seatNumber: 1 });
    const availableSeats = seats.filter(s => s.status === 'available').length;

    res.json({ ...event.toObject(), seats, availableSeats });
  } catch (err) {
    console.error('getEventById error:', err);
    res.status(500).json({ message: 'Failed to fetch event.' });
  }
};

module.exports = { getEvents, getEventById };
