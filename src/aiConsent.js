import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './api';

const KEY = 'contract_analyzer_ai_consent';

// Bump when what is sent, or who it is sent to, changes in a way that needs
// fresh permission (e.g. a different AI provider). Existing consent is then
// ignored and the user is asked again.
export const AI_CONSENT_VERSION = '2026-10-03';

export async function hasAiConsent() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw).version === AI_CONSENT_VERSION : false;
  } catch {
    return false;
  }
}

async function grantAiConsent() {
  const record = { version: AI_CONSENT_VERSION, grantedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY, JSON.stringify(record));
}

export async function revokeAiConsent() {
  await AsyncStorage.removeItem(KEY);
}

const openPrivacyPolicy = () => Linking.openURL(`${BASE_URL}/privacy`);

/**
 * Resolves true if the user has allowed (now or earlier) redacted document
 * text to be sent to Groq. Shows the permission prompt if they haven't.
 */
export async function requestAiConsent() {
  if (await hasAiConsent()) return true;

  return new Promise((resolve) => {
    Alert.alert(
      'Send to Groq for AI analysis?',
      'To analyze your document, the redacted text and the document type you chose will be sent to Groq, a third-party AI service. Emails, phone numbers, SSNs and similar identifiers are removed first, and names where detected.\n\nAutomatic redaction can miss details, including names, so check the preview first. Your original file or photo is never sent to Groq.',
      [
        { text: 'Privacy Policy', onPress: () => { openPrivacyPolicy(); resolve(false); } },
        { text: "Don't Allow", style: 'cancel', onPress: () => resolve(false) },
        { text: 'Allow', onPress: async () => { await grantAiConsent(); resolve(true); } },
      ],
      { cancelable: false }
    );
  });
}

/** Lets the user review, and turn off, the permission they gave. */
export async function showAiConsentSettings() {
  if (await hasAiConsent()) {
    Alert.alert(
      'AI data sharing',
      'You have allowed redacted document text to be sent to Groq, a third-party AI service, to generate analyses.\n\nIf you turn this off, nothing is sent and you will be asked again before your next analysis.',
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Turn Off', style: 'destructive', onPress: () => revokeAiConsent() },
      ]
    );
  } else {
    Alert.alert(
      'AI data sharing',
      "Nothing is sent to Groq, a third-party AI service, until you allow it. You'll be asked before your first analysis.",
      [
        { text: 'OK', style: 'cancel' },
        { text: 'Privacy Policy', onPress: openPrivacyPolicy },
      ]
    );
  }
}
