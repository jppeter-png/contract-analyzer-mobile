import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '../i18n';

/**
 * One text box with an add button. `onAdd(text)` returns { error } to show a message under the box,
 * or anything else to clear it. It may be async.
 */
export default function AddTermField({ placeholder, buttonLabel, onAdd, busy = false }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!value.trim() || busy) return;
    const result = await onAdd(value);
    if (result && result.error) {
      setError(result.error);
    } else {
      setError('');
      setValue('');
    }
  };

  return (
    <View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={text => { setValue(text); if (error) setError(''); }}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={submit}
          maxLength={200}
        />
        <TouchableOpacity
          style={[styles.btn, (!value.trim() || busy) && styles.btnOff]}
          onPress={submit}
          accessibilityRole="button"
        >
          <Text style={styles.btnText}>{buttonLabel || t('details.add')}</Text>
        </TouchableOpacity>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111',
  },
  btn: { backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  btnOff: { backgroundColor: '#aaa' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  error: { fontSize: 12, color: '#b91c1c', marginTop: 6 },
});
