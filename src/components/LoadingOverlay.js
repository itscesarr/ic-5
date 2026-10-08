import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';
import { useThemeColors } from '../theme/theme';

export default function LoadingOverlay({ label = 'Loading events...' }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { backgroundColor: colors.cream, alignItems: 'center', flex: 1, justifyContent: 'center' },
  label: { color: colors.muted, marginTop: 12 },
});
