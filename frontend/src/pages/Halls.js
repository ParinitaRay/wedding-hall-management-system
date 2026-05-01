import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Halls() {
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/halls').then(r => setHalls(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = halls.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    (h.location || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="spinner">Loading halls...</div>;

  return (
    <div>
      <div style={{ background: 'var(--terracotta)', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: 'white', marginBottom: '1rem' }}>Browse Wedding Halls</h1>
        <input
          placeholder="🔍  Search by name or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 20px', borderRadius: '24px', border: 'none', width: '100%', maxWidth: '400px', fontSize: '1rem' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="spinner">No halls found.</div>
      ) : (
        <div className="hall-grid">
          {filtered.map(hall => (
            <Link to={`/halls/${hall.hall_id}`} key={hall.hall_id} style={{ textDecoration: 'none' }}>
              <div className="card hall-card">
                {hall.primary_image
                  ? <img src={hall.primary_image} alt={hall.name} />
                  : <div className="hall-card-placeholder">💒</div>}
                <div className="card-body">
                  <h3>{hall.name}</h3>
                  <div className="hall-meta">
                    <span> {hall.capacity} guests</span>
                    <span> {hall.size_sqft} sqft</span>
                    {hall.location && <span> {hall.location}</span>}
                  </div>
                  <div className="hall-price">₹{Number(hall.price_per_day).toLocaleString()} / day</div>
                  <span className="badge badge-success">Available</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
