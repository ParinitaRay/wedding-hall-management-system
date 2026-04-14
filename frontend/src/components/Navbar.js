import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">💒 Wedding<span>Hall</span></Link>
      <div className="navbar-links">
        <Link to="/halls">Browse Halls</Link>
        {user ? (
          <>
            {isAdmin ? (
              <Link to="/admin">Admin Dashboard</Link>
            ) : (
              <Link to="/my-bookings">My Bookings</Link>
            )}
            <button onClick={handleLogout} className="nav-btn">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="nav-btn">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}