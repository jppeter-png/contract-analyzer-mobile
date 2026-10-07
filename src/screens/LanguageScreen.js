import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t, getLanguage, setLanguage, SUPPORTED_LANGUAGES } from '../i18n';

// Before a language is chosen nothing can be translated, so the first-run heading
// says the same thing in every language.
const FIRST_RUN_HEADING = [
  'Choose your language',
  'Elige tu idioma',
  'Choisissez votre langue',
  'Wählen Sie Ihre Sprache',
  'Escolha o idioma',
];

/**
 * Used twice: as the very first screen (no `navigation`, nothing chosen yet) and as a
 * normal screen reached from the main screen, where the current language is marked.
 * Choosing a language redraws the whole app in it, so there is nothing to navigate to.
 */
export default function LanguageScreen({ navigation }) {
  const firstRun = !navigation;
  const selected = firstRun ? null : getLanguage();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {!firstRun && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>
        )}

        {firstRun ? (
          <View style={styles.headingBlock}>
            <Text style={styles.title}>🌐</Text>
            {FIRST_RUN_HEADING.map(line => (
              <Text key={line} style={styles.headingLine}>{line}</Text>
            ))}
          </View>
        ) : (
          <>
            <Text style={styles.titleLeft}>{t('language.title')}</Text>
            <Text style={styles.subtitle}>{t('language.subtitle')}</Text>
          </>
        )}

        <View style={styles.list}>
          {SUPPORTED_LANGUAGES.map(code => {
            const active = selected === code;
            return (
              <TouchableOpacity
                key={code}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setLanguage(code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{t(`lang.${code}`)}</Text>
                {active && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  back: { position: 'absolute', top: 16, left: 24 },
  backText: { fontSize: 15, color: '#555' },
  headingBlock: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 40, marginBottom: 14 },
  headingLine: { fontSize: 17, fontWeight: '600', color: '#111', marginBottom: 4, textAlign: 'center' },
  titleLeft: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 8, marginTop: 40 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 21, marginBottom: 28 },
  list: { gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 18, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e5e5e5', backgroundColor: '#fafafa',
  },
  optionActive: { borderColor: '#111', backgroundColor: '#111' },
  optionText: { fontSize: 17, fontWeight: '500', color: '#222' },
  optionTextActive: { color: '#fff' },
  check: { fontSize: 17, color: '#fff', fontWeight: '700' },
});
