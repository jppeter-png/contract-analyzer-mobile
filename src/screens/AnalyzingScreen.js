import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STEPS = [
  'Applying privacy protections...',
  'Reading contract clauses...',
  'Identifying risks and loopholes...',
  'Preparing your report...',
];

export default function AnalyzingScreen() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#111" style={styles.spinner} />
        <Text style={styles.step}>{STEPS[stepIndex]}</Text>
        <Text style={styles.note}>This usually takes 10–20 seconds</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  spinner: { marginBottom: 24 },
  step: { fontSize: 18, fontWeight: '600', color: '#111', textAlign: 'center', marginBottom: 8 },
  note: { fontSize: 14, color: '#888', textAlign: 'center' },
});
