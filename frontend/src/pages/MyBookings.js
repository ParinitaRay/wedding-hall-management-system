import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const statusColors = {
  Pending: 'badge-warning',
  Confirmed: 'badge-success',
  Cancelled: 'badge-danger',
};

export default function MyBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (!user) return navigate('/login');
    api.get('/bookings').then(r => setBookings(r.data)).finally(() => setLoading(false));
  }, [user, navigate]);

  const viewDetails = async (booking) => {
    setSelected(booking);
    const r = await api.get(`/payments/${booking.booking_id}`);
    setPayments(r.data);
  };

  if (loading) return <div className="spinner">Loading your bookings...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Bookings</h1>
      </div>

      {bookings.length === 0 ? (
        <div className="card card-body" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <h3>No bookings yet</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem' }}>Browse halls and book your perfect venue!</p>
          <button className="btn btn-primary" onClick={() => navigate('/halls')}>Browse Halls</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bookings.map(b => (
            <div key={b.booking_id} className="card card-body"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ color: 'var(--terracotta)', marginBottom: '0.3rem' }}>{b.hall_name}</h3>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>
                  📅 {b.slot_date?.slice(0,10)} &nbsp;|&nbsp; 🕐 {b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)}
                </div>
                <div style={{ marginTop: '0.3rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Booked on {new Date(b.booking_date).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className={`badge ${statusColors[b.status] || 'badge-info'}`}>{b.status}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => viewDetails(b)}>View Details</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Booking Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.5rem' }}>
              <div><strong>Hall:</strong> {selected.hall_name}</div>
              <div><strong>Date:</strong> {selected.slot_date?.slice(0,10)}</div>
              <div><strong>Time:</strong> {selected.start_time?.slice(0,5)} – {selected.end_time?.slice(0,5)}</div>
              <div><strong>Price per Day:</strong> ₹{Number(selected.price_per_day).toLocaleString()}</div>
              <div><strong>Status:</strong> <span className={`badge ${statusColors[selected.status]}`}>{selected.status}</span></div>
              {selected.notes && <div><strong>Notes:</strong> {selected.notes}</div>}
            </div>

            <h3 style={{ color: 'var(--terracotta)', marginBottom: '0.75rem' }}>Payment History</h3>
            {payments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No payments recorded yet.</p>
            ) : (
              <table>
                <thead><tr><th>Type</th><th>Amount</th><th>Date</th></tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.payment_id}>
                      <td><span className="badge badge-info">{p.payment_type}</span></td>
                      <td>₹{Number(p.amount).toLocaleString()}</td>
                      <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}