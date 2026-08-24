import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { db } from './client';
import migrations from './migrations/migrations';

// Phase1でルートレイアウトから呼び出し、マイグレーション完了までスプラッシュを維持する想定
export function useDbMigrations() {
  return useMigrations(db, migrations);
}
