import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analyzeContract } from '../api';
import { saveAnalysis } from '../history';
import { chunkText, estimateMinutes, MAX_CHARS_PER_ANALYSIS } from '../analysisChunking';

const CONTRACT_TYPES = [
  { key: 'auto',       label: '🔍 Auto-detect',           desc: "Let AI figure it out" },
  { key: 'employment', label: '💼 Employment',             desc: "Job offers, work agreements" },
  { key: 'nda',        label: '🤫 NDA / Confidentiality',  desc: "Non-disclosure agreements" },
  { key: 'lease',      label: '🏠 Lease / Real estate',    desc: "Rental and property contracts" },
  { key: 'service',    label: '🤝 Service agreement',      desc: "Freelance, vendor, consulting" },
  { key: 'loan',       label: '💰 Loan / Finance',         desc: "Loans, credit, financing" },
  { key: 'tos',        label: '📱 Terms of service',       desc: "ToS, privacy policies" },
];

export default function ReviewScreen({ navigation, route }) {
  const { scrubResult, fileName } = route.params;
  const { scrubbedText, findings = [], wordCount, totalRedacted, preview } = scrubResult;

  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('auto');
  const [expandedIndex, setExpandedIndex] = useState(null);

  const runNormalAnalysis = async () => {
    setLoading(true);
    navigation.navigate('Analyzing');
    try {
      const analysis = await analyzeContract(scrubbedText, selectedType);
      saveAnalysis({ fileName, analysis, findings, totalRedacted });
      navigation.replace('Results', { analysis, findings, totalRedacted, fileName });
    } catch (err) {
      navigation.goBack();
      Alert.alert('Analysis failed', err.response?.data?.error || err.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const runChunkedAnalysis = () => {
    const chunks = chunkText(scrubbedText, MAX_CHARS_PER_ANALYSIS);
    navigation.navigate('ChunkedAnalyzing', { chunks, contractType: selectedType, fileName, findings, totalRedacted });
  };

  const handleAnalyze = () => {
    if (scrubbedText.length <= MAX_CHARS_PER_ANALYSIS) {
      runNormalAnalysis();
      return;
    }

    const minutes = estimateMinutes(Math.ceil(scrubbedText.length / MAX_CHARS_PER_ANALYSIS));
    Alert.alert(
      'This contract is long',
      `It's ${scrubbedText.length.toLocaleString()} characters — longer than the ${MAX_CHARS_PER_ANALYSIS.toLocaleString()}-character limit analyzed in a single pass. Later sections would be skipped unless you choose to process it in full.`,
      [
        {
          text: 'Process anyway (may miss later sections)',
          onPress: runNormalAnalysis,
        },
        {
          text: `Process in full, ~${minutes} min (splits into sections)`,
          onPress: runChunkedAnalysis,
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Privacy review</Text>
        <Text style={styles.meta}>
          {fileName ? `"${fileName}" · ` : ''}{wordCount?.toLocaleString() ?? 0} words
        </Text>

        {/* PII findings */}
        {totalRedacted > 0 ? (
          <View style={[styles.alert, styles.alertWarning]}>
            <Text style={[styles.alertTitle, styles.alertTitleWarning]}>
              🛡 {totalRedacted} item{totalRedacted !== 1 ? 's' : ''} will be redacted
            </Text>
            {findings.map(({ label, count, redacted = [] }, i) => (
              <View key={label} style={styles.findingRow}>
                <TouchableOpacity
                  style={styles.findingHeader}
                  onPress={() => setExpandedIndex(expandedIndex === i ? null : i)}
                >
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>{label} ×{count}</Text>
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
            <Text style={[styles.alertTitle, styles.alertTitleSuccess]}>✅ No personal identifiers detected</Text>
          </View>
        )}

        {/* Contract type selector */}
        <Text style={styles.sectionLabel}>Contract type</Text>
        <Text style={styles.sectionDesc}>Choose a category for a more targeted analysis</Text>
        <View style={styles.typeGrid}>
          {CONTRACT_TYPES.map(({ key, label, desc }) => (
            <TouchableOpacity
              key={key}
              style={[styles.typeCard, selectedType === key && styles.typeCardSelected]}
              onPress={() => setSelectedType(key)}
            >
              <Text style={[styles.typeLabel, selectedType === key && styles.typeLabelSelected]}>
                {label}
              </Text>
              <Text style={[styles.typeDesc, selectedType === key && styles.typeDescSelected]}>
                {desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.confirmNote}>
          The redacted version above is what will be sent for analysis.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={handleAnalyze} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Analyze contract</Text>}
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
  previewBox: {
    backgroundColor: '#f8f8f8', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#e5e5e5', marginBottom: 20,
  },
  previewText: { fontSize: 12, color: '#555', lineHeight: 19, fontFamily: 'monospace' },
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