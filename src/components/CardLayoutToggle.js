import React from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { colors } from '../theme/theme';

export default function CardLayoutToggle() {
  const { preferences, changeCardLayout, layoutReady, layoutSaving } = useAppContext();
  const disabled = !layoutReady || layoutSaving;

  async function select(layout) {
    try {
      await changeCardLayout(layout);
    } catch {
      Alert.alert('Unable to save layout', 'Please try again.');
    }
  }

  return (
    <View style={styles.row}>
      <Text style={styles.label}>Grid</Text>
      <View style={styles.switchTarget}>
        <Switch
          accessibilityLabel="Grid"
          accessibilityHint="Show compact cards when on, full-width cards when off"
          disabled={disabled}
          value={preferences.cardLayout === 'grid'}
          onValueChange={(enabled) => select(enabled ? 'grid' : 'list')}
          trackColor={{ false: '#AAB4BE', true: colors.blue }}
          thumbColor="#FFFFFF"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginHorizontal: 20, marginBottom: 12, marginTop: 12 },
  label: { color: colors.blue, fontSize: 14, fontWeight: '700' },
  switchTarget: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
});
