// Run with `node scripts/check-coverage.js`. Checks the pure logic behind "what this analysis
// didn't check": photo-source info, matching missing protections across sections, and the merge.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const read = file => fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
const strip = src => src.replace(/^import .*$/gm, '').replace(/^export /gm, '');

const coverage = new Function(`${strip(read('coverage.js'))}; return { LOW_OCR_CONFIDENCE, sourceInfo, similarText, reportedInEverySection };`)();
const { sourceInfo, similarText, reportedInEverySection } = coverage;
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

console.log(`coverage OK: ${checks} checks`);
