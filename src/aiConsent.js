import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './api';
import { t } from './i18n';

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
      t('consent.title'),
      t('consent.message'),
      [
        { text: t('consent.privacyPolicy'), onPress: () => { openPrivacyPolicy(); resolve(false); } },
        { text: t('consent.dontAllow'), style: 'cancel', onPress: () => resolve(false) },
        { text: t('consent.allow'), onPress: async () => { await grantAiConsent(); resolve(true); } },
      ],
      { cancelable: false }
    );
  });
}

/** Lets the user review, and turn off, the permission they gave. */
export async function showAiConsentSettings() {
  if (await hasAiConsent()) {
    Alert.alert(
      t('consent.settingsTitle'),
      t('consent.settingsOn'),
      [
        { text: t('common.close'), style: 'cancel' },
        { text: t('consent.turnOff'), style: 'destructive', onPress: () => revokeAiConsent() },
      ]
    );
  } else {
    Alert.alert(
      t('consent.settingsTitle'),
      t('consent.settingsOff'),
      [
        { text: t('common.ok'), style: 'cancel' },
        { text: t('consent.privacyPolicy'), onPress: openPrivacyPolicy },
      ]
    );
  }
}
