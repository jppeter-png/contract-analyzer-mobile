// Run with `node scripts/check-coverage.js`. Checks the pure logic behind "what this analysis
// didn't check": photo-source info, matching missing protections across sections, and the merge.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const read = file => fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
const strip = src => src.replace(/^import .*$/gm, '').replace(/^export /gm, '');

const coverage = new Function(`${strip(read('coverage.js'))}; return { LOW_OCR_CONFIDENCE, sourceInfo, similarText, reportedInEverySection };`)();
const { sourceInfo, similarText, reportedInEverySection } = coverage;
const { isBusy, retryAfterSeconds, MAX_BUSY_RETRIES } = new Function(`${strip(read('rateLimit.js'))}; return { isBusy, retryAfterSeconds, MAX_BUSY_RETRIES };`)();
const { splitSegments, redactionStarts, passageAround } = new Function(`${strip(read('redactionPreview.js'))}; return { splitSegments, redactionStarts, passageAround };`)();
const chunking = new Function('t', 'reportedInEverySection',
  `${strip(read('analysisChunking.js'))}; return { mergeAnalyses };`)((key, vars) => `${key}:${JSON.stringify(vars || {})}`, reportedInEverySection);

let checks = 0;
const test = (name, fn) => { fn(); checks += 1; };

test('typed or uploaded text has no photo info', () => assert.strictEqual(sourceInfo(false, 10), null));
test('photos are flagged, low confidence more strongly', () => {
  assert.deepStrictEqual(sourceInfo(true, 90), { photos: true, lowOcr: false });
  assert.deepStrictEqual(sourceInfo(true, 55), { photos: true, lowOcr: true });
});

test('the same protection worded differently still matches', () => {
  assert(similarText('No severance clause', 'Severance pay is not mentioned'));
  assert(similarText('Cap on liability', 'No cap on liability for the landlord'));
  assert(!similarText('No severance clause', 'No data protection terms'));
});

test('a protection is missing only if every section reports it', () => {
  const sections = [
    ['No cap on liability', 'No severance clause'],
    ['Liability cap is absent'],
    ['No cap on liability', 'Data protection terms missing'],
  ];
  assert.deepStrictEqual(reportedInEverySection(sections), [0]);
  assert.deepStrictEqual(reportedInEverySection([['No severance clause']]), [0]);
  assert.deepStrictEqual(reportedInEverySection([['No severance clause'], []]), []);
});

test('merging keeps clause issues from every section and drops one-section "missing" claims', () => {
  const clause = (title, severity = 'medium') => ({ title, severity, type: 'unfair_clause' });
  const missing = title => ({ title, severity: 'low', type: 'missing_protection' });
  const merged = chunking.mergeAnalyses([
    { overall_risk: 'low', category: 'lease', summary: 'A', issues: [clause('Broad entry'), missing('No cap on liability')], missing_protections: ['No cap on liability', 'No notice period'] },
    { overall_risk: 'medium', category: 'lease', summary: 'B', issues: [clause('Late fee')], missing_protections: ['No notice period'] },
  ]);
  assert.strictEqual(merged.overall_risk, 'medium');
  assert.strictEqual(merged.sections, 2);
  assert.deepStrictEqual(merged.issues.map(i => i.title), ['Broad entry', 'Late fee']);
  assert.deepStrictEqual(merged.issues.map(i => i.section), [1, 2]);
  assert.deepStrictEqual(merged.missing_protections, ['No notice period']);
});

test('a missing-protection issue every section reports is kept', () => {
  const missing = title => ({ title, severity: 'low', type: 'missing_protection' });
  const merged = chunking.mergeAnalyses([
    { overall_risk: 'low', category: 'x', summary: 'A', issues: [missing('No cap on liability')], missing_protections: [] },
    { overall_risk: 'low', category: 'x', summary: 'B', issues: [missing('Liability cap is absent')], missing_protections: [] },
  ]);
  assert.deepStrictEqual(merged.issues.map(i => i.title), ['No cap on liability']);
});

test('a 429 is recognised as "AI service busy", other errors are not', () => {
  assert.strictEqual(isBusy({ response: { status: 429 } }), true);
  assert.strictEqual(isBusy({ response: { status: 500 } }), false);
  assert.strictEqual(isBusy(new Error('network')), false);
});

test('the wait follows the server hint, kept between 5 and 90 seconds', () => {
  assert.strictEqual(retryAfterSeconds({ response: { data: { retryAfter: 17 } } }), 17);
  assert.strictEqual(retryAfterSeconds({ response: { data: { retryAfter: 1 } } }), 5);
  assert.strictEqual(retryAfterSeconds({ response: { data: { retryAfter: 600 } } }), 90);
  assert.strictEqual(retryAfterSeconds({ response: { headers: { 'retry-after': '25' } } }), 25);
  assert.strictEqual(retryAfterSeconds({ response: {} }), 30);
  assert.strictEqual(retryAfterSeconds({}, 12), 12);
  assert(MAX_BUSY_RETRIES >= 1);
});

test('placeholders are picked out of the redacted text, numbered or not', () => {
  const text = 'Landlord [NAME 1] and [NAME 2] sign. Write to [EMAIL] or [PHONE 2]. Keep [brackets] and [A] as they are.';
  const tags = splitSegments(text).filter(s => s.redacted).map(s => s.text);
  assert.deepStrictEqual(tags, ['[NAME 1]', '[NAME 2]', '[EMAIL]', '[PHONE 2]']);
  assert.strictEqual(splitSegments(text).map(s => s.text).join(''), text);
  assert.strictEqual(redactionStarts(text).length, 4);
  assert.deepStrictEqual(splitSegments('no redactions here'), [{ text: 'no redactions here', redacted: false }]);
});

test('the preview passage starts near the first redaction, not at the top of the document', () => {
  const filler = 'Lorem ipsum dolor sit amet consectetur. '.repeat(60);
  const text = `Title\n\n${filler}\n\nSigned by [NAME 1] on the date above. ${filler}`;
  const at = redactionStarts(text)[0];
  const p = passageAround(text, at, 800);
  assert(p.text.includes('[NAME 1]'));
  assert(p.text.startsWith('Signed by'), `starts at the paragraph: ${p.text.slice(0, 30)}`);
  assert.strictEqual(p.cutBefore, true);
  assert.strictEqual(p.cutAfter, true);
  assert(p.text.length <= 800);
});

test('a long paragraph is entered a little before the redaction, on a word boundary', () => {
  const text = `${'alpha beta gamma delta '.repeat(100)}[EMAIL] ${'epsilon zeta '.repeat(100)}`;
  const p = passageAround(text, redactionStarts(text)[0], 600);
  assert(p.text.includes('[EMAIL]'));
  assert(/^[a-z]+ /.test(p.text), 'does not begin mid-word');
});

test('short documents come back whole', () => {
  const p = passageAround('Tenant [NAME] pays rent.', 7, 1200);
  assert.deepStrictEqual(p, { text: 'Tenant [NAME] pays rent.', cutBefore: false, cutAfter: false });
});

console.log(`coverage OK: ${checks} checks`);
