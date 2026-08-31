import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const DATABASE_NAME = 'headaches-log.db';

let dbInstance: SQLiteDatabase | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

/**
 * ローカルDBを初期化する。アプリ起動時に一度だけ呼ぶ（SplashGate）。
 *
 * iOS/Android/Web すべてで expo-sqlite の**非同期API**のみを使う。
 * expo-sqlite の Web 実装（wa-sqlite + OPFS）の同期APIは SharedArrayBuffer 経由で
 * 結果を受け渡す都合上、複数行の結果で JSON が壊れて例外になることを実機で確認したため。
 * drizzle-orm の expo-sqlite ドライバは同期API専用（prepareSync/executeSync/getAllSync）で
 * この制約に抵触するので、クエリには使わず、スキーマ定義（schema.ts）と
 * マイグレーションSQLの生成（drizzle-kit）にのみ使っている。
 */
export async function initDb(): Promise<SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  // 実行中の Promise 自体をキャッシュする。解決済みインスタンスだけを見ていると、
  // Fast Refresh や StrictMode で initDb() が並行して2回走ったときに DB が二重に開かれ、
  // マイグレーションも並行実行されて `table already exists` で初期化に失敗する。
  if (!initPromise) {
    initPromise = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      await db.execAsync('PRAGMA foreign_keys = ON');
      dbInstance = db;

      return db;
    })().catch((error: unknown) => {
      // 失敗した Promise を残すと以降のリトライが常に同じエラーになるためクリアする
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

export function getDb(): SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Local database is not initialized. Call initDb() first.');
  }

  return dbInstance;
}
