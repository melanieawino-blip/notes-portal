const fs = require('fs');
const pdfParse = require('pdf-parse');

// Pulls plain text out of a PDF so it can be stored and later searched or
// summarized. If a PDF is scanned images with no text layer, this will come
// back empty — that's fine, upload still succeeds, it just won't be
// searchable until OCR is added later.
const MAX_CHARS = 200000; // keep the stored text reasonable in size

async function extractText(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return (data.text || '').slice(0, MAX_CHARS);
  } catch (err) {
    console.error('PDF text extraction failed:', err.message);
    return '';
  }
}

module.exports = { extractText };
