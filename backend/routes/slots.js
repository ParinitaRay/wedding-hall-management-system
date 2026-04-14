const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/slots/:hall_id?date=YYYY-MM-DD
router.get('/:hall_id', async (req, res) => {
  const { date } = req.query;
  try {
    let query = 'SELECT * FROM TimeSlots WHERE hall_id = ?';
    const params = [req.params.hall_id];
    if (date) { query += ' AND slot_date = ?'; params.push(date); }
    query += ' ORDER BY slot_date, start_time';
    const [slots] = await db.query(query, params);
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/slots - admin creates slot
router.post('/', auth, adminOnly, async (req, res) => {
  const { hall_id, slot_date, start_time, end_time } = req.body;
  if (!hall_id || !slot_date || !start_time || !end_time)
    return res.status(400).json({ message: 'All fields required' });

  try {
    const [result] = await db.query(
      'INSERT INTO TimeSlots (hall_id, slot_date, start_time, end_time, is_available) VALUES (?,?,?,?,TRUE)',
      [hall_id, slot_date, start_time, end_time]
    );
    res.status(201).json({ slot_id: result.insertId, message: 'Slot created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'Slot already exists for this hall/date/time' });
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/slots/:slot_id
router.delete('/:slot_id', auth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM TimeSlots WHERE slot_id = ?', [req.params.slot_id]);
    res.json({ message: 'Slot deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
