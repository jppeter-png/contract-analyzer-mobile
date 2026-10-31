// Run with `node scripts/check-feedback.js`. Checks the feedback email: where it goes, what the link looks like,
// and that nothing from the document or the analysis text can end up in it.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const read = file => fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
const strip = src => src.replace(/^import .*$/gm, '').replace(/^export /gm, '');
const { FEEDBACK_EMAIL, FEEDBACK_KINDS, feedbackDetails, buildFeedbackUrl } = new Function(
  `${strip(read('feedbackEmail.js'))}; return { FEEDBACK_EMAIL, FEEDBACK_KINDS, feedbackDetails, buildFeedbackUrl };`,
)();

let checks = 0;
const test = (name, fn) => { fn(); checks += 1; };
const base = { appVersion: '1.1.0', osVersion: '27.0', language: 'de' };

test('the link goes to the support address with an encoded subject and body', () => {
  const url = buildFeedbackUrl({ intro: 'Write here & now', details: ['App version: 1.1.0'] });
  assert(url.startsWith(`mailto:${FEEDBACK_EMAIL}?subject=`));
  const body = decodeURIComponent(url.split('&body=')[1]);
  assert(body.startsWith('Write here & now'));
  assert(body.includes('---\nApp version: 1.1.0'));
  assert(!url.includes(' '), 'no raw spaces in the link');
});

test('general feedback carries only app, iOS and language', () => {
  assert.deepStrictEqual(feedbackDetails(base), ['App version: 1.1.0', 'iOS: 27.0', 'Language: de']);
});

test('result feedback adds counts and the chosen reason, never analysis text', () => {
  const analysis = {
    category: 'residential lease', overall_risk: 'high', sections: 3, source: { photos: true },
    summary: 'SECRET SUMMARY about Maria Gonzalez',
    issues: [
      { type: 'unfair_clause', title: 'SECRET TITLE', description: 'SECRET DESCRIPTION' },
      { type: 'unfair_clause', title: 'another', description: 'x' },
      { type: 'missing_protection', title: 'not counted', description: 'y' },
    ],
    missing_protections: ['SECRET PROTECTION'],
  };
  const lines = feedbackDetails({ ...base, analysis, kind: 'missed' });
  assert(lines.includes('Feedback: it missed a risk'));
  assert(lines.includes('Issues found: 2'));
  assert(lines.includes('Sections: 3'));
  assert(lines.includes('From photos: yes'));
  assert(!lines.join('\n').includes('SECRET'));
  const url = buildFeedbackUrl({ intro: 'hi', details: lines });
  assert(!decodeURIComponent(url).includes('SECRET') && !decodeURIComponent(url).includes('Maria'));
});

test('an analysis with no sections or photo info still produces sane lines', () => {
  const lines = feedbackDetails({ ...base, analysis: { overall_risk: 'low', issues: [] } });
  assert(lines.includes('Document type: unknown') && lines.includes('Sections: 1') && lines.includes('From photos: no'));
});

test('every reason has a label and the four reasons are the ones the app offers', () => {
  assert.deepStrictEqual(FEEDBACK_KINDS, ['missed', 'tooMuch', 'summary', 'other']);
  for (const kind of FEEDBACK_KINDS) assert(!feedbackDetails({ ...base, kind }).join('').includes('undefined'));
});

console.log(`feedback OK: ${checks} checks`);
