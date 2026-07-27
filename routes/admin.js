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

// Auto-approve staff number list management
router.get('/auto-approve', requireLogin, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, staff_number, added_at FROM auto_approve_staff_numbers ORDER BY added_at DESC').all();
  res.json(rows);
});

router.post('/auto-approve', requireLogin, requireAdmin, (req, res) => {
  const { staff_number } = req.body;
  if (!staff_number || !staff_number.trim()) {
    return res.status(400).json({ error: 'Staff number is required' });
  }
  try {
    const info = db.prepare('INSERT INTO auto_approve_staff_numbers (staff_number) VALUES (?)').run(staff_number.trim());
    res.json({ id: info.lastInsertRowid, staff_number: staff_number.trim() });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'That staff number is already on the list' });
    }
    res.status(500).json({ error: 'Could not add staff number' });
  }
});

router.delete('/auto-approve/:id', requireLogin, requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM auto_approve_staff_numbers WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Entry not found' });
  res.json({ ok: true });
});
module.exports = router;
