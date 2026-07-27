const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// If DATA_DIR is set (e.g. pointing at a Railway volume), the database file
// lives there so it survives redeploys. Otherwise it defaults to this folder,
// which is fine for local development.
const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'notes-portal.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);
// --- Safe migration: enforce "no duplicate note title per lecturer per
// course" on databases that may already contain data from before this rule
// existed. Creating this as a plain CREATE UNIQUE INDEX would crash the app
// on startup if any old duplicates are already present — so instead we
// rename any duplicates out of the way first, then add the index.
try {
  const duplicates = db.prepare(`
    SELECT id, title, course_id, uploaded_by
    FROM notes n
    WHERE EXISTS (
      SELECT 1 FROM notes n2
      WHERE n2.course_id = n.course_id
        AND n2.uploaded_by = n.uploaded_by
        AND LOWER(n2.title) = LOWER(n.title)
        AND n2.id < n.id
    )
  `).all();

  if (duplicates.length > 0) {
    console.log(`Renaming ${duplicates.length} duplicate note title(s) found from before this rule existed...`);
    const rename = db.prepare('UPDATE notes SET title = title || ? WHERE id = ?');
    duplicates.forEach((row, i) => rename.run(` (older upload ${i + 1})`, row.id));
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_unique_title_per_lecturer_course
      ON notes(course_id, uploaded_by, title COLLATE NOCASE)
  `);
} catch (err) {
  console.error('Could not apply duplicate-title index (app will still run):', err.message);
}

module.exports = db;
