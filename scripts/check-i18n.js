// Run with `node scripts/check-i18n.js`. Fails (exit 1) when a translation is missing or
// inconsistent, or when the code asks for a key that doesn't exist.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const LANGS = ['en', 'es', 'fr', 'de', 'pt'];

const load = lang => {
  const src = fs.readFileSync(path.join(root, 'src/i18n/locales', `${lang}.js`), 'utf8');
  const body = src.slice(src.indexOf('export default') + 'export default'.length).trim().replace(/;\s*$/, '');
  return new Function(`return (${body})`)();
};
const catalogs = Object.fromEntries(LANGS.map(l => [l, load(l)]));
const placeholders = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

const problems = [];
const en = catalogs.en;

for (const lang of LANGS.slice(1)) {
  const c = catalogs[lang];
  for (const key of Object.keys(en)) {
    if (!(key in c)) problems.push(`${lang}: missing "${key}"`);
    else if (!String(c[key]).trim()) problems.push(`${lang}: empty "${key}"`);
    else if (placeholders(c[key]) !== placeholders(en[key])) {
      problems.push(`${lang}: placeholders differ in "${key}" (en {${placeholders(en[key])}} vs {${placeholders(c[key])}})`);
    }
  }
  for (const key of Object.keys(c)) if (!(key in en)) problems.push(`${lang}: extra key "${key}" not in en`);
}

for (const [lang, c] of Object.entries(catalogs)) {
  for (const key of Object.keys(c)) {
    if (key.endsWith('_one') && !(key.replace(/_one$/, '_other') in c)) problems.push(`${lang}: "${key}" has no _other`);
    if (key.endsWith('_other') && !(key.replace(/_other$/, '_one') in c)) problems.push(`${lang}: "${key}" has no _one`);
  }
}

// Every literal t('...') in the app must exist (plural keys are looked up as key_one/key_other).
const files = [];
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
  const p = path.join(dir, e.name);
  if (e.isDirectory() && !['node_modules', 'ios', 'android', 'i18n'].includes(e.name)) walk(p);
  else if (/\.js$/.test(e.name)) files.push(p);
});
walk(path.join(root, 'src'));
files.push(path.join(root, 'App.js'));
const used = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1]);
}
for (const key of used) {
  if (!(key in en) && !(`${key}_one` in en)) problems.push(`code uses unknown key "${key}"`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}
console.log(`i18n OK: ${Object.keys(en).length} keys × ${LANGS.length} languages, ${used.size} keys used in code.`);
