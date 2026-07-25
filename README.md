# AMREF ITC notes portal

A small web app: lecturers upload course notes as PDFs, students browse and
download them. Built and tested end-to-end (signup/login, upload, full-text
search, download).

## What's in here

- **Backend**: Node.js + Express
- **Database**: SQLite (a single file — nothing to install or host separately
  for a pilot). Swap for Postgres later with the same `db/schema.sql` if you
  outgrow it.
- **File storage**: PDFs saved to a local `uploads/` folder. Fine for a pilot;
  move to S3/Supabase Storage/Cloudflare R2 before a real public deployment
  (see "Going to production" below).
- **Frontend**: plain HTML/CSS/JS — three pages (login, lecturer dashboard,
  student dashboard), no framework needed.
- **Auth**: email/password, hashed with bcrypt, sessions via a signed cookie.
  Two roles: `lecturer` and `student`.

## Running it locally

```bash
npm install
cp .env.example .env
# open .env and set JWT_SECRET to any long random string
npm start
```

Then open `http://localhost:3000` in a browser. Create a lecturer account and
a student account (the signup form on the homepage lets you pick a role),
add a course as the lecturer, upload a PDF, then log in as the student to
find and download it.

## How it's already set up for the AI features you mentioned wanting later

You said you'd eventually want to (1) search *inside* the PDFs and (2)
auto-summarize a lecturer's notes. Both are already half-built:

- **Every PDF's text is extracted at upload time** (`utils/pdfText.js`, using
  `pdf-parse`) and stored in `notes.extracted_text`. The search endpoint
  (`GET /api/notes/search`) already searches that column, not just titles —
  right now it's a simple keyword match (SQL `LIKE`). When you're ready for
  smarter search (e.g. "find notes about postpartum bleeding" even if that
  exact phrase never appears), you upgrade the *query*, not the pipeline —
  swap the `LIKE` for a vector similarity search using embeddings, or a
  proper full-text search index. No re-processing of old PDFs needed since
  the text is already sitting there.
- **Auto-summarize is a working stub** (`POST /api/notes/:id/summarize`)
  that calls the Claude API if you set `ANTHROPIC_API_KEY` in `.env`. Right
  now it's disabled by default (returns a clear "not turned on yet" message)
  so nothing breaks if you don't set a key. The lecturer dashboard already
  has an "AI summary" button wired up to it — flip the key on and it works.

## Going to production (beyond a local pilot)

- Move file storage off local disk to S3/Supabase/R2 (avoids losing files if
  the server restarts or you need to scale)
- Move from SQLite to Postgres if you expect concurrent writes at scale
  (Supabase or Railway both offer a free tier)
- Deploy the app itself to Render, Railway, or Fly.io
- Add HTTPS (these platforms give you this for free) — never run real
  student/lecturer logins over plain HTTP
- Consider a virus scan step on upload if lecturers might use shared/public
  computers
- Upgrade `multer` to 2.x before going live (1.x has known vulnerabilities;
  kept at 1.x here only because it's the more stable API for a first pass)

## Project layout

```
notes-portal/
  server.js           entry point
  db/
    schema.sql        table definitions
    init.js           opens the SQLite file, applies schema
  routes/
    auth.js            signup / login / logout
    courses.js         list / create courses
    notes.js            upload / list / search / download / delete / summarize
  middleware/
    auth.js            login check + role check
    upload.js           multer config (PDF only, 25MB cap)
  utils/
    pdfText.js          extracts text from an uploaded PDF
  public/               the three HTML pages + their JS/CSS
```
