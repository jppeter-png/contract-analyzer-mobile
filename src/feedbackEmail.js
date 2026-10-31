// Feedback goes out as an email the user sends from their own mail app: we receive nothing unless they press send,
// and the message never contains the document. Pure functions, so scripts/check-feedback.js can test them.
export const FEEDBACK_EMAIL = 'contractanalyzer@icloud.com';
export const FEEDBACK_SUBJECT = 'Document Risk Analyzer feedback';
export const FEEDBACK_KINDS = ['missed', 'tooMuch', 'summary', 'other'];

const KIND_LABEL = {
  missed: 'it missed a risk',
  tooMuch: "it flagged something that isn't a risk",
  summary: 'the summary is wrong or unclear',
  other: 'something else',
};

/** Technical context for whoever reads the email. English on purpose: it is for us, not for the user. */
export function feedbackDetails({ appVersion, osVersion, language, analysis = null, kind = null }) {
  const lines = [`App version: ${appVersion}`, `iOS: ${osVersion}`, `Language: ${language}`];
  if (kind) lines.push(`Feedback: ${KIND_LABEL[kind] || kind}`);
  if (analysis) {
    const issues = (analysis.issues || []).filter(i => i.type !== 'missing_protection');
    lines.push(
      `Document type: ${analysis.category || 'unknown'}`,
      `Overall risk: ${analysis.overall_risk}`,
      `Issues found: ${issues.length}`,
      `Sections: ${analysis.sections || 1}`,
      `From photos: ${analysis.source?.photos ? 'yes' : 'no'}`,
    );
  }
  return lines;
}

/** mailto: link with the subject and a body that tells the user to write above the technical lines. */
export function buildFeedbackUrl({ intro, details }) {
  const body = `${intro}\n\n\n---\n${details.join('\n')}`;
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(FEEDBACK_SUBJECT)}&body=${encodeURIComponent(body)}`;
}
