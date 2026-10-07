import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import mobileAds from 'react-native-google-mobile-ads';

import UploadScreen from './src/screens/UploadScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import AnalyzingScreen from './src/screens/AnalyzingScreen';
import ChunkedAnalyzingScreen from './src/screens/ChunkedAnalyzingScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import CameraScreen from './src/screens/CameraScreen';
import BatchReviewScreen from './src/screens/BatchReviewScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import TermsGateScreen from './src/screens/TermsGateScreen';
import LanguageScreen from './src/screens/LanguageScreen';
import { hasAcceptedCurrentTerms } from './src/terms';
import { loadLanguage, subscribeLanguage } from './src/i18n';

const Stack = createStackNavigator();

export default function App() {
  const [termsAccepted, setTermsAccepted] = useState(null); // null while checking
  const [language, setLanguage] = useState(undefined); // undefined while checking, null = not chosen yet

  useEffect(() => {
    mobileAds().initialize();
    hasAcceptedCurrentTerms().then(setTermsAccepted);
    loadLanguage().then(setLanguage);
    // Choosing a language (first launch or later) redraws the app in it.
    return subscribeLanguage(setLanguage);
  }, []);

  if (termsAccepted === null || language === undefined) {
    return null;
  }

  // Nothing is translated until the user picks a language.
  if (language === null) {
    return (
      <SafeAreaProvider>
        <LanguageScreen />
      </SafeAreaProvider>
    );
  }

  if (!termsAccepted) {
    return (
      <SafeAreaProvider>
        <TermsGateScreen onAccept={() => setTermsAccepted(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* key: remounting redraws every screen when the language changes */}
        <NavigationContainer key={language}>
          <Stack.Navigator
            initialRouteName="Upload"
            screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          >
            <Stack.Screen name="Upload" component={UploadScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="Review" component={ReviewScreen} />
            <Stack.Screen name="BatchReview" component={BatchReviewScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Language" component={LanguageScreen} />
            <Stack.Screen name="Analyzing" component={AnalyzingScreen} />
            <Stack.Screen name="ChunkedAnalyzing" component={ChunkedAnalyzingScreen} />
            <Stack.Screen name="Results" component={ResultsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
