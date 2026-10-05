import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@rneui/themed';
import EventCard from '../components/EventCard';
import EmptyState from '../components/EmptyState';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAppContext } from '../context/AppContext';
import { colors } from '../theme/theme';

export default function SavedScreen({ navigation }) {
  const { events, eventsLoading, savedEventIds, toggleSaved } = useAppContext();
  const displayedEvents = events.filter((event) => savedEventIds.includes(event.id)).sort(
    (left, right) => new Date(left.startsAt) - new Date(right.startsAt)
  );

  if (eventsLoading) {
    return <LoadingOverlay label="Loading saved events..." />;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text h2 h2Style={styles.heading}>Saved events</Text>
        <Text style={styles.subheading}>Keep the good ones close.</Text>
      </View>
      <FlatList
        contentContainerStyle={displayedEvents.length ? styles.list : styles.emptyList}
        data={displayedEvents}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            message="Tap the heart on an event to keep it here."
            title="Nothing saved yet"
          />
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            saved={savedEventIds.includes(item.id)}
            onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
            onToggleSaved={toggleSaved}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16 },
  heading: { color: colors.blue, fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  subheading: { color: colors.muted, marginTop: 3 },
  list: { paddingBottom: 28, paddingHorizontal: 20, paddingTop: 18 },
  emptyList: { flexGrow: 1 },
  separator: { height: 12 },
});
