const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// ── Admin Register ─────────────────────────────────────────
router.post('/admin/register', async (req, res) => {
  try {
    const { full_name, email, phone, position, password } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    const [existing] = await db.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ message: 'Email already registered.' });
    const hashed = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO admins (full_name, email, phone, position, password) VALUES (?,?,?,?,?)',
      [full_name, email, phone || null, position || 'Administrator', hashed]
    );
    const token = generateToken(result.insertId, 'admin');
    res.status(201).json({ message: 'Admin registered successfully.', token, role: 'admin', id: result.insertId, full_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during admin registration.' });
  }
});

// ── Admin Login ────────────────────────────────────────────
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required.' });
    const [rows] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials.' });
    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials.' });
    const token = generateToken(admin.id, 'admin');
    res.json({ token, role: 'admin', id: admin.id, full_name: admin.full_name, email: admin.email, profile_picture: admin.profile_picture });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// ── Intern Register ────────────────────────────────────────
router.post('/intern/register', async (req, res) => {
  try {
    const { full_name, email, phone, school, department, internship_start, internship_end, password } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    const [existing] = await db.query('SELECT id FROM interns WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ message: 'Email already registered.' });
    const hashed = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO interns (full_name, email, phone, school, department, internship_start, internship_end, password) VALUES (?,?,?,?,?,?,?,?)',
      [full_name, email, phone || null, school || null, department || null, internship_start || null, internship_end || null, hashed]
    );
    res.status(201).json({ message: 'Registration submitted. Awaiting admin approval.', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during intern registration.' });
  }
});

// ── Intern Login ───────────────────────────────────────────
router.post('/intern/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required.' });
    const [rows] = await db.query('SELECT * FROM interns WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials.' });
    const intern = rows[0];
    if (intern.status === 'pending') return res.status(403).json({ message: 'Your account is pending admin approval.' });
    if (intern.status === 'rejected') return res.status(403).json({ message: 'Your account has been rejected. Contact admin.' });
    const match = await bcrypt.compare(password, intern.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials.' });
    const token = generateToken(intern.id, 'intern');
    res.json({ token, role: 'intern', id: intern.id, full_name: intern.full_name, email: intern.email, profile_picture: intern.profile_picture });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

module.exports = router;
