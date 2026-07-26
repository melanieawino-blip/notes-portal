const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

// Pulls plain text out of a PDF so it can be stored and later searched or
// summarized. If a PDF is scanned images with no text layer, this will come
// back empty — that's fine, upload still succeeds, it just won't be
// searchable until OCR is added later.
const MAX_CHARS = 200000; // keep the stored text reasonable in size

// Figures out a sensible note title without the lecturer having to type one:
//   1. The PDF's own "Title" metadata, if the file has one set
//   2. Otherwise, the first real line of text in the document
//   3. Otherwise, the original filename (minus ".pdf")
// Some PDF exporters (ReportLab, Word, PowerPoint, Google Docs) leave a
// generic placeholder in the metadata title instead of nothing at all.
// Treat those the same as "no title set" rather than using them literally.
const JUNK_TITLES = [
  'untitled', 'untitled document', 'untitled document.docx',
  'document1', 'document', 'presentation1', 'presentation',
  'new microsoft word document', 'microsoft word - document1',
  'powerpoint presentation', 'slide 1'
];

function deriveTitle(pdfInfo, text, originalFilename) {
  const metaTitle = pdfInfo && pdfInfo.Title && pdfInfo.Title.trim();
  if (metaTitle && !JUNK_TITLES.includes(metaTitle.toLowerCase())) {
    return metaTitle.slice(0, 200);
  }

  const firstLine = text
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length >= 4 && !JUNK_TITLES.includes(line.toLowerCase()));

  if (firstLine) {
    return firstLine.slice(0, 200);
  }

  return path.basename(originalFilename, path.extname(originalFilename));
}

// Parses a PDF once, returning both its extracted text and a derived title.
async function parsePdf(filePath, originalFilename) {
  try {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    const text = (data.text || '').slice(0, MAX_CHARS);
    const title = deriveTitle(data.info, text, originalFilename);
    return { text, title };
  } catch (err) {
    console.error('PDF parsing failed:', err.message);
    return { text: '', title: path.basename(originalFilename, path.extname(originalFilename)) };
  }
}

module.exports = { parsePdf };
