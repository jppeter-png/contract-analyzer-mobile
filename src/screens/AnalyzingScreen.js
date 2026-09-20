import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analyzeContract } from '../api';
import { saveAnalysis } from '../history';
import { showInterstitial } from '../ads';

const STEPS = [
  'Reading document clauses...',
  'Identifying risks and loopholes...',
  'Preparing your report...',
];

export default function AnalyzingScreen({ navigation, route }) {
  const { scrubbedText, contractType, fileName, findings, totalRedacted } = route.params;
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 4000);

    // No real progress signal from the backend (one request, one response), so
    // this eases toward 90% and never quite gets there on its own — the actual
    // response snaps it to 100% instead of it stalling visibly at a cap.
    const progressTimer = setInterval(() => {
      setProgress((p) => p + (0.9 - p) * 0.08);
    }, 300);

    const controller = new AbortController();

    (async () => {
      try {
        // Runs the ad alongside the real analysis call, not before it — masks
        // the wait instead of adding to it. If the ad isn't loaded in time,
        // showInterstitial() resolves immediately rather than blocking.
        const [analysis] = await Promise.all([
          analyzeContract(scrubbedText, contractType, null, controller.signal),
          showInterstitial(),
        ]);
        setProgress(1);
        saveAnalysis({ fileName, analysis, findings, totalRedacted });
        setTimeout(() => {
          navigation.replace('Results', { analysis, findings, totalRedacted, fileName });
        }, 250);
      } catch (err) {
        if (controller.signal.aborted) return;
        navigation.goBack();
        Alert.alert('Analysis failed', err.response?.data?.error || err.message || 'Please try again');
      }
    })();

    return () => {
      clearInterval(stepTimer);
      clearInterval(progressTimer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    Alert.alert('Cancel analysis?', 'Your progress will be lost.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Cancel', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#111" style={styles.spinner} />
        <Text style={styles.step}>{STEPS[stepIndex]}</Text>
        <Text style={styles.note}>This usually takes 10–20 seconds</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>

        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  spinner: { marginBottom: 24 },
  step: { fontSize: 18, fontWeight: '600', color: '#111', textAlign: 'center', marginBottom: 8 },
  note: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
  progressTrack: {
    width: '100%', maxWidth: 280, height: 6, borderRadius: 3,
    backgroundColor: '#eee', overflow: 'hidden', marginBottom: 28,
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#111' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  cancelBtnText: { fontSize: 15, color: '#dc2626', fontWeight: '500' },
});
