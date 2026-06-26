const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
    next();
  });
};

const verifyIntern = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'intern') return res.status(403).json({ message: 'Intern access required.' });
    next();
  });
};

module.exports = { verifyToken, verifyAdmin, verifyIntern };
