import { t } from './i18n';
import { reportedInEverySection } from './coverage';

// Must match backend/src/routes/analyze.js's MAX_INPUT_CHARS. Most documents fit in one pass; a larger section
// keeps a definition and the clauses that use it together (8,000 characters split even a short contract).
export const MAX_CHARS_PER_ANALYSIS = 60000;

// Wait between section requests. Zero now that the AI account is on a paid tier; it was 60 s on the free tier's
// per-minute limit. A rate-limit reply is still handled (see rateLimit.js).
export const CHUNK_INTERVAL_MS = 0;

// One 60,000-character section takes about 7 s; rounded up for slower connections and busier moments.
const SECONDS_PER_SECTION = 15;

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
 * Estimated wall-clock time to process `chunkCount` chunks, including any
 * inter-chunk pacing delay. Used to show the user an upfront ETA.
 */
export function estimateMinutes(chunkCount) {
  const seconds = chunkCount * SECONDS_PER_SECTION + Math.max(0, chunkCount - 1) * (CHUNK_INTERVAL_MS / 1000);
  return Math.max(1, Math.ceil(seconds / 60));
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

  const summary = t('chunked.merged', { count: analyses.length })
    + analyses.map((a, i) => t('chunked.sectionLabel', { number: i + 1, summary: a.summary })).join(' ');

  // Each section only sees its own part of the document, so a protection counts as missing
  // only when every section reports it absent (see reportedInEverySection).
  const clauseIssues = analyses.flatMap((a, i) =>
    (a.issues || []).filter(issue => issue.type !== 'missing_protection').map(issue => ({ ...issue, section: i + 1 }))
  );
  const missingIssues = analyses.map(a => (a.issues || []).filter(issue => issue.type === 'missing_protection'));
  const commonIssues = reportedInEverySection(missingIssues.map(list => list.map(issue => issue.title)))
    .map(index => missingIssues[0][index]);
  const issues = [...clauseIssues, ...commonIssues];

  const protections = analyses.map(a => a.missing_protections || []);
  const missing_protections = reportedInEverySection(protections).map(index => protections[0][index]);

  return { overall_risk, category, summary, issues, missing_protections, truncated: false, chunked: true, sections: analyses.length };
}
