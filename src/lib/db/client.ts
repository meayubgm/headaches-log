import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';

import * as schema from './schema';

// iOS/Android/Web すべてで同じ非同期APIのみを使う（expo-sqliteのWeb実装はOPFSベースの非同期APIのみ対応のため）
const sqlite = await openDatabaseAsync('headaches-log.db');

export const db = drizzle(sqlite, { schema });
