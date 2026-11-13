import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ACCENT } from '../theme';
import { t } from '../i18n';

const STEPS = [1, 2, 3, 4];
const OPTIONS = [
  { n: 1, icon: '👤' },
  { n: 2, icon: '✍️' },
  { n: 3, icon: '✋' },
  { n: 4, icon: '📚' },
  { n: 5, icon: '🕓' },
];

/** What the app does, step by step, and the optional features. */
export default function GuideScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('guide.title')}</Text>

        <Text style={styles.section}>{t('guide.basics')}</Text>
        {STEPS.map(n => (
          <View key={n} style={styles.step}>
            <View style={styles.num}><Text style={styles.numText}>{n}</Text></View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{t(`guide.step${n}.title`)}</Text>
              <Text style={styles.stepBody}>{t(`guide.step${n}.body`)}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.section}>{t('guide.optional')}</Text>
        {OPTIONS.map(({ n, icon }) => (
          <View key={n} style={styles.option}>
            <Text style={styles.optionIcon}>{icon}</Text>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{t(`guide.opt${n}.title`)}</Text>
              <Text style={styles.stepBody}>{t(`guide.opt${n}.body`)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24, paddingBottom: 48 },
  back: { marginBottom: 16 },
  backText: { fontSize: 15, color: '#555' },
  title: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 4 },
  section: { fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 12 },
  step: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  stepText: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  stepBody: { fontSize: 13, color: '#666', lineHeight: 19, marginTop: 2 },
  option: {
    flexDirection: 'row', gap: 12, backgroundColor: '#f7f9fc', borderRadius: 12,
    borderWidth: 1, borderColor: '#e3e9f3', padding: 14, marginBottom: 10,
  },
  optionIcon: { fontSize: 20 },
});
