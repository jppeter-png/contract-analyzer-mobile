import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '../i18n';

/** The items a user has added, each with a button to remove it. */
export default function TermChips({ terms, onRemove }) {
  if (!terms.length) return null;
  return (
    <View style={styles.wrap}>
      {terms.map(term => (
        <View key={term} style={styles.chip}>
          <Text style={styles.chipText}>{term}</Text>
          <TouchableOpacity
            onPress={() => onRemove(term)}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={`${t('details.remove')} ${term}`}
          >
            <Text style={styles.x}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#e8f0fd', borderRadius: 16, paddingVertical: 6, paddingLeft: 12, paddingRight: 10,
  },
  chipText: { fontSize: 13, color: '#1b4fb8' },
  x: { fontSize: 12, color: '#1b4fb8' },
});
