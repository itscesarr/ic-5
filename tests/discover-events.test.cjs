const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const babel = require('@babel/core');

function screenHarness(file, context, database = {}) {
  const states = [];
  const memos = [];
  let cursor = 0;
  let memoCursor = 0;
  const effects = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = value; }];
    },
    useMemo(callback, dependencies) {
      const index = memoCursor++;
      const previous = memos[index];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        memos[index] = { dependencies, value: callback() };
      }
      return memos[index].value;
    },
    useEffect: (callback) => effects.push(callback),
  };
  const source = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (name === 'react') return react;
      if (name.includes('AppContext')) return { useAppContext: () => context };
      if (name.includes('database')) return database;
      if (name.includes('eventService')) return database;
      if (name.includes('utils/cardLayout')) return { useCardLayout: () => ({ columns: 1, cardWidth: 350 }) };
      if (name.includes('utils/date')) return { formatFullEventDate: () => 'Event date' };
      if (name === '@rneui/themed') return { Text: 'Text', Button: 'Button', Chip: 'Chip' };
      if (name.includes('theme')) return { colors: {} };
      if (name === 'react-native') return {
        FlatList: 'FlatList', TextInput: 'TextInput', Pressable: 'Pressable', RefreshControl: 'RefreshControl',
        View: 'View', StyleSheet: { create: (styles) => styles },
      };
      return {};
    },
  });
  return {
    effects,
    render(props) { cursor = 0; memoCursor = 0; return exports.default(props); },
  };
}

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return;
  if (Array.isArray(tree)) {
    for (const child of tree) { const found = find(child, predicate); if (found) return found; }
  } else {
    if (predicate(tree)) return tree;
    return find(tree.props?.children, predicate);
  }
}

const events = [
  { id: 'late', title: 'AI Panel', category: 'Academic', startsAt: '2026-09-09', location: 'Weiser', tags: ['ethics'] },
  { id: 'early', title: 'Résumé Workshop', category: 'Career', startsAt: '2026-09-03', description: 'Coach feedback', location: 'Union', room: '3200' },
  { id: 'other', title: 'AI Panel', category: 'Academic', startsAt: '2026-09-08', location: 'Library' },
];

test('category changes recalculate results without mutating shared events', () => {
  const harness = screenHarness('src/screens/DiscoverScreen.js', { events, savedEventIds: [] });
  const render = () => harness.render({ navigation: {} });
  let tree = render();
  const category = find(tree, (node) => node.type === 'Pressable' && node.props.children[0]?.props.children[0] === 'Career');
  category.props.onPress();
  tree = render();
  assert.deepEqual(Array.from(find(tree, (node) => node.type === 'FlatList').props.data, (event) => event.id), ['early']);
  assert.deepEqual(events.map((event) => event.id), ['late', 'early', 'other']);
});

test('search matches attributes and navigates duplicate titles by stable ID', () => {
  const harness = screenHarness('src/screens/DiscoverScreen.js', { events, savedEventIds: [] });
  let destination;
  const render = () => harness.render({ navigation: { navigate: (...args) => { destination = args; } } });
  for (const [query, expected] of [[' RESUME ', 'early'], ['feedback', 'early'], ['3200', 'early'], [' ETHICS ', 'late'], ['weiser', 'late']]) {
    find(render(), (node) => node.type === 'TextInput').props.onChangeText(query);
    const list = find(render(), (node) => node.type === 'FlatList');
    assert.deepEqual(Array.from(list.props.data, (event) => event.id), [expected]);
    list.props.renderItem({ item: list.props.data[0], index: 0 }).props.onPress();
    assert.equal(destination[0], 'EventDetails');
    assert.equal(destination[1].eventId, expected);
  }
});

test('details loads the requested event ID independently of list position', async () => {
  let requested;
  let registrationId;
  const harness = screenHarness('src/screens/EventDetailsScreen.js', { events, savedEventIds: [] }, {
    getEvent: async (id) => { requested = id; return events.find((event) => event.id === id); },
    isRegistered: async (id) => { registrationId = id; return false; },
  });
  harness.render({ navigation: {}, route: { params: { eventId: 'late' } } });
  harness.effects[0]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requested, 'late');
  assert.equal(registrationId, 'late');
});

