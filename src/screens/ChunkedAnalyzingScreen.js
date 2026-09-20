import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analyzeContract } from '../api';
import { mergeAnalyses, CHUNK_INTERVAL_MS } from '../analysisChunking';
import { saveAnalysis } from '../history';
import { showInterstitial } from '../ads';

export default function ChunkedAnalyzingScreen({ navigation, route }) {
  const { chunks, contractType, fileName, findings, totalRedacted } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sectionProgress, setSectionProgress] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    let countdownTimer;

    async function run() {
      const results = [];

      for (let i = 0; i < chunks.length; i++) {
        if (cancelledRef.current) return;
        setCurrentIndex(i);
        setSectionProgress(0);

        // No real progress signal per section, so this eases toward 90% and
        // never quite gets there on its own — the actual response snaps it
        // to 100% instead of it stalling visibly at a cap.
        const sectionTimer = setInterval(() => {
          setSectionProgress((p) => p + (0.9 - p) * 0.08);
        }, 300);

        try {
          // Only shown once, alongside the first section — masks that wait
          // rather than adding one, and firing it once per chunk would just
          // be annoying (and risk AdMob flagging it as excessive ad load).
          const [analysis] = await Promise.all([
            analyzeContract(chunks[i], contractType, { index: i + 1, total: chunks.length }),
            i === 0 ? showInterstitial() : Promise.resolve(),
          ]);
          results.push(analysis);
          setSectionProgress(1);
        } catch (err) {
          if (cancelledRef.current) return;
          Alert.alert(
            'Analysis failed',
            `Section ${i + 1} of ${chunks.length} failed: ${err.response?.data?.error || err.message || 'Please try again'}`
          );
          navigation.goBack();
          return;
        } finally {
          clearInterval(sectionTimer);
        }

        const isLast = i === chunks.length - 1;
        if (!isLast && !cancelledRef.current) {
          // Pace requests to stay under the model provider's rate limits.
          let remainingMs = CHUNK_INTERVAL_MS;
          setSecondsLeft(Math.ceil(remainingMs / 1000));
          await new Promise(resolve => {
            countdownTimer = setInterval(() => {
              remainingMs -= 1000;
              setSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
              if (remainingMs <= 0) {
                clearInterval(countdownTimer);
                resolve();
              }
            }, 1000);
          });
        }
      }

      if (cancelledRef.current) return;

      const merged = mergeAnalyses(results);
      saveAnalysis({ fileName, analysis: merged, findings, totalRedacted });
      navigation.replace('Results', { analysis: merged, findings, totalRedacted, fileName });
    }

    run();

    return () => {
      cancelledRef.current = true;
      clearInterval(countdownTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    Alert.alert('Cancel analysis?', 'Progress on the current section will be lost.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: () => {
          cancelledRef.current = true;
          navigation.goBack();
        },
      },
    ]);
  };

  const waiting = secondsLeft != null && secondsLeft > 0;
  const remainingChunks = chunks.length - currentIndex - 1;
  const etaMinutes = Math.ceil((remainingChunks * CHUNK_INTERVAL_MS) / 60000);
  const overallProgress = (currentIndex + sectionProgress) / chunks.length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#111" style={styles.spinner} />
        <Text style={styles.step}>
          {waiting
            ? `Waiting to avoid rate limits... (${secondsLeft}s)`
            : `Analyzing section ${currentIndex + 1} of ${chunks.length}...`}
        </Text>
        <Text style={styles.note}>
          {remainingChunks > 0
            ? `About ${etaMinutes} minute${etaMinutes !== 1 ? 's' : ''} remaining`
            : 'Almost done'}
        </Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(overallProgress * 100)}%` }]} />
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
  note: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 },
  progressTrack: {
    width: '100%', maxWidth: 280, height: 6, borderRadius: 3,
    backgroundColor: '#eee', overflow: 'hidden', marginBottom: 28,
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#111' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  cancelBtnText: { fontSize: 15, color: '#dc2626', fontWeight: '500' },
});
