const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyAdmin } = require('../middleware/auth');

// ── Full summary report ────────────────────────────────────
router.get('/summary', verifyAdmin, async (req, res) => {
  try {
    const [[internStats]] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status='approved') as approved,
        SUM(status='pending')  as pending,
        SUM(status='rejected') as rejected
      FROM interns`);

    const [[taskStats]] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status='pending')   as pending,
        SUM(status='submitted') as submitted,
        SUM(status='approved')  as approved,
        SUM(status='rejected')  as rejected
      FROM tasks`);

    const [[attendanceStats]] = await db.query(`
      SELECT
        COUNT(*)             as total_records,
        SUM(status='present') as present,
        SUM(status='late')    as late,
        SUM(status='absent')  as absent
      FROM attendance`);

    const [topInterns] = await db.query(`
      SELECT i.full_name, COUNT(t.id) as tasks_completed, e.grade, e.performance_rating
      FROM interns i
      LEFT JOIN tasks t     ON i.id = t.intern_id AND t.status='approved'
      LEFT JOIN evaluations e ON i.id = e.intern_id
      WHERE i.status='approved'
      GROUP BY i.id, i.full_name, e.grade, e.performance_rating
      ORDER BY tasks_completed DESC
      LIMIT 10`);

    const [monthlyAttendance] = await db.query(`
      SELECT DATE_FORMAT(date, '%Y-%m') as month,
             SUM(status='present') as present,
             SUM(status='late')    as late,
             SUM(status='absent')  as absent
      FROM attendance
      GROUP BY month ORDER BY month DESC LIMIT 6`);

    res.json({ internStats, taskStats, attendanceStats, topInterns, monthlyAttendance });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Per-intern report ──────────────────────────────────────
router.get('/intern/:id', verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const [[intern]] = await db.query(
      'SELECT id, full_name, email, school, department, internship_start, internship_end, status FROM interns WHERE id=?', [id]);
    if (!intern) return res.status(404).json({ message: 'Intern not found.' });

    const [[taskStats]]= await db.query(`
      SELECT COUNT(*) as total, SUM(status='approved') as approved, SUM(status='rejected') as rejected
      FROM tasks WHERE intern_id=?`, [id]);

    const [[attStats]] = await db.query(`
      SELECT COUNT(*) as total, SUM(status='present') as present, SUM(status='late') as late, SUM(status='absent') as absent
      FROM attendance WHERE intern_id=?`, [id]);

    const [evaluation]  = await db.query(
      `SELECT e.*, a.full_name as admin_name FROM evaluations e JOIN admins a ON e.admin_id=a.id WHERE e.intern_id=?`, [id]);

    res.json({ intern, taskStats, attStats, evaluation: evaluation[0] || null });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
