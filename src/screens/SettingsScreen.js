import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ListItem, Switch, Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { clearSession } from '../services/session';
import { resetPreferences, setDarkTheme } from '../storage/preferences';
import { useThemeColors } from '../theme/theme';

function SettingRow({ icon, title, description, value, onChange, disabled }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <ListItem containerStyle={styles.row}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons color={colors.primary} name={icon} size={22} />
      </View>
      <ListItem.Content>
        <ListItem.Title style={styles.rowTitle}>{title}</ListItem.Title>
        <ListItem.Subtitle style={styles.rowDescription}>{description}</ListItem.Subtitle>
      </ListItem.Content>
      <Switch
        accessibilityLabel={title}
        disabled={disabled}
        onValueChange={onChange}
        value={value}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </ListItem>
  );
}

export default function SettingsScreen({ navigation }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { preferences, setPreferences, session, setSession } = useAppContext();
  const [message, setMessage] = useState('');
  const [themeSaving, setThemeSaving] = useState(false);

  async function changeDarkTheme(value) {
    if (themeSaving) return;
    setThemeSaving(true);
    setMessage('');
    try {
      await setDarkTheme(value);
      setPreferences((current) => ({ ...current, darkTheme: value }));
    } catch {
      setMessage('Could not save your preference.');
    } finally {
      setThemeSaving(false);
    }
  }

  function handleReset() {
    Alert.alert(
      'Reset app data?',
      'This will clear your local MaizeMeet data and sign you out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetPreferences();
            setPreferences({ darkTheme: false, cardLayout: 'list' });
            setMessage('App data reset.');
          },
        },
      ]
    );
  }

  async function handleLogout() {
    await clearSession();
    setSession(null);
    navigation.navigate('Login');
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text h2 h2Style={styles.heading}>Settings</Text>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{session?.username?.slice(0, 1).toUpperCase() || 'M'}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{session?.username || 'MaizeMeet user'}</Text>
            <Text style={styles.profileLabel}>Campus account</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>DISPLAY</Text>
        <View style={styles.group}>
          <SettingRow
            disabled={themeSaving}
            description="Use a darker color palette"
            icon="weather-night"
            onChange={changeDarkTheme}
            title="Dark theme"
            value={preferences.darkTheme}
          />
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT & DATA</Text>
        <Button
          buttonStyle={styles.secondaryButton}
          disabled={themeSaving}
          onPress={handleReset}
          title="Reset app data"
          titleStyle={styles.secondaryButtonText}
          type="outline"
        />
        <Button
          buttonStyle={styles.logoutButton}
          onPress={handleLogout}
          title="Sign out"
          titleStyle={styles.logoutText}
          type="clear"
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Text style={styles.version}>MaizeMeet · Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  content: { padding: 20 },
  heading: { color: colors.primary, fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  profile: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, flexDirection: 'row', marginTop: 18, padding: 17 },
  avatar: { alignItems: 'center', backgroundColor: colors.maize, borderRadius: 24, height: 48, justifyContent: 'center', marginRight: 13, width: 48 },
  avatarText: { color: colors.blue, fontSize: 20, fontWeight: '900' },
  profileName: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  profileLabel: { color: colors.muted, fontSize: 13, marginTop: 2 },
  sectionLabel: { color: colors.blueLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8, marginTop: 25 },
  group: { borderRadius: 14, overflow: 'hidden' },
  row: { backgroundColor: colors.surface, minHeight: 78, paddingHorizontal: 15 },
  iconBox: { alignItems: 'center', backgroundColor: colors.subtle, borderRadius: 9, height: 38, justifyContent: 'center', width: 38 },
  rowTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  rowDescription: { color: colors.muted, fontSize: 12, marginTop: 3 },
  divider: { backgroundColor: colors.border, height: 1, marginLeft: 68 },
  secondaryButton: { borderColor: colors.primary, borderRadius: 10, marginTop: 2 },
  secondaryButtonText: { color: colors.primary },
  logoutButton: { marginTop: 10 },
  logoutText: { color: colors.danger },
  message: { color: colors.blueLight, marginTop: 10, textAlign: 'center' },
  version: { color: colors.muted, fontSize: 12, marginTop: 28, textAlign: 'center' },
});
