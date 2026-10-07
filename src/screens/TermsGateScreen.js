import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../api';
import { acceptCurrentTerms } from '../terms';
import { t } from '../i18n';

export default function TermsGateScreen({ onAccept }) {
  const [checked, setChecked] = useState(false);

  const handleContinue = async () => {
    await acceptCurrentTerms();
    onAccept();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('terms.title')}</Text>

        <View style={styles.card}>
          <Text style={styles.body}>{t('terms.body1')}</Text>
          <Text style={styles.body}>{t('terms.body2')}</Text>
        </View>

        <TouchableOpacity onPress={() => Linking.openURL(`${BASE_URL}/terms`)}>
          <Text style={styles.link}>{t('terms.readFull')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setChecked(c => !c)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>{t('terms.checkbox')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueBtn, !checked && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!checked}
        >
          <Text style={styles.continueBtnText}>{t('terms.continue')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  title: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 20, textAlign: 'center' },
  card: {
    backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 16,
  },
  body: { fontSize: 14, color: '#333', lineHeight: 21, marginBottom: 12 },
  link: { fontSize: 14, color: '#2f6fd0', fontWeight: '500', marginBottom: 28, textAlign: 'center' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: '#ccc',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#111', borderColor: '#111' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkboxLabel: { flex: 1, fontSize: 14, color: '#111', fontWeight: '500' },
  continueBtn: { backgroundColor: '#111', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  continueBtnDisabled: { backgroundColor: '#ccc' },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
