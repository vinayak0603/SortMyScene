import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventById, reserveSeats, createBooking } from '../api/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Tag,
  CheckCircle2, AlertCircle, Info, Ticket
} from 'lucide-react';

/* ── Countdown ──────────────────────────────────────── */
const CountdownTimer = ({ expiresAt, onExpire }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setSeconds(diff);
      if (diff === 0) onExpire();
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isUrgent = seconds < 60;

  return (
    <div className={`countdown ${isUrgent ? 'urgent' : ''}`}>
      <Clock size={15} />
      <span className="countdown-text">Reservation expires in</span>
      <span className="countdown-time">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
};

/* ── Seat Legend ────────────────────────────────────── */
const SeatLegend = () => (
  <div className="seat-legend">
    {[
      { cls: 'available', label: 'Available' },
      { cls: 'selected',  label: 'Selected' },
      { cls: 'reserved',  label: 'Reserved' },
      { cls: 'booked',    label: 'Booked' },
    ].map(({ cls, label }) => (
      <span key={cls} className="legend-item">
        <span className={`legend-dot ${cls}`} />
        {label}
      </span>
    ))}
  </div>
);

/* ── Main Page ──────────────────────────────────────── */
const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [booking, setBooking] = useState(false);
  const [reservation, setReservation] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await getEventById(id);
      setEvent(res.data);
      setSeats(res.data.seats || []);
    } catch {
      toast.error('Failed to load event details.');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const toggleSeat = (seat) => {
    if (seat.status !== 'available') return;
    if (reservation) return;
    setSelected(prev =>
      prev.includes(seat.seatNumber)
        ? prev.filter(s => s !== seat.seatNumber)
        : [...prev, seat.seatNumber]
    );
  };

  const handleReserve = async () => {
    if (!user) { navigate('/auth'); return; }
    if (selected.length === 0) { toast.error('Select at least one seat.'); return; }
    setReserving(true);
    try {
      const res = await reserveSeats({ eventId: id, seatNumbers: selected });
      setReservation(res.data.reservation);
      setSeats(prev => prev.map(s =>
        selected.includes(s.seatNumber) ? { ...s, status: 'reserved' } : s
      ));
      toast.success(`${selected.length} seat${selected.length > 1 ? 's' : ''} reserved! You have 10 minutes.`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Reservation failed.';
      const unavailable = err.response?.data?.unavailableSeats || [];
      toast.error(msg);
      if (unavailable.length > 0) {
        await fetchEvent();
        setSelected(prev => prev.filter(s => !unavailable.includes(s)));
      }
    } finally {
      setReserving(false);
    }
  };

  const handleBook = async () => {
    if (!reservation) return;
    setBooking(true);
    try {
      const res = await createBooking({ reservationId: reservation._id });
      setBookingResult(res.data.booking);
      setSeats(prev => prev.map(s =>
        reservation.seatNumbers.includes(s.seatNumber) ? { ...s, status: 'booked' } : s
      ));
      setReservation(null);
      setSelected([]);
      toast.success('🎉 Booking confirmed!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Booking failed.';
      toast.error(msg);
      if (err.response?.status === 410) {
        setReservation(null);
        setSelected([]);
        await fetchEvent();
      }
    } finally {
      setBooking(false);
    }
  };

  const handleExpire = useCallback(async () => {
    toast.error('⏰ Reservation expired. Please reserve again.');
    setReservation(null);
    setSelected([]);
    await fetchEvent();
  }, [fetchEvent]);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  });

  if (loading) return (
    <div className="page-loader">
      <div className="spinner" />
      <p>Loading event</p>
    </div>
  );
  if (!event) return null;

  // Group into rows
  const seatRows = seats.reduce((acc, seat) => {
    const row = seat.seatNumber.charAt(0);
    if (!acc[row]) acc[row] = [];
    acc[row].push(seat);
    return acc;
  }, {});

  const getSeatClass = (seat) => {
    if (seat.status === 'booked') return 'seat booked';
    if (seat.status === 'reserved' && reservation?.seatNumbers?.includes(seat.seatNumber)) return 'seat selected';
    if (seat.status === 'reserved') return 'seat reserved';
    if (selected.includes(seat.seatNumber)) return 'seat selected';
    return 'seat available';
  };

  const totalPrice = selected.length * (event.price || 0);
  const reservedSeats = reservation?.seatNumbers || [];

  return (
    <div className="event-detail-page">
      <button className="back-btn" onClick={() => navigate('/')} id="back-btn">
        <ArrowLeft size={15} />
        All events
      </button>

      {/* ── Hero Banner ── */}
      <div className="event-hero-banner">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.name} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, var(--p-950), var(--deep))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '5rem'
          }}>🎫</div>
        )}
        <div className="event-hero-overlay" />
        <div className="event-hero-content">
          <div className="event-hero-tag">
            <Ticket size={10} /> {event.category}
          </div>
          <h1 className="event-hero-title">{event.name}</h1>
          <div className="event-hero-venue">
            <MapPin size={14} />
            {event.venue}
          </div>
        </div>
      </div>

      {/* ── Info Strip ── */}
      <div className="event-info-strip">
        {[
          { icon: <Calendar size={18} />, label: 'Date', value: formatDate(event.dateTime) },
          { icon: <Clock size={18} />,    label: 'Time', value: formatTime(event.dateTime) },
          { icon: <MapPin size={18} />,   label: 'Venue', value: event.venue },
          { icon: <Users size={18} />,    label: 'Availability', value: `${event.availableSeats} / ${event.totalSeats} seats` },
        ].map(({ icon, label, value }) => (
          <div key={label} className="info-strip-card">
            <div className="info-strip-icon">{icon}</div>
            <div>
              <div className="info-strip-label">{label}</div>
              <div className="info-strip-value">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Booking Success ── */}
      {bookingResult && (
        <div className="booking-success">
          <div className="success-pulse">
            <CheckCircle2 size={36} />
          </div>
          <h2>Booking Confirmed</h2>
          <p className="booking-success-desc">
            Your seats have been successfully booked. Enjoy the event!
          </p>
          <div className="booking-seats-chips">
            {bookingResult.seatNumbers.map(s => (
              <span key={s} className="booking-seat-chip">{s}</span>
            ))}
          </div>
          <p className="booking-ref">
            Reference ID: <code>{bookingResult.reservationId}</code>
          </p>
          <button
            className="btn-primary btn-lg"
            onClick={() => { setBookingResult(null); fetchEvent(); }}
            id="book-another-btn"
          >
            <Ticket size={16} />
            Book more seats
          </button>
        </div>
      )}

      {/* ── Seat Layout ── */}
      {!bookingResult && (
        <div className="seat-layout">
          {/* Seat map */}
          <div className="seat-map-panel">
            <div className="seat-map-header">
              <h2 className="seat-map-title">Select Seats</h2>
              <SeatLegend />
            </div>

            {reservation && (
              <CountdownTimer expiresAt={reservation.expiresAt} onExpire={handleExpire} />
            )}

            <div className="stage-wrap">
              <div className="stage-bar" />
              <div className="stage-label">Stage / Screen</div>
            </div>

            <div className="seat-grid">
              {Object.entries(seatRows).map(([row, rowSeats]) => (
                <div key={row} className="seat-row">
                  <span className="row-label">{row}</span>
                  <div className="seat-row-seats">
                    {rowSeats.map(seat => (
                      <button
                        key={seat.seatNumber}
                        id={`seat-${seat.seatNumber}`}
                        className={getSeatClass(seat)}
                        onClick={() => toggleSeat(seat)}
                        disabled={
                          seat.status === 'booked' ||
                          (seat.status === 'reserved' && !reservation?.seatNumbers?.includes(seat.seatNumber))
                        }
                        title={`${seat.seatNumber} — ${seat.status}`}
                      >
                        {seat.seatNumber}
                      </button>
                    ))}
                  </div>
                  <span className="row-label">{row}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Booking sidebar */}
          <div className="booking-sidebar">
            {/* Seat selection card */}
            <div className="booking-card">
              <div className="booking-card-title">Your Selection</div>
              <div className="selected-seats-list">
                {reservation
                  ? reservedSeats.map(s => (
                      <span key={s} className="selected-seat-chip">{s}</span>
                    ))
                  : selected.length > 0
                    ? selected.map(s => (
                        <span key={s} className="selected-seat-chip">{s}</span>
                      ))
                    : <span className="no-seat-hint">Click seats on the map to select</span>
                }
              </div>

              {/* Order summary */}
              {(selected.length > 0 || reservedSeats.length > 0) && event.price > 0 && (
                <div>
                  <div className="order-row">
                    <span className="order-row-label">
                      {reservedSeats.length || selected.length} × ₹{event.price.toLocaleString()}
                    </span>
                    <span className="order-row-value">
                      ₹{((reservedSeats.length || selected.length) * event.price).toLocaleString()}
                    </span>
                  </div>
                  <div className="order-row">
                    <span className="order-row-label">Platform fee</span>
                    <span className="order-row-value">₹0</span>
                  </div>
                  <div className="order-total">
                    <span className="order-total-label">Total</span>
                    <span className="order-total-value">
                      ₹{((reservedSeats.length || selected.length) * event.price).toLocaleString()}
                      <small>INR</small>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Countdown for active reservation */}
            {reservation && (
              <CountdownTimer expiresAt={reservation.expiresAt} onExpire={handleExpire} />
            )}

            {/* Reserved confirmation */}
            {reservation && (
              <div className="reserved-strip">
                <CheckCircle2 size={16} />
                Seats held — confirm to book
              </div>
            )}

            {/* CTA */}
            <div className="booking-card" style={{ padding: '20px' }}>
              {!reservation ? (
                <button
                  id="reserve-btn"
                  className="btn-primary btn-full btn-lg"
                  onClick={handleReserve}
                  disabled={selected.length === 0 || reserving}
                >
                  {reserving ? <span className="spinner-sm" /> : <Ticket size={16} />}
                  {reserving
                    ? 'Reserving…'
                    : selected.length > 0
                      ? `Reserve ${selected.length} Seat${selected.length !== 1 ? 's' : ''}`
                      : 'Reserve Seats'
                  }
                </button>
              ) : (
                <button
                  id="confirm-booking-btn"
                  className="btn-success btn-full"
                  style={{ padding: '14px', fontSize: '0.95rem', fontWeight: 600 }}
                  onClick={handleBook}
                  disabled={booking}
                >
                  {booking ? <span className="spinner-sm" /> : <CheckCircle2 size={17} />}
                  {booking ? 'Confirming…' : 'Confirm Booking'}
                </button>
              )}

              <p style={{
                textAlign: 'center',
                fontSize: '0.72rem',
                color: 'var(--text-dim)',
                marginTop: '12px',
                lineHeight: 1.6
              }}>
                {reservation
                  ? 'Seats released automatically after timer expires.'
                  : 'Seats will be held for 10 minutes after reservation.'}
              </p>
            </div>

            {/* Event description */}
            {event.description && (
              <div className="booking-card">
                <div className="booking-card-title">About this event</div>
                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-mid)',
                  lineHeight: 1.75
                }}>
                  {event.description}
                </p>
                {event.price > 0 && (
                  <div style={{
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--p-300)',
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}>
                    <Tag size={14} />
                    ₹{event.price.toLocaleString()} per seat
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetailPage;
