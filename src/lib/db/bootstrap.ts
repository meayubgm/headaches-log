import { initDb } from './client';
import { runMigrations } from './migrate';
import { initLocalUserId } from './repositories/local-user';

let bootstrapPromise: Promise<void> | null = null;

/**
 * DB初期化 → マイグレーション適用 → 端末ローカル user_id の初期化を、
 * アプリ全体で一度だけ実行する。
 *
 * Promise 自体をキャッシュしているのは、Fast Refresh や StrictMode で
 * 起動処理が並行して2回走ると、両方が「マイグレーション未適用」と判定して
 * 同じ CREATE TABLE を流し `table already exists` で失敗するため。
 */
export function bootstrapDb(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const db = await initDb();
      await runMigrations(db);
      await initLocalUserId();
    })().catch((error: unknown) => {
      // 失敗した Promise を残すと以降のリトライが常に同じエラーになるためクリアする
      bootstrapPromise = null;
      throw error;
    });
  }

  return bootstrapPromise;
}
