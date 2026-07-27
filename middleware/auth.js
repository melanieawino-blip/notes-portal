const jwt = require('jsonwebtoken');
const db = require('../db/init');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireLogin(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Only ${role}s can do this` });
    }
    next();
  };
}

function requireApprovedLecturer(req, res, next) {
  const user = db.prepare('SELECT status FROM users WHERE id = ?').get(req.user.id);
  if (!user || user.status !== 'approved') {
    return res.status(403).json({
      error: 'Your lecturer account is still pending admin approval. You\'ll be able to do this once approved.'
    });
  }
  next();
}

function requireAdmin(req, res, next) {
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (!adminEmail || req.user.email.toLowerCase() !== adminEmail) {
    return res.status(403).json({ error: 'Admin access only' });
  }
  next();
}

module.exports = { requireLogin, requireRole, requireApprovedLecturer, requireAdmin, JWT_SECRET };
