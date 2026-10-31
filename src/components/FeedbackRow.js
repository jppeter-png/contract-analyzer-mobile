import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { t } from '../i18n';
import { FEEDBACK_KINDS } from '../feedbackEmail';
import { openFeedbackEmail, askForStoreReview } from '../feedback';

// "Was this analysis helpful?" under a result. Thumbs up thanks the user and lets iOS offer its rating prompt;
// thumbs down asks what went wrong, then opens a prefilled email. The document is never attached.
export default function FeedbackRow({ analysis }) {
  const [done, setDone] = useState(false);

  const helpful = () => {
    setDone(true);
    askForStoreReview();
  };

  const notHelpful = () => {
    Alert.alert(t('feedback.whatWrong'), undefined, [
      ...FEEDBACK_KINDS.map(kind => ({
        text: t(`feedback.kind.${kind}`),
        onPress: async () => { if (await openFeedbackEmail({ analysis, kind })) setDone(true); },
      })),
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.box}>
      {done ? (
        <Text style={styles.thanks}>{t('feedback.thanks')}</Text>
      ) : (
        <>
          <Text style={styles.title}>{t('feedback.helpful')}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.button} onPress={helpful} activeOpacity={0.7}>
              <Text style={styles.buttonText}>{t('feedback.yes')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={notHelpful} activeOpacity={0.7}>
              <Text style={styles.buttonText}>{t('feedback.no')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.note}>{t('feedback.note')}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#f8f8f8', borderRadius: 10, padding: 16, marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 12, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  button: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  buttonText: { fontSize: 14, color: '#333', fontWeight: '500' },
  note: { fontSize: 12, color: '#888', lineHeight: 17, textAlign: 'center' },
  thanks: { fontSize: 14, color: '#166534', fontWeight: '600', textAlign: 'center' },
});
