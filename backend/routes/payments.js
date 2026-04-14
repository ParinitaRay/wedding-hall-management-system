const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/payments/:booking_id
router.get('/:booking_id', auth, async (req, res) => {
  try {
    const [payments] = await db.query(
      'SELECT * FROM Payments WHERE booking_id = ? ORDER BY payment_date DESC',
      [req.params.booking_id]
    );
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/payments - admin records a payment
router.post('/', auth, adminOnly, async (req, res) => {
  const { booking_id, amount, payment_type } = req.body;
  if (!booking_id || !amount || !payment_type)
    return res.status(400).json({ message: 'All fields required' });

  try {
    const [result] = await db.query(
      'INSERT INTO Payments (booking_id, amount, payment_type) VALUES (?,?,?)',
      [booking_id, amount, payment_type]
    );
    res.status(201).json({ payment_id: result.insertId, message: 'Payment recorded' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/payments - admin gets all payments summary
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const [payments] = await db.query(`
      SELECT p.*, b.status AS booking_status, u.username, h.name AS hall_name
      FROM Payments p
      JOIN Bookings b ON p.booking_id = b.booking_id
      JOIN Users u ON b.user_id = u.user_id
      JOIN Halls h ON b.hall_id = h.hall_id
      ORDER BY p.payment_date DESC
    `);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
