import { createTheme, useTheme } from '@rneui/themed';

export const colors = {
  maize: '#FFCB05',
  blue: '#00274C',
  blueLight: '#33597D',
  cream: '#F7F4ED',
  ink: '#17212B',
  muted: '#66717C',
  border: '#DCE2E7',
  danger: '#B42318',
  primary: '#00274C',
  surface: '#FFFFFF',
  subtle: '#EDF1F4',
  body: '#3E4A55',
  onPrimary: '#FFFFFF',
  saved: '#C6253D',
};

export const darkColors = {
  ...colors,
  primary: colors.maize,
  blueLight: '#A9C6E2',
  cream: '#101820',
  surface: '#17212B',
  subtle: '#253443',
  ink: '#F7F4ED',
  muted: '#AAB6C2',
  body: '#D3DCE5',
  border: '#465868',
  danger: '#FF938A',
  onPrimary: colors.blue,
  saved: '#FF7D94',
};

export function useThemeColors() {
  const { theme } = useTheme();
  return theme.mode === 'dark' ? darkColors : colors;
}

export const appTheme = createTheme({
  lightColors: {
    primary: colors.primary,
    secondary: colors.maize,
    background: colors.cream,
    white: '#FFFFFF',
    black: colors.ink,
    grey0: colors.ink,
    grey3: colors.muted,
    grey5: colors.border,
  },
  darkColors: {
    primary: darkColors.primary,
    secondary: darkColors.blueLight,
    background: darkColors.cream,
    white: darkColors.surface,
    black: darkColors.ink,
    grey0: darkColors.ink,
    grey3: darkColors.muted,
    grey5: darkColors.border,
    disabled: darkColors.subtle,
  },
  mode: 'light',
  components: {
    Button: (props, theme) => ({
      radius: 10,
      titleStyle: {
        fontWeight: '700',
        color: !props.type || props.type === 'solid'
          ? (theme.mode === 'dark' ? darkColors.onPrimary : colors.onPrimary)
          : theme.colors.primary,
      },
      loadingProps: { color: !props.type || props.type === 'solid'
        ? (theme.mode === 'dark' ? darkColors.onPrimary : colors.onPrimary)
        : theme.colors.primary },
      disabledTitleStyle: { color: theme.mode === 'dark' ? darkColors.muted : colors.muted },
    }),
    Input: (_props, theme) => ({
      inputStyle: { color: theme.colors.black },
      labelStyle: { color: theme.mode === 'dark' ? darkColors.muted : colors.muted },
      placeholderTextColor: theme.mode === 'dark' ? darkColors.muted : colors.muted,
    }),
    Card: {
      containerStyle: {
        borderRadius: 16,
        borderWidth: 0,
        margin: 0,
      },
    },
  },
});
