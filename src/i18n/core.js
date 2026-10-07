// Pure translation logic (no React Native imports) so it can be tested in plain Node.

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'pt'];

/** 'es-MX', 'pt_BR', 'fr' -> 'es' / 'pt' / 'fr'; anything unsupported -> 'en'. */
export function pickLanguage(raw) {
  const code = String(raw || '').slice(0, 2).toLowerCase();
  return SUPPORTED_LANGUAGES.includes(code) ? code : 'en';
}

/** Which plural form a count takes. French treats 0 and 1 as singular. */
export function pluralForm(language, count) {
  const n = Math.abs(Number(count));
  return (language === 'fr' ? n < 2 : n === 1) ? 'one' : 'other';
}

// Numbers are shown the way the device formats them (1,234 / 1.234 / 1 234).
const show = value => (typeof value === 'number' ? value.toLocaleString() : String(value));

export function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name) => (vars[name] !== undefined ? show(vars[name]) : whole));
}

/**
 * Builds t(key, vars). With a `count` var, `key_one` / `key_other` is chosen by
 * the language's plural rule. Lookup falls back to English, then to the key itself,
 * so a missing translation shows English text rather than breaking the screen.
 */
export function createTranslator(catalogs, language) {
  const primary = catalogs[language] || {};
  const english = catalogs.en || {};
  const lookup = key => (key in primary ? primary[key] : english[key]);

  return function t(key, vars) {
    let template;
    if (vars && vars.count !== undefined) {
      template = lookup(`${key}_${pluralForm(language, vars.count)}`);
    }
    if (template === undefined) template = lookup(key);
    if (template === undefined) return key;
    return interpolate(template, vars);
  };
}
