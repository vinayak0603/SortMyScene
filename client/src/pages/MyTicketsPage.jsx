import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyTickets, createBooking } from '../api/api';
import toast from 'react-hot-toast';
import {
  Ticket, Clock, CheckCircle2, XCircle, Calendar,
  MapPin, ArrowRight, RefreshCw, LogIn, Tag
} from 'lucide-react';

/* ── Live countdown per active reservation ── */
const LiveCountdown = ({ expiresAt }) => {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const tick = () => setSecs(Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const urgent = secs < 60;

  if (secs === 0) return <span className="mt-badge mt-badge-expired">Expired</span>;

  return (
    <span className={`mt-countdown ${urgent ? 'urgent' : ''}`}>
      <Clock size={12} />
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
};

/* ── Status badge ── */
const StatusBadge = ({ status }) => {
  const map = {
    active:    { cls: 'mt-badge-active',    label: 'Reserved',  icon: <Clock size={11} /> },
    completed: { cls: 'mt-badge-booked',    label: 'Booked',    icon: <CheckCircle2 size={11} /> },
    expired:   { cls: 'mt-badge-expired',   label: 'Expired',   icon: <XCircle size={11} /> },
  };
  const { cls, label, icon } = map[status] || map.expired;
  return (
    <span className={`mt-badge ${cls}`}>
      {icon} {label}
    </span>
  );
};

/* ── Seat chips ── */
const SeatChips = ({ seats, variant = 'default' }) => (
  <div className="mt-seat-chips">
    {seats.map(s => (
      <span key={s} className={`mt-seat-chip mt-seat-chip-${variant}`}>{s}</span>
    ))}
  </div>
);

/* ── Ticket card ── */
const TicketCard = ({ ticket, onConfirm, confirming }) => {
  const nav = useNavigate();
  const event = ticket.event;
  const isActive    = ticket.status === 'active';
  const isCompleted = ticket.status === 'completed';
  const isExpired   = ticket.status === 'expired';

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  });
  const formatBooked = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className={`mt-card ${isExpired ? 'mt-card-expired' : ''} ${isCompleted ? 'mt-card-booked' : ''}`}>
      {/* Left: image strip */}
      {event?.imageUrl && (
        <div className="mt-card-img">
          <img src={event.imageUrl} alt={event?.name} />
          <div className="mt-card-img-overlay" />
        </div>
      )}

      {/* Center: info */}
      <div className="mt-card-body">
        <div className="mt-card-top">
          <StatusBadge status={ticket.status} />
          {isActive && <LiveCountdown expiresAt={ticket.expiresAt} />}
        </div>

        <h3 className="mt-card-title">{event?.name || 'Event Unavailable'}</h3>

        {event && (
          <div className="mt-card-meta">
            <span className="mt-meta-item">
              <Calendar size={13} />
              {formatDate(event.dateTime)} · {formatTime(event.dateTime)}
            </span>
            <span className="mt-meta-item">
              <MapPin size={13} />
              {event.venue}
            </span>
            {event.price > 0 && (
              <span className="mt-meta-item">
                <Tag size={13} />
                ₹{(ticket.seatNumbers.length * event.price).toLocaleString()} total
              </span>
            )}
          </div>
        )}

        <div className="mt-card-seats-row">
          <span className="mt-seats-label">
            {ticket.seatNumbers.length} Seat{ticket.seatNumbers.length !== 1 ? 's' : ''}
          </span>
          <SeatChips
            seats={ticket.seatNumbers}
            variant={isCompleted ? 'booked' : isExpired ? 'expired' : 'active'}
          />
        </div>

        {isCompleted && (
          <p className="mt-booked-at">
            Booked on {formatBooked(ticket.updatedAt)}
          </p>
        )}
      </div>

      {/* Right: actions */}
      <div className="mt-card-actions">
        {isActive && (
          <>
            <button
              className="btn-success mt-confirm-btn"
              onClick={() => onConfirm(ticket._id)}
              disabled={confirming === ticket._id}
              id={`confirm-btn-${ticket._id}`}
            >
              {confirming === ticket._id
                ? <><span className="spinner-sm" /> Confirming…</>
                : <><CheckCircle2 size={15} /> Confirm Booking</>
              }
            </button>
            <button
              className="mt-view-btn"
              onClick={() => nav(`/events/${ticket.eventId}`)}
            >
              View seats <ArrowRight size={13} />
            </button>
          </>
        )}
        {isCompleted && (
          <div className="mt-confirmed-badge">
            <CheckCircle2 size={20} />
            <span>Confirmed</span>
          </div>
        )}
        {isExpired && (
          <button
            className="mt-rebook-btn"
            onClick={() => nav(`/events/${ticket.eventId}`)}
          >
            Rebook <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Empty section state ── */
const EmptySection = ({ icon, title, sub, action, onAction }) => (
  <div className="mt-empty">
    <div className="mt-empty-icon">{icon}</div>
    <h4>{title}</h4>
    <p>{sub}</p>
    {action && <button className="btn-outline" onClick={onAction}>{action}</button>}
  </div>
);

/* ── Main Page ── */
const MyTicketsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]         = useState({ active: [], booked: [], expired: [] });
  const [loading, setLoading]   = useState(true);
  const [confirming, setConfirming] = useState(null);
  const [tab, setTab]           = useState('active');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyTickets();
      setData(res.data);
    } catch {
      toast.error('Failed to load your tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchTickets();
    else setLoading(false);
  }, [user, fetchTickets]);

  const handleConfirm = async (reservationId) => {
    setConfirming(reservationId);
    try {
      await createBooking({ reservationId });
      toast.success('🎉 Booking confirmed!');
      await fetchTickets();
      setTab('booked');
    } catch (err) {
      const msg = err.response?.data?.message || 'Booking failed.';
      toast.error(msg);
      if (err.response?.status === 410) await fetchTickets();
    } finally {
      setConfirming(null);
    }
  };

  if (!user) {
    return (
      <div className="mt-page">
        <div className="mt-unauthenticated">
          <div className="mt-unauth-icon"><Ticket size={40} /></div>
          <h2>Sign in to view your tickets</h2>
          <p>Your reservations and bookings will appear here once you sign in.</p>
          <button className="btn-primary btn-lg" onClick={() => navigate('/auth')}>
            <LogIn size={16} /> Sign in
          </button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="page-loader">
      <div className="spinner" />
      <p>Loading your tickets</p>
    </div>
  );

  const tabs = [
    { id: 'active',  label: 'Active Reservations', count: data.active.length },
    { id: 'booked',  label: 'Booked Tickets',       count: data.booked.length },
    { id: 'expired', label: 'Expired',               count: data.expired.length },
  ];

  const currentList = data[tab] || [];

  return (
    <div className="mt-page">
      {/* Page header */}
      <div className="mt-header">
        <div className="mt-header-inner">
          <div>
            <div className="mt-eyebrow">
              <Ticket size={13} /> My Account
            </div>
            <h1 className="mt-page-title">My Tickets</h1>
            <p className="mt-page-sub">
              Track your seat reservations and confirmed bookings in one place.
            </p>
          </div>
          <button
            className="btn-ghost mt-refresh-btn"
            onClick={fetchTickets}
            id="refresh-tickets-btn"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-stats-row">
          <div className="mt-stat">
            <span className="mt-stat-num">{data.active.length}</span>
            <span className="mt-stat-label">Active Reservations</span>
          </div>
          <div className="mt-stat">
            <span className="mt-stat-num">{data.booked.length}</span>
            <span className="mt-stat-label">Confirmed Bookings</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-tabs-bar">
        <div className="mt-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              className={`mt-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`mt-tab-count ${tab === t.id ? 'active' : ''}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      <div className="mt-list-wrap">
        {currentList.length === 0 ? (
          tab === 'active' ? (
            <EmptySection
              icon="🎫"
              title="No active reservations"
              sub="Browse events and reserve seats — they'll appear here for 10 minutes."
              action="Browse events"
              onAction={() => navigate('/')}
            />
          ) : tab === 'booked' ? (
            <EmptySection
              icon="✅"
              title="No confirmed bookings yet"
              sub="Confirm an active reservation or browse events to book new tickets."
              action="Browse events"
              onAction={() => navigate('/')}
            />
          ) : (
            <EmptySection
              icon="🕐"
              title="No expired reservations"
              sub="Expired reservations will show up here for your reference."
            />
          )
        ) : (
          <div className="mt-list">
            {currentList.map(ticket => (
              <TicketCard
                key={ticket._id}
                ticket={ticket}
                onConfirm={handleConfirm}
                confirming={confirming}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTicketsPage;
