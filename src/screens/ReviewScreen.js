import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chunkText, estimateMinutes, MAX_CHARS_PER_ANALYSIS } from '../analysisChunking';
import { preloadInterstitial } from '../ads';
import { requestAiConsent } from '../aiConsent';
import { LOW_OCR_CONFIDENCE, sourceInfo } from '../coverage';
import { splitSegments, redactionStarts, passageAround } from '../redactionPreview';
import { t, findingLabel, displayFileName } from '../i18n';

const CONTRACT_TYPES = ['auto', 'employment', 'nda', 'lease', 'service', 'loan', 'tos'];

export default function ReviewScreen({ navigation, route }) {
  const { scrubResult, fileName, fromPhotos = false, ocrConfidence = 100 } = route.params;
  const hardToRead = fromPhotos && ocrConfidence < LOW_OCR_CONFIDENCE;
  const { scrubbedText, findings = [], wordCount, totalRedacted } = scrubResult;

  const [selectedType, setSelectedType] = useState('auto');
  const [expandedIndex, setExpandedIndex] = useState(null);

  // The preview opens at the first redaction (not the top of the document, where there may be none),
  // can jump between them, and can show the whole text that will be sent.
  const [showFull, setShowFull] = useState(false);
  const [focus, setFocus] = useState(0);
  const starts = useMemo(() => redactionStarts(scrubbedText || ''), [scrubbedText]);
  const passage = useMemo(
    () => (showFull ? null : passageAround(scrubbedText || '', starts[focus] ?? 0)),
    [showFull, focus, starts, scrubbedText],
  );
  const segments = useMemo(
    () => splitSegments(showFull ? scrubbedText : passage.text),
    [showFull, scrubbedText, passage],
  );

  useEffect(() => {
    preloadInterstitial(); // so it's likely ready by the time the user taps Analyze
  }, []);

  const runNormalAnalysis = () => {
    navigation.navigate('Analyzing', {
      scrubbedText, contractType: selectedType, fileName, findings, totalRedacted,
      source: sourceInfo(fromPhotos, ocrConfidence),
    });
  };

  const runChunkedAnalysis = () => {
    const chunks = chunkText(scrubbedText, MAX_CHARS_PER_ANALYSIS);
    navigation.navigate('ChunkedAnalyzing', {
      chunks, contractType: selectedType, fileName, findings, totalRedacted,
      source: sourceInfo(fromPhotos, ocrConfidence),
    });
  };

  const handleAnalyze = async () => {
    if (!(await requestAiConsent())) return;

    if (scrubbedText.length <= MAX_CHARS_PER_ANALYSIS) {
      runNormalAnalysis();
      return;
    }

    const minutes = estimateMinutes(Math.ceil(scrubbedText.length / MAX_CHARS_PER_ANALYSIS));
    Alert.alert(
      t('review.long.title'),
      t('review.long.message', {
        length: scrubbedText.length.toLocaleString(),
        limit: MAX_CHARS_PER_ANALYSIS.toLocaleString(),
      }),
      [
        {
          text: t('review.long.anyway'),
          onPress: runNormalAnalysis,
        },
        {
          text: t('review.long.full', { minutes }),
          onPress: runChunkedAnalysis,
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('review.title')}</Text>
        <Text style={styles.meta}>
          {fileName ? `"${displayFileName(fileName)}" · ` : ''}{t('review.words', { count: wordCount ?? 0 })}
        </Text>

        {/* PII findings */}
        {totalRedacted > 0 ? (
          <View style={[styles.alert, styles.alertWarning]}>
            <Text style={[styles.alertTitle, styles.alertTitleWarning]}>
              {t('review.redactedTitle', { count: totalRedacted })}
            </Text>
            {findings.map(({ label, count, redacted = [] }, i) => (
              <View key={label} style={styles.findingRow}>
                <TouchableOpacity
                  style={styles.findingHeader}
                  onPress={() => setExpandedIndex(expandedIndex === i ? null : i)}
                >
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>{findingLabel(label)} ×{count}</Text>
                  </View>
                  {redacted.length > 0 && (
                    <Text style={styles.expandHint}>{expandedIndex === i ? '▲' : '▼'}</Text>
                  )}
                </TouchableOpacity>
                {expandedIndex === i && redacted.length > 0 && (
                  <View style={styles.redactedList}>
                    {redacted.map((item, j) => (
                      <Text key={j} style={styles.redactedItem}>• {item}</Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.alert, styles.alertSuccess]}>
            <Text style={[styles.alertTitle, styles.alertTitleSuccess]}>{t('review.noPii')}</Text>
          </View>
        )}

        {/* Text read from photos can contain recognition mistakes */}
        {fromPhotos && (
          <View style={[styles.photoNote, hardToRead && styles.photoNoteStrong]}>
            <Text style={[styles.photoNoteText, hardToRead && styles.photoNoteTextStrong]}>
              {hardToRead ? t('review.photoLowConfidence') : t('review.photoNote')}
            </Text>
          </View>
        )}

        {/* Exactly what will be sent */}
        {!!scrubbedText && (
          <>
            <Text style={styles.sectionLabel}>{t('review.sentLabel')}</Text>
            <View style={styles.previewBox}>
              <Text style={styles.previewText}>
                {!showFull && passage.cutBefore ? '… ' : ''}
                {segments.map((segment, i) => (segment.redacted
                  ? <Text key={i} style={styles.redactionChip}>{segment.text}</Text>
                  : segment.text))}
                {!showFull && passage.cutAfter ? ' …' : ''}
              </Text>
            </View>
            <View style={styles.previewActions}>
              <TouchableOpacity onPress={() => setShowFull(v => !v)}>
                <Text style={styles.previewLink}>{showFull ? t('review.showLess') : t('review.showFull')}</Text>
              </TouchableOpacity>
              {!showFull && starts.length > 1 && (
                <TouchableOpacity onPress={() => setFocus(f => (f + 1) % starts.length)}>
                  <Text style={styles.previewLink}>
                    {t('review.nextRedaction', { current: focus + 1, total: starts.length })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Document type selector */}
        <Text style={styles.sectionLabel}>{t('review.docType')}</Text>
        <Text style={styles.sectionDesc}>{t('review.docTypeDesc')}</Text>
        <View style={styles.typeGrid}>
          {CONTRACT_TYPES.map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.typeCard, selectedType === key && styles.typeCardSelected]}
              onPress={() => setSelectedType(key)}
            >
              <Text style={[styles.typeLabel, selectedType === key && styles.typeLabelSelected]}>
                {t(`review.type.${key}`)}
              </Text>
              <Text style={[styles.typeDesc, selectedType === key && styles.typeDescSelected]}>
                {t(`review.type.${key}.desc`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.confirmNote}>{t('review.confirmNote')}</Text>

        <TouchableOpacity style={styles.btn} onPress={handleAnalyze}>
          <Text style={styles.btnText}>{t('review.analyze')}</Text>
        </TouchableOpacity>
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
  meta: { fontSize: 14, color: '#888', marginBottom: 20 },
  alert: { borderRadius: 10, padding: 14, marginBottom: 20 },
  alertWarning: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  alertSuccess: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  alertTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  alertTitleWarning: { color: '#92400e' },
  alertTitleSuccess: { color: '#166534' },
  findingRow: { marginBottom: 6 },
  findingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    backgroundColor: '#fff', borderRadius: 999, borderWidth: 1,
    borderColor: '#fcd34d', paddingVertical: 3, paddingHorizontal: 10,
  },
  pillText: { fontSize: 12, color: '#555' },
  expandHint: { fontSize: 10, color: '#aaa' },
  redactedList: {
    marginTop: 6, marginLeft: 8, padding: 10,
    backgroundColor: '#fff8e1', borderRadius: 8, borderWidth: 1, borderColor: '#fde68a',
  },
  redactedItem: { fontSize: 12, color: '#444', marginBottom: 3, fontFamily: 'monospace' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: '#aaa', marginBottom: 12 },
  photoNote: {
    backgroundColor: '#f8f8f8', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#e5e5e5', marginBottom: 14,
  },
  photoNoteStrong: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  photoNoteText: { fontSize: 13, color: '#555', lineHeight: 19 },
  photoNoteTextStrong: { color: '#92400e', fontWeight: '500' },
  previewBox: {
    backgroundColor: '#f8f8f8', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#e5e5e5', marginBottom: 20,
  },
  previewText: { fontSize: 12, color: '#555', lineHeight: 19, fontFamily: 'monospace' },
  redactionChip: { backgroundColor: '#111', color: '#fff', fontWeight: '700' },
  previewActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 20 },
  previewLink: { fontSize: 13, color: '#2f6fd0', fontWeight: '500' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  typeCard: {
    width: '48%', padding: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e5e5', backgroundColor: '#fafafa',
  },
  typeCardSelected: { borderColor: '#111', backgroundColor: '#111' },
  typeLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 3 },
  typeLabelSelected: { color: '#fff' },
  typeDesc: { fontSize: 11, color: '#aaa' },
  typeDescSelected: { color: '#ccc' },
  confirmNote: { fontSize: 13, color: '#777', lineHeight: 19, marginBottom: 16 },
  btn: { backgroundColor: '#111', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});