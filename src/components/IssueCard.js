import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import RiskBadge from './RiskBadge';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export default function IssueCard({ issue }) {
  const [open, setOpen] = useState(false);
  const { severity, category, title, description, recommendation } = issue;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  const recoBorderColor = severity === 'high' ? '#fecaca' : severity === 'medium' ? '#fde68a' : '#bbf7d0';

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={toggle} style={styles.row} activeOpacity={0.7}>
        <RiskBadge risk={severity} />
        <Text style={styles.title} numberOfLines={open ? undefined : 1}>{title}</Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.body}>
          <Text style={styles.category}>{category}</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={[styles.recoBox, { borderLeftColor: recoBorderColor }]}>
            <Text style={styles.recoLabel}>Recommendation</Text>
            <Text style={styles.recoText}>{recommendation}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5',
    backgroundColor: '#fff', marginBottom: 8, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14,
  },
  title: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111' },
  chevron: { fontSize: 10, color: '#aaa' },
  body: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  category: { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 12, marginBottom: 4 },
  description: { fontSize: 13, color: '#444', lineHeight: 20, marginBottom: 12 },
  recoBox: { backgroundColor: '#f8f8f8', borderRadius: 8, padding: 12, borderLeftWidth: 3 },
  recoLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 },
  recoText: { fontSize: 13, color: '#333', lineHeight: 19 },
});
