import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { t } from './i18n';

// Names, addresses and ID numbers the user wants hidden in every document ("Your details"). The server
// hides them as well as what it detects by itself. They are kept on this phone only.
// Items typed on the review screen, and the "hide only my items" choice, live on that screen and are
// gone when it closes.

const KEY = 'contract_analyzer_my_details';
export const MAX_TERMS = 50; // the server refuses more
export const MIN_LENGTH = 2;
export const MAX_LENGTH = 100;

let saved = [];
let loadFailed = false;
let loading = null;
const listeners = new Set();

const notify = () => listeners.forEach(listener => listener());
const clean = raw => String(raw || '').replace(/\s+/g, ' ').trim();
const same = (a, b) => a.toLowerCase() === b.toLowerCase();

/** Reads the saved list once. Anything that scrubs a document waits for this. */
export function loadSavedTerms() {
  if (!loading) {
    loading = AsyncStorage.getItem(KEY)
      .then(raw => {
        const list = raw ? JSON.parse(raw) : [];
        saved = Array.isArray(list) ? list.filter(item => typeof item === 'string') : [];
      })
      .catch(() => { loadFailed = true; })
      .then(notify);
  }
  return loading;
}

const persist = () => AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => {});

/** Checks a typed item against the rules and the items already on the list: { term } or { error }. */
export function checkNewTerm(raw, existing) {
  const term = clean(raw);
  if (term.length < MIN_LENGTH) return { error: t('details.err.short') };
  if (term.length > MAX_LENGTH) return { error: t('details.err.long', { max: MAX_LENGTH }) };
  if (existing.some(item => same(item, term))) return { error: t('details.err.duplicate') };
  if (existing.length >= MAX_TERMS) return { error: t('details.err.limit', { max: MAX_TERMS }) };
  return { term };
}

export async function addSavedTerm(raw) {
  await loadSavedTerms();
  const result = checkNewTerm(raw, saved);
  if (result.error) return result;
  saved.push(result.term);
  await persist();
  notify();
  return { ok: true };
}

export async function removeSavedTerm(term) {
  saved = saved.filter(item => item !== term);
  await persist();
  notify();
}

/**
 * What to send with a document. By default: the saved details, with automatic detection on.
 * options.extra: more items to hide (typed on the review screen); options.autoDetect: false hides only the listed items.
 * Refuses to continue if the saved list could not be read, so a document is never sent unhidden by mistake.
 */
export async function getScrubOptions({ extra = [], autoDetect = true } = {}) {
  await loadSavedTerms();
  if (loadFailed) throw new Error(t('details.err.load'));
  return {
    customTerms: [...saved, ...extra.filter(e => !saved.some(s => same(s, e)))],
    autoDetect,
  };
}

/** The saved details, for the screens that list or count them, kept in step with changes. */
export function useCustomTerms() {
  const [, bump] = useState(0);
  useEffect(() => {
    const listener = () => bump(n => n + 1);
    listeners.add(listener);
    loadSavedTerms();
    return () => listeners.delete(listener);
  }, []);
  return { saved };
}
