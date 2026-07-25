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

module.exports = db;
