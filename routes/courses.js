const express = require('express');
const db = require('../db/init');
const { requireLogin, requireRole, requireApprovedLecturer } = require('../middleware/auth');

const router = express.Router();

// Anyone logged in can see the list of courses (needed to browse or upload)
router.get('/', requireLogin, (req, res) => {
  const courses = db.prepare('SELECT * FROM courses ORDER BY title').all();
  res.json(courses);
});

// Only approved lecturers can create new courses
router.post('/', requireLogin, requireRole('lecturer'), requireApprovedLecturer, (req, res) => {
  const { title, unit_code } = req.body;
  if (!title) return res.status(400).json({ error: 'Course title is required' });

  const info = db.prepare('INSERT INTO courses (title, unit_code) VALUES (?, ?)').run(title, unit_code || null);
  res.json({ id: info.lastInsertRowid, title, unit_code });
});

module.exports = router;
