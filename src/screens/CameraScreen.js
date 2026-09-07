import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  StyleSheet, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { ocrImages, scrubText } from '../api';

const { width } = Dimensions.get('window');
const THUMB = (width - 48 - 12) / 3;

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [pages, setPages] = useState([]); // Array of { uri }
  const [showCamera, setShowCamera] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const cameraRef = useRef(null);

  // Pick from camera roll
  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.length) {
      setPages(prev => [...prev, ...result.assets.map(a => ({ uri: a.uri }))]);
    }
  };

  // Take a photo with camera
  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      setPages(prev => [...prev, { uri: photo.uri }]);
    } catch (err) {
      Alert.alert('Error', 'Could not take photo');
    }
  };

  const removePage = (index) => {
    setPages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDone = async () => {
    if (!pages.length) return;
    setShowCamera(false);
    setProcessing(true);

    try {
      setStatusMsg(`Running OCR on ${pages.length} page${pages.length !== 1 ? 's' : ''}...`);
      const { text, pageCount, wordCount } = await ocrImages(pages);

      if (!text.trim()) {
        Alert.alert('No text found', 'Could not extract any text from the images. Try taking clearer photos.');
        setProcessing(false);
        return;
      }

      setStatusMsg('Scanning for personal information...');
      const scrubResult = await scrubText(text);

      navigation.navigate('Review', { scrubResult });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Something went wrong');
    } finally {
      setProcessing(false);
      setStatusMsg('');
    }
  };

  // Request camera permission if needed
  const openCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Camera access needed', 'Please allow camera access in Settings to take photos of contracts.');
        return;
      }
    }
    setShowCamera(true);
  };

  if (processing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#111" />
          <Text style={styles.processingText}>{statusMsg}</Text>
          <Text style={styles.processingNote}>This may take a moment for multiple pages</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          {/* Top bar */}
          <SafeAreaView style={styles.cameraTop}>
            <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.cameraTopBtn}>
              <Text style={styles.cameraTopBtnText}>✕ Close</Text>
            </TouchableOpacity>
            <Text style={styles.pageCount}>{pages.length} page{pages.length !== 1 ? 's' : ''} captured</Text>
            {pages.length > 0 && (
              <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.cameraTopBtn}>
                <Text style={[styles.cameraTopBtnText, { color: '#4ade80' }]}>Done</Text>
              </TouchableOpacity>
            )}
          </SafeAreaView>

          {/* Shutter */}
          <View style={styles.cameraBottom}>
            <TouchableOpacity onPress={pickFromLibrary} style={styles.sideBtn}>
              <Text style={styles.sideBtnText}>📁</Text>
              <Text style={styles.sideBtnLabel}>Library</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={takePicture} style={styles.shutter}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
            <View style={styles.sideBtn} />
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Photograph contract</Text>
        <Text style={styles.subtitle}>
          Take photos of each page or pick from your camera roll. We'll extract the text automatically.
        </Text>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={openCamera}>
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionLabel}>Take photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={pickFromLibrary}>
            <Text style={styles.actionIcon}>🖼</Text>
            <Text style={styles.actionLabel}>Camera roll</Text>
          </TouchableOpacity>
        </View>

        {/* Pages grid */}
        {pages.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{pages.length} page{pages.length !== 1 ? 's' : ''} ready</Text>
              <TouchableOpacity onPress={() => setPages([])}>
                <Text style={styles.clearText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.grid}>
              {pages.map((page, i) => (
                <View key={i} style={styles.thumb}>
                  <Image source={{ uri: page.uri }} style={styles.thumbImg} />
                  <View style={styles.thumbLabel}>
                    <Text style={styles.thumbNum}>P{i + 1}</Text>
                  </View>
                  <TouchableOpacity style={styles.thumbRemove} onPress={() => removePage(i)}>
                    <Text style={styles.thumbRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {/* Add more button */}
              <TouchableOpacity style={[styles.thumb, styles.thumbAdd]} onPress={openCamera}>
                <Text style={styles.thumbAddIcon}>+</Text>
                <Text style={styles.thumbAddLabel}>Add page</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>📌 Tips for best results</Text>
          <Text style={styles.tip}>• Lay the contract flat on a solid surface</Text>
          <Text style={styles.tip}>• Make sure all text is in frame and in focus</Text>
          <Text style={styles.tip}>• Good lighting improves accuracy</Text>
          <Text style={styles.tip}>• Add pages in order — they'll be combined automatically</Text>
        </View>

        {/* Analyze button */}
        {pages.length > 0 && (
          <TouchableOpacity style={styles.btn} onPress={handleDone}>
            <Text style={styles.btnText}>
              Extract text from {pages.length} page{pages.length !== 1 ? 's' : ''} →
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  processingText: { fontSize: 18, fontWeight: '600', color: '#111', marginTop: 20, textAlign: 'center' },
  processingNote: { fontSize: 13, color: '#888', marginTop: 8, textAlign: 'center' },
  back: { marginBottom: 16 },
  backText: { fontSize: 15, color: '#555' },
  title: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  actionBtn: {
    flex: 1, backgroundColor: '#f5f5f5', borderRadius: 12,
    paddingVertical: 20, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e5e5',
  },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  clearText: { fontSize: 13, color: '#888' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: THUMB, height: THUMB, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%' },
  thumbLabel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 3, alignItems: 'center',
  },
  thumbNum: { fontSize: 11, color: '#fff', fontWeight: '600' },
  thumbRemove: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  thumbRemoveText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  thumbAdd: {
    backgroundColor: '#f5f5f5', borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: '#ccc', alignItems: 'center', justifyContent: 'center',
  },
  thumbAddIcon: { fontSize: 24, color: '#aaa', marginBottom: 2 },
  thumbAddLabel: { fontSize: 11, color: '#aaa' },
  tips: { backgroundColor: '#f8f8f8', borderRadius: 10, padding: 14, marginBottom: 24 },
  tipsTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  tip: { fontSize: 13, color: '#666', lineHeight: 22 },
  btn: { backgroundColor: '#111', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // Camera styles
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cameraTopBtn: { padding: 8 },
  cameraTopBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  pageCount: { color: '#fff', fontSize: 14, fontWeight: '500' },
  cameraBottom: {
    position: 'absolute', bottom: 48, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 32,
  },
  shutter: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  sideBtn: { width: 50, alignItems: 'center' },
  sideBtnText: { fontSize: 28 },
  sideBtnLabel: { fontSize: 11, color: '#fff', marginTop: 4 },
});
