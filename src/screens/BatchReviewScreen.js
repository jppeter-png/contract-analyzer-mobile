import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analyzeContract } from '../api';
import { saveAnalysis } from '../history';
import { chunkText, mergeAnalyses, estimateMinutes, MAX_CHARS_PER_ANALYSIS, CHUNK_INTERVAL_MS } from '../analysisChunking';
import RiskBadge from '../components/RiskBadge';

export default function BatchReviewScreen({ navigation, route }) {
  const { results } = route.params;
  const [analyzing, setAnalyzing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [stepInfo, setStepInfo] = useState(null); // { step, totalSteps, chunkIndex, totalChunksForFile, waitSeconds }
  const [analyses, setAnalyses] = useState({});
  const [expandedRedacted, setExpandedRedacted] = useState(new Set());
  const [expandedFindings, setExpandedFindings] = useState({});
  const cancelledRef = useRef(false);

  const toggleRedacted = (index) => {
    setExpandedRedacted(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const toggleFinding = (fileIndex, findingIndex) => {
    const key = `${fileIndex}-${findingIndex}`;
    setExpandedFindings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const analyzeAll = async () => {
    setAnalyzing(true);
    const newAnalyses = {};
    for (let i = 0; i < results.length; i++) {
      const item = results[i];
      if (item.error) continue;
      setCurrentIndex(i);
      try {
        const analysis = await analyzeContract(item.scrubResult.scrubbedText);
        newAnalyses[i] = analysis;
        saveAnalysis({
          fileName: item.fileName,
          analysis,
          findings: item.scrubResult.findings || [],
          totalRedacted: item.scrubResult.totalRedacted || 0,
        });
      } catch (err) {
        newAnalyses[i] = { error: err.response?.data?.error || err.message };
      }
    }
    setAnalyses(newAnalyses);
    setCurrentIndex(null);
    setAnalyzing(false);
  };

  // Builds one ordered list of analyze calls across the WHOLE batch — a file
  // that needs 3 sections contributes 3 steps, spliced in with every other
  // file's steps in file order. Pacing is applied globally across this list,
  // not reset per file, since every call shares the same rate-limit budget.
  const buildBatchSteps = () => {
    const steps = [];
    results.forEach((item, fileIndex) => {
      if (item.error) return;
      const chunks = chunkText(item.scrubResult.scrubbedText, MAX_CHARS_PER_ANALYSIS);
      chunks.forEach((text, chunkIndex) => {
        steps.push({ fileIndex, chunkIndex, totalChunksForFile: chunks.length, text });
      });
    });
    return steps;
  };

  const waitWithCountdown = (ms, onTick) => {
    return new Promise((resolve) => {
      let remaining = ms;
      onTick(Math.ceil(remaining / 1000));
      const interval = setInterval(() => {
        remaining -= 1000;
        onTick(Math.max(0, Math.ceil(remaining / 1000)));
        if (remaining <= 0 || cancelledRef.current) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
  };

  const analyzeAllChunked = async () => {
    setAnalyzing(true);
    cancelledRef.current = false;
    const steps = buildBatchSteps();
    const newAnalyses = {};
    const perFileChunks = {};
    const failedFiles = new Set();
    let calledOnce = false;

    for (let s = 0; s < steps.length; s++) {
      if (cancelledRef.current) break;
      const step = steps[s];
      if (failedFiles.has(step.fileIndex)) continue;

      if (calledOnce) {
        setStepInfo({ step: s, totalSteps: steps.length, waiting: true });
        await waitWithCountdown(CHUNK_INTERVAL_MS, (secs) =>
          setStepInfo({ step: s, totalSteps: steps.length, waiting: true, waitSeconds: secs })
        );
        if (cancelledRef.current) break;
      }
      calledOnce = true;

      setCurrentIndex(step.fileIndex);
      setStepInfo({
        step: s + 1, totalSteps: steps.length, waiting: false,
        chunkIndex: step.chunkIndex + 1, totalChunksForFile: step.totalChunksForFile,
      });

      try {
        const analysis = await analyzeContract(
          step.text,
          'auto',
          step.totalChunksForFile > 1 ? { index: step.chunkIndex + 1, total: step.totalChunksForFile } : null
        );
        perFileChunks[step.fileIndex] = perFileChunks[step.fileIndex] || [];
        perFileChunks[step.fileIndex].push(analysis);
      } catch (err) {
        failedFiles.add(step.fileIndex);
        newAnalyses[step.fileIndex] = { error: err.response?.data?.error || err.message };
      }
    }

    // Only merge+show files whose sections all completed — if cancelled or a
    // later section failed mid-file, a partial merge would misrepresent an
    // incomplete read as a full one. Files that did finish (e.g. before a
    // cancel) still show normally rather than throwing away real results.
    for (const [fileIndexStr, chunkAnalyses] of Object.entries(perFileChunks)) {
      const fileIndex = Number(fileIndexStr);
      const expectedChunks = steps.filter(st => st.fileIndex === fileIndex).length;
      if (chunkAnalyses.length !== expectedChunks) continue;

      const merged = chunkAnalyses.length > 1 ? mergeAnalyses(chunkAnalyses) : chunkAnalyses[0];
      newAnalyses[fileIndex] = merged;
      const item = results[fileIndex];
      saveAnalysis({
        fileName: item.fileName,
        analysis: merged,
        findings: item.scrubResult.findings || [],
        totalRedacted: item.scrubResult.totalRedacted || 0,
      });
    }
    setAnalyses(newAnalyses);

    setCurrentIndex(null);
    setStepInfo(null);
    setAnalyzing(false);
  };

  const handleCancelChunked = () => {
    Alert.alert('Cancel analysis?', 'Files not yet analyzed will be skipped.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Cancel', style: 'destructive', onPress: () => { cancelledRef.current = true; } },
    ]);
  };

  const handleAnalyzeAllPress = () => {
    const steps = buildBatchSteps();
    const filesNeedingChunking = results.filter(item =>
      !item.error && chunkText(item.scrubResult.scrubbedText, MAX_CHARS_PER_ANALYSIS).length > 1
    ).length;

    if (filesNeedingChunking === 0) {
      analyzeAll();
      return;
    }

    const minutes = estimateMinutes(steps.length);
    Alert.alert(
      'Some contracts are long',
      `${filesNeedingChunking} of ${results.length} file${results.length !== 1 ? 's' : ''} exceed the ${MAX_CHARS_PER_ANALYSIS.toLocaleString()}-character single-pass limit. Later sections in those files would be skipped unless you process everything in full.`,
      [
        { text: 'Process anyway (may miss later sections)', onPress: analyzeAll },
        { text: `Process in full, ~${minutes} min (${steps.length} sections total)`, onPress: analyzeAllChunked },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const viewResult = (index) => {
    const item = results[index];
    navigation.navigate('Results', {
      analysis: analyses[index],
      findings: item.scrubResult.findings || [],
      totalRedacted: item.scrubResult.totalRedacted || 0,
      fileName: item.fileName,
    });
  };

  const totalRedacted = results.reduce((sum, r) => sum + (r.scrubResult?.totalRedacted || 0), 0);
  const hasAnalyses = Object.keys(analyses).length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => navigation.navigate('Upload')} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Batch review</Text>
        <Text style={styles.meta}>
          {results.length} contract{results.length !== 1 ? 's' : ''} · {totalRedacted} items redacted total
        </Text>

        {results.map((item, i) => {
          const findings = item.scrubResult?.findings || [];
          const total = item.scrubResult?.totalRedacted || 0;
          const isExpanded = expandedRedacted.has(i);
          const analysis = analyses[i];

          return (
            <View key={i} style={styles.card}>
              {/* File header */}
              <View style={styles.cardTop}>
                <Text style={styles.fileIcon}>
                  {item.fileName?.endsWith('.pdf') ? '📕' : item.fileName?.endsWith('.docx') ? '📘' : '📄'}
                </Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.fileName}</Text>
                  <Text style={styles.cardSub}>
                    {item.scrubResult?.wordCount?.toLocaleString()} words
                    {total > 0 ? ` · ${total} item${total !== 1 ? 's' : ''} redacted` : ' · no PII found'}
                  </Text>
                </View>
                {analyzing && currentIndex === i && <ActivityIndicator size="small" color="#111" />}
                {analysis && !analysis.error && <RiskBadge risk={analysis.overall_risk} small />}
              </View>

              {/* Redacted section */}
              {total > 0 && (
                <View style={styles.redactedSection}>
                  <TouchableOpacity
                    style={styles.redactedToggle}
                    onPress={() => toggleRedacted(i)}
                  >
                    <Text style={styles.redactedToggleIcon}>🔒</Text>
                    <Text style={styles.redactedToggleText}>
                      {total} identifier{total !== 1 ? 's' : ''} redacted
                    </Text>
                    <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.findingsList}>
                      {findings.map((finding, fi) => {
                        const fKey = `${i}-${fi}`;
                        const fExpanded = expandedFindings[fKey];
                        return (
                          <View key={fi} style={styles.findingRow}>
                            <TouchableOpacity
                              style={styles.findingHeader}
                              onPress={() => finding.redacted?.length && toggleFinding(i, fi)}
                            >
                              <View style={styles.pill}>
                                <Text style={styles.pillText}>{finding.label} ×{finding.count}</Text>
                              </View>
                              {finding.redacted?.length > 0 && (
                                <Text style={styles.expandHint}>{fExpanded ? '▲' : '▼'}</Text>
                              )}
                            </TouchableOpacity>
                            {fExpanded && finding.redacted?.length > 0 && (
                              <View style={styles.redactedValues}>
                                {finding.redacted.map((val, vi) => (
                                  <Text key={vi} style={styles.redactedValue}>• {val}</Text>
                                ))}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Error */}
              {item.error && <Text style={styles.errorText}>⚠ Could not process: {item.error}</Text>}

              {/* View results button */}
              {analysis && !analysis.error && (
                <TouchableOpacity style={styles.viewBtn} onPress={() => viewResult(i)}>
                  <Text style={styles.viewBtnText}>View full results →</Text>
                </TouchableOpacity>
              )}
              {analysis?.error && (
                <Text style={styles.errorText}>Analysis failed: {analysis.error}</Text>
              )}
            </View>
          );
        })}

        {!hasAnalyses ? (
          <>
            <TouchableOpacity
              style={[styles.btn, analyzing && styles.btnDisabled]}
              onPress={handleAnalyzeAllPress}
              disabled={analyzing}
            >
              {analyzing ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.btnText}>
                    {stepInfo?.waiting
                      ? `Waiting ${stepInfo.waitSeconds ?? ''}s to avoid rate limits...`
                      : stepInfo
                        ? `Analyzing file ${currentIndex + 1} of ${results.length}${stepInfo.totalChunksForFile > 1 ? ` (section ${stepInfo.chunkIndex} of ${stepInfo.totalChunksForFile})` : ''}...`
                        : `Analyzing ${currentIndex !== null ? `${currentIndex + 1} of ${results.length}` : ''}...`}
                  </Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Analyze all {results.length} contracts →</Text>
              )}
            </TouchableOpacity>

            {analyzing && stepInfo && (
              <View style={styles.batchProgressRow}>
                <Text style={styles.batchProgressText}>
                  Step {stepInfo.step} of {stepInfo.totalSteps}
                  {stepInfo.totalSteps - stepInfo.step > 0
                    ? ` · ~${estimateMinutes(stepInfo.totalSteps - stepInfo.step)} min remaining`
                    : ''}
                </Text>
                <TouchableOpacity onPress={handleCancelChunked}>
                  <Text style={styles.batchCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('Upload')}>
            <Text style={styles.newBtnText}>↺ Analyze new contracts</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          This analysis is for informational purposes only and does not constitute legal advice.
        </Text>
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
  meta: { fontSize: 14, color: '#888', marginBottom: 24 },
  card: {
    backgroundColor: '#f8f8f8', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#e5e5e5', marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  fileIcon: { fontSize: 22 },
  cardMeta: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#111' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
  redactedSection: {
    borderTopWidth: 1, borderTopColor: '#e5e5e5', paddingTop: 10, marginTop: 4,
  },
  redactedToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  redactedToggleIcon: { fontSize: 13 },
  redactedToggleText: { flex: 1, fontSize: 13, color: '#166534', fontWeight: '600' },
  chevron: { fontSize: 10, color: '#aaa' },
  findingsList: { marginTop: 10, gap: 6 },
  findingRow: { marginBottom: 4 },
  findingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    backgroundColor: '#fff', borderRadius: 999, borderWidth: 1,
    borderColor: '#fcd34d', paddingVertical: 3, paddingHorizontal: 10,
  },
  pillText: { fontSize: 12, color: '#555' },
  expandHint: { fontSize: 10, color: '#aaa' },
  redactedValues: {
    marginTop: 6, marginLeft: 8, padding: 10,
    backgroundColor: '#fff8e1', borderRadius: 8,
    borderWidth: 1, borderColor: '#fde68a',
  },
  redactedValue: { fontSize: 12, color: '#444', marginBottom: 3, fontFamily: 'monospace' },
  errorText: { fontSize: 12, color: '#dc2626', marginTop: 6 },
  viewBtn: {
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#e5e5e5',
  },
  viewBtnText: { fontSize: 14, color: '#111', fontWeight: '600' },
  btn: {
    backgroundColor: '#111', borderRadius: 10, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { backgroundColor: '#aaa' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  batchProgressRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingHorizontal: 2,
  },
  batchProgressText: { fontSize: 12, color: '#888' },
  batchCancelText: { fontSize: 13, color: '#dc2626', fontWeight: '500' },
  newBtn: {
    backgroundColor: '#f0f0f0', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  newBtnText: { color: '#444', fontSize: 15, fontWeight: '600' },
  disclaimer: { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 20, lineHeight: 18 },
});