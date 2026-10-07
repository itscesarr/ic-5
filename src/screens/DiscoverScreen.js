import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text as NativeText,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import EventCard from '../components/EventCard';
import CardLayoutToggle from '../components/CardLayoutToggle';
import { useCardLayout } from '../utils/cardLayout';
import EmptyState from '../components/EmptyState';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAppContext } from '../context/AppContext';
import { refreshEvents } from '../services/eventService';
import { colors } from '../theme/theme';

const categories = ['All', 'Academic', 'Arts', 'Career', 'Community', 'Workshop'];

export default function DiscoverScreen({ navigation }) {
  const { events, setEvents, eventsLoading, eventsError, setEventsError, reloadEvents, savedEventIds, toggleSaved, preferences } = useAppContext();
  const layout = preferences?.cardLayout || 'list';
  const { columns, cardWidth } = useCardLayout(layout);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const hasFilters = query.trim().length > 0 || selectedCategory !== 'All';

  const filteredEvents = useMemo(() => {
    const search = query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return events.filter((event) => {
      const searchableText = [
        event.title, event.description, event.category, event.location, event.room,
        ...(event.tags || []),
      ].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const matchesSearch = !search || searchableText.includes(search);
      const matchesCategory =
        selectedCategory === 'All' || event.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }).sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt));
  }, [events, query, selectedCategory]);

  async function handleRefresh() {
    if (refreshing || eventsLoading) return;
    setRefreshing(true);
    setRefreshError('');
    try {
      const nextEvents = await refreshEvents();
      setEvents(nextEvents);
      setEventsError('');
    } catch {
      setRefreshError('Unable to refresh events. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }

  function clearFilters() {
    setQuery('');
    setSelectedCategory('All');
  }

  const error = refreshError || eventsError;
  async function retry() {
    if (eventsError) {
      setRefreshError('');
      await reloadEvents();
    } else {
      await handleRefresh();
    }
  }
  const emptyState = eventsLoading || refreshing ? (
    <LoadingOverlay label="Loading events..." />
  ) : error ? (
    <EmptyState title="Unable to load events" message="Try loading events again." actionLabel="Try again" onAction={retry} />
  ) : events.length === 0 ? (
    <EmptyState title="No events listed yet" message="Check back soon or try refreshing for new campus events." actionLabel="Refresh events" onAction={handleRefresh} />
  ) : (
    <EmptyState title="No matching events" message="Try another search or clear your filters to see all events." actionLabel="Clear filters" onAction={clearFilters} />
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>UNIVERSITY OF MICHIGAN</Text>
        <Text h2 h2Style={styles.heading}>Find your next thing.</Text>
        <Text style={styles.subheading}>Events, ideas, and people across campus.</Text>
      </View>

      <View style={styles.searchBox}>
        <MaterialCommunityIcons color={colors.muted} name="magnify" size={21} />
        <TextInput
          onChangeText={setQuery}
          placeholder="Search events"
          accessibilityLabel="Search events"
          placeholderTextColor="#7B858E"
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
      </View>

      <View style={styles.categories}>
        {categories.map((category) => {
          const selected = category === selectedCategory;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[styles.chip, selected && styles.selectedChip]}
            >
              <NativeText style={[styles.chipText, selected && styles.selectedChipText]}>
                {category}
              </NativeText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.filterStatus}>
        {hasFilters ? (
          <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.resetButton}>
            <NativeText style={styles.chipText}>Clear filters</NativeText>
          </Pressable>
        ) : <Text style={styles.filterHint}>Showing all events. Try a search or choose a category.</Text>}
      </View>

      {error && events.length > 0 ? (
        <View style={styles.errorBanner}>
          <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.refreshError}>{error} Your previously loaded events are still available.</Text>
          <Pressable accessibilityRole="button" disabled={refreshing || eventsLoading} onPress={retry} style={styles.resetButton}>
            <NativeText style={styles.chipText}>{refreshing || eventsLoading ? 'Trying again…' : 'Try again'}</NativeText>
          </Pressable>
        </View>
      ) : null}

      <CardLayoutToggle />
      <FlatList
        key={`${layout}-${columns}`}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={filteredEvents.length ? styles.list : styles.emptyList}
        data={filteredEvents}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={emptyState}
        refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={refreshing} />}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            compact={layout === 'grid'}
            cardWidth={cardWidth}
            saved={savedEventIds.includes(item.id)}
            onPress={() =>
              navigation.navigate('EventDetails', {
                eventId: item.id,
                source: 'Discover',
              })
            }
            onToggleSaved={toggleSaved}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12 },
  eyebrow: { color: colors.blueLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  heading: { color: colors.blue, fontSize: 31, fontWeight: '900', letterSpacing: -0.7, marginTop: 4 },
  subheading: { color: colors.muted, fontSize: 15, marginTop: 3 },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 13,
  },
  searchInput: { color: colors.ink, flex: 1, fontSize: 16, height: 48, marginLeft: 8 },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: '#AAB4BE',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selectedChip: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  selectedChipText: { color: '#FFFFFF' },
  refreshError: { color: colors.danger, marginHorizontal: 20, marginBottom: 8 },
  filterStatus: { marginHorizontal: 20 },
  filterHint: { color: colors.muted, fontSize: 13 },
  resetButton: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 12 },
  errorBanner: { marginTop: 12 },
  list: { paddingBottom: 28, paddingHorizontal: 20 },
  emptyList: { flexGrow: 1 },
  separator: { height: 12 },
  gridRow: { gap: 12, alignItems: 'stretch' },
});
