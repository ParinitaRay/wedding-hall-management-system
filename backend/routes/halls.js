const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|webp|gif/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

const uploadToCloudinary = (buffer) => new Promise((resolve, reject) => {
  cloudinary.uploader.upload_stream({ folder: 'wedding-hall' }, (err, result) => {
    if (err) reject(err); else resolve(result);
  }).end(buffer);
});

// GET /api/halls
router.get('/', async (req, res) => {
  try {
    const [halls] = await db.query(`
      SELECT h.*,
        (SELECT image_url FROM Hall_Images WHERE hall_id = h.hall_id AND is_primary = TRUE LIMIT 1) AS primary_image
      FROM Halls h WHERE h.status = 'Active'
    `);
    res.json(halls);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/halls/all
router.get('/all', auth, adminOnly, async (req, res) => {
  try {
    const [halls] = await db.query(`
      SELECT h.*,
        (SELECT image_url FROM Hall_Images WHERE hall_id = h.hall_id AND is_primary = TRUE LIMIT 1) AS primary_image
      FROM Halls h
    `);
    res.json(halls);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/halls/images/:img_id — MUST be before /:id
router.delete('/images/:img_id', auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT cloudinary_id FROM Hall_Images WHERE img_id = ?', [req.params.img_id]);
    if (rows.length > 0 && rows[0].cloudinary_id) {
      await cloudinary.uploader.destroy(rows[0].cloudinary_id);
    }
    await db.query('DELETE FROM Hall_Images WHERE img_id = ?', [req.params.img_id]);
    res.json({ message: 'Image deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/halls/:id
router.get('/:id', async (req, res) => {
  try {
    const [halls] = await db.query('SELECT * FROM Halls WHERE hall_id = ?', [req.params.id]);
    if (halls.length === 0) return res.status(404).json({ message: 'Hall not found' });
    const [images] = await db.query('SELECT * FROM Hall_Images WHERE hall_id = ?', [req.params.id]);
    res.json({ ...halls[0], images });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/halls
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
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/halls/:id
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, capacity, size_sqft, price_per_day, description, location, status } = req.body;
  try {
    await db.query(
      'UPDATE Halls SET name=?, capacity=?, size_sqft=?, price_per_day=?, description=?, location=?, status=? WHERE hall_id=?',
      [name, capacity, size_sqft, price_per_day, description, location, status, req.params.id]
    );
    res.json({ message: 'Hall updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/halls/:id
router.delete('/:id', auth, adminOnly, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Delete in correct order to respect foreign key constraints
    await conn.query('DELETE FROM Payments WHERE booking_id IN (SELECT booking_id FROM Bookings WHERE hall_id = ?)', [req.params.id]);
    await conn.query('DELETE FROM Bookings WHERE hall_id = ?', [req.params.id]);
    await conn.query('DELETE FROM TimeSlots WHERE hall_id = ?', [req.params.id]);
    // Hall_Images cascade automatically, but delete Cloudinary images first
    const [images] = await conn.query('SELECT cloudinary_id FROM Hall_Images WHERE hall_id = ?', [req.params.id]);
    for (const img of images) {
      if (img.cloudinary_id) {
        try { await cloudinary.uploader.destroy(img.cloudinary_id); } catch {}
      }
    }
    await conn.query('DELETE FROM Halls WHERE hall_id = ?', [req.params.id]);
    await conn.commit();
    res.json({ message: 'Hall deleted' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// POST /api/halls/:id/images
router.post('/:id/images', auth, adminOnly, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image file provided' });
  const isPrimary = req.body.is_primary === 'true';
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    if (isPrimary) {
      await db.query('UPDATE Hall_Images SET is_primary = FALSE WHERE hall_id = ?', [req.params.id]);
    }
    const [existing] = await db.query('SELECT COUNT(*) as count FROM Hall_Images WHERE hall_id = ?', [req.params.id]);
    const makePrimary = isPrimary || existing[0].count === 0;
    const [dbResult] = await db.query(
      'INSERT INTO Hall_Images (hall_id, image_url, cloudinary_id, is_primary) VALUES (?,?,?,?)',
      [req.params.id, result.secure_url, result.public_id, makePrimary]
    );
    res.status(201).json({ img_id: dbResult.insertId, image_url: result.secure_url, message: 'Image uploaded' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;