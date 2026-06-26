const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyAdmin, verifyIntern, verifyToken } = require('../middleware/auth');

// ── Get all tasks (admin) ──────────────────────────────────
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { status, intern_id } = req.query;
    let q = `SELECT t.*, i.full_name as intern_name, a.full_name as admin_name
             FROM tasks t
             JOIN interns i ON t.intern_id = i.id
             JOIN admins a ON t.assigned_by = a.id`;
    const params = [];
    const conds = [];
    if (status) { conds.push('t.status=?'); params.push(status); }
    if (intern_id) { conds.push('t.intern_id=?'); params.push(intern_id); }
    if (conds.length) q += ' WHERE ' + conds.join(' AND ');
    q += ' ORDER BY t.created_at DESC';
    const [rows] = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get intern's tasks ─────────────────────────────────────
router.get('/my', verifyIntern, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, a.full_name as admin_name FROM tasks t
       JOIN admins a ON t.assigned_by = a.id
       WHERE t.intern_id=? ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get task stats for intern ──────────────────────────────
router.get('/my/stats', verifyIntern, async (req, res) => {
  try {
    const [[{ total }]]    = await db.query('SELECT COUNT(*) as total FROM tasks WHERE intern_id=?', [req.user.id]);
    const [[{ pending }]]  = await db.query("SELECT COUNT(*) as pending FROM tasks WHERE intern_id=? AND status='pending'", [req.user.id]);
    const [[{ submitted }]]= await db.query("SELECT COUNT(*) as submitted FROM tasks WHERE intern_id=? AND status='submitted'", [req.user.id]);
    const [[{ approved }]] = await db.query("SELECT COUNT(*) as approved FROM tasks WHERE intern_id=? AND status='approved'", [req.user.id]);
    res.json({ total, pending, submitted, approved });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Assign task (admin) ─────────────────────────────────────
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { title, description, intern_id, deadline, priority } = req.body;
    if (!title || !intern_id) return res.status(400).json({ message: 'Title and intern are required.' });
    const [result] = await db.query(
      'INSERT INTO tasks (title, description, intern_id, assigned_by, deadline, priority) VALUES (?,?,?,?,?,?)',
      [title, description || null, intern_id, req.user.id, deadline || null, priority || 'medium']
    );
    // Notify intern
    await db.query(
      "INSERT INTO notifications (intern_id, title, message, type) VALUES (?, 'New Task Assigned', ?, 'info')",
      [intern_id, `You have been assigned a new task: "${title}"`]
    );
    res.status(201).json({ message: 'Task assigned.', id: result.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Submit task (intern) ─────────────────────────────────────
router.patch('/:id/submit', verifyIntern, async (req, res) => {
  try {
    const { submission_text } = req.body;
    await db.query(
      "UPDATE tasks SET status='submitted', submission_text=?, submitted_at=NOW() WHERE id=? AND intern_id=?",
      [submission_text || '', req.params.id, req.user.id]
    );
    res.json({ message: 'Task submitted successfully.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Review task (admin) ─────────────────────────────────────
router.patch('/:id/review', verifyAdmin, async (req, res) => {
  try {
    const { status, admin_feedback } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    const [taskRows] = await db.query('SELECT intern_id, title FROM tasks WHERE id=?', [req.params.id]);
    if (!taskRows.length) return res.status(404).json({ message: 'Task not found.' });
    await db.query(
      'UPDATE tasks SET status=?, admin_feedback=?, reviewed_at=NOW() WHERE id=?',
      [status, admin_feedback || null, req.params.id]
    );
    const msg = status === 'approved'
      ? `Your task "${taskRows[0].title}" has been approved! Great work.`
      : `Your task "${taskRows[0].title}" was rejected. Feedback: ${admin_feedback || 'No feedback provided.'}`;
    await db.query(
      'INSERT INTO notifications (intern_id, title, message, type) VALUES (?, ?, ?, ?)',
      [taskRows[0].intern_id, `Task ${status === 'approved' ? 'Approved' : 'Rejected'}`, msg, status === 'approved' ? 'success' : 'danger']
    );
    res.json({ message: `Task ${status}.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Update task (admin) ─────────────────────────────────────
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { title, description, deadline, priority } = req.body;
    await db.query(
      'UPDATE tasks SET title=?, description=?, deadline=?, priority=? WHERE id=?',
      [title, description || null, deadline || null, priority || 'medium', req.params.id]
    );
    res.json({ message: 'Task updated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Delete task (admin) ─────────────────────────────────────
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM tasks WHERE id=?', [req.params.id]);
    res.json({ message: 'Task deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
