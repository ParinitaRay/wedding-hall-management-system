const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/bookings/hall/:hall_id - admin calendar
router.get("/hall/:hall_id", auth, adminOnly, async (req, res) => {
  try {
    const [bookings] = await db.query(`
      SELECT b.*, u.username, u.email,
        ts.slot_date, ts.start_time, ts.end_time
      FROM Bookings b
      JOIN Users u ON b.user_id = u.user_id
      JOIN TimeSlots ts ON b.slot_id = ts.slot_id
      WHERE b.hall_id = ? AND b.status != "Cancelled"
      ORDER BY ts.slot_date, ts.start_time
    `, [req.params.hall_id]);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings - user sees their bookings, admin sees all
router.get('/', auth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = `
        SELECT b.*, u.username, u.email, h.name AS hall_name,
          ts.slot_date, ts.start_time, ts.end_time
        FROM Bookings b
        JOIN Users u ON b.user_id = u.user_id
        JOIN Halls h ON b.hall_id = h.hall_id
        JOIN TimeSlots ts ON b.slot_id = ts.slot_id
        ORDER BY b.booking_date DESC
      `;
      params = [];
    } else {
      query = `
        SELECT b.*, h.name AS hall_name, h.price_per_day,
          ts.slot_date, ts.start_time, ts.end_time
        FROM Bookings b
        JOIN Halls h ON b.hall_id = h.hall_id
        JOIN TimeSlots ts ON b.slot_id = ts.slot_id
        WHERE b.user_id = ?
        ORDER BY b.booking_date DESC
      `;
      params = [req.user.user_id];
    }
    const [bookings] = await db.query(query, params);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/:id - single booking with payments
router.get('/:id', auth, async (req, res) => {
  try {
    const [bookings] = await db.query(`
      SELECT b.*, h.name AS hall_name, h.price_per_day,
        ts.slot_date, ts.start_time, ts.end_time,
        u.username, u.email
      FROM Bookings b
      JOIN Halls h ON b.hall_id = h.hall_id
      JOIN TimeSlots ts ON b.slot_id = ts.slot_id
      JOIN Users u ON b.user_id = u.user_id
      WHERE b.booking_id = ?
    `, [req.params.id]);

    if (bookings.length === 0) return res.status(404).json({ message: 'Booking not found' });

    const booking = bookings[0];
    if (req.user.role !== 'admin' && booking.user_id !== req.user.user_id)
      return res.status(403).json({ message: 'Access denied' });

    const [payments] = await db.query('SELECT * FROM Payments WHERE booking_id = ?', [req.params.id]);
    res.json({ ...booking, payments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/bookings - user creates booking
router.post('/', auth, async (req, res) => {
  const { hall_id, slot_id, notes } = req.body;
  if (!hall_id || !slot_id)
    return res.status(400).json({ message: 'hall_id and slot_id are required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Check slot is available
    const [slots] = await conn.query(
      'SELECT * FROM TimeSlots WHERE slot_id = ? AND hall_id = ? AND is_available = TRUE FOR UPDATE',
      [slot_id, hall_id]
    );
    if (slots.length === 0) {
      await conn.rollback();
      return res.status(409).json({ message: 'Slot is not available' });
    }

    // Create booking
    const [result] = await conn.query(
      'INSERT INTO Bookings (user_id, hall_id, slot_id, notes, status) VALUES (?,?,?,?,?)',
      [req.user.user_id, hall_id, slot_id, notes || '', 'Pending']
    );

    // Mark slot as unavailable
    await conn.query('UPDATE TimeSlots SET is_available = FALSE WHERE slot_id = ?', [slot_id]);

    await conn.commit();
    res.status(201).json({ booking_id: result.insertId, message: 'Booking submitted successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// PATCH /api/bookings/:id/status - admin updates booking status
router.patch('/:id/status', auth, adminOnly, async (req, res) => {
  const { status } = req.body;
  if (!['Pending', 'Confirmed', 'Cancelled'].includes(status))
    return res.status(400).json({ message: 'Invalid status' });

  try {
    // If cancelling, free up the slot
    if (status === 'Cancelled') {
      const [bookings] = await db.query('SELECT slot_id FROM Bookings WHERE booking_id = ?', [req.params.id]);
      if (bookings.length > 0) {
        await db.query('UPDATE TimeSlots SET is_available = TRUE WHERE slot_id = ?', [bookings[0].slot_id]);
      }
    }
    await db.query('UPDATE Bookings SET status = ? WHERE booking_id = ?', [status, req.params.id]);
    res.json({ message: `Booking ${status}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
