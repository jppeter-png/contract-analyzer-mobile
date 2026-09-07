import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import RiskBadge from '../components/RiskBadge';
import { getHistory, deleteHistoryEntry, clearHistory } from '../history';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function HistoryScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(list => {
        setEntries(list);
        setLoaded(true);
      });
    }, [])
  );

  const handleDelete = (id) => {
    Alert.alert('Delete analysis', 'Remove this from your history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => setEntries(await deleteHistoryEntry(id)),
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Clear history', 'Remove all past analyses?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          setEntries([]);
        },
      },
    ]);
  };

  const openEntry = (entry) => {
    navigation.navigate('Results', {
      analysis: entry.analysis,
      findings: entry.findings,
      totalRedacted: entry.totalRedacted,
      fileName: entry.fileName,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>History</Text>
        {entries.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearAll}>Clear all</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {loaded && entries.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🕓</Text>
            <Text style={styles.emptyTitle}>No past analyses yet</Text>
            <Text style={styles.emptySub}>Contracts you analyze will show up here.</Text>
          </View>
        )}

        {entries.map((entry) => (
          <TouchableOpacity key={entry.id} style={styles.card} onPress={() => openEntry(entry)}>
            <View style={styles.cardTop}>
              <Text style={styles.fileName} numberOfLines={1}>{entry.fileName}</Text>
              <TouchableOpacity onPress={() => handleDelete(entry.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardMeta}>
              <RiskBadge risk={entry.overall_risk} />
              <Text style={styles.date}>{formatDate(entry.date)}</Text>
            </View>
            {!!entry.summary && (
              <Text style={styles.summary} numberOfLines={2}>{entry.summary}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  back: { width: 60 },
  backText: { fontSize: 15, color: '#444' },
  title: { fontSize: 17, fontWeight: '700', color: '#111' },
  clearAll: { fontSize: 13, color: '#dc2626', width: 60, textAlign: 'right' },
  container: { padding: 20, paddingBottom: 48 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#888', textAlign: 'center' },
  card: {
    backgroundColor: '#f8f8f8', borderRadius: 12, borderWidth: 1, borderColor: '#eee',
    padding: 14, marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fileName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111', marginRight: 8 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 13, color: '#aaa' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  date: { fontSize: 12, color: '#888' },
  summary: { fontSize: 13, color: '#555', lineHeight: 19 },
});
