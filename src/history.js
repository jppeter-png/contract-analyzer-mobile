import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'contract_analyzer_history';
const MAX_ENTRIES = 50;

export async function getHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveAnalysis({ fileName, analysis, findings = [], totalRedacted = 0 }) {
  if (!analysis) return;
  try {
    const list = await getHistory();
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString(),
      fileName: fileName || 'Pasted text',
      overall_risk: analysis.overall_risk,
      summary: analysis.summary,
      analysis,
      findings,
      totalRedacted,
    };
    const next = [entry, ...list].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('Failed to save analysis history', err);
  }
}

export async function deleteHistoryEntry(id) {
  const list = await getHistory();
  const next = list.filter(e => e.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearHistory() {
  await AsyncStorage.removeItem(KEY);
}
