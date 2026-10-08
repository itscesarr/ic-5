import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DiscoverScreen from '../screens/DiscoverScreen';
import EventDetailsScreen from '../screens/EventDetailsScreen';
import LoginScreen from '../screens/LoginScreen';
import NotesScreen from '../screens/NotesScreen';
import SavedScreen from '../screens/SavedScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useAppContext } from '../context/AppContext';
import { useThemeColors } from '../theme/theme';

const RootStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const icons = {
  Discover: ['compass', 'compass-outline'],
  Saved: ['heart', 'heart-outline'],
  Settings: ['cog', 'cog-outline'],
};

function MainTabs() {
  const colors = useThemeColors();
  const { savedEventIds } = useAppContext();
  const [savedCount] = useState(savedEventIds.length);

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 82, paddingBottom: 22, paddingTop: 8 },
        tabBarIcon: ({ color, focused, size }) => (
          <MaterialCommunityIcons
            color={color}
            name={icons[route.name][focused ? 0 : 1]}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen name="Discover" component={DiscoverScreen} />
      <Tabs.Screen
        name="Saved"
        component={SavedScreen}
        options={{ tabBarBadge: savedCount || undefined }}
      />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

export default function AppNavigator({ initialSession }) {
  return (
    <RootStack.Navigator
      initialRouteName={initialSession ? 'Main' : 'Login'}
      screenOptions={{ animation: 'slide_from_right', headerShown: false }}
    >
      <RootStack.Screen name="Login" component={LoginScreen} />
      <RootStack.Screen name="Main" component={MainTabs} />
      <RootStack.Screen name="EventDetails" component={EventDetailsScreen} />
      <RootStack.Screen name="Notes" component={NotesScreen} />
    </RootStack.Navigator>
  );
}
