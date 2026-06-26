const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyAdmin, verifyIntern, verifyToken } = require('../middleware/auth');

// ── Get all events ─────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    let q = `SELECT e.*, i.full_name as intern_name, a.full_name as admin_name
             FROM calendar_events e
             LEFT JOIN interns i ON e.intern_id = i.id
             JOIN admins a ON e.created_by = a.id`;
    const params = [];
    if (month && year) {
      q += ' WHERE MONTH(e.event_date)=? AND YEAR(e.event_date)=?';
      params.push(month, year);
    }
    q += ' ORDER BY e.event_date ASC';
    const [rows] = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Add event (admin) ──────────────────────────────────────
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { title, description, event_date, event_type, intern_id } = req.body;
    if (!title || !event_date) return res.status(400).json({ message: 'Title and date are required.' });
    const [result] = await db.query(
      'INSERT INTO calendar_events (title, description, event_date, event_type, intern_id, created_by) VALUES (?,?,?,?,?,?)',
      [title, description || null, event_date, event_type || 'other', intern_id || null, req.user.id]
    );
    res.status(201).json({ message: 'Event created.', id: result.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Delete event (admin) ───────────────────────────────────
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM calendar_events WHERE id=?', [req.params.id]);
    res.json({ message: 'Event deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
