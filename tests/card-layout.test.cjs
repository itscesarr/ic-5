const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const babel = require('@babel/core');

function load(file, dependencies) {
  const exports = {};
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  vm.runInNewContext(code, { exports, require: (name) => dependencies[name] });
  return exports;
}

test('layout survives reloading preferences and defaults safely for old or invalid values', async () => {
  const data = new Map();
  const dependencies = { '@react-native-async-storage/async-storage': {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
  } };
  const preferences = load('src/storage/preferences.js', dependencies);
  assert.equal((await preferences.getPreferences()).cardLayout, 'list');
  await preferences.setCardLayout('grid');
  const restarted = load('src/storage/preferences.js', dependencies);
  assert.equal((await restarted.getPreferences()).cardLayout, 'grid');
  await restarted.setCardLayout('list');
  assert.equal((await preferences.getPreferences()).cardLayout, 'list');
  data.set('preferences.cardLayout', 'invalid');
  assert.equal((await restarted.getPreferences()).cardLayout, 'list');
});

test('grid adapts to narrow screens and large text without changing the selected preference', () => {
  const { getCardLayout } = load('src/utils/cardLayout.js', { 'react-native': {} });
  assert.equal(getCardLayout('grid', 390, 1).columns, 2);
  assert.equal(getCardLayout('grid', 320, 1).columns, 1);
  assert.equal(getCardLayout('grid', 390, 1.5).columns, 1);
  assert.equal(getCardLayout('list', 800, 1).columns, 1);
  assert.equal(getCardLayout('grid', 390, 1).cardWidth, 169);
});
