import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CapacityBadge from '../components/CapacityBadge';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAppContext } from '../context/AppContext';
import { getEvent, isRegistered, registerForEvent } from '../db/database';
import { formatFullEventDate } from '../utils/date';
import { useThemeColors } from '../theme/theme';

export default function EventDetailsScreen({ navigation, route }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { savedEventIds, toggleSaved } = useAppContext();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const saved = event ? savedEventIds.includes(event.id) : false;

  useEffect(() => {
    let active = true;
    async function loadEvent() {
      setLoading(true);
      setLoadError(null);
      try {
        const selected = await getEvent(route.params?.eventId);
        const selectedRegistered = selected ? await isRegistered(selected.id) : false;
        if (active) {
          setEvent(selected);
          setRegistered(selectedRegistered);
        }
      } catch {
        if (active) setLoadError('Unable to open event. Please go back and try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadEvent();
    return () => { active = false; };
  }, [route.params?.eventId]);

  async function handleSave() {
    try {
      await toggleSaved(event.id);
    } catch (error) {
      Alert.alert('Unable to update saved event', error.message);
    }
  }

  async function handleRegister() {
    setRegistering(true);
    try {
      await registerForEvent(event.id);
      setRegistered(true);
      setEvent((current) => ({ ...current, registeredCount: current.registeredCount + 1 }));
      Alert.alert('You’re registered', 'This event has been added to your plans.');
    } catch (error) {
      Alert.alert('Registration unavailable', error.message);
    } finally {
      setRegistering(false);
    }
  }

  if (loading) {
    return <LoadingOverlay label="Opening event..." />;
  }

  if (loadError || !event) {
    return (
      <SafeAreaView style={styles.center}>
        <Text h4>{loadError || 'Event not found'}</Text>
        <Button onPress={() => navigation.goBack()} title="Go back" type="clear" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.navBar}>
        <Pressable
          onPress={() =>
            route.params.source ? navigation.goBack() : navigation.navigate(route.params.source)
          }
          style={styles.navButton}
        >
          <MaterialCommunityIcons color={colors.primary} name="arrow-left" size={25} />
        </Pressable>
        <Pressable onPress={handleSave} style={styles.navButton}>
          <MaterialCommunityIcons
            color={saved ? colors.saved : colors.primary}
            name={saved ? 'heart' : 'heart-outline'}
            size={25}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.category}>{event.category.toUpperCase()}</Text>
        <Text h1 h1Style={styles.title}>{event.title}</Text>
        <Text style={styles.date}>{formatFullEventDate(event.startsAt, event.endsAt)}</Text>

        <View style={styles.locationRow}>
          <MaterialCommunityIcons color={colors.blueLight} name="map-marker-outline" size={22} />
          <View style={styles.locationText}>
            <Text style={styles.location}>{event.location}</Text>
            {event.room ? <Text style={styles.room}>{event.room}</Text> : null}
          </View>
        </View>

        <View style={styles.capacityRow}>
          <CapacityBadge capacity={event.capacity} registeredCount={event.registeredCount} />
          {event.capacity !== null && (
            <Text style={styles.capacityText}>
              {event.registeredCount} of {event.capacity} registered
            </Text>
          )}
        </View>

        <View style={styles.rule} />
        <Text style={styles.sectionTitle}>About this event</Text>
        <Text style={styles.description}>{event.description}</Text>
        <View style={styles.tags}>
          {(event.tags || []).map((tag) => (
            <Chip
              buttonStyle={styles.tag}
              key={tag}
              title={tag}
              titleStyle={styles.tagText}
              type="outline"
            />
          ))}
        </View>

        <Pressable
          onPress={() => navigation.navigate('Notes', { eventId: event.id, eventTitle: event.title })}
          style={styles.noteCard}
        >
          <View style={styles.noteIcon}>
            <MaterialCommunityIcons color={colors.primary} name="notebook-edit-outline" size={24} />
          </View>
          <View style={styles.noteCopy}>
            <Text style={styles.noteTitle}>Private note</Text>
            <Text style={styles.noteDescription}>Add a reminder or thought about this event.</Text>
          </View>
          <MaterialCommunityIcons color={colors.muted} name="chevron-right" size={24} />
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        {event.capacity === null ? (
          <Button disabled title="No registration needed" type="outline" />
        ) : (
          <Button
            disabled={registered}
            loading={registering}
            onPress={handleRegister}
            title={registered ? 'Registered' : 'Register for event'}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  center: { backgroundColor: colors.cream, alignItems: 'center', flex: 1, justifyContent: 'center' },
  navBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 4 },
  navButton: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
  content: { paddingBottom: 28, paddingHorizontal: 22 },
  category: { color: colors.blueLight, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginTop: 14 },
  title: { color: colors.primary, fontSize: 34, fontWeight: '900', letterSpacing: -0.8, lineHeight: 39, marginTop: 7 },
  date: { color: colors.blueLight, fontSize: 16, fontWeight: '700', marginTop: 14 },
  locationRow: { alignItems: 'flex-start', flexDirection: 'row', marginTop: 18 },
  locationText: { marginLeft: 8 },
  location: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  room: { color: colors.muted, marginTop: 2 },
  capacityRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 18 },
  capacityText: { color: colors.muted, fontSize: 13 },
  rule: { backgroundColor: colors.border, height: 1, marginVertical: 24 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  description: { color: colors.body, fontSize: 16, lineHeight: 25, marginTop: 9 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 17 },
  tag: { borderColor: colors.border, borderRadius: 999 },
  tagText: { color: colors.blueLight, fontSize: 12 },
  noteCard: { alignItems: 'center', backgroundColor: colors.cream, borderRadius: 14, flexDirection: 'row', marginTop: 26, padding: 15 },
  noteIcon: { alignItems: 'center', backgroundColor: colors.subtle, borderRadius: 10, height: 42, justifyContent: 'center', width: 42 },
  noteCopy: { flex: 1, marginHorizontal: 12 },
  noteTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  noteDescription: { color: colors.muted, fontSize: 12, marginTop: 2 },
  footer: { borderTopColor: colors.border, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 14 },
});
