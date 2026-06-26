const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyAdmin, verifyIntern, verifyToken } = require('../middleware/auth');

// ── Get intern notifications ───────────────────────────────
router.get('/my', verifyIntern, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE intern_id=? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Mark as read ───────────────────────────────────────────
router.patch('/:id/read', verifyIntern, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=TRUE WHERE id=? AND intern_id=?', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Mark all read ──────────────────────────────────────────
router.patch('/read-all', verifyIntern, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=TRUE WHERE intern_id=?', [req.user.id]);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Send notification to intern (admin) ───────────────────
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { intern_id, title, message, type } = req.body;
    if (!intern_id || !title || !message) return res.status(400).json({ message: 'intern_id, title and message required.' });
    await db.query(
      'INSERT INTO notifications (intern_id, title, message, type) VALUES (?,?,?,?)',
      [intern_id, title, message, type || 'info']
    );
    res.status(201).json({ message: 'Notification sent.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
