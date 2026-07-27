const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/init');
const { requireLogin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Sign up — role must be 'lecturer' or 'student'.
//
// By default, signing up as 'lecturer' requires a staff number that YOU have
// pre-approved (added via scripts/add-staff-number.js). Set the environment
// variable REQUIRE_STAFF_NUMBER=false to switch this check off temporarily
// (e.g. while you're still collecting real staff numbers) — anyone can then
// sign up as a lecturer, same as before this feature existed. Flip it back
// to true (or just remove the variable) once you're ready to lock it down;
// no code changes needed either way.
const STAFF_NUMBER_CHECK_ENABLED = process.env.REQUIRE_STAFF_NUMBER !== 'false';

router.post('/signup', async (req, res) => {
  const { name, email, password, role, id_number } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password and role are all required' });
  }
  if (!['lecturer', 'student'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'lecturer' or 'student'" });
  }

  if (role === 'lecturer' && STAFF_NUMBER_CHECK_ENABLED) {
    if (!id_number || !id_number.trim()) {
      return res.status(400).json({ error: 'Staff number is required to sign up as a lecturer' });
    }
    const staffNumber = id_number.trim();
    const entry = db.prepare('SELECT * FROM lecturer_staff_numbers WHERE staff_number = ?').get(staffNumber);

    if (!entry) {
      return res.status(403).json({ error: 'That staff number is not recognized. Contact the administrator.' });
    }
    if (entry.claimed_by_user_id) {
      return res.status(403).json({ error: 'That staff number has already been used to create an account.' });
    }
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const password_hash = await bcrypt.hash(password, 10);
  const info = db.prepare(
    'INSERT INTO users (name, email, password_hash, role, id_number) VALUES (?, ?, ?, ?, ?)'
  ).run(name, email, password_hash, role, id_number ? id_number.trim() : null);

  // Mark the staff number as claimed so it can't be reused by anyone else
  // (only relevant when the check above is actually enabled and a real,
  // pre-approved number was supplied)
  if (role === 'lecturer' && STAFF_NUMBER_CHECK_ENABLED) {
    db.prepare('UPDATE lecturer_staff_numbers SET claimed_by_user_id = ? WHERE staff_number = ?')
      .run(info.lastInsertRowid, id_number.trim());
  }

  res.json({ id: info.lastInsertRowid, name, email, role });
});

// Log in — sets a cookie with a signed JWT
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ id: user.id, name: user.name, role: user.role });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', requireLogin, (req, res) => {
  res.json(req.user);
});

module.exports = router;
