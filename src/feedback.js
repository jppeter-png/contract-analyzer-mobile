import { Alert, Linking, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import appConfig from '../app.json';
import { t, getLanguage } from './i18n';
import { FEEDBACK_EMAIL, buildFeedbackUrl, feedbackDetails } from './feedbackEmail';

/** Opens the user's mail app with a prefilled message. Pass `analysis` and `kind` for feedback on a result. */
export async function openFeedbackEmail({ analysis = null, kind = null } = {}) {
  const url = buildFeedbackUrl({
    intro: t('feedback.emailIntro'),
    details: feedbackDetails({
      appVersion: appConfig.expo.version,
      osVersion: String(Platform.Version),
      language: getLanguage(),
      analysis,
      kind,
    }),
  });
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert(t('feedback.noMail.title'), t('feedback.noMail.message', { email: FEEDBACK_EMAIL }));
    return false;
  }
}

/** Apple's own rating prompt. iOS decides whether to show it (it limits how often), so this may do nothing. */
export async function askForStoreReview() {
  // A build without the native module (an older dev client) simply skips the prompt instead of failing.
  if (!requireOptionalNativeModule('ExpoStoreReview')) return;
  try {
    const StoreReview = require('expo-store-review');
    if (await StoreReview.hasAction()) await StoreReview.requestReview();
  } catch {
    // Never let a rating prompt break the results screen.
  }
}
