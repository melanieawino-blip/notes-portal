const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/init');
const { requireLogin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function isAdmin(email) {
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  return !!adminEmail && email.toLowerCase() === adminEmail;
}

// Sign up — role must be 'lecturer' or 'student'.
//
// Signing up as 'lecturer' requires a staff number, but it's no longer
// checked against a pre-made list. Instead, the account is created with
// status 'pending' — the admin (see ADMIN_EMAIL) reviews it on the Admin
// page and approves or rejects it there. A lecturer can log in right away,
// but can't add courses or upload notes until approved (enforced in
// middleware/auth.js's requireApprovedLecturer, checked fresh from the
// database on every request — not something a stale login token can get around).
router.post('/signup', async (req, res) => {
  const { name, email, password, role, id_number } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password and role are all required' });
  }
  if (!['lecturer', 'student'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'lecturer' or 'student'" });
  }
  if (role === 'lecturer' && (!id_number || !id_number.trim())) {
    return res.status(400).json({ error: 'Staff number is required to sign up as a lecturer' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const password_hash = await bcrypt.hash(password, 10);
  const status = role === 'lecturer' ? 'pending' : 'approved';

  const info = db.prepare(
    'INSERT INTO users (name, email, password_hash, role, id_number, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email, password_hash, role, id_number ? id_number.trim() : null, status);

  res.json({ id: info.lastInsertRowid, name, email, role, status });
});

// Log in — sets a cookie with a signed JWT
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role, email: user.email, status: user.status },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ id: user.id, name: user.name, role: user.role, status: user.status, is_admin: isAdmin(user.email) });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', requireLogin, (req, res) => {
  // Re-check status/is_admin fresh from the DB rather than trusting the
  // token, so an approval that just happened shows up immediately.
  const user = db.prepare('SELECT email, status FROM users WHERE id = ?').get(req.user.id);
  res.json({ ...req.user, status: user ? user.status : req.user.status, is_admin: user ? isAdmin(user.email) : false });
});

module.exports = router;
