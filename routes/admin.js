const express = require('express');
const db = require('../db/init');
const { requireLogin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// List every lecturer account, pending ones first, so the admin sees who
// needs a decision right away.
router.get('/lecturers', requireLogin, requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, email, id_number AS staff_number, status, created_at
    FROM users
    WHERE role = 'lecturer'
    ORDER BY
      CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
      created_at DESC
  `).all();

  res.json(rows);
});

// Approving looks up the lecturer's email and adds it to the trusted list,
// so that same email is auto-approved forever after — even if this exact
// account is ever deleted and they sign up again later.
router.post('/lecturers/:id/approve', requireLogin, requireAdmin, (req, res) => {
  const lecturer = db.prepare("SELECT email FROM users WHERE id = ? AND role = 'lecturer'").get(req.params.id);
  if (!lecturer) return res.status(404).json({ error: 'Lecturer not found' });

  db.prepare("UPDATE users SET status = 'approved' WHERE id = ?").run(req.params.id);
  db.prepare('INSERT OR IGNORE INTO auto_approved_emails (email) VALUES (?)').run(lecturer.email);

  res.json({ ok: true });
});

router.post('/lecturers/:id/reject', requireLogin, requireAdmin, (req, res) => {
  const info = db.prepare("UPDATE users SET status = 'rejected' WHERE id = ? AND role = 'lecturer'").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Lecturer not found' });
  res.json({ ok: true });
});

// --- Auto-approved emails ---
// Anyone signing up as a lecturer with an email on this list skips the
// pending queue entirely. Grows automatically as you approve lecturers, and
// you can also add emails here directly ahead of time.
router.get('/auto-approve', requireLogin, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT email, added_at FROM auto_approved_emails ORDER BY added_at DESC').all();
  res.json(rows);
});

router.post('/auto-approve', requireLogin, requireAdmin, (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    db.prepare('INSERT INTO auto_approved_emails (email) VALUES (?)').run(email.trim());
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'That email is already on the auto-approve list' });
    }
    throw err;
  }
  res.json({ ok: true });
});

router.delete('/auto-approve/:email', requireLogin, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM auto_approved_emails WHERE email = ?').run(req.params.email);
  res.json({ ok: true });
});

module.exports = router;
