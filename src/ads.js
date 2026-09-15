import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// Real interstitial Ad Unit ID from the AdMob console (distinct from the App ID in
// app.json — the App ID identifies the app as a whole, this identifies this specific
// placement). Only used in release builds: __DEV__ is true for local/Metro/simulator
// runs, where tapping our own ads repeatedly would look like invalid traffic to AdMob —
// Google's official test ID is used there instead, which always serves a real-looking
// but harmless test creative.
const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-4330297206877846/1158881374';

const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
  requestNonPersonalizedAdsOnly: true,
});

let isLoaded = false;

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

/** Call ahead of when the ad might be needed, so it's likely ready in time. */
export function preloadInterstitial() {
  if (!isLoaded) interstitial.load();
}

/**
 * Shows the interstitial if it's ready, resolving once the user closes it.
 * If it isn't loaded yet (slow network, no fill, still loading), resolves
 * immediately instead of blocking the caller — an ad is a bonus, not a gate.
 */
export function showInterstitial() {
  return new Promise((resolve) => {
    if (!isLoaded) {
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
