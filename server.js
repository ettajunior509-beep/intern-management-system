const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static Files ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../frontend/uploads')));
app.use('/image', express.static(path.join(__dirname, '../image')));

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/interns',       require('./routes/interns'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/attendance',    require('./routes/attendance'));
app.use('/api/calendar',      require('./routes/calendar'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/evaluations',   require('./routes/evaluations'));
app.use('/api/reports',       require('./routes/reports'));

// ── Admin profile routes ────────────────────────────────────
const db = require('./config/db');
const bcrypt = require('bcryptjs');
const { verifyAdmin } = require('./middleware/auth');
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../frontend/uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.get('/api/admin/profile', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id,full_name,email,phone,position,profile_picture,created_at FROM admins WHERE id=?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Admin not found.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/admin/profile', verifyAdmin, async (req, res) => {
  try {
    const { full_name, phone, position } = req.body;
    await db.query('UPDATE admins SET full_name=?, phone=?, position=? WHERE id=?', [full_name, phone || null, position || 'Administrator', req.user.id]);
    res.json({ message: 'Profile updated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/admin/password', verifyAdmin, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const [rows] = await db.query('SELECT password FROM admins WHERE id=?', [req.user.id]);
    const match = await bcrypt.compare(current_password, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Current password incorrect.' });
    const hashed = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE admins SET password=? WHERE id=?', [hashed, req.user.id]);
    res.json({ message: 'Password changed.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/admin/avatar', verifyAdmin, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const url = '/uploads/' + req.file.filename;
    await db.query('UPDATE admins SET profile_picture=? WHERE id=?', [url, req.user.id]);
    res.json({ message: 'Avatar updated.', url });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Catch-all → serve frontend ─────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const initializeDatabase = require('./intern/backend/initDb');

app.listen(PORT, async () => {
  console.log(`🚀 Intern Management Server running on http://localhost:${PORT}`);
  await initializeDatabase();
});
