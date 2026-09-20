import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'contract_analyzer_terms_acceptance';

// Bump this whenever terms.html changes in a way that actually changes what
// the user is agreeing to (not for typo fixes) — it forces re-prompting
// everyone who already accepted an older version. Keep it in sync with the
// "Effective" date shown on https://.../terms.
export const TERMS_VERSION = '2026-09-20';

export async function getTermsAcceptance() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function hasAcceptedCurrentTerms() {
  const record = await getTermsAcceptance();
  return record?.version === TERMS_VERSION;
}

export async function acceptCurrentTerms() {
  const record = { version: TERMS_VERSION, acceptedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY, JSON.stringify(record));
  return record;
}
