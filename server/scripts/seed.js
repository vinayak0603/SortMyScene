require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Seat = require('../models/Seat');

const events = [
  {
    name: 'The Neon Dreamers Concert',
    description: 'An electrifying live performance blending synth-pop and indie rock under dazzling neon lights.',
    dateTime: new Date('2026-07-15T19:00:00'),
    venue: 'Madison Square Garden, New York',
    totalSeats: 36,
    category: 'Music',
    price: 1200,
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800'
  },
  {
    name: 'Tech Forward 2026 Summit',
    description: 'A premier technology conference featuring talks from global innovators, live demos, and networking.',
    dateTime: new Date('2026-08-05T09:00:00'),
    venue: 'Moscone Center, San Francisco',
    totalSeats: 48,
    category: 'Conference',
    price: 4999,
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'
  },
  {
    name: 'Hamlet – A Modern Retelling',
    description: 'Shakespeare\'s timeless tragedy reimagined for the digital age in a breathtaking stage production.',
    dateTime: new Date('2026-07-28T20:00:00'),
    venue: 'Globe Theatre, London',
    totalSeats: 30,
    category: 'Theatre',
    price: 2500,
    imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800'
  },
  {
    name: 'IPL Final 2026',
    description: 'Witness cricket\'s biggest night! Top two franchises battle it out for the coveted IPL trophy.',
    dateTime: new Date('2026-06-25T19:30:00'),
    venue: 'Narendra Modi Stadium, Ahmedabad',
    totalSeats: 60,
    category: 'Sports',
    price: 3500,
    imageUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800'
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Event.deleteMany({});
    await Seat.deleteMany({});
    console.log('Cleared existing events and seats');

    for (const eventData of events) {
      const event = await Event.create(eventData);
      console.log(`Created event: ${event.name}`);

      // Generate seat rows A-Z with numbered seats
      const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
      const seatsPerRow = Math.ceil(event.totalSeats / rows.length);
      const seatDocs = [];

      let seatCount = 0;
      for (const row of rows) {
        for (let col = 1; col <= seatsPerRow && seatCount < event.totalSeats; col++) {
          seatDocs.push({
            eventId: event._id,
            seatNumber: `${row}${col}`,
            status: 'available'
          });
          seatCount++;
        }
      }

      await Seat.insertMany(seatDocs);
      console.log(`  Created ${seatDocs.length} seats for ${event.name}`);
    }

    console.log('\n✅ Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedDatabase();
