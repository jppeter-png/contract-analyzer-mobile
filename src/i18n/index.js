import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTranslator, pickLanguage, SUPPORTED_LANGUAGES } from './core';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import de from './locales/de';
import pt from './locales/pt';

const CATALOGS = { en, es, fr, de, pt };
const KEY = 'contract_analyzer_language';

// The language is chosen by the user (first launch, then Language on the main screen),
// never guessed from the device. Until a choice exists the app behaves as English.
let current = 'en';
const translators = Object.fromEntries(SUPPORTED_LANGUAGES.map(code => [code, createTranslator(CATALOGS, code)]));
const listeners = new Set();

export const t = (key, vars) => translators[current](key, vars);
export const getLanguage = () => current;
export { SUPPORTED_LANGUAGES };

/** Reads the saved choice. Resolves the language code, or null if the user hasn't chosen yet. */
export async function loadLanguage() {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved && pickLanguage(saved) === saved) {
      current = saved;
      return saved;
    }
  } catch {
    // an unreadable choice just means asking again
  }
  return null;
}

/** Saves the choice and tells the app to redraw in that language. */
export async function setLanguage(code) {
  if (!SUPPORTED_LANGUAGES.includes(code)) return;
  current = code;
  try {
    await AsyncStorage.setItem(KEY, code);
  } catch {
    // still applies for this session
  }
  listeners.forEach(listener => listener(code));
}

export function subscribeLanguage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Label for a redacted-item category reported by the server (always English there). */
export const findingLabel = label => {
  const key = `finding.${label}`;
  const translated = t(key);
  return translated === key ? label : translated;
};

/** Stored history entries saved for pasted text used the English name; show it translated. */
export const displayFileName = fileName => (!fileName || fileName === 'Pasted text' ? t('common.pastedText') : fileName);
