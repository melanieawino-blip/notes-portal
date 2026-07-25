-- Users: both lecturers and students live in one table, told apart by role
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('lecturer', 'student')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Courses / units notes get attached to
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  unit_code TEXT
);

-- Notes: one row per uploaded PDF
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id),
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  original_filename TEXT,
  file_size INTEGER,
  -- Full text pulled out of the PDF at upload time. Not used yet, but this is
  -- exactly what you'll search over later ("find every note that mentions
  -- DHIS2") without needing to re-process every PDF you've already uploaded.
  extracted_text TEXT,
  -- AI-generated summary, filled in on demand later by calling an LLM.
  -- NULL until a lecturer asks for one.
  summary TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_course ON notes(course_id);
