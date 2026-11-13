import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { scrubDocument, scrubText, ocrImages } from '../api';
import { getScrubOptions, useCustomTerms } from '../customTerms';
import {
  useDetectionChoice, setDetectionMode, addListedTerm, removeListedTerm,
} from '../detectionChoice';
import AddTermField from '../components/AddTermField';
import TermChips from '../components/TermChips';
import { ACCENT } from '../theme';
import { t, getLanguage } from '../i18n';

const SOURCES = [
  { key: 'file', icon: '📄', label: 'upload.tab.file' },
  { key: 'paste', icon: '📋', label: 'upload.tab.paste' },
  { key: 'camera', icon: '📷', label: 'upload.tab.camera' },
];

/**
 * Choose a document and how personal details are hidden, then run. Nothing leaves the phone before
 * "Run analysis": picking a file, typing text or taking photos only prepares it.
 */
export default function StartScreen({ navigation, route }) {
  const [source, setSource] = useState(null); // 'file' | 'paste' | 'camera'
  const [files, setFiles] = useState([]);
  const [pastedText, setPastedText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoLanguage, setPhotoLanguage] = useState(getLanguage());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const { saved } = useCustomTerms();
  const { mode, listed } = useDetectionChoice();

  // The camera screen sends its pages back here.
  useEffect(() => {
    const returned = route.params?.photos;
    if (returned) {
      setPhotos(returned);
      setPhotoLanguage(route.params.photoLanguage || getLanguage());
      setSource(returned.length ? 'camera' : source);
      navigation.setParams({ photos: undefined, photoLanguage: undefined });
    }
  }, [route.params?.photos]);

  const hasDocument = (
    (source === 'file' && files.length > 0)
    || (source === 'paste' && pastedText.trim().length > 0)
    || (source === 'camera' && photos.length > 0)
  );
  const ownItems = saved.length + listed.length;
  const needsItems = mode === 'own' && ownItems === 0;
  const canRun = hasDocument && !needsItems && !busy;

  const pickFiles = async () => {
    setSource('file');
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
      setFiles(prev => {
        const existing = new Set(prev.map(f => f.name));
        return [...prev, ...result.assets.filter(f => !existing.has(f.name))];
      });
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('upload.err.pick'));
    }
  };

  const choose = key => {
    if (busy) return;
    if (key === 'file') pickFiles();
    else if (key === 'camera') navigation.navigate('Camera', { pages: photos, documentLanguage: photoLanguage });
    else setSource('paste');
  };

  const run = async () => {
    if (!canRun) return;
    setBusy(true);
    try {
      const options = await getScrubOptions({ extra: mode === 'own' ? listed : [], autoDetect: mode === 'auto' });

      if (source === 'paste') {
        setStatus(t('upload.scanning'));
        const scrubResult = await scrubText(pastedText.trim(), options);
        navigation.navigate('Review', { scrubResult });
      } else if (source === 'camera') {
        setStatus(t('camera.ocrRunning', { count: photos.length }));
        const { text, confidence, lowestPageConfidence } = await ocrImages(photos, photoLanguage);
        if (!text.trim()) {
          Alert.alert(t('camera.noTextTitle'), t('camera.noTextMessage'));
          return;
        }
        setStatus(t('upload.scanning'));
        const scrubResult = await scrubText(text, options);
        // The review screen warns that this text came from photos, more strongly if they were hard to read.
        navigation.navigate('Review', {
          scrubResult,
          fromPhotos: true,
          ocrConfidence: [confidence, lowestPageConfidence].filter(Number.isFinite).reduce((a, b) => Math.min(a, b), 100),
        });
      } else if (files.length === 1) {
        setStatus(t('upload.scanning'));
        const scrubResult = await scrubDocument(files[0], options);
        navigation.navigate('Review', { scrubResult, fileName: files[0].name });
      } else {
        const results = [];
        for (let i = 0; i < files.length; i++) {
          setStatus(t('upload.analyzingOf', { current: i + 1, total: files.length }));
          try {
            results.push({ fileName: files[i].name, scrubResult: await scrubDocument(files[i], options) });
          } catch (err) {
            results.push({ fileName: files[i].name, error: err.response?.data?.error || err.message });
          }
        }
        navigation.navigate('BatchReview', { results });
      }
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.error || err.message || t('upload.err.file'));
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  const hint = busy ? status : !hasDocument ? t('start.hint.doc') : needsItems ? t('start.hint.list') : '';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('start.title')}</Text>
        <Text style={styles.subtitle}>{t('start.subtitle')}</Text>

        {/* 1. The document */}
        <Text style={styles.section}>{t('start.step1')}</Text>
        <View style={styles.tiles}>
          {SOURCES.map(({ key, icon, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tile, source === key && styles.tileOn]}
              onPress={() => choose(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: source === key }}
            >
              <Text style={styles.tileIcon}>{icon}</Text>
              <Text style={[styles.tileText, source === key && styles.tileTextOn]}>{t(label)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {source === 'file' && files.map((file, i) => (
          <View key={file.name} style={styles.chipRow}>
            <Text style={styles.fileIcon}>{file.name.endsWith('.pdf') ? '📕' : file.name.endsWith('.docx') ? '📘' : '📄'}</Text>
            <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
            {!!file.size && <Text style={styles.fileSize}>{`${(file.size / 1024).toFixed(0)} KB`}</Text>}
            <TouchableOpacity onPress={() => setFiles(prev => prev.filter((_, j) => j !== i))} hitSlop={10} disabled={busy}>
              <Text style={styles.remove}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {source === 'paste' && (
          <TextInput
            style={styles.textArea}
            multiline
            placeholder={t('upload.pastePlaceholder')}
            placeholderTextColor="#aaa"
            value={pastedText}
            onChangeText={setPastedText}
            textAlignVertical="top"
            editable={!busy}
          />
        )}

        {source === 'camera' && photos.length > 0 && (
          <View style={styles.chipRow}>
            <Text style={styles.fileIcon}>📷</Text>
            <Text style={styles.fileName}>{t('start.photos', { count: photos.length })}</Text>
            <TouchableOpacity onPress={() => choose('camera')} disabled={busy}>
              <Text style={styles.retake}>{t('start.retake')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. How personal details are hidden */}
        <Text style={styles.section}>{t('start.step2')}</Text>
        <TouchableOpacity
          style={[styles.option, styles.optionHead, mode === 'auto' && styles.optionOn]}
          onPress={() => setDetectionMode('auto')}
          accessibilityRole="radio"
          accessibilityState={{ selected: mode === 'auto' }}
        >
          <View style={[styles.radio, mode === 'auto' && styles.radioOn]}>{mode === 'auto' && <View style={styles.dot} />}</View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>
              {t('start.auto')}
              {'  '}
              <Text style={styles.recommended}>{t('start.recommended')}</Text>
            </Text>
            {mode === 'auto' && <Text style={styles.optionDesc}>{t('start.auto.desc')}</Text>}
          </View>
        </TouchableOpacity>

        <View style={[styles.option, mode === 'own' && styles.optionOn]}>
          <TouchableOpacity
            style={styles.optionHead}
            onPress={() => setDetectionMode('own')}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === 'own' }}
          >
            <View style={[styles.radio, mode === 'own' && styles.radioOn]}>{mode === 'own' && <View style={styles.dot} />}</View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{t('start.own')}</Text>
              {mode === 'own' && (
                <Text style={styles.optionDesc}>
                  {saved.length ? t('start.own.descSaved', { count: saved.length }) : t('start.own.desc')}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          {mode === 'own' && (
            <View style={styles.ownBody}>
              <AddTermField
                placeholder={t('details.placeholder')}
                onAdd={raw => addListedTerm(raw, saved)}
              />
              <TermChips terms={listed} onRemove={removeListedTerm} />
              <View style={styles.warn}>
                <Text style={styles.warnText}>{t('start.own.warn')}</Text>
              </View>
            </View>
          )}
        </View>

        {mode === 'auto' && (
          <View style={styles.notice}>
            <Text style={styles.noticeIcon}>🔒</Text>
            <Text style={styles.noticeText}>{t('upload.notice.privacy')}</Text>
          </View>
        )}

        {!!hint && (
          <View style={styles.hintRow}>
            {busy && <ActivityIndicator size="small" color={ACCENT} />}
            <Text style={styles.hint}>{hint}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.run, !canRun && styles.runOff]}
          onPress={run}
          disabled={!canRun}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canRun }}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.runText}>{t('start.run')}</Text>}
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
  title: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 21 },
  section: { fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 22, marginBottom: 10 },
  tiles: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tile: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e5e5e5', backgroundColor: '#fafafa',
  },
  tileOn: { borderColor: ACCENT, backgroundColor: '#eef4ff' },
  tileIcon: { fontSize: 26, marginBottom: 4 },
  tileText: { fontSize: 13, fontWeight: '600', color: '#333' },
  tileTextOn: { color: '#1d4ed8' },
  chipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8f8f8', borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e5e5', paddingVertical: 10, paddingHorizontal: 12, marginBottom: 6,
  },
  fileIcon: { fontSize: 20 },
  fileName: { flex: 1, fontSize: 14, color: '#111' },
  fileSize: { fontSize: 12, color: '#888' },
  remove: { fontSize: 14, color: '#aaa' },
  retake: { fontSize: 13, color: ACCENT, fontWeight: '600' },
  textArea: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, height: 160, fontSize: 14,
    color: '#111', backgroundColor: '#fafafa', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  option: { borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 12, padding: 13, marginBottom: 10, backgroundColor: '#fff' },
  optionOn: { borderColor: ACCENT, backgroundColor: '#f5f9ff' },
  optionHead: { flexDirection: 'row', gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#999', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  radioOn: { borderColor: ACCENT },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: ACCENT },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  recommended: { fontSize: 11, fontWeight: '600', color: '#166534' },
  optionDesc: { fontSize: 13, color: '#666', lineHeight: 19, marginTop: 3 },
  ownBody: { marginTop: 12 },
  warn: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, padding: 10, marginTop: 12 },
  warnText: { fontSize: 12.5, color: '#92400e', lineHeight: 18 },
  notice: { flexDirection: 'row', backgroundColor: '#f5f5f5', borderRadius: 10, padding: 14, gap: 10, alignItems: 'flex-start', marginTop: 4, marginBottom: 20 },
  noticeIcon: { fontSize: 16 },
  noticeText: { flex: 1, fontSize: 12.5, color: '#666', lineHeight: 18 },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  hint: { fontSize: 12.5, color: '#999', textAlign: 'center' },
  run: {
    backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    shadowColor: ACCENT, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  runOff: { backgroundColor: '#d4d7dd', shadowOpacity: 0 },
  runText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
