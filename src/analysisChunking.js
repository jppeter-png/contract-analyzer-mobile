// Must match backend/src/routes/analyze.js's MAX_INPUT_CHARS.
export const MAX_CHARS_PER_ANALYSIS = 8000;

// How long to wait between chunk requests, to stay well under the model
// provider's per-minute rate limits on a slow/free tier.
export const CHUNK_INTERVAL_MS = 60000;

/**
 * Splits text into chunks no longer than maxLen, breaking on paragraph or
 * whitespace boundaries where possible so words/sentences aren't cut mid-way.
 */
export function chunkText(text, maxLen = MAX_CHARS_PER_ANALYSIS) {
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxLen, text.length);

    if (end < text.length) {
      // Prefer breaking at a paragraph break, then the last whitespace run,
      // but only if that break point isn't too far back (else we'd waste
      // most of the chunk budget on a single oddly-formatted paragraph).
      const window = text.slice(start, end);
      const paragraphBreak = window.lastIndexOf('\n\n');
      const lastWhitespace = window.search(/\s\S*$/);
      const breakAt = paragraphBreak > maxLen * 0.5 ? paragraphBreak
        : lastWhitespace > maxLen * 0.5 ? lastWhitespace
        : -1;

      if (breakAt > 0) {
        end = start + breakAt;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end;
  }

  return chunks.filter(Boolean);
}

/**
 * Estimated wall-clock time to process `chunkCount` chunks, given the fixed
 * inter-chunk pacing delay. Used to show the user an upfront ETA.
 */
export function estimateMinutes(chunkCount) {
  return Math.max(1, chunkCount); // ~1 minute per chunk, rounding up
}

const RISK_RANK = { high: 3, medium: 2, low: 1 };

/**
 * Merges per-chunk analysis results (each shaped like the /api/analyze
 * response) into a single combined analysis for display.
 */
export function mergeAnalyses(analyses) {
  if (analyses.length === 1) return analyses[0];

  const overall_risk = analyses.reduce((worst, a) => {
    return (RISK_RANK[a.overall_risk] || 0) > (RISK_RANK[worst] || 0) ? a.overall_risk : worst;
  }, 'low');

  const category = analyses.find(a => a.category && a.category !== 'auto')?.category
    || analyses[0].category;

  const summary = `This contract was long and analyzed in ${analyses.length} sections. `
    + analyses.map((a, i) => `Section ${i + 1}: ${a.summary}`).join(' ');

  const issues = analyses.flatMap((a, i) =>
    (a.issues || []).map(issue => ({ ...issue, section: i + 1 }))
  );

  const missing_protections = [...new Set(
    analyses.flatMap(a => a.missing_protections || [])
  )];

  return { overall_risk, category, summary, issues, missing_protections, truncated: false, chunked: true };
}
