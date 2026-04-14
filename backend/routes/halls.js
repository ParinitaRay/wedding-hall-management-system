const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// Multer config - save to /uploads with unique filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `hall_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// GET /api/halls - list all active halls
router.get('/', async (req, res) => {
  try {
    const [halls] = await db.query(`
      SELECT h.*, 
        (SELECT image_url FROM Hall_Images WHERE hall_id = h.hall_id AND is_primary = TRUE LIMIT 1) AS primary_image
      FROM Halls h WHERE h.status = 'Active'
    `);
    res.json(halls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/halls/all - admin gets all halls
router.get('/all', auth, adminOnly, async (req, res) => {
  try {
    const [halls] = await db.query(`
      SELECT h.*, 
        (SELECT image_url FROM Hall_Images WHERE hall_id = h.hall_id AND is_primary = TRUE LIMIT 1) AS primary_image
      FROM Halls h
    `);
    res.json(halls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/halls/:id - single hall with images
router.get('/:id', async (req, res) => {
  try {
    const [halls] = await db.query('SELECT * FROM Halls WHERE hall_id = ?', [req.params.id]);
    if (halls.length === 0) return res.status(404).json({ message: 'Hall not found' });
    const [images] = await db.query('SELECT * FROM Hall_Images WHERE hall_id = ?', [req.params.id]);
    res.json({ ...halls[0], images });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/halls - admin creates a hall
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, capacity, size_sqft, price_per_day, description, location, status } = req.body;
  if (!name || !capacity || !size_sqft || !price_per_day)
    return res.status(400).json({ message: 'Required fields missing' });
  try {
    const [result] = await db.query(
      'INSERT INTO Halls (name, capacity, size_sqft, price_per_day, description, location, status) VALUES (?,?,?,?,?,?,?)',
      [name, capacity, size_sqft, price_per_day, description || '', location || '', status || 'Active']
    );
    res.status(201).json({ hall_id: result.insertId, message: 'Hall created' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/halls/:id - admin updates a hall
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, capacity, size_sqft, price_per_day, description, location, status } = req.body;
  try {
    await db.query(
      'UPDATE Halls SET name=?, capacity=?, size_sqft=?, price_per_day=?, description=?, location=?, status=? WHERE hall_id=?',
      [name, capacity, size_sqft, price_per_day, description, location, status, req.params.id]
    );
    res.json({ message: 'Hall updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/halls/:id - admin deletes a hall
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM Halls WHERE hall_id = ?', [req.params.id]);
    res.json({ message: 'Hall deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/halls/:id/images - upload image file
router.post('/:id/images', auth, adminOnly, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image file provided' });

  const imageUrl = `/uploads/${req.file.filename}`;
  const isPrimary = req.body.is_primary === 'true';

  try {
    if (isPrimary) {
      await db.query('UPDATE Hall_Images SET is_primary = FALSE WHERE hall_id = ?', [req.params.id]);
    }
    // If no images exist yet, make this one primary automatically
    const [existing] = await db.query('SELECT COUNT(*) as count FROM Hall_Images WHERE hall_id = ?', [req.params.id]);
    const makePrimary = isPrimary || existing[0].count === 0;

    const [result] = await db.query(
      'INSERT INTO Hall_Images (hall_id, image_url, is_primary) VALUES (?,?,?)',
      [req.params.id, imageUrl, makePrimary]
    );
    res.status(201).json({ img_id: result.insertId, image_url: imageUrl, message: 'Image uploaded' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/halls/images/:img_id - delete image and file
router.delete('/images/:img_id', auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT image_url FROM Hall_Images WHERE img_id = ?', [req.params.img_id]);
    if (rows.length > 0) {
      const filePath = path.join(__dirname, '..', rows[0].image_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.query('DELETE FROM Hall_Images WHERE img_id = ?', [req.params.img_id]);
    res.json({ message: 'Image deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;