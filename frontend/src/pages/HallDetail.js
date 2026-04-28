import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function HallDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  if (isAdmin) return <AdminHallView id={id} />;
  return <UserHallView id={id} user={user} />;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function HallImages({ images }) {
  const [imgIdx, setImgIdx] = useState(0);
  if (images.length === 0)
    return (
      <div style={{ width: '100%', height: '260px', background: 'linear-gradient(135deg, var(--brown-mid), var(--espresso))',
        borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', marginBottom: '1.5rem' }}>
        💒
      </div>
    );
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <img src={images[imgIdx]?.image_url} alt=""
        style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: '12px' }} />
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', overflowX: 'auto' }}>
          {images.map((img, i) => (
            <img key={img.img_id} src={img.image_url} alt=""
              onClick={() => setImgIdx(i)}
              style={{ width: '72px', height: '54px', objectFit: 'cover', borderRadius: '6px',
                cursor: 'pointer', border: i === imgIdx ? '3px solid var(--terracotta)' : '2px solid transparent' }} />
          ))}
        </div>
      )}
    </div>
  );
}

function HallInfoCards({ hall }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
      {[
        { label: 'Capacity', value: `${hall.capacity} guests`, icon: '👥' },
        { label: 'Size', value: `${hall.size_sqft} sqft`, icon: '📐' },
        { label: 'Price', value: `₹${Number(hall.price_per_day).toLocaleString()}/day`, icon: '💰' },
        { label: 'Status', value: hall.status, icon: '✅' },
      ].map(item => (
        <div key={item.label} className="card card-body" style={{ padding: '0.85rem' }}>
          <div style={{ fontSize: '1.2rem' }}>{item.icon}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{item.label}</div>
          <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Booking Calendar (User) ──────────────────────────────────────────────────

function BookingCalendar({ hallId, onDateSelect, selectedDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState({});
  const [loading, setLoading] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  // Load all slots for the current month to know which dates have availability
  useEffect(() => {
    setLoading(true);
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    // Fetch slots for each day in the month
    const promises = Array.from({ length: daysInMonth }).map((_, i) => {
      const day = String(i + 1).padStart(2, '0');
      const dateStr = `${monthStr}-${day}`;
      if (dateStr < today) return Promise.resolve({ date: dateStr, available: false, count: 0 });
      return api.get(`/slots/${hallId}?date=${dateStr}`)
        .then(r => ({
          date: dateStr,
          available: r.data.some(s => s.is_available),
          count: r.data.filter(s => s.is_available).length,
          total: r.data.length,
        }))
        .catch(() => ({ date: dateStr, available: false, count: 0 }));
    });

    Promise.all(promises).then(results => {
      const map = {};
      results.forEach(r => { map[r.date] = r; });
      setAvailableDates(map);
      setLoading(false);
    });
  }, [hallId, year, month, daysInMonth, today]);

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Month Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button className="btn btn-secondary btn-sm"
          onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>‹</button>
        <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, color: 'var(--espresso)' }}>
          {monthName}
        </span>
        <button className="btn btn-secondary btn-sm"
          onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '3px' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700,
            color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Loading availability...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const info = availableDates[dateStr];
            const isPast = dateStr < today;
            const isToday = dateStr === today;
            const isSelected = selectedDate === dateStr;
            const hasSlots = info?.total > 0;
            const hasAvailable = info?.available;

            let bg = 'var(--beige)';
            let color = 'var(--text-muted)';
            let cursor = 'default';
            let border = '2px solid transparent';

            if (isPast) {
              bg = '#f0ebe5'; color = '#ccc';
            } else if (isSelected) {
              bg = 'var(--terracotta)'; color = 'white'; border = '2px solid var(--terra-dark)';
            } else if (hasAvailable) {
              bg = '#e8f5e9'; color = '#2e7d32'; cursor = 'pointer'; border = '2px solid #a5d6a7';
            } else if (hasSlots && !hasAvailable) {
              bg = '#fce4ec'; color = '#c62828'; border = '2px solid #ef9a9a';
            } else if (isToday) {
              bg = 'var(--cream-dark)'; color = 'var(--espresso)'; cursor = 'default';
            }

            return (
              <div key={day}
                onClick={() => !isPast && hasAvailable && onDateSelect(dateStr)}
                style={{
                  borderRadius: '8px', padding: '6px 2px', textAlign: 'center',
                  minHeight: '48px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '2px',
                  background: bg, color, cursor, border, transition: 'all 0.15s',
                  fontSize: '0.85rem', fontWeight: isSelected || isToday ? 700 : 500,
                }}>
                <span>{day}</span>
                {!isPast && hasAvailable && !isSelected && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 600 }}>{info.count} free</span>
                )}
                {!isPast && hasSlots && !hasAvailable && (
                  <span style={{ fontSize: '0.6rem' }}>full</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { color: '#e8f5e9', border: '#a5d6a7', label: 'Available' },
          { color: '#fce4ec', border: '#ef9a9a', label: 'Fully booked' },
          { color: 'var(--terracotta)', border: 'var(--terra-dark)', label: 'Selected' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px',
              background: l.color, border: `1.5px solid ${l.border}` }} />
            <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── User View ────────────────────────────────────────────────────────────────

function UserHallView({ id, user }) {
  const navigate = useNavigate();
  const [hall, setHall] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get(`/halls/${id}`).then(r => setHall(r.data)).finally(() => setLoading(false));
  }, [id]);

  const loadSlots = useCallback(() => {
    if (!selectedDate) return;
    api.get(`/slots/${id}?date=${selectedDate}`).then(r => setSlots(r.data));
    setSelectedSlot(null);
  }, [selectedDate, id]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setError('');
    setSuccess('');
  };

  const handleBook = async () => {
    if (!user) return navigate('/login');
    if (!selectedSlot) return setError('Please select a time slot.');
    setBooking(true); setError('');
    try {
      await api.post('/bookings', { hall_id: id, slot_id: selectedSlot.slot_id, notes });
      setSuccess('Booking submitted! Check "My Bookings" for status.');
      setSelectedSlot(null);
      loadSlots();
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally { setBooking(false); }
  };

  if (loading) return <div className="spinner">Loading...</div>;
  if (!hall) return <div className="spinner">Hall not found.</div>;

  return (
    <div className="page" style={{ maxWidth: '960px' }}>
      <HallImages images={hall.images || []} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* Left - Hall Info */}
        <div>
          <h1 style={{ color: 'var(--espresso)', fontSize: '2rem', marginBottom: '0.5rem' }}>{hall.name}</h1>
          {hall.location && <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>📍 {hall.location}</p>}
          <HallInfoCards hall={hall} />
          {hall.description && (
            <div className="card card-body">
              <h3 style={{ marginBottom: '0.5rem', color: 'var(--terracotta)' }}>About this Venue</h3>
              <p style={{ color: '#555', lineHeight: '1.7' }}>{hall.description}</p>
            </div>
          )}
        </div>

        {/* Right - Booking Panel */}
        <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Calendar Card */}
          <div className="card card-body">
            <h3 style={{ color: 'var(--espresso)', marginBottom: '1rem', fontFamily: 'Playfair Display, serif' }}>
              📅 Select a Date
            </h3>
            <BookingCalendar
              hallId={id}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          </div>

          {/* Slots + Booking Card */}
          {selectedDate && (
            <div className="card card-body">
              <h3 style={{ color: 'var(--espresso)', marginBottom: '0.75rem', fontSize: '1rem' }}>
                🕐 Available Slots
              </h3>

              {success && <div className="alert alert-success">{success}</div>}
              {error && <div className="alert alert-error">{error}</div>}

              {slots.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No slots for this date.</p>
              ) : (
                <div className="slot-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  {slots.map(slot => (
                    <div key={slot.slot_id}
                      className={`slot-card ${!slot.is_available ? 'slot-taken' : ''} ${selectedSlot?.slot_id === slot.slot_id ? 'slot-selected' : ''}`}
                      onClick={() => slot.is_available && setSelectedSlot(slot)}>
                      <div className="slot-time">{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</div>
                      <div className="slot-status">{slot.is_available ? '✅ Free' : '❌ Booked'}</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedSlot && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Notes (optional)</label>
                  <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Any special requirements..." style={{ resize: 'none' }} />
                </div>
              )}

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.75rem' }}
                onClick={handleBook} disabled={booking || !selectedSlot}>
                {booking ? 'Booking...' : '✨ Book Now'}
              </button>

              {!user && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
                  <a href="/login" style={{ color: 'var(--terracotta)' }}>Login</a> to book
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Admin View: Calendar ─────────────────────────────────────────────────────

function AdminHallView({ id }) {
  const navigate = useNavigate();
  const [hall, setHall] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    Promise.all([api.get(`/halls/${id}`), api.get(`/bookings/hall/${id}`)])
      .then(([h, b]) => { setHall(h.data); setBookings(b.data); })
      .finally(() => setLoading(false));
  }, [id]);

  const bookingsByDate = bookings.reduce((acc, b) => {
    const d = b.slot_date?.slice(0, 10);
    if (!d) return acc;
    if (!acc[d]) acc[d] = [];
    acc[d].push(b);
    return acc;
  }, {});

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const selectedBookings = selectedDay ? (bookingsByDate[selectedDay] || []) : [];
  const statusColors = { Pending: '#f39c12', Confirmed: '#27ae60', Cancelled: '#e74c3c' };

  if (loading) return <div className="spinner">Loading...</div>;
  if (!hall) return <div className="spinner">Hall not found.</div>;

  return (
    <div className="page" style={{ maxWidth: '960px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
        <h1 style={{ color: 'var(--espresso)', fontSize: '1.6rem' }}>{hall.name}</h1>
        {hall.location && <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>📍 {hall.location}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
        {/* Calendar */}
        <div className="card card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>‹ Prev</button>
            <h2 style={{ color: 'var(--espresso)', fontSize: '1.1rem' }}>{monthName}</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>Next ›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayBookings = bookingsByDate[dateStr] || [];
              const isToday = dateStr === today;
              const isSelected = selectedDay === dateStr;
              const hasBooking = dayBookings.length > 0;

              return (
                <div key={day} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  style={{
                    borderRadius: '8px', padding: '6px 4px', textAlign: 'center', cursor: 'pointer',
                    minHeight: '56px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'flex-start', gap: '3px', transition: 'all 0.15s',
                    border: isSelected ? '2px solid var(--terracotta)' : '2px solid transparent',
                    background: isSelected ? '#fdf0f2' : isToday ? '#fff5f7' : hasBooking ? '#fefaf0' : '#f9f9f9',
                  }}>
                  <span style={{
                    fontWeight: isToday ? '800' : '500', fontSize: '0.85rem',
                    color: isToday ? 'var(--terracotta)' : '#333',
                    width: '24px', height: '24px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isToday ? 'var(--cream-dark)' : 'transparent',
                  }}>{day}</span>
                  {dayBookings.slice(0, 2).map((b, idx) => (
                    <div key={idx} style={{
                      fontSize: '0.62rem', borderRadius: '3px', padding: '1px 3px',
                      background: statusColors[b.status] + '22', color: statusColors[b.status],
                      fontWeight: 600, width: '100%', textAlign: 'center',
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    }}>
                      {b.start_time?.slice(0, 5)}
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+{dayBookings.length - 2}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
            {[['#27ae60', 'Confirmed'], ['#f39c12', 'Pending'], ['var(--cream-dark)', 'Today']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color }} />
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <HallImages images={hall.images || []} />
          <HallInfoCards hall={hall} />

          <div className="card card-body">
            <h3 style={{ color: 'var(--terracotta)', marginBottom: '0.75rem', fontSize: '1rem' }}>📊 {monthName}</h3>
            {(() => {
              const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
              const mb = bookings.filter(b => b.slot_date?.startsWith(monthStr));
              return (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    { label: 'Total', value: mb.length, color: 'var(--terracotta)' },
                    { label: 'Confirmed', value: mb.filter(b => b.status === 'Confirmed').length, color: '#27ae60' },
                    { label: 'Pending', value: mb.filter(b => b.status === 'Pending').length, color: '#f39c12' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', flex: 1, padding: '0.5rem', background: 'var(--beige)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="card card-body">
            <h3 style={{ color: 'var(--terracotta)', marginBottom: '0.75rem', fontSize: '1rem' }}>
              {selectedDay
                ? `📋 ${new Date(selectedDay + 'T00:00:00').toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}`
                : '📋 Select a date'}
            </h3>
            {!selectedDay && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Click any date on the calendar.</p>}
            {selectedDay && selectedBookings.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No bookings on this date.</p>}
            {selectedBookings.map(b => (
              <div key={b.booking_id} style={{
                borderLeft: `4px solid ${statusColors[b.status]}`,
                padding: '0.75rem', borderRadius: '6px', background: 'var(--beige)', marginBottom: '0.75rem',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '3px' }}>
                  🕐 {b.start_time?.slice(0, 5)} – {b.end_time?.slice(0, 5)}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#555' }}>👤 {b.username}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>✉️ {b.email}</div>
                {b.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>📝 {b.notes}</div>}
                <div style={{ marginTop: '6px' }}>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                    background: statusColors[b.status] + '22', color: statusColors[b.status],
                  }}>{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}