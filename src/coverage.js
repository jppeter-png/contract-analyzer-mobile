// Pure helpers (no React Native imports) for being honest about what an analysis could not see.

// Tesseract's own 0-100 score for how sure it was of the characters. It is only a rough signal
// (clear errors can still score high), so the general notice always shows for photos and the
// stronger one only appears when the score is clearly poor.
export const LOW_OCR_CONFIDENCE = 70;

/** What we know about where the text came from, saved with the analysis. Null for typed/uploaded text. */
export function sourceInfo(fromPhotos, ocrConfidence = 100) {
  return fromPhotos ? { photos: true, lowOcr: ocrConfidence < LOW_OCR_CONFIDENCE } : null;
}

const FILLER = new Set(['a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'and', 'or', 'no', 'any', 'clause', 'clauses', 'provision', 'provisions', 'protection', 'protections', 'is', 'are', 'not', 'missing', 'absent', 'mentioned', 'lacks', 'lack', 'without', 'there']);

const wordSet = text => new Set(
  String(text).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w && !FILLER.has(w))
);

/** Two descriptions of the same missing protection are worded differently each time, so compare by shared key words. */
export function similarText(a, b) {
  const x = wordSet(a);
  const y = wordSet(b);
  if (!x.size || !y.size) return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  let shared = 0;
  x.forEach(w => { if (y.has(w)) shared += 1; });
  return shared / Math.min(x.size, y.size) >= 0.6;
}

/**
 * A protection is only "missing" from a document read in sections if every section says so;
 * each section only sees its own part, so one section reporting it absent proves nothing.
 * `perSection` is a list (one per section) of lists of texts; returns the indexes, within the
 * first section's list, of the texts that every other section also reports.
 */
export function reportedInEverySection(perSection) {
  const [first = [], ...rest] = perSection;
  return first
    .map((text, index) => (rest.every(others => others.some(other => similarText(text, other))) ? index : -1))
    .filter(index => index >= 0);
}
