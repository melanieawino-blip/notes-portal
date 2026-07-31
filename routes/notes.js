const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db/init');
const { requireLogin, requireRole, requireApprovedLecturer } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { UPLOAD_DIR } = upload;
const { parsePdf } = require('../utils/pdfText');

const router = express.Router();

// --- Upload a note (lecturer only) ---
// Title is now optional: if left blank, it's read straight from the PDF
// (its metadata title, or its first line of text, or the filename as a last
// resort). A lecturer can still type their own title to override that.
router.post('/upload', requireLogin, requireRole('lecturer'), requireApprovedLecturer, upload.single('file'), async (req, res) => {
  const { course_id, title: titleOverride } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No file received' });
  if (!course_id) return res.status(400).json({ error: 'course_id is required' });

  const { text, title: derivedTitle } = await parsePdf(req.file.path, req.file.originalname);
  const title = (titleOverride && titleOverride.trim()) || derivedTitle;

  // Same lecturer can't upload two notes with the same title in the same course
  const duplicate = db.prepare(`
    SELECT id FROM notes WHERE course_id = ? AND uploaded_by = ? AND LOWER(title) = LOWER(?)
  `).get(course_id, req.user.id, title);

  if (duplicate) {
    fs.unlinkSync(req.file.path); // clean up the file we already saved to disk
    return res.status(409).json({ error: `You've already uploaded a note titled "${title}" for this course.` });
  }

  let info;
  try {
    info = db.prepare(`
      INSERT INTO notes (course_id, uploaded_by, title, file_path, original_filename, file_size, extracted_text)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(course_id, req.user.id, title, req.file.filename, req.file.originalname, req.file.size, text);
  } catch (err) {
    fs.unlinkSync(req.file.path);
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `You've already uploaded a note titled "${title}" for this course.` });
    }
    throw err;
  }

  res.json({ id: info.lastInsertRowid, title, course_id });
});

// --- List notes, optionally filtered by course, and optionally scoped to
// only the logged-in user's own uploads (mine=true). The lecturer dashboard
// always sends mine=true, so a lecturer only ever sees and can act on their
// own notes — never another lecturer's. Students never send mine=true, so
// they still see everything for a course as intended.
router.get('/', requireLogin, (req, res) => {
  const { course_id, mine } = req.query;
  const conditions = [];
  const params = [];

  if (course_id) {
    conditions.push('n.course_id = ?');
    params.push(course_id);
  }
  if (mine === 'true') {
    conditions.push('n.uploaded_by = ?');
    params.push(req.user.id);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT n.id, n.title, n.original_filename, n.file_size, n.created_at, n.summary,
           c.title AS course_title, u.name AS uploaded_by_name
    FROM notes n
    JOIN courses c ON c.id = n.course_id
    JOIN users u ON u.id = n.uploaded_by
    ${whereClause}
    ORDER BY n.created_at DESC
  `).all(...params);

  res.json(rows);
});

// --- Keyword search across titles and extracted PDF text ---
// This is today's simple version of "AI search" — plain keyword matching.
// Later you can swap this query for a vector/embedding search without
// touching anything else, because the text is already being stored.
router.get('/search', requireLogin, (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  const like = `%${q}%`;
  const rows = db.prepare(`
    SELECT n.id, n.title, n.original_filename, n.created_at,
           c.title AS course_title, u.name AS uploaded_by_name
    FROM notes n
    JOIN courses c ON c.id = n.course_id
    JOIN users u ON u.id = n.uploaded_by
    WHERE n.title LIKE ? OR n.extracted_text LIKE ?
    ORDER BY n.created_at DESC
  `).all(like, like);

  res.json(rows);
});

// --- Download a note ---
router.get('/:id/download', requireLogin, (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const filePath = path.join(UPLOAD_DIR, note.file_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on server' });

  res.download(filePath, note.original_filename || `${note.title}.pdf`);
});

// --- Delete a note (lecturer who owns it only) ---
router.delete('/:id', requireLogin, requireRole('lecturer'), requireApprovedLecturer, (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  if (note.uploaded_by !== req.user.id) return res.status(403).json({ error: 'You can only delete your own notes' });

  const filePath = path.join(UPLOAD_DIR, note.file_path);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);

  res.json({ ok: true });
});

module.exports = router;
