import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Card, Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatEventDate, formatEventTime } from '../utils/date';
import { useThemeColors } from '../theme/theme';

export default function EventCard({ event, saved, onPress, onToggleSaved, compact = false, cardWidth }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  async function handleSavedPress(pressEvent) {
    pressEvent.stopPropagation();
    try {
      await onToggleSaved(event.id);
    } catch (error) {
      Alert.alert('Unable to update saved event', error.message);
    }
  }

  return (
    <View style={cardWidth ? { width: cardWidth } : undefined}>
      <Card containerStyle={[styles.card, compact && styles.compactCard, compact && { minHeight: cardWidth }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${event.title}. ${formatEventDate(event.startsAt)}. ${formatEventTime(event.startsAt, event.endsAt)}. ${event.location}`}
          accessibilityHint="Opens event details"
          onPress={onPress}
          style={({ pressed }) => [styles.content, compact && styles.compactContent, pressed && styles.pressed]}
        >
        <View style={[styles.topRow, compact && styles.compactTopRow]}>
          <Text style={[styles.category, compact && styles.compactCategory]}>{event.category.toUpperCase()}</Text>
        </View>
        <Text style={[styles.title, compact && styles.compactTitle]}>
          {event.title}
        </Text>
        <Text style={styles.date}>{formatEventDate(event.startsAt)}</Text>
        <Text style={styles.meta}>{formatEventTime(event.startsAt, event.endsAt)}</Text>
        <Text style={styles.meta}>{event.location}</Text>
        </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${saved ? 'Unsave' : 'Save'} ${event.title}`}
            accessibilityState={{ selected: saved }}
            onPress={handleSavedPress}
            style={styles.heartButton}
          >
            <MaterialCommunityIcons
              color={saved ? colors.saved : colors.muted}
              name={saved ? 'heart' : 'heart-outline'}
              size={22}
            />
          </Pressable>
      </Card>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    elevation: 1,
    minHeight: 174,
    padding: 0,
    flex: 1,
    shadowColor: '#102B44',
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  compactCard: { borderRadius: 12 },
  compactContent: { padding: 12 },
  compactTopRow: { paddingRight: 40 },
  compactCategory: { letterSpacing: 0.3 },
  content: { padding: 16, paddingTop: 16, flex: 1, minHeight: 48 },
  compactTitle: { fontSize: 16 },
  pressed: { opacity: 0.78 },
  topRow: { paddingRight: 36, minHeight: 32, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  category: { color: colors.blueLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  heartButton: { position: 'absolute', top: 4, right: 4, alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: 2 },
  date: { color: colors.primary, fontSize: 14, fontWeight: '700', marginTop: 8 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 3 },
});
