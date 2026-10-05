import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Card, Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatEventDate, formatEventTime } from '../utils/date';
import { colors } from '../theme/theme';

export default function EventCard({ event, saved, onPress, onToggleSaved }) {

  async function handleSavedPress(pressEvent) {
    pressEvent.stopPropagation();
    try {
      await onToggleSaved(event.id);
    } catch (error) {
      Alert.alert('Unable to update saved event', error.message);
    }
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card containerStyle={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.category}>{event.category.toUpperCase()}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Unsave event' : 'Save event'}
            accessibilityState={{ selected: saved }}
            hitSlop={4}
            onPress={handleSavedPress}
            style={styles.heartButton}
          >
            <MaterialCommunityIcons
              color={saved ? '#C6253D' : colors.muted}
              name={saved ? 'heart' : 'heart-outline'}
              size={22}
            />
          </Pressable>
        </View>
        <Text h4 h4Style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.date}>{formatEventDate(event.startsAt)}</Text>
        <Text numberOfLines={1} style={styles.meta}>
          {formatEventTime(event.startsAt, event.endsAt)} · {event.location}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
    height: 174,
    padding: 18,
    shadowColor: '#102B44',
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  pressed: { opacity: 0.78 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  category: { color: colors.blueLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  heartButton: { alignItems: 'center', height: 28, justifyContent: 'center', width: 28 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: 2 },
  date: { color: colors.blue, fontSize: 14, fontWeight: '700', marginTop: 8 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 3 },
});
