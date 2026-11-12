import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { useCustomTerms, addSavedTerm, removeSavedTerm } from '../customTerms';
import AddTermField from '../components/AddTermField';
import TermChips from '../components/TermChips';

/** "Your details": names, addresses and numbers hidden in every document. Stored on this phone only. */
export default function MyDetailsScreen({ navigation }) {
  const { saved } = useCustomTerms();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('details.title')}</Text>
        <Text style={styles.intro}>{t('details.intro')}</Text>

        <AddTermField placeholder={t('details.placeholder')} onAdd={addSavedTerm} />
        <Text style={styles.tip}>{t('details.tip')}</Text>

        <View style={styles.card}>
          {saved.length === 0
            ? <Text style={styles.empty}>{t('details.empty')}</Text>
            : <TermChips terms={saved} onRemove={removeSavedTerm} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24, paddingBottom: 48 },
  back: { marginBottom: 16 },
  backText: { fontSize: 15, color: '#555' },
  title: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 8 },
  intro: { fontSize: 14, color: '#666', lineHeight: 21, marginBottom: 20 },
  tip: { fontSize: 12, color: '#888', lineHeight: 17, marginTop: 10, marginBottom: 20 },
  card: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, minHeight: 64 },
  empty: { fontSize: 13, color: '#888' },
});
