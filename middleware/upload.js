const multer = require('multer');
const path = require('path');
const fs = require('fs');

// If DATA_DIR is set (e.g. pointing at a Railway volume), uploaded PDFs are
// stored there so they survive redeploys. Otherwise defaults to a local
// uploads/ folder, which is fine for local development.
const UPLOAD_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '.pdf');
  }
});

function pdfOnly(req, file, cb) {
  const isPdf = file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf';
  if (!isPdf) return cb(new Error('Only PDF files are allowed'));
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: pdfOnly,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB cap — adjust if lecturers need bigger files
});

module.exports = upload;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
