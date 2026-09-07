import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RiskBadge from '../components/RiskBadge';
import IssueCard from '../components/IssueCard';

export default function ResultsScreen({ navigation, route }) {
  const { analysis, findings = [], totalRedacted = 0 } = route.params;
  const { overall_risk, summary, issues = [], missing_protections = [], truncated = false } = analysis;

  const high = issues.filter(i => i.severity === 'high');
  const medium = issues.filter(i => i.severity === 'medium');
  const low = issues.filter(i => i.severity === 'low');
  const sorted = [...high, ...medium, ...low];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.headerRow}>
          <RiskBadge risk={overall_risk} large />
          <TouchableOpacity onPress={() => navigation.navigate('Upload')} style={styles.newBtn}>
            <Text style={styles.newBtnText}>Home</Text>
          </TouchableOpacity>
        </View>

        {truncated && (
          <View style={styles.truncatedNotice}>
            <Text style={styles.truncatedText}>
              ⚠ This contract was long — only the first ~8,000 characters were analyzed. Later sections weren't reviewed.
            </Text>
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>

        <View style={styles.stats}>
          {[['high', high.length], ['medium', medium.length], ['low', low.length]].map(([risk, count]) => (
            <View key={risk} style={styles.statChip}>
              <Text style={[styles.statCount, { color: riskColor(risk) }]}>{count}</Text>
              <Text style={styles.statLabel}>{risk === 'high' ? 'High' : risk === 'medium' ? 'Medium' : 'Low'}</Text>
            </View>
          ))}
        </View>

        {/* Redacted items */}
        {totalRedacted > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 Redacted before analysis</Text>
            <View style={styles.redactedBox}>
              <Text style={styles.redactedSummary}>
                {totalRedacted} identifier{totalRedacted !== 1 ? 's' : ''} stripped before AI analysis
              </Text>
              {findings.map(({ label, count, redacted = [] }) => (
                <View key={label} style={styles.redactedGroup}>
                  <Text style={styles.redactedLabel}>{label} ×{count}</Text>
                  {redacted.map((item, i) => (
                    <Text key={i} style={styles.redactedItem}>• {item}</Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        {sorted.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠ Issues found</Text>
            {sorted.map((issue, i) => <IssueCard key={i} issue={issue} />)}
          </View>
        )}

        {missing_protections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛑 Missing protections</Text>
            {missing_protections.map((p, i) => (
              <View key={i} style={styles.missingItem}>
                <Text style={styles.missingDot}>○</Text>
                <Text style={styles.missingText}>{p}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.disclaimer}>
          This analysis is for informational purposes only and does not constitute legal advice. Consult a qualified attorney before signing any contract.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function riskColor(risk) {
  return risk === 'high' ? '#dc2626' : risk === 'medium' ? '#d97706' : '#16a34a';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  newBtn: { backgroundColor: '#f0f0f0', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  newBtnText: { fontSize: 13, color: '#444', fontWeight: '500' },
  truncatedNotice: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#fde68a' },
  truncatedText: { fontSize: 12.5, color: '#92400e', lineHeight: 18 },
  summaryCard: { backgroundColor: '#f8f8f8', borderRadius: 10, padding: 16, marginBottom: 16 },
  summaryText: { fontSize: 15, color: '#333', lineHeight: 23 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statChip: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  statCount: { fontSize: 26, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#888' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12 },
  redactedBox: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#bbf7d0' },
  redactedSummary: { fontSize: 13, color: '#166534', fontWeight: '600', marginBottom: 12 },
  redactedGroup: { marginBottom: 10 },
  redactedLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  redactedItem: { fontSize: 13, color: '#333', fontFamily: 'monospace', marginBottom: 2, marginLeft: 4 },
  missingItem: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#f8f8f8', borderRadius: 8, marginBottom: 6 },
  missingDot: { fontSize: 16, color: '#999', marginTop: 1 },
  missingText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 21 },
  disclaimer: { fontSize: 12, color: '#aaa', lineHeight: 18, textAlign: 'center', marginTop: 8 },
});