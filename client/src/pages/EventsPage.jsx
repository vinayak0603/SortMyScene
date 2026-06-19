import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../api/api';
import { Calendar, MapPin, Users, ArrowRight, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await getEvents();
        setEvents(res.data);
        setFiltered(res.data);
      } catch {
        toast.error('Failed to load events.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    let result = events;
    if (category !== 'All') {
      result = result.filter(e => e.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, category, events]);

  const categories = ['All', ...new Set(events.map(e => e.category))];

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  });

  const availabilityPct = (event) =>
    Math.round((event.availableSeats / event.totalSeats) * 100);

  if (loading) return (
    <div className="page-loader">
      <div className="spinner" />
      <p>Loading events</p>
    </div>
  );

  return (
    <div className="events-page">

      {/* ── Hero ── */}
      <section className="events-hero">
        <div className="hero-inner">
          <h1 className="hero-title">
            Discover<br />
            <span className="hero-title-accent">Extraordinary</span>
            Events
          </h1>
          <p className="hero-sub">
            Reserve front-row seats to concerts, sports, theatre, and conferences.
            All in one beautifully crafted platform.
          </p>
          <div className="hero-stats">
            <div>
              <div className="hero-stat-num">{events.length}<span>+</span></div>
              <div className="hero-stat-desc">Live events</div>
            </div>
            <div>
              <div className="hero-stat-num">
                {events.reduce((a, e) => a + (e.availableSeats || 0), 0)}<span>+</span>
              </div>
              <div className="hero-stat-desc">Seats available</div>
            </div>
            <div>
              <div className="hero-stat-num">10<span>min</span></div>
              <div className="hero-stat-desc">Reservation hold</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Combined Search + Filter bar ── */}
      <div className="events-filter-bar">
        <div className="events-filter-inner">
          {/* Search input */}
          <div className="filter-search-wrap">
            <Search size={15} className="filter-search-icon" />
            <input
              id="event-search"
              type="text"
              placeholder="Search events, artists, venues…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="filter-search-input"
            />
            {search && (
              <button
                className="search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Divider */}
          <span className="filter-divider" />

          {/* Category pills */}
          {categories.map(cat => (
            <button
              key={cat}
              id={`cat-${cat.toLowerCase()}`}
              className={`cat-pill ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Events Grid ── */}
      <div className="events-body">
        <div className="events-section-label">
          <h2>{category === 'All' ? 'All Events' : category}</h2>
          <span className="events-count">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="events-grid">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🎭</span>
              <h3>No events found</h3>
              <p>Try a different search term or category filter.</p>
            </div>
          ) : (
            filtered.map((event, i) => (
              <div
                key={event._id}
                id={`event-card-${event._id}`}
                className="event-card"
                onClick={() => navigate(`/events/${event._id}`)}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Image */}
                <div className="event-card-img">
                  {event.imageUrl ? (
                    <img src={event.imageUrl} alt={event.name} loading="lazy" />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '3rem', background: 'var(--deep)'
                    }}>🎫</div>
                  )}
                  <div className="event-card-img-overlay" />
                  <span className="event-category-badge">{event.category}</span>
                </div>

                {/* Body */}
                <div className="event-card-body">
                  <div className="event-card-tag">{event.category}</div>
                  <h3 className="event-card-title">{event.name}</h3>
                  <p className="event-card-desc">{event.description}</p>

                  <div className="event-card-meta">
                    <span className="meta-item">
                      <Calendar size={13} />
                      {formatDate(event.dateTime)} · {formatTime(event.dateTime)}
                    </span>
                    <span className="meta-item">
                      <MapPin size={13} />
                      {event.venue}
                    </span>
                  </div>

                  {/* Availability bar */}
                  <div className="event-seats-bar">
                    <div
                      className="event-seats-fill"
                      style={{ width: `${availabilityPct(event)}%` }}
                    />
                  </div>
                  <div className="event-seats-label">
                    <Users size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {event.availableSeats} of {event.totalSeats} seats available
                  </div>

                  <div className="event-card-footer">
                    <div>
                      <div className="event-price">
                        {event.price > 0 ? `₹${event.price.toLocaleString()}` : 'Free'}
                        {event.price > 0 && (
                          <span className="event-price-label">/ seat</span>
                        )}
                      </div>
                    </div>
                    <button className="btn-book">
                      Book Now <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EventsPage;
