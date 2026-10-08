import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Input, Text } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { createSession } from '../services/session';
import { useThemeColors } from '../theme/theme';

export default function LoginScreen({ navigation }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { setSession } = useAppContext();
  const [username, setUsername] = useState('student');
  const [password, setPassword] = useState('maize');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setLoading(true);
    const nextSession = await createSession(username.trim());
    setSession(nextSession);
    setLoading(false);
    navigation.navigate('Main');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.accent} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          style={styles.flex}
        >
          <View style={styles.mark}>
            <MaterialCommunityIcons color={colors.blue} name="calendar-star" size={34} />
          </View>
          <Text h1 h1Style={styles.title}>MaizeMeet</Text>
          <Text style={styles.tagline}>There’s more happening here.</Text>

          <View style={styles.form}>
            <Input
              autoCapitalize="none"
              autoComplete="username"
              containerStyle={styles.inputContainer}
              inputContainerStyle={styles.input}
              label="Campus username"
              onChangeText={setUsername}
              value={username}
            />
            <Input
              autoComplete="password"
              containerStyle={styles.inputContainer}
              inputContainerStyle={styles.input}
              label="Password"
              onChangeText={setPassword}
              secureTextEntry
              value={password}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button loading={loading} onPress={handleLogin} title="Sign in" />
            <Text style={styles.demo}>Demo account credentials are filled in for you.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  accent: { backgroundColor: colors.maize, height: 8, left: 0, position: 'absolute', right: 0, top: 0 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 24 },
  mark: { alignItems: 'center', backgroundColor: colors.maize, borderRadius: 18, height: 64, justifyContent: 'center', width: 64 },
  title: { color: colors.primary, fontSize: 38, fontWeight: '900', letterSpacing: -1, marginTop: 16 },
  tagline: { color: colors.muted, fontSize: 17, marginTop: 3 },
  form: { backgroundColor: colors.surface, borderRadius: 18, marginTop: 32, padding: 20 },
  inputContainer: { paddingHorizontal: 0 },
  input: { borderBottomColor: colors.border },
  error: { color: colors.danger, marginBottom: 12 },
  demo: { color: colors.muted, fontSize: 12, marginTop: 15, textAlign: 'center' },
});
