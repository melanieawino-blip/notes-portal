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

router.post('/lecturers/:id/approve', requireLogin, requireAdmin, (req, res) => {
  const info = db.prepare("UPDATE users SET status = 'approved' WHERE id = ? AND role = 'lecturer'").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Lecturer not found' });
  res.json({ ok: true });
});

router.post('/lecturers/:id/reject', requireLogin, requireAdmin, (req, res) => {
  const info = db.prepare("UPDATE users SET status = 'rejected' WHERE id = ? AND role = 'lecturer'").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Lecturer not found' });
  res.json({ ok: true });
});

module.exports = router;
