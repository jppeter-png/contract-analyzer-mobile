// Helpers for showing the redacted text with the placeholders picked out (no React Native imports).
// The server replaces personal details with tags like [NAME 1], [EMAIL] or [PHONE 2].

const TAG = /\[[A-Z]{2,10}(?: \d+)?\]/g;

/** Splits text into plain runs and redaction tags, in order. */
export function splitSegments(text) {
  const segments = [];
  let cursor = 0;
  for (const match of text.matchAll(TAG)) {
    if (match.index > cursor) segments.push({ text: text.slice(cursor, match.index), redacted: false });
    segments.push({ text: match[0], redacted: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), redacted: false });
  return segments;
}

/** Where each redaction starts in the text. */
export function redactionStarts(text) {
  return [...text.matchAll(TAG)].map(match => match.index);
}

/**
 * A readable passage that contains the redaction at `index`: it starts at the beginning of that
 * paragraph (or a little before it when the paragraph is long) and runs about `size` characters.
 */
export function passageAround(text, index = 0, size = 1200) {
  let start = index > 0 ? text.lastIndexOf('\n\n', index) + 2 : 0;
  if (start < 2 || index - start > 500) {
    start = Math.max(0, index - 300);
    // begin on a word boundary rather than mid-word
    while (start > 0 && start < index && !/\s/.test(text[start - 1])) start += 1;
  }
  let end = Math.min(text.length, start + size);
  if (end < text.length) {
    const lastSpace = text.lastIndexOf(' ', end);
    if (lastSpace > start + size * 0.6) end = lastSpace;
  }
  return { text: text.slice(start, end).trim(), cutBefore: start > 0, cutAfter: end < text.length };
}
