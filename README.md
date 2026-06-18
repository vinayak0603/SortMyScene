# SortMyScene – Event Ticket Booking

A full-stack event ticket booking application with seat reservation, real-time countdown, and booking confirmation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite, React Router DOM, Axios, Tailwind CSS v4, Lucide React, React Hot Toast |
| Backend | Node.js + Express 5, Mongoose |
| Database | MongoDB Atlas (with Replica Set for transactions) |
| Auth | JWT (jsonwebtoken) + bcryptjs |

---

## How to Run

### Prerequisites

- Node.js v18+
- A MongoDB Atlas cluster URI (already configured in `server/.env`)

### 1. Backend (Server)

```bash
cd server
npm install       # if not already done
npm run seed      # seed the database with sample events & seats
npm run dev       # starts nodemon on port 5000
```

The server will be available at **http://localhost:5000**

### 2. Frontend (Client)

```bash
cd client
npm install       # if not already done
npm run dev       # starts Vite dev server on port 5173
```

Open **http://localhost:5173** in your browser.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register a new user |
| POST | `/api/auth/login` | ❌ | Login and receive JWT token |
| GET | `/api/events` | ❌ | List all events with available seat counts |
| GET | `/api/events/:id` | ❌ | Get single event with full seat grid |
| POST | `/api/reserve` | ✅ | Reserve selected seats for 10 minutes |
| POST | `/api/bookings` | ✅ | Confirm reservation and mark seats as booked |

---

## Booking Flow

1. **Browse Events** – See all upcoming events with search and category filters
2. **Select Seats** – Click seats on the interactive color-coded grid
3. **Reserve** → calls `POST /api/reserve` → seats turn "reserved" with a 10-min countdown
4. **Confirm Booking** → calls `POST /api/bookings` → seats become "booked" permanently
5. **Error Handling** – If seats become unavailable between selection and reservation, the app shows which seats are taken and refreshes the grid

---

## Design Decisions

### Double Booking Prevention

The key mechanism is **MongoDB transactions + atomic queries**:

```
POST /api/reserve:
  1. Start a session/transaction
  2. Query seats WHERE status = 'available' AND seatNumber IN [...selected] 
     (with session lock)
  3. If count ≠ requested seats → abort → return 409 with unavailable seat list
  4. Create Reservation document
  5. Update all seat statuses to 'reserved' atomically
  6. Commit transaction

POST /api/bookings:
  1. Start a session/transaction
  2. Find reservation WHERE _id = ? AND userId = ? AND status = 'active'
  3. Check expiresAt < now → 410 Expired
  4. Verify seats still have status = 'reserved' AND reservationId = reservation._id
  5. Update seats to 'booked'
  6. Mark reservation as 'completed'
  7. Commit transaction
```

This ensures no two concurrent requests can book the same seat — only one transaction will succeed if there's a race condition.

### Reservation Expiry

- Reservations expire after **10 minutes**
- MongoDB TTL index (`expireAfterSeconds: 60`) auto-cleans expired reservation documents
- The frontend shows a live countdown timer
- The backend validates `expiresAt` on booking confirmation
- If expired during booking, seats are released back to `available`

### Authentication

- JWT tokens stored in `localStorage`, sent via `Authorization: Bearer <token>` header
- Reserve and book endpoints require auth; browsing events is public

### State Management

- React Context (`AuthContext`) for global auth state
- Component-local `useState` / `useEffect` for event data, seat selection, reservation state
- Seat status is optimistically updated locally after API success, with full refresh on errors

---

## Assumptions

- MongoDB Atlas cluster must support **replica sets** (required for multi-document transactions). Atlas free tier supports this.
- Each user can only have one active reservation per event at a time.
- Seat numbering follows a row-based grid (A1, A2… F6).
- No payment processing is implemented (out of scope).
- userId is extracted from the JWT token (no separate user profile page needed).
