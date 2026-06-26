const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { verifyAdmin, verifyIntern, verifyToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../frontend/uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Get all interns (admin) ─────────────────────────────────
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT id, full_name, email, phone, school, department, internship_start, internship_end, status, profile_picture, created_at FROM interns';
    const params = [];
    const conditions = [];
    if (status) { conditions.push('status = ?'); params.push(status); }
    if (search) { conditions.push('(full_name LIKE ? OR email LIKE ? OR school LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get dashboard stats (admin) ─────────────────────────────
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM interns');
    const [[{ active }]] = await db.query("SELECT COUNT(*) as active FROM interns WHERE status='approved'");
    const [[{ pending }]] = await db.query("SELECT COUNT(*) as pending FROM interns WHERE status='pending'");
    const [[{ tasks }]] = await db.query("SELECT COUNT(*) as tasks FROM tasks");
    const [[{ attendance }]] = await db.query("SELECT COUNT(*) as attendance FROM attendance WHERE date=CURDATE()");
    res.json({ total, active, pending, tasks, attendance });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get single intern ────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, school, department, internship_start, internship_end, status, profile_picture, created_at FROM interns WHERE id=?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Intern not found.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Approve / Reject intern (admin) ─────────────────────────
router.patch('/:id/status', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    await db.query('UPDATE interns SET status=? WHERE id=?', [status, req.params.id]);
    // Send notification if approved
    if (status === 'approved') {
      await db.query(
        "INSERT INTO notifications (intern_id, title, message, type) VALUES (?, 'Account Approved', 'Your internship account has been approved. Welcome!', 'success')",
        [req.params.id]
      );
    }
    res.json({ message: `Intern ${status} successfully.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Add intern manually (admin) ─────────────────────────────
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { full_name, email, phone, school, department, internship_start, internship_end, password } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    const [existing] = await db.query('SELECT id FROM interns WHERE email=?', [email]);
    if (existing.length) return res.status(409).json({ message: 'Email already registered.' });
    const hashed = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO interns (full_name, email, phone, school, department, internship_start, internship_end, password, status) VALUES (?,?,?,?,?,?,?,?,?)',
      [full_name, email, phone || null, school || null, department || null, internship_start || null, internship_end || null, hashed, 'approved']
    );
    res.status(201).json({ message: 'Intern added successfully.', id: result.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Update intern profile ────────────────────────────────────
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { full_name, phone, school, department, internship_start, internship_end } = req.body;
    await db.query(
      'UPDATE interns SET full_name=?, phone=?, school=?, department=?, internship_start=?, internship_end=? WHERE id=?',
      [full_name, phone || null, school || null, department || null, internship_start || null, internship_end || null, req.params.id]
    );
    res.json({ message: 'Profile updated successfully.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Change password ──────────────────────────────────────────
router.patch('/:id/password', verifyToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const [rows] = await db.query('SELECT password FROM interns WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Intern not found.' });
    const match = await bcrypt.compare(current_password, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect.' });
    const hashed = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE interns SET password=? WHERE id=?', [hashed, req.params.id]);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Upload profile picture ────────────────────────────────────
router.post('/:id/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const url = '/uploads/' + req.file.filename;
    await db.query('UPDATE interns SET profile_picture=? WHERE id=?', [url, req.params.id]);
    res.json({ message: 'Profile picture updated.', url });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Delete intern (admin) ────────────────────────────────────
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM interns WHERE id=?', [req.params.id]);
    res.json({ message: 'Intern deleted successfully.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
