const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const babel = require('@babel/core');

function load(file, dependencies) {
  const exports = {};
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  }).code;
  vm.runInNewContext(code, { exports, require: (name) => dependencies[name] || {} });
  return exports;
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('screens, cards, buttons, and active tabs follow light/dark/light changes with readable colors', () => {
  let mode = 'light';
  const themeModule = load('src/theme/theme.js', { '@rneui/themed': {
    createTheme: (theme) => theme,
    useTheme: () => ({ theme: { mode } }),
  } });
  const context = { events: [], savedEventIds: [], preferences: { cardLayout: 'list' }, session: null };
  const createNavigator = () => ({ Navigator: 'Navigator', Screen: 'Screen' });
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: (value) => [value, () => {}],
    useMemo: (callback) => callback(),
    useEffect: () => {}, useRef: () => ({ current: null }),
  };
  const dependencies = {
    react,
    'react-native': { StyleSheet: { create: (styles) => styles }, Platform: {} },
    '../theme/theme': themeModule,
    '../context/AppContext': { useAppContext: () => context },
    '../utils/cardLayout': { useCardLayout: () => ({ columns: 1, cardWidth: 350 }) },
    '../utils/date': { formatEventDate: () => '', formatEventTime: () => '' },
    '@react-navigation/bottom-tabs': { createBottomTabNavigator: createNavigator },
    '@react-navigation/native-stack': { createNativeStackNavigator: createNavigator },
  };
  dependencies['../components/LoadingOverlay'] = load('src/components/LoadingOverlay.js', dependencies);
  const screens = ['Login', 'Discover', 'Saved', 'Settings', 'Notes', 'EventDetails'].map((name) =>
    load(`src/screens/${name}Screen.js`, dependencies).default
  );
  const card = load('src/components/EventCard.js', dependencies).default;
  const navigator = load('src/navigation/AppNavigator.js', dependencies).default;
  for (const nextMode of ['light', 'dark', 'light']) {
    mode = nextMode;
    const colors = themeModule.useThemeColors();
    for (const Screen of screens) {
      let tree = Screen({ navigation: {}, route: { params: {} } });
      if (typeof tree.type === 'function') tree = tree.type(tree.props);
      assert.equal(tree.props.style.backgroundColor, colors.cream);
    }
    const tree = card({ event: { title: 'Test', category: 'Arts', location: 'Union' } });
    assert.equal(tree.props.children[0].props.containerStyle[0].backgroundColor, colors.surface);
    const tabs = navigator({}).props.children[1].props.component();
    const options = tabs.props.screenOptions({ route: { name: 'Discover' } });
    assert.equal(options.tabBarActiveTintColor, colors.primary);
    assert.equal(options.tabBarStyle.backgroundColor, colors.surface);
    assert.ok(contrast(options.tabBarActiveTintColor, options.tabBarStyle.backgroundColor) >= 4.5);
    for (const background of [colors.cream, colors.surface]) {
      assert.ok(contrast(colors.ink, background) >= 4.5);
      assert.ok(contrast(colors.muted, background) >= 4.5);
    }
    const rneuiTheme = { mode, colors: mode === 'dark' ? themeModule.appTheme.darkColors : themeModule.appTheme.lightColors };
    const button = themeModule.appTheme.components.Button({}, rneuiTheme);
    assert.ok(contrast(button.titleStyle.color, colors.primary) >= 4.5);
    assert.equal(themeModule.appTheme.components.Button({ type: 'outline' }, rneuiTheme).titleStyle.color, colors.primary);
  }
});
