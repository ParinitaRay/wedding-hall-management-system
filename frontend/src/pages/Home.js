import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  return (
    <div>
      <div className="hero">
        <h1> Find Your Perfect Wedding Venue</h1>
        <p>Browse beautiful halls, check availability, and book instantly.</p>
        <Link to="/halls" className="btn btn-primary" style={{ marginRight: '1rem' }}>
          Browse Halls
        </Link>
        {!user && <Link to="/register" className="btn btn-outline">
          Get Started
        </Link>}
      </div>

      <div className="page" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <h2 style={{ color: 'var(--espresso)', marginBottom: '1rem' }}>How It Works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          {[
            { icon: '🔍', title: 'Browse Halls', desc: 'Explore our curated list of premium wedding venues.' },
            { icon: '📅', title: 'Check Availability', desc: 'Pick your date and see available time slots.' },
            { icon: '✅', title: 'Book Instantly', desc: 'Submit a booking request in just a few clicks.' },
          ].map((s, i) => (
            <div key={i} className="card card-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
              <h3 style={{ marginBottom: '0.5rem', color: 'var(--terracotta)' }}>{s.title}</h3>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}