import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { t } from '../i18n';
import {
  useCustomTerms, addExtraTerm, removeExtraTerm, setAutoDetect,
} from '../customTerms';
import AddTermField from './AddTermField';
import TermChips from './TermChips';

/**
 * "Also hide these names or addresses": extra items for the documents scanned in this session,
 * and the switch that turns automatic detection off. Collapsed until the user opens it.
 */
export default function ExtraTerms() {
  const { saved, extra, autoDetect } = useCustomTerms();
  const [open, setOpen] = useState(false);

  const label = extra.length
    ? t('extra.toggle.count', { count: extra.length })
    : t('extra.toggle');

  if (!open) {
    return (
      <View style={styles.collapsed}>
        <TouchableOpacity onPress={() => setOpen(true)} accessibilityRole="button">
          <Text style={styles.link}>{label}</Text>
        </TouchableOpacity>
        {!autoDetect && <Text style={styles.flag}>{t('extra.autoOffFlag')}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <TouchableOpacity onPress={() => setOpen(false)} style={styles.headRow} accessibilityRole="button">
        <Text style={styles.title}>{t('extra.title')}</Text>
        <Text style={styles.caret}>▲</Text>
      </TouchableOpacity>
      <Text style={styles.desc}>{t('extra.desc')}</Text>

      <AddTermField placeholder={t('extra.placeholder')} buttonLabel={t('extra.add')} onAdd={addExtraTerm} />
      <TermChips terms={extra} onRemove={removeExtraTerm} />
      <Text style={styles.tip}>{t('details.tip')}</Text>
      {saved.length > 0 && <Text style={styles.savedNote}>{t('extra.saved', { count: saved.length })}</Text>}

      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={styles.switchTitle}>{t('extra.autoOff')}</Text>
          <Text style={styles.switchDesc}>{t('extra.autoOff.desc')}</Text>
        </View>
        <Switch
          value={!autoDetect}
          onValueChange={off => setAutoDetect(!off)}
          trackColor={{ true: '#b45309' }}
        />
      </View>
      {!autoDetect && <Text style={styles.flag}>{t('extra.autoOffFlag')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  collapsed: { marginTop: 4, marginBottom: 4, gap: 4 },
  link: { fontSize: 14, color: '#2f6fd0', fontWeight: '600', paddingVertical: 6 },
  flag: { fontSize: 12, color: '#b45309', fontWeight: '600', marginTop: 6 },
  panel: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e5e5',
    padding: 14, marginTop: 4, marginBottom: 4,
  },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: '#111' },
  caret: { fontSize: 10, color: '#aaa' },
  desc: { fontSize: 13, color: '#666', lineHeight: 19, marginTop: 4, marginBottom: 10 },
  tip: { fontSize: 12, color: '#888', lineHeight: 17, marginTop: 10 },
  savedNote: { fontSize: 12, color: '#888', lineHeight: 17, marginTop: 6 },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee',
  },
  switchText: { flex: 1 },
  switchTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  switchDesc: { fontSize: 12, color: '#777', lineHeight: 17, marginTop: 2 },
});
