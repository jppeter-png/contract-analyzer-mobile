import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { t } from './i18n';

// Names, addresses and ID numbers the user wants hidden. The server hides them as well as what it
// detects by itself. Two lists:
//   saved  - "Your details": kept on this phone and applied to every document
//   extra  - "Also hide these": kept in memory only, gone when the app closes
// Automatic detection is switched off per session at most, and always starts on.

const KEY = 'contract_analyzer_my_details';
export const MAX_TERMS = 50; // the server refuses more
export const MIN_LENGTH = 2;
export const MAX_LENGTH = 100;

let saved = [];
let extra = [];
let autoDetect = true;
let loadFailed = false;
let loading = null;
const listeners = new Set();

const notify = () => listeners.forEach(listener => listener());
const clean = raw => String(raw || '').replace(/\s+/g, ' ').trim();
const same = (a, b) => a.toLowerCase() === b.toLowerCase();
const union = () => [...saved, ...extra.filter(e => !saved.some(s => same(s, e)))];

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

function tryAdd(list, raw) {
  const term = clean(raw);
  if (term.length < MIN_LENGTH) return { error: t('details.err.short') };
  if (term.length > MAX_LENGTH) return { error: t('details.err.long', { max: MAX_LENGTH }) };
  if (union().some(item => same(item, term))) return { error: t('details.err.duplicate') };
  if (union().length >= MAX_TERMS) return { error: t('details.err.limit', { max: MAX_TERMS }) };
  list.push(term);
  return { ok: true };
}

export async function addSavedTerm(raw) {
  await loadSavedTerms();
  const result = tryAdd(saved, raw);
  if (result.ok) { await persist(); notify(); }
  return result;
}

export async function removeSavedTerm(term) {
  saved = saved.filter(item => item !== term);
  await persist();
  notify();
}

export function addExtraTerm(raw) {
  const result = tryAdd(extra, raw);
  if (result.ok) notify();
  return result;
}

export function removeExtraTerm(term) {
  extra = extra.filter(item => item !== term);
  notify();
}

export const getExtraTerms = () => extra;

export function setAutoDetect(on) {
  autoDetect = !!on;
  notify();
}

/**
 * What to send with a document: every saved and session term, and whether automatic detection is on.
 * Refuses to continue if the saved list could not be read, so a document is never sent unhidden by mistake.
 */
export async function getScrubOptions() {
  await loadSavedTerms();
  if (loadFailed) throw new Error(t('details.err.load'));
  return { customTerms: union(), autoDetect };
}

/** Live view of the lists for a screen. */
export function useCustomTerms() {
  const [, bump] = useState(0);
  useEffect(() => {
    const listener = () => bump(n => n + 1);
    listeners.add(listener);
    loadSavedTerms();
    return () => listeners.delete(listener);
  }, []);
  return { saved, extra, autoDetect };
}