test('Mixer details render without tags', async () => {
  const event = { ...events[1], id: 'evt-006', title: 'Graduate Student Mixer' };
  const harness = screenHarness('src/screens/EventDetailsScreen.js', { savedEventIds: [] }, {
    getEvent: async () => event,
    isRegistered: async () => false,
  });
  const props = { navigation: {}, route: { params: { eventId: event.id } } };
  harness.render(props);
  harness.effects[0]();
  await new Promise((resolve) => setImmediate(resolve));
  const tree = harness.render(props);
  assert.ok(find(tree, (node) => node.type === 'Text' && node.props.children[0] === event.title));
  assert.equal(find(tree, (node) => node.type === 'Chip'), undefined);
});

test('failed details reads leave loading and show a working back button', async () => {
  for (const failsRegistration of [false, true]) {
    let wentBack = false;
    const harness = screenHarness('src/screens/EventDetailsScreen.js', { savedEventIds: [] }, {
      getEvent: async () => {
        if (!failsRegistration) throw new Error('Database unavailable');
        return events[0];
      },
      isRegistered: async () => { throw new Error('Registration query failed'); },
    });
    const props = { navigation: { goBack: () => { wentBack = true; } }, route: { params: { eventId: 'late' } } };
    harness.render(props);
    harness.effects[0]();
    await new Promise((resolve) => setImmediate(resolve));
    const tree = harness.render(props);
    assert.ok(find(tree, (node) => node.type === 'Text' && node.props.children[0].startsWith('Unable to open event')));
    find(tree, (node) => node.type === 'Button').props.onPress();
    assert.equal(wentBack, true);
  }
});

test('Discover distinguishes loading, no listed events, and no filter matches', () => {
  const context = { events: [], savedEventIds: [], eventsLoading: true };
  const harness = screenHarness('src/screens/DiscoverScreen.js', context);
  const list = () => find(harness.render({ navigation: {} }), (node) => node.type === 'FlatList');
  assert.equal(list().props.ListEmptyComponent.props.label, 'Loading events...');
  context.eventsLoading = false;
  assert.equal(list().props.ListEmptyComponent.props.title, 'No events listed yet');
  assert.equal(list().props.ListEmptyComponent.props.actionLabel, 'Refresh events');
  context.events = events;
  find(harness.render({ navigation: {} }), (node) => node.type === 'TextInput').props.onChangeText('no such event');
  assert.equal(list().props.ListEmptyComponent.props.title, 'No matching events');
  list().props.ListEmptyComponent.props.onAction();
  assert.equal(list().props.data.length, events.length);
});

test('Discover offers a retry for initial loading errors', async () => {
  let retries = 0;
  const harness = screenHarness('src/screens/DiscoverScreen.js', {
    events: [], savedEventIds: [], eventsError: 'Unable to load events.',
    reloadEvents: async () => { retries++; },
  });
  const empty = find(harness.render({ navigation: {} }), (node) => node.type === 'FlatList').props.ListEmptyComponent;
  assert.equal(empty.props.title, 'Unable to load events');
  assert.equal(empty.props.actionLabel, 'Try again');
  await empty.props.onAction();
  assert.equal(retries, 1);
});

test('failed refresh preserves events, stops refreshing, and can recover', async () => {
  let shouldFail = true;
  const context = {
    events, savedEventIds: [],
    setEvents: (next) => { context.events = next; },
    setEventsError: () => {},
  };
  const harness = screenHarness('src/screens/DiscoverScreen.js', context, {
    refreshEvents: async () => {
      if (shouldFail) throw new Error('Service unavailable');
      return [events[0]];
    },
  });
  const list = () => find(harness.render({ navigation: {} }), (node) => node.type === 'FlatList');
  await list().props.refreshControl.props.onRefresh();
  assert.equal(context.events, events);
  assert.equal(list().props.refreshControl.props.refreshing, false);
  const retry = find(harness.render({ navigation: {} }), (node) => node.type === 'Pressable' && node.props.children[0]?.props.children[0] === 'Try again');
  assert.ok(retry);
  shouldFail = false;
  await retry.props.onPress();
  assert.equal(list().props.data.length, 1);
  assert.equal(list().props.refreshControl.props.refreshing, false);
  assert.equal(find(harness.render({ navigation: {} }), (node) => node.props.accessibilityRole === 'alert'), undefined);
});
