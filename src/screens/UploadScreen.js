import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { scrubDocument, scrubText } from '../api';

const TABS = ['Upload file', 'Paste text', 'Camera', 'History'];

export default function UploadScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState(0);
  const [pastedText, setPastedText] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzingIndex, setAnalyzingIndex] = useState(null);

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled || !result.assets?.length) return;
      // Avoid duplicates by name
      setFiles(prev => {
        const existing = new Set(prev.map(f => f.name));
        const newFiles = result.assets.filter(f => !existing.has(f.name));
        return [...prev, ...newFiles];
      });
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not pick files');
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeFile = async (file, index) => {
    setAnalyzingIndex(index);
    try {
      const scrubResult = await scrubDocument(file);
      navigation.navigate('Review', { scrubResult, fileName: file.name });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Could not process file');
    } finally {
      setAnalyzingIndex(null);
    }
  };

  const analyzeAll = async () => {
    if (!files.length) return;
    setLoading(true);
    const results = [];

    for (let i = 0; i < files.length; i++) {
      setAnalyzingIndex(i);
      try {
        const scrubResult = await scrubDocument(files[i]);
        results.push({ fileName: files[i].name, scrubResult });
      } catch (err) {
        results.push({ fileName: files[i].name, error: err.response?.data?.error || err.message });
      }
    }

    setAnalyzingIndex(null);
    setLoading(false);
    navigation.navigate('BatchReview', { results });
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    setLoading(true);
    try {
      const data = await scrubText(pastedText.trim());
      navigation.navigate('Review', { scrubResult: data });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Could not process text');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Contract Analyzer</Text>
          <Text style={styles.subtitle}>
            Upload, paste, or photograph a contract. Personal data is removed before any AI analysis.
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === i && styles.tabActive]}
              onPress={() => setActiveTab(i)}
            >
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upload file */}
        {activeTab === 0 && (
          <View>
            <TouchableOpacity style={styles.dropZone} onPress={handleFilePick} disabled={loading}>
              <Text style={styles.dropIcon}>📄</Text>
              <Text style={styles.dropTitle}>Tap to select files</Text>
              <Text style={styles.dropSub}>PDF, DOCX, or TXT · select multiple</Text>
            </TouchableOpacity>

            {/* File list */}
            {files.length > 0 && (
              <View style={styles.fileList}>
                <View style={styles.fileListHeader}>
                  <Text style={styles.fileListTitle}>{files.length} file{files.length !== 1 ? 's' : ''} selected</Text>
                  <TouchableOpacity onPress={() => setFiles([])}>
                    <Text style={styles.clearAll}>Clear all</Text>
                  </TouchableOpacity>
                </View>

                {files.map((file, i) => (
                  <View key={i} style={styles.fileCard}>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileIcon}>
                        {file.name.endsWith('.pdf') ? '📕' : file.name.endsWith('.docx') ? '📘' : '📄'}
                      </Text>
                      <View style={styles.fileMeta}>
                        <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                        <Text style={styles.fileSize}>
                          {file.size ? `${(file.size / 1024).toFixed(0)} KB` : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.fileActions}>
                      {analyzingIndex === i ? (
                        <ActivityIndicator size="small" color="#111" />
                      ) : (
                        <>
                          <TouchableOpacity
                            style={styles.analyzeOneBtn}
                            onPress={() => analyzeFile(file, i)}
                            disabled={loading || analyzingIndex !== null}
                          >
                            <Text style={styles.analyzeOneBtnText}>Analyze</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removeFile(i)} style={styles.removeBtn}>
                            <Text style={styles.removeBtnText}>✕</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                ))}

                {files.length > 1 && (
                  <TouchableOpacity
                    style={[styles.analyzeAllBtn, (loading || analyzingIndex !== null) && styles.btnDisabled]}
                    onPress={analyzeAll}
                    disabled={loading || analyzingIndex !== null}
                  >
                    {loading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.analyzeAllBtnText}>
                          Analyzing {analyzingIndex !== null ? `${analyzingIndex + 1} of ${files.length}` : ''}...
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.analyzeAllBtnText}>Analyze all {files.length} contracts →</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Paste text */}
        {activeTab === 1 && (
          <View>
            <TextInput
              style={styles.textArea}
              multiline
              placeholder="Paste your contract text here..."
              placeholderTextColor="#aaa"
              value={pastedText}
              onChangeText={setPastedText}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.analyzeAllBtn, (!pastedText.trim() || loading) && styles.btnDisabled]}
              onPress={handlePasteSubmit}
              disabled={!pastedText.trim() || loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.analyzeAllBtnText}>Continue →</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Camera */}
        {activeTab === 2 && (
          <TouchableOpacity style={styles.dropZone} onPress={() => navigation.navigate('Camera')}>
            <Text style={styles.dropIcon}>📷</Text>
            <Text style={styles.dropTitle}>Photograph your contract</Text>
            <Text style={styles.dropSub}>Take photos or pick from camera roll</Text>
            <Text style={styles.dropSub}>Multiple pages supported</Text>
          </TouchableOpacity>
        )}

        {/* History */}
        {activeTab === 3 && (
          <TouchableOpacity style={styles.dropZone} onPress={() => navigation.navigate('History')}>
            <Text style={styles.dropIcon}>🕓</Text>
            <Text style={styles.dropTitle}>View past analyses</Text>
            <Text style={styles.dropSub}>Revisit contracts you've already checked</Text>
          </TouchableOpacity>
        )}

        {/* Privacy notice */}
        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>🔒</Text>
          <Text style={styles.noticeText}>
            Names, emails, phone numbers, SSNs, and other personal identifiers are automatically redacted before analysis.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24, paddingBottom: 48 },
  header: { marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '700', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', lineHeight: 22 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e5e5', marginBottom: 20 },
  tab: { paddingVertical: 10, paddingHorizontal: 14, marginRight: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#111', marginBottom: -1 },
  tabText: { fontSize: 14, color: '#888' },
  tabTextActive: { color: '#111', fontWeight: '600' },
  dropZone: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#ccc', borderRadius: 12,
    paddingVertical: 48, alignItems: 'center', backgroundColor: '#fafafa', marginBottom: 16,
  },
  dropIcon: { fontSize: 40, marginBottom: 12 },
  dropTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  dropSub: { fontSize: 13, color: '#888', marginTop: 2 },
  fileList: { marginBottom: 16 },
  fileListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  fileListTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  clearAll: { fontSize: 13, color: '#888' },
  fileCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, backgroundColor: '#f8f8f8', borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e5e5', marginBottom: 8,
  },
  fileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  fileIcon: { fontSize: 22 },
  fileMeta: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '500', color: '#111' },
  fileSize: { fontSize: 12, color: '#888', marginTop: 2 },
  fileActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyzeOneBtn: {
    backgroundColor: '#111', borderRadius: 6,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  analyzeOneBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: 14, color: '#aaa' },
  analyzeAllBtn: {
    backgroundColor: '#111', borderRadius: 10, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { backgroundColor: '#aaa' },
  analyzeAllBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textArea: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14,
    height: 200, fontSize: 14, color: '#111', backgroundColor: '#fafafa',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 12,
  },
  notice: {
    flexDirection: 'row', backgroundColor: '#f5f5f5', borderRadius: 10,
    padding: 14, gap: 10, alignItems: 'flex-start', marginTop: 16,
  },
  noticeIcon: { fontSize: 16 },
  noticeText: { flex: 1, fontSize: 13, color: '#666', lineHeight: 19 },
});
