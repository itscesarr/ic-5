const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const babel = require('@babel/core');

function loadDatabase(db) {
  const source = babel.transformSync(fs.readFileSync('src/db/database.js', 'utf8'), {
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require: (name) => name === 'expo-sqlite'
      ? { openDatabaseAsync: async () => db }
      : { seedEvents: [] },
  });
  return exports;
}

function savedDatabase() {
  const saved = new Set();
  let failNextWrite = false;
  return {
    saved,
    failWrite() { failNextWrite = true; },
    async getFirstAsync(sql, id) {
      await new Promise((resolve) => setImmediate(resolve));
      return saved.has(id) ? { rowId: 1 } : null;
    },
    async runAsync(sql, id) {
      if (failNextWrite) {
        failNextWrite = false;
        throw new Error('Write failed');
      }
      if (sql.startsWith('DELETE')) saved.delete(id);
      else {
        assert.equal(saved.has(id), false, 'duplicate save attempted');
        saved.add(id);
      }
    },
  };
}

test('rapid overlapping taps alternate saved state without duplicate inserts', async () => {
  const db = savedDatabase();
  const { toggleSavedEvent } = loadDatabase(db);
  const results = await Promise.all(Array.from({ length: 20 }, () => toggleSavedEvent('event-1')));
  assert.deepEqual(results, Array.from({ length: 20 }, (_, index) => index % 2 === 0));
  assert.equal(db.saved.size, 0);
  assert.equal(await toggleSavedEvent('event-1'), true);
  assert.equal(db.saved.size, 1);
});

test('a failed write does not block later saves or unsaves', async () => {
  const db = savedDatabase();
  const { toggleSavedEvent } = loadDatabase(db);
  db.failWrite();
  await assert.rejects(toggleSavedEvent('event-1'), /Write failed/);
  assert.equal(await toggleSavedEvent('event-1'), true);
  assert.equal(await toggleSavedEvent('event-1'), false);
  assert.equal(db.saved.size, 0);
});

test('event reads tolerate missing, malformed, and non-array stored tags', async () => {
  for (const tags of [null, undefined, '', 'null', '{}', '"social"', 'invalid JSON']) {
    const row = { id: 'evt-006', title: 'Graduate Student Mixer', tags };
    const database = loadDatabase({
      getFirstAsync: async () => row,
      getAllAsync: async () => [row],
    });
    const event = await database.getEvent('evt-006');
    assert.equal(event.title, row.title);
    assert.deepEqual(Array.from(event.tags), []);
    assert.equal((await database.getEvents()).length, 1);
    assert.equal((await database.getSavedEvents()).length, 1);
  }
});

test('event reads preserve valid tags and discard non-text entries', async () => {
  const database = loadDatabase({
    getFirstAsync: async () => ({ id: 'evt-001', tags: '["film",null,42,"late night"]' }),
  });
  assert.deepEqual(Array.from((await database.getEvent('evt-001')).tags), ['film', 'late night']);
});
