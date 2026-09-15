import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// TODO: swap for a real interstitial Ad Unit ID from the AdMob console before release.
// The App ID in app.json (ca-app-pub-4330297206877846~...) identifies the app, not a
// placement — a separate per-placement Ad Unit ID is required. Using real ad unit IDs
// during development risks AdMob flagging the account for invalid traffic, so this uses
// Google's official test interstitial ID unconditionally until a real one is set.
const INTERSTITIAL_AD_UNIT_ID = TestIds.INTERSTITIAL;

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
