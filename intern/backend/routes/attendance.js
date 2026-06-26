const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyAdmin, verifyIntern, verifyToken } = require('../middleware/auth');

// ── Check-in (intern) ─────────────────────────────────────
router.post('/checkin', verifyIntern, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0];
    const [existing] = await db.query('SELECT id FROM attendance WHERE intern_id=? AND date=?', [req.user.id, today]);
    if (existing.length) return res.status(409).json({ message: 'Already checked in today.' });
    // Determine late: after 9:00 AM
    const hour = parseInt(time.split(':')[0]);
    const status = hour >= 9 ? 'late' : 'present';
    await db.query(
      'INSERT INTO attendance (intern_id, date, check_in_time, status) VALUES (?,?,?,?)',
      [req.user.id, today, time, status]
    );
    res.status(201).json({ message: `Checked in at ${time}. Status: ${status}.`, status, time });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get my attendance (intern) ─────────────────────────────
router.get('/my', verifyIntern, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM attendance WHERE intern_id=? ORDER BY date DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get attendance summary for intern ─────────────────────
router.get('/my/summary', verifyIntern, async (req, res) => {
  try {
    const [[{ present }]] = await db.query("SELECT COUNT(*) as present FROM attendance WHERE intern_id=? AND status='present'", [req.user.id]);
    const [[{ late }]]    = await db.query("SELECT COUNT(*) as late FROM attendance WHERE intern_id=? AND status='late'", [req.user.id]);
    const [[{ absent }]]  = await db.query("SELECT COUNT(*) as absent FROM attendance WHERE intern_id=? AND status='absent'", [req.user.id]);
    const today = new Date().toISOString().split('T')[0];
    const [todayRec] = await db.query('SELECT * FROM attendance WHERE intern_id=? AND date=?', [req.user.id, today]);
    res.json({ present, late, absent, total: present + late + absent, todayRecord: todayRec[0] || null });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get all attendance (admin) ─────────────────────────────
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { intern_id, date, status } = req.query;
    let q = `SELECT a.*, i.full_name as intern_name FROM attendance a
             JOIN interns i ON a.intern_id = i.id`;
    const params = [];
    const conds = [];
    if (intern_id) { conds.push('a.intern_id=?'); params.push(intern_id); }
    if (date)      { conds.push('a.date=?'); params.push(date); }
    if (status)    { conds.push('a.status=?'); params.push(status); }
    if (conds.length) q += ' WHERE ' + conds.join(' AND ');
    q += ' ORDER BY a.date DESC, i.full_name ASC';
    const [rows] = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get attendance stats by intern (admin) ─────────────────
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.id, i.full_name,
        SUM(a.status='present') as present,
        SUM(a.status='late')    as late,
        SUM(a.status='absent')  as absent,
        COUNT(a.id) as total
      FROM interns i
      LEFT JOIN attendance a ON i.id = a.intern_id
      WHERE i.status='approved'
      GROUP BY i.id, i.full_name
      ORDER BY i.full_name
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Mark absent manually (admin) ──────────────────────────
router.post('/mark-absent', verifyAdmin, async (req, res) => {
  try {
    const { intern_id, date } = req.body;
    const [existing] = await db.query('SELECT id FROM attendance WHERE intern_id=? AND date=?', [intern_id, date]);
    if (existing.length) {
      await db.query("UPDATE attendance SET status='absent' WHERE intern_id=? AND date=?", [intern_id, date]);
    } else {
      await db.query("INSERT INTO attendance (intern_id, date, status) VALUES (?,?,'absent')", [intern_id, date]);
    }
    res.json({ message: 'Marked as absent.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
