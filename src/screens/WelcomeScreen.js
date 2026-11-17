import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomTerms } from '../customTerms';
import { ACCENT } from '../theme';
import { t, getLanguage } from '../i18n';

/** The first screen: a greeting, one big way in, and the menu. */
// The idea behind the app; the same line is on the terms screen and the website.
const IDEA_BY = 'Chrystal Ding';

export default function WelcomeScreen({ navigation }) {
  const { saved } = useCustomTerms();
  const insets = useSafeAreaInsets();

  const rows = [
    { icon: '🕓', title: t('upload.tab.history'), sub: t('welcome.history.sub'), go: () => navigation.navigate('History') },
    {
      icon: '👤',
      title: t('details.title'),
      sub: saved.length ? t('details.row.count', { count: saved.length }) : t('welcome.personal.sub'),
      go: () => navigation.navigate('MyDetails'),
    },
    { icon: '🌐', title: t('welcome.language'), sub: t(`lang.${getLanguage()}`), go: () => navigation.navigate('Language') },
    { icon: '💬', title: t('support.title'), sub: t('welcome.support.sub'), go: () => navigation.navigate('Support') },
    { icon: '📖', title: t('guide.title'), go: () => navigation.navigate('Guide') },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <Image source={require('../assets/app-icon.png')} style={styles.icon} />
          <Text style={styles.greeting}>{t('welcome.greeting')}</Text>
          <Text style={styles.title}>Document Risk Analyzer</Text>
          <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
        </View>

        <View style={styles.body}>
          <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('Start')} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.ctaText}>{t('welcome.start')}</Text>
          </TouchableOpacity>

          {rows.map(row => (
            <TouchableOpacity key={row.title} style={styles.row} onPress={row.go} activeOpacity={0.7} accessibilityRole="button">
              <View style={styles.bubble}><Text style={styles.bubbleIcon}>{row.icon}</Text></View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                {!!row.sub && <Text style={styles.rowSub}>{row.sub}</Text>}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.credit}>{t('terms.credit', { name: IDEA_BY })}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, backgroundColor: '#fff' },
  hero: { backgroundColor: '#eef4ff', paddingHorizontal: 24, paddingBottom: 22 },
  icon: { width: 64, height: 64, borderRadius: 15, marginBottom: 16 },
  greeting: { fontSize: 14, fontWeight: '600', color: ACCENT, marginBottom: 2 },
  title: { fontSize: 27, fontWeight: '700', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555', lineHeight: 22 },
  body: { flexGrow: 1, padding: 24, paddingTop: 20 },
  credit: { marginTop: 'auto', paddingTop: 20, fontSize: 8, color: '#aaa', textAlign: 'center' },
  cta: {
    backgroundColor: ACCENT, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 18,
    shadowColor: ACCENT, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
  },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fafafa', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5',
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10,
  },
  bubble: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eaf2ff', alignItems: 'center', justifyContent: 'center' },
  bubbleIcon: { fontSize: 18 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  rowSub: { fontSize: 12.5, color: '#888', marginTop: 2 },
  chevron: { fontSize: 22, color: '#bbb' },
});
