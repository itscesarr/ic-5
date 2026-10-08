import { getEvents, resetDatabase } from '../db/database';
import { resetPreferences } from '../storage/preferences';
import { clearSession } from './session';

export async function resetLocalAppData() {
  await resetDatabase();
  await resetPreferences();
  await clearSession();
  return getEvents();
}
