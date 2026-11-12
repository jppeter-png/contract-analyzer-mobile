import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chunkText, MAX_CHARS_PER_ANALYSIS } from '../analysisChunking';
import { preloadInterstitial } from '../ads';
import { requestAiConsent } from '../aiConsent';
import { LOW_OCR_CONFIDENCE, sourceInfo } from '../coverage';
import { splitSegments, redactionStarts, passageAround } from '../redactionPreview';
import { scrubText } from '../api';
import AddTermField from '../components/AddTermField';
import { getExtraTerms } from '../customTerms';
import { t, findingLabel, displayFileName } from '../i18n';

const HIDDEN_LABEL = 'Hidden by you'; // what the server calls the items the user asked to hide
const CONTRACT_TYPES = ['auto', 'employment', 'nda', 'lease', 'service', 'loan', 'tos'];

export default function ReviewScreen({ navigation, route }) {
  const { scrubResult: initialResult, fileName, fromPhotos = false, ocrConfidence = 100 } = route.params;
  const hardToRead = fromPhotos && ocrConfidence < LOW_OCR_CONFIDENCE;
  // Changes when the user hides something the automatic pass missed.
  const [scrubResult, setScrubResult] = useState(initialResult);
  const { scrubbedText, findings = [], wordCount, totalRedacted } = scrubResult;
  const autoDetectOff = scrubResult.autoDetect === false;
  // Only items typed for this session are worth flagging: a saved name is not expected in every document.
  const notFound = (scrubResult.termMatches || [])
    .filter(m => m.count === 0 && getExtraTerms().some(e => e.toLowerCase() === m.term.toLowerCase()))
    .map(m => m.term);
  const [missedBusy, setMissedBusy] = useState(false);

  const [selectedType, setSelectedType] = useState('auto');
  const [expandedIndex, setExpandedIndex] = useState(null);
  // The list of redacted items opens on tap so the screen starts uncluttered; the text that will be sent
  // is always open, because reading it is the point of this screen.
  const [showFindings, setShowFindings] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [typeOpen, setTypeOpen] = useState(false);

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

  // Sends the text we already hold (the original stays out of it) back with the one new item,
  // asking the server to hide only that.
  const hideMissed = async raw => {
    const term = raw.replace(/\s+/g, ' ').trim();
    if (term.length < 2) return { error: t('details.err.short') };
    setMissedBusy(true);
    try {
      const next = await scrubText(scrubbedText, { customTerms: [term], autoDetect: false });
      if (!next.termMatches?.[0]?.count) return { error: t('review.missed.notFound') };
      const added = next.findings.find(f => f.label === HIDDEN_LABEL);
      const merged = findings.map(f => (f.label === HIDDEN_LABEL
        ? { ...f, count: f.count + added.count, redacted: [...new Set([...f.redacted, ...added.redacted])] }
        : f));
      if (!findings.some(f => f.label === HIDDEN_LABEL)) merged.unshift(added);
      setScrubResult({
        ...scrubResult,
        scrubbedText: next.scrubbedText,
        findings: merged,
        totalRedacted: merged.reduce((sum, f) => sum + f.count, 0),
      });
      setFocus(0);
      return { ok: true };
    } catch {
      return { error: t('review.missed.error') };
    } finally {
      setMissedBusy(false);
    }
  };

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
          text: t('review.long.full'),
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

        {autoDetectOff && (
          <View style={[styles.alert, styles.alertDanger]}>
            <Text style={[styles.alertTitle, styles.alertTitleDanger]}>{t('review.autoOff.title')}</Text>
            <Text style={styles.alertBody}>{t('review.autoOff.body')}</Text>
          </View>
        )}

        {/* PII findings */}
        {totalRedacted > 0 ? (
          <View style={[styles.alert, styles.alertWarning]}>
            <TouchableOpacity
              style={styles.collapseHeader}
              onPress={() => setShowFindings(v => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showFindings }}
            >
              <Text style={[styles.alertTitle, styles.alertTitleWarning, styles.collapseTitle]}>
                {t('review.redactedTitle', { count: totalRedacted })}
              </Text>
              <Text style={styles.expandHint}>{showFindings ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showFindings && (
              <View style={styles.findingsBody}>
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
            )}
          </View>
        ) : (
          !autoDetectOff && (
            <View style={[styles.alert, styles.alertSuccess]}>
              <Text style={[styles.alertTitle, styles.alertTitleSuccess]}>{t('review.noPii')}</Text>
            </View>
          )
        )}

        {notFound.length > 0 && (
          <Text style={styles.notFound}>{t('review.notFound', { terms: notFound.join(', ') })}</Text>
        )}

        {/* Text read from photos can contain recognition mistakes */}
        {fromPhotos && (
          <View style={[styles.photoNote, hardToRead && styles.photoNoteStrong]}>
            <Text style={[styles.photoNoteText, hardToRead && styles.photoNoteTextStrong]}>
              {hardToRead ? t('review.photoLowConfidence') : t('review.photoNote')}
            </Text>
          </View>
        )}

        {/* Exactly what will be sent, and a way to hide anything the automatic pass left visible */}
        {!!scrubbedText && (
          <>
            <TouchableOpacity
              style={[styles.sectionToggle, !showPreview && styles.sectionToggleClosed]}
              onPress={() => setShowPreview(v => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showPreview }}
            >
              <Text style={[styles.sectionLabel, styles.sectionToggleLabel]}>{t('review.sentLabel')}</Text>
              <Text style={styles.expandHint}>{showPreview ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showPreview && (
              <>
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

                <View style={styles.missed}>
                  <Text style={styles.missedTitle}>{t('review.missed.title')}</Text>
                  <Text style={styles.missedDesc}>{t('review.missed.desc')}</Text>
                  <AddTermField
                    placeholder={t('review.missed.placeholder')}
                    buttonLabel={t('review.missed.add')}
                    onAdd={hideMissed}
                    busy={missedBusy}
                  />
                </View>
              </>
            )}
          </>
        )}

        {/* Document type selector */}
        <Text style={styles.sectionLabel}>{t('review.docType')}</Text>
        <Text style={styles.sectionDesc}>{t('review.docTypeDesc')}</Text>
        <TouchableOpacity
          style={styles.typeCurrent}
          onPress={() => setTypeOpen(v => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: typeOpen }}
        >
          <View style={styles.typeCurrentText}>
            <Text style={[styles.typeLabel, styles.typeLabelSelected]}>{t(`review.type.${selectedType}`)}</Text>
            <Text style={[styles.typeDesc, styles.typeDescSelected]}>{t(`review.type.${selectedType}.desc`)}</Text>
          </View>
          <Text style={styles.typeCaret}>{typeOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {typeOpen && (
          <View style={styles.typeGrid}>
            {CONTRACT_TYPES.filter(key => key !== selectedType).map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.typeCard, selectedType === key && styles.typeCardSelected]}
                onPress={() => { setSelectedType(key); setTypeOpen(false); }}
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
        )}

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
  alertDanger: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  alertTitleDanger: { color: '#991b1b' },
  alertBody: { fontSize: 13, color: '#7f1d1d', lineHeight: 19 },
  notFound: { fontSize: 12, color: '#b45309', marginTop: -10, marginBottom: 16 },
  missed: { backgroundColor: '#fffaf0', borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', padding: 14, marginBottom: 20 },
  missedTitle: { fontSize: 14, fontWeight: '600', color: '#92400e' },
  missedDesc: { fontSize: 13, color: '#666', lineHeight: 19, marginTop: 2, marginBottom: 10 },
  collapseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  collapseTitle: { flex: 1, marginBottom: 0 },
  findingsBody: { marginTop: 10 },
  sectionToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingVertical: 4 },
  sectionToggleClosed: { marginBottom: 24 },
  sectionToggleLabel: { marginBottom: 0 },
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
  typeCurrent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: 14, borderRadius: 10, backgroundColor: '#111', marginBottom: 12,
  },
  typeCurrentText: { flex: 1 },
  typeCaret: { fontSize: 11, color: '#ccc' },
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