import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openLegalPage } from '../legalPages';
import { openFeedbackEmail } from '../feedback';
import { showAiConsentSettings } from '../aiConsent';
import { t } from '../i18n';

/** Feedback, privacy (the AI notice and the policy) and terms in one place. */
export default function SupportScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('support.title')}</Text>

        <Text style={styles.section}>{t('support.section.support')}</Text>
        <TouchableOpacity style={styles.notice} onPress={() => openFeedbackEmail()} activeOpacity={0.7}>
          <Text style={styles.icon}>💬</Text>
          <Text style={styles.text}>
            {t('feedback.prompt')}{' '}
            <Text style={styles.link}>{t('feedback.send')}</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.section}>{t('support.section.privacy')}</Text>
        <View style={styles.notice}>
          <Text style={styles.icon}>🤖</Text>
          <Text style={styles.text}>
            {t('upload.notice.ai')}{' '}
            <Text style={styles.link} onPress={showAiConsentSettings}>{t('upload.notice.manage')}</Text>
          </Text>
        </View>
        <View style={styles.notice}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.text}>
            {t('support.privacy')}{' '}
            <Text style={styles.link} onPress={() => openLegalPage('privacy')}>{t('support.privacy.link')}</Text>
          </Text>
        </View>

        <Text style={styles.section}>{t('support.section.legal')}</Text>
        <View style={styles.notice}>
          <Text style={styles.icon}>⚖️</Text>
          <Text style={styles.text}>
            {t('upload.notice.legal')}{' '}
            <Text style={styles.link} onPress={() => openLegalPage('terms')}>{t('upload.notice.termsLink')}</Text>
          </Text>
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
  title: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 4 },
  section: { fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
  notice: { flexDirection: 'row', backgroundColor: '#f5f5f5', borderRadius: 10, padding: 14, gap: 10, alignItems: 'flex-start' , marginBottom: 8 },
  icon: { fontSize: 16 },
  text: { flex: 1, fontSize: 13, color: '#666', lineHeight: 19 },
  link: { color: '#2f6fd0', fontWeight: '600' },
});
