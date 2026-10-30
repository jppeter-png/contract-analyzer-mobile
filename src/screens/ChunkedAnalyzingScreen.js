import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analyzeContract } from '../api';
import { mergeAnalyses, estimateMinutes, CHUNK_INTERVAL_MS } from '../analysisChunking';
import { isBusy, retryAfterSeconds, MAX_BUSY_RETRIES } from '../rateLimit';
import { saveAnalysis } from '../history';
import { showInterstitial } from '../ads';
import { t } from '../i18n';

export default function ChunkedAnalyzingScreen({ navigation, route }) {
  const { chunks, contractType, fileName, findings, totalRedacted, source = null } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sectionProgress, setSectionProgress] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    let countdownTimer;

    // Counts down on screen (the same line used between sections) and resolves when the wait is over.
    const waitSeconds = seconds => new Promise(resolve => {
      let remaining = seconds;
      setSecondsLeft(remaining);
      countdownTimer = setInterval(() => {
        remaining -= 1;
        setSecondsLeft(Math.max(0, remaining));
        if (remaining <= 0 || cancelledRef.current) {
          clearInterval(countdownTimer);
          resolve();
        }
      }, 1000);
    });

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
          // If the AI service is busy, wait as long as it asks and try this section again,
          // so the sections already done aren't thrown away.
          let analysis;
          for (let tries = 0; ; tries++) {
            try {
              // The ad is only shown once, alongside the first section's first try — masks that wait
              // rather than adding one, and firing it once per chunk would just
              // be annoying (and risk AdMob flagging it as excessive ad load).
              [analysis] = await Promise.all([
                analyzeContract(chunks[i], contractType, { index: i + 1, total: chunks.length }),
                i === 0 && tries === 0 ? showInterstitial() : Promise.resolve(),
              ]);
              break;
            } catch (err) {
              if (!isBusy(err) || tries >= MAX_BUSY_RETRIES || cancelledRef.current) throw err;
              await waitSeconds(retryAfterSeconds(err));
              if (cancelledRef.current) return;
            }
          }
          results.push(analysis);
          setSectionProgress(1);
        } catch (err) {
          if (cancelledRef.current) return;
          Alert.alert(
            t('analyzing.failed'),
            t('chunked.sectionFailed', {
              current: i + 1, total: chunks.length,
              error: isBusy(err) ? t('analyzing.busy') : err.response?.data?.error || err.message || t('common.tryAgain'),
            })
          );
          navigation.goBack();
          return;
        } finally {
          clearInterval(sectionTimer);
        }

        const isLast = i === chunks.length - 1;
        if (!isLast && !cancelledRef.current && CHUNK_INTERVAL_MS > 0) {
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

      const combined = mergeAnalyses(results);
      const merged = source ? { ...combined, source } : combined;
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
    Alert.alert(t('analyzing.cancelTitle'), t('chunked.cancelMessage'), [
      { text: t('analyzing.keepGoing'), style: 'cancel' },
      {
        text: t('common.cancel'),
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
  const etaMinutes = estimateMinutes(remainingChunks);
  const overallProgress = (currentIndex + sectionProgress) / chunks.length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#111" style={styles.spinner} />
        <Text style={styles.step}>
          {waiting
            ? t('chunked.waiting', { seconds: secondsLeft })
            : t('chunked.section', { current: currentIndex + 1, total: chunks.length })}
        </Text>
        <Text style={styles.note}>
          {remainingChunks > 0
            ? t('chunked.eta', { count: etaMinutes })
            : t('chunked.almostDone')}
        </Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(overallProgress * 100)}%` }]} />
        </View>

        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
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
