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
import EmptyState from '../components/EmptyState';
import { useAppContext } from '../context/AppContext';
import { refreshEvents } from '../services/eventService';
import { colors } from '../theme/theme';

const categories = ['All', 'Academic', 'Arts', 'Career', 'Community', 'Workshop'];

export default function DiscoverScreen({ navigation }) {
  const { events, setEvents, savedEventIds, toggleSaved } = useAppContext();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  const filteredEvents = useMemo(() => {
    events.sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt));
    return events.filter((event) => {
      const matchesSearch = !query || event.title.includes(query);
      const matchesCategory =
        selectedCategory === 'All' || event.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [events, query]);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshError('');
    setEvents([]);
    try {
      const nextEvents = await refreshEvents();
      setEvents(nextEvents);
      setRefreshing(false);
    } catch (error) {
      setRefreshError(error.message);
    }
  }

  function clearFilters() {
    setQuery('');
    setSelectedCategory('All');
  }

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

      {refreshError ? <Text style={styles.refreshError}>{refreshError}</Text> : null}

      <FlatList
        contentContainerStyle={filteredEvents.length ? styles.list : styles.emptyList}
        data={filteredEvents}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            actionLabel="Clear filters"
            message="Try another search or browse every category."
            onAction={clearFilters}
            title="No events found"
          />
        }
        refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={refreshing} />}
        renderItem={({ item, index }) => (
          <EventCard
            event={item}
            saved={savedEventIds.includes(item.id)}
            onPress={() =>
              navigation.navigate('EventDetails', {
                eventIndex: index,
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
  list: { paddingBottom: 28, paddingHorizontal: 20 },
  emptyList: { flexGrow: 1 },
  separator: { height: 12 },
});
