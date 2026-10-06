import { Platform } from 'react-native';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// Real interstitial Ad Unit IDs from the AdMob console (distinct from the App ID in
// app.json — the App ID identifies the app as a whole, this identifies this specific
// placement). AdMob apps and ad units are per platform, so each OS has its own. Only used
// in release builds: __DEV__ is true for local/Metro/simulator runs, where tapping our own
// ads repeatedly would look like invalid traffic to AdMob — Google's official test ID is
// used there instead, which always serves a real-looking but harmless test creative.
// A platform with no unit (null) simply shows no ads.
const RELEASE_AD_UNIT_IDS = {
  ios: 'ca-app-pub-4330297206877846/1158881374',
  android: 'ca-app-pub-4330297206877846/2837894160',
};
const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : RELEASE_AD_UNIT_IDS[Platform.OS] ?? null;

const interstitial = INTERSTITIAL_AD_UNIT_ID
  ? InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    })
  : null;

let isLoaded = false;

if (interstitial) {
  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
  });
  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    isLoaded = false;
  });
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    isLoaded = false;
    interstitial.load(); // preload the next one
  });

  interstitial.load();
}

/** Call ahead of when the ad might be needed, so it's likely ready in time. */
export function preloadInterstitial() {
  if (interstitial && !isLoaded) interstitial.load();
}

/**
 * Shows the interstitial if it's ready, resolving once the user closes it.
 * If it isn't loaded yet (slow network, no fill, still loading), resolves
 * immediately instead of blocking the caller — an ad is a bonus, not a gate.
 */
export function showInterstitial() {
  return new Promise((resolve) => {
    if (!interstitial || !isLoaded) {
      resolve();
      return;
    }
    const unsubscribe = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribe();
      resolve();
    });
    interstitial.show();
  });
}
