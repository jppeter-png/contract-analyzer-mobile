import { useEffect, useState } from 'react';
import { checkNewTerm } from './customTerms';

// How personal details are hidden for the documents analysed in this session:
//   'auto' - the server finds them (always the choice when the app opens)
//   'own'  - no automatic detection; only the items the user lists (plus Personal data) are hidden
// The listed items stay until the app closes. Nothing here is written to storage.

let mode = 'auto';
let listed = [];
const listeners = new Set();
const notify = () => listeners.forEach(listener => listener());

export const getDetectionMode = () => mode;
export const getListedTerms = () => listed;

export function setDetectionMode(next) {
  mode = next === 'own' ? 'own' : 'auto';
  notify();
}

/** `saved` is the Personal data list, so the same item is not counted twice. */
export function addListedTerm(raw, saved = []) {
  const result = checkNewTerm(raw, [...saved, ...listed]);
  if (result.error) return result;
  listed = [...listed, result.term];
  notify();
  return { ok: true };
}

export function removeListedTerm(term) {
  listed = listed.filter(item => item !== term);
  notify();
}

/** Live view for a screen. */
export function useDetectionChoice() {
  const [, bump] = useState(0);
  useEffect(() => {
    const listener = () => bump(n => n + 1);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);
  return { mode, listed };
}
