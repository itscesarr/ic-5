import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getNote, saveNote } from '../db/database';
import { useThemeColors } from '../theme/theme';

export default function NotesScreen({ navigation, route }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { eventId, eventTitle } = route.params;
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    getNote(eventId)
      .then((stored) => setNote(stored?.body || ''))
      .finally(() => setLoaded(true));
  }, [eventId]);

  useEffect(() => {
    if (!loaded) return;
    timer.current = setTimeout(() => {
      saveNote(eventId, note)
        .catch(() => {});
    }, 700);
    return () => clearTimeout(timer.current);
  }, [note]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons color={colors.primary} name="arrow-left" size={25} />
          </Pressable>
          <Text style={styles.headerTitle}>Private note</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>NOTE FOR</Text>
          <Text h3 h3Style={styles.eventTitle}>{eventTitle}</Text>
          <Text style={styles.helper}>Only you can see this note.</Text>

          <TextInput
            multiline
            onChangeText={setNote}
            placeholder="What do you want to remember about this event?"
            placeholderTextColor={colors.muted}
            style={styles.input}
            textAlignVertical="top"
            value={note}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  flex: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 7 },
  backButton: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
  headerTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 28 },
  eyebrow: { color: colors.blueLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  eventTitle: { color: colors.primary, fontSize: 25, fontWeight: '900', lineHeight: 30, marginTop: 6 },
  helper: { color: colors.muted, marginTop: 8 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.ink, flex: 1, fontSize: 16, lineHeight: 24, marginTop: 22, maxHeight: 330, minHeight: 180, padding: 16 },
});
