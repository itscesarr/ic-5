import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

export default function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <MaterialCommunityIcons color={colors.blueLight} name="calendar-blank-outline" size={42} />
      <Text h4 accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && <Button accessibilityLabel={actionLabel} buttonStyle={styles.action} onPress={onAction} title={actionLabel} type="clear" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 40, paddingBottom: 32 },
  title: { color: colors.ink, fontWeight: '800', marginTop: 14, textAlign: 'center' },
  action: { minHeight: 48 },
  message: { color: colors.muted, lineHeight: 21, marginBottom: 8, marginTop: 8, textAlign: 'center' },
});
