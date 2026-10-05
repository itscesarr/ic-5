import * as SQLite from 'expo-sqlite';
import { seedEvents } from '../data/seedEvents';

const DATABASE_NAME = 'maizemeet.db';

let databasePromise;
let savedMutationQueue = Promise.resolve();

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return databasePromise;
}

export async function initializeDatabase() {
  const db = await getDatabase();
  const existingColumns = await db.getAllAsync('PRAGMA table_info(events)');
  if (existingColumns.length && !existingColumns.some((column) => column.name === 'startsAt')) {
    await db.execAsync(`
      DROP TABLE IF EXISTS registrations;
      DROP TABLE IF EXISTS notes;
      DROP TABLE IF EXISTS saved_events;
      DROP TABLE IF EXISTS events;
    `);
  }
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS events (
      rowId INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      startsAt TEXT NOT NULL,
      endsAt TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      room TEXT,
      capacity INTEGER,
      registeredCount INTEGER NOT NULL,
      tags TEXT
    );
    CREATE TABLE IF NOT EXISTS saved_events (
      rowId INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notes (
      eventId TEXT PRIMARY KEY,
      body TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS registrations (
      rowId INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    -- Keep the original event row, including its current registration count.
    -- Related tables reference event IDs, so their data survives this cleanup.
    DELETE FROM events
    WHERE rowId NOT IN (SELECT MIN(rowId) FROM events GROUP BY id);
    CREATE UNIQUE INDEX IF NOT EXISTS events_id_unique ON events (id);
    DELETE FROM saved_events
    WHERE rowId NOT IN (SELECT MIN(rowId) FROM saved_events GROUP BY eventId);
    CREATE UNIQUE INDEX IF NOT EXISTS saved_events_event_id_unique ON saved_events (eventId);
  `);

  for (const event of seedEvents) {
    await db.runAsync(
      `INSERT INTO events
        (id, title, description, startsAt, endsAt, category, location, room, capacity, registeredCount, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
      event.id,
      event.title,
      event.description,
      event.startsAt,
      event.endsAt,
      event.category,
      event.location,
      event.room,
      event.capacity,
      event.registeredCount,
      event.tags ? JSON.stringify(event.tags) : null
    );
  }
}

function mapEvent(row) {
  let tags = [];
  try {
    const parsed = row.tags ? JSON.parse(row.tags) : [];
    if (Array.isArray(parsed)) {
      tags = parsed.filter((tag) => typeof tag === 'string');
    }
  } catch {
    // Older rows may contain invalid JSON; optional tags must not prevent loading.
  }
  return {
    ...row,
    tags,
  };
}

export async function getEvents() {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync('SELECT * FROM events');
    return rows.map(mapEvent);
  } catch {
    return [];
  }
}

export async function getEvent(eventId) {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM events WHERE id = ?', eventId);
  return row ? mapEvent(row) : null;
}

export async function getSavedEvents() {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync(`
      SELECT events.*
      FROM events
      INNER JOIN saved_events ON saved_events.eventId = events.id
    `);
    return rows.map(mapEvent);
  } catch {
    return [];
  }
}

export async function getSavedEventIds() {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync('SELECT eventId FROM saved_events');
    return rows.map((row) => row.eventId);
  } catch {
    return [];
  }
}

export function toggleSavedEvent(eventId) {
  // Serialize the read/write pair so rapid taps cannot read the same old state.
  const operation = savedMutationQueue.then(() => performSavedToggle(eventId));
  savedMutationQueue = operation.catch(() => {});
  return operation;
}

async function performSavedToggle(eventId) {
  const db = await getDatabase();
  const saved = await db.getFirstAsync(
    'SELECT rowId FROM saved_events WHERE eventId = ?',
    eventId
  );

  if (saved) {
    await db.runAsync('DELETE FROM saved_events WHERE eventId = ?', eventId);
    return false;
  }

  await db.runAsync('INSERT INTO saved_events (eventId) VALUES (?)', eventId);
  return true;
}

export async function getNote(eventId) {
  const db = await getDatabase();
  return db.getFirstAsync('SELECT body, updatedAt FROM notes WHERE eventId = ?', eventId);
}

export async function saveNote(eventId, body) {
  const db = await getDatabase();
  const updatedAt = new Date().toISOString();
  await db.execAsync(
    `INSERT OR REPLACE INTO notes (eventId, body, updatedAt) VALUES ('${eventId}', '${body}', '${updatedAt}')`
  );
  return updatedAt;
}

export async function registerForEvent(eventId) {
  const db = await getDatabase();
  const event = await db.getFirstAsync(
    'SELECT capacity, registeredCount FROM events WHERE id = ?',
    eventId
  );

  if (event.capacity !== null && event.registeredCount > event.capacity) {
    throw new Error('This event is full.');
  }

  await db.runAsync(
    'INSERT INTO registrations (eventId, createdAt) VALUES (?, ?)',
    eventId,
    new Date().toISOString()
  );
  await db.runAsync(
    'UPDATE events SET registeredCount = registeredCount + 1 WHERE id = ?',
    eventId
  );
}

export async function isRegistered(eventId) {
  const db = await getDatabase();
  return Boolean(
    await db.getFirstAsync('SELECT rowId FROM registrations WHERE eventId = ?', eventId)
  );
}
