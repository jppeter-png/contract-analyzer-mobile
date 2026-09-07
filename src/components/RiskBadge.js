import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CONFIG = {
  high:   { label: 'High Risk',   bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  medium: { label: 'Medium Risk', bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  low:    { label: 'Low Risk',    bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

export default function RiskBadge({ risk, large }) {
  const c = CONFIG[risk] || CONFIG.medium;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }, large && styles.large]}>
      <Text style={[styles.text, { color: c.text }, large && styles.largeText]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999, borderWidth: 1,
    paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
  large: { paddingVertical: 6, paddingHorizontal: 16 },
  largeText: { fontSize: 14 },
});
