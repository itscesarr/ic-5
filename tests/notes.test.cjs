const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const { test } = require('node:test');
const babel = require('@babel/core');

function loadDatabase(db) {
  const exports = {};
  const code = babel.transformSync(fs.readFileSync('src/db/database.js', 'utf8'), {
    configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  vm.runInNewContext(code, {
    exports,
    require: (name) => name === 'expo-sqlite'
      ? { openDatabaseAsync: async () => db }
      : { seedEvents: [] },
  });
  return exports;
}

test('notes round-trip punctuation, Unicode, multiline and SQL-like text without modifying other notes', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec('CREATE TABLE notes (eventId TEXT PRIMARY KEY, body TEXT NOT NULL, updatedAt TEXT NOT NULL)');
    const database = loadDatabase({
      execAsync: async (sql) => sqlite.exec(sql),
      runAsync: async (sql, ...params) => sqlite.prepare(sql).run(...params),
      getFirstAsync: async (sql, ...params) => sqlite.prepare(sql).get(...params),
    });
    await database.saveNote('other-event', 'Keep this note');
    const eventId = "student's-event";
    for (const body of ["Don't forget the professor's slides.", '"Quoted" text; punctuation',
      'First line\nSecond line: café — 学生 🎉', "'); DROP TABLE notes; --", '']) {
      const updatedAt = await database.saveNote(eventId, body);
      const stored = await database.getNote(eventId);
      assert.equal(stored.body, body);
      assert.equal(stored.updatedAt, updatedAt);
      assert.equal((await database.getNote('other-event')).body, 'Keep this note');
    }
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM notes').get().count, 2);
  } finally {
    sqlite.close();
  }
});

test('failed note writes reject so the screen can report the failure', async () => {
  const database = loadDatabase({ runAsync: async () => { throw new Error('Storage unavailable'); } });
  await assert.rejects(database.saveNote('event-1', "Don't lose this"), /Storage unavailable/);
});
