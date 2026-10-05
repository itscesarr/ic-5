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
      if (name.includes('theme')) return { colors: {} };
      if (name === 'react-native') return {
        FlatList: 'FlatList', TextInput: 'TextInput', Pressable: 'Pressable',
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
