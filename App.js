import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import UploadScreen from './src/screens/UploadScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import AnalyzingScreen from './src/screens/AnalyzingScreen';
import ChunkedAnalyzingScreen from './src/screens/ChunkedAnalyzingScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import CameraScreen from './src/screens/CameraScreen';
import BatchReviewScreen from './src/screens/BatchReviewScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Upload"
            screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          >
            <Stack.Screen name="Upload" component={UploadScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="Review" component={ReviewScreen} />
            <Stack.Screen name="BatchReview" component={BatchReviewScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Analyzing" component={AnalyzingScreen} />
            <Stack.Screen name="ChunkedAnalyzing" component={ChunkedAnalyzingScreen} />
            <Stack.Screen name="Results" component={ResultsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
