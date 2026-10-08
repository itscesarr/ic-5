const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const { test } = require('node:test');
const babel = require('@babel/core');

function load(file, dependencies, globals = {}) {
  const exports = {};
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  }).code;
  vm.runInNewContext(code, { exports, ...globals, require: (name) => dependencies[name] || {} });
  return exports;
}

test('reset removes saved events, notes, registrations, preferences and session across signing in and restarting', async () => {
  const sqlite = new DatabaseSync(':memory:');
  const storage = new Map();
  const asyncStorage = {
    getItem: async (key) => storage.get(key) ?? null,
    setItem: async (key, value) => storage.set(key, value),
    removeItem: async (key) => storage.delete(key),
    multiRemove: async (keys) => keys.forEach((key) => storage.delete(key)),
  };
  const seed = load('src/data/seedEvents.js', {});
  const db = {
    execAsync: async (sql) => sqlite.exec(sql),
    runAsync: async (sql, ...params) => sqlite.prepare(sql).run(...params),
    getFirstAsync: async (sql, ...params) => sqlite.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql, ...params) => sqlite.prepare(sql).all(...params),
    async withTransactionAsync(task) {
      sqlite.exec('BEGIN');
      try { await task(); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const databaseDependencies = { 'expo-sqlite': { openDatabaseAsync: async () => db }, '../data/seedEvents': seed };
  const database = load('src/db/database.js', databaseDependencies);
  const preferences = load('src/storage/preferences.js', { '@react-native-async-storage/async-storage': asyncStorage });
  const session = load('src/services/session.js', { '@react-native-async-storage/async-storage': asyncStorage });
  const reset = load('src/services/reset.js', { '../db/database': database, '../storage/preferences': preferences, './session': session });
  try {
    await database.initializeDatabase();
    const event = seed.seedEvents[0];
    await database.saveNote(event.id, "Don't forget");
    await database.registerForEvent(event.id);
    await preferences.setDarkTheme(true);
    await preferences.setCardLayout('grid');
    await session.createSession('student');
    storage.set('unrelated-key', 'Keep');
    const pendingSave = database.toggleSavedEvent(event.id);
    const resetEvents = await reset.resetLocalAppData();
    await pendingSave;
    assert.equal(resetEvents.length, seed.seedEvents.length);
    assert.equal((await session.restoreSession()), null);
    assert.equal((await preferences.getPreferences()).darkTheme, false);
    assert.equal((await preferences.getPreferences()).cardLayout, 'list');
    assert.equal(storage.get('unrelated-key'), 'Keep');
    await session.createSession('student');
    const restarted = load('src/db/database.js', databaseDependencies);
    await restarted.initializeDatabase();
    assert.deepEqual(Array.from(await restarted.getSavedEventIds()), []);
    assert.equal(await restarted.getNote(event.id), null);
    assert.equal(await restarted.isRegistered(event.id), false);
    assert.equal((await restarted.getEvent(event.id)).registeredCount, event.registeredCount);
    await reset.resetLocalAppData();
    assert.equal((await database.getEvents()).length, seed.seedEvents.length);
  } finally {
    sqlite.close();
  }
});

test('reset clears cached context state and session only after storage reset succeeds', async () => {
  const states = [];
  let cursor = 0;
  let fail = false;
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    createElement: (_type, props) => props,
    useEffect: () => {},
    useRef: (initial) => ({ current: initial }),
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
  };
  const initialEvents = [{ id: 'seed-event' }];
  const { AppContextProvider } = load('src/context/AppContext.js', {
    react,
    '../services/reset': { resetLocalAppData: async () => {
      if (fail) throw new Error('Reset failed');
      return initialEvents;
    } },
  });
  const render = () => { cursor = 0; return AppContextProvider({ initialSession: { username: 'student' } }).value; };
  let context = render();
  context.setEvents([{ id: 'old-event' }]);
  context.setPreferences({ darkTheme: true, cardLayout: 'grid' });
  fail = true;
  await assert.rejects(context.resetAppData(), /Reset failed/);
  assert.equal(render().session.username, 'student');
  fail = false;
  await render().resetAppData();
  context = render();
  assert.equal(context.session, null);
  assert.deepEqual(Array.from(context.savedEventIds), []);
  assert.equal(context.events, initialEvents);
  assert.equal(context.preferences.darkTheme, false);
  assert.equal(context.preferences.cardLayout, 'list');
});

test('Settings reset works from the web button and native confirmation, with cancellation and failure handling', async () => {
  for (const platform of ['web', 'ios', 'android']) {
    const states = [];
    let cursor = 0;
    let confirmed = false;
    let alertButtons;
    let resets = 0;
    let fail = false;
    let destination;
    const { default: SettingsScreen } = load('src/screens/SettingsScreen.js', {
      react: {
        createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
        useState(initial) {
          const index = cursor++;
          if (!(index in states)) states[index] = initial;
          return [states[index], (value) => { states[index] = value; }];
        },
      },
      'react-native': {
        Platform: { OS: platform },
        Alert: { alert: (_title, _body, buttons) => { alertButtons = buttons; } },
        StyleSheet: { create: (styles) => styles },
      },
      '@rneui/themed': { Button: 'Button', Text: 'Text' },
      '../theme/theme': { useThemeColors: () => ({}) },
      '../context/AppContext': { useAppContext: () => ({
        preferences: {},
        resetAppData: async () => {
          if (fail) throw new Error('Reset failed');
          resets++;
        },
      }) },
    }, { window: { confirm: () => confirmed } });
    const navigation = {
      getParent: () => ({ reset: (value) => { destination = value; } }),
      reset: () => assert.fail('Reset must target the root navigator'),
    };
    const render = () => { cursor = 0; return SettingsScreen({ navigation }); };
    function find(tree, predicate) {
      if (!tree || typeof tree !== 'object') return;
      if (predicate(tree)) return tree;
      for (const child of tree.props?.children || []) {
        const match = find(child, predicate);
        if (match) return match;
      }
    }
    const button = () => find(render(), (node) => node.props?.title === 'Reset app data');
    await button().props.onPress();
    assert.equal(resets, 0);
    assert.equal(destination, undefined);
    confirmed = true;
    await button().props.onPress();
    if (platform !== 'web') await alertButtons.find((item) => item.text === 'Reset').onPress();
    assert.equal(resets, 1);
    assert.equal(destination.routes[0].name, 'Login');
    assert.equal(destination.index, 0);
    destination = undefined;
    fail = true;
    await button().props.onPress();
    if (platform !== 'web') await alertButtons.find((item) => item.text === 'Reset').onPress();
    assert.equal(destination, undefined);
    assert.ok(find(render(), (node) => node.props?.children?.[0] === 'Could not reset all app data. Please try again.'));
    assert.equal(button().props.loading, false);
  }
});
