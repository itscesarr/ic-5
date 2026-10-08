import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';
import { useThemeColors } from '../theme/theme';

export default function CapacityBadge({ capacity, registeredCount = 0 }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const label = capacity === null ? 'Drop-in event' : `${registeredCount} / ${capacity}`;

  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.subtle,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700' },
});
