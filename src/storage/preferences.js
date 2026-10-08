import AsyncStorage from "@react-native-async-storage/async-storage";

const DARK_KEY = "preferences.darkTheme";
const LAYOUT_KEY = "preferences.cardLayout";

export async function getPreferences() {
  const storedTheme = await AsyncStorage.getItem(DARK_KEY);
  const storedLayout = await AsyncStorage.getItem(LAYOUT_KEY);

  return {
    darkTheme: storedTheme === "true",
    cardLayout: storedLayout === "grid" ? "grid" : "list",
  };
}

export function setCardLayout(value) {
  return AsyncStorage.setItem(LAYOUT_KEY, value);
}

export function setDarkTheme(value) {
  return AsyncStorage.setItem(DARK_KEY, String(value));
}

export function resetPreferences() {
  return AsyncStorage.multiRemove([DARK_KEY, LAYOUT_KEY]);
}
