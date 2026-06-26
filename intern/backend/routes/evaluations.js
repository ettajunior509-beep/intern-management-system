const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyAdmin, verifyToken } = require('../middleware/auth');

// ── Grade / evaluate intern (admin) ────────────────────────
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { intern_id, grade, performance_rating, comments } = req.body;
    if (!intern_id) return res.status(400).json({ message: 'intern_id is required.' });
    // Upsert evaluation
    const [existing] = await db.query('SELECT id FROM evaluations WHERE intern_id=? AND admin_id=?', [intern_id, req.user.id]);
    if (existing.length) {
      await db.query(
        'UPDATE evaluations SET grade=?, performance_rating=?, comments=? WHERE id=?',
        [grade || null, performance_rating || 'Good', comments || null, existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO evaluations (intern_id, admin_id, grade, performance_rating, comments) VALUES (?,?,?,?,?)',
        [intern_id, req.user.id, grade || null, performance_rating || 'Good', comments || null]
      );
    }
    // Notify intern
    await db.query(
      "INSERT INTO notifications (intern_id, title, message, type) VALUES (?, 'Internship Evaluation', 'Your internship has been evaluated. Check your profile for details.', 'info')",
      [intern_id]
    );
    res.json({ message: 'Evaluation saved.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get evaluation for intern ────────────────────────────────
router.get('/:intern_id', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*, a.full_name as admin_name FROM evaluations e
       JOIN admins a ON e.admin_id = a.id
       WHERE e.intern_id=? ORDER BY e.created_at DESC`,
      [req.params.intern_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
