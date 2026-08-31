import type { SQLiteDatabase } from 'expo-sqlite';

import migrationsBundle from './migrations/migrations';

type JournalEntry = { idx: number; tag: string; when: number };
type MigrationsBundle = {
  journal: { entries: JournalEntry[] };
  migrations: Record<string, string>;
};

const MIGRATIONS_TABLE = '__migrations';

function migrationKey(idx: number): string {
  return `m${String(idx).padStart(4, '0')}`;
}

/**
 * drizzle-kit が生成したマイグレーション（migrations/）を適用する自前ランナー。
 *
 * drizzle の useMigrations は同期APIを使うため Web で動かない（client.ts のコメント参照）。
 * 適用済みの管理は独自の __migrations テーブルで行う。
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const { journal, migrations } = migrationsBundle as unknown as MigrationsBundle;

  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (tag TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`,
  );

  const entries = [...journal.entries].sort((a, b) => a.idx - b.idx);

  for (const entry of entries) {
    const applied = await db.getFirstAsync<{ tag: string }>(
      `SELECT tag FROM ${MIGRATIONS_TABLE} WHERE tag = ?`,
      entry.tag,
    );
    if (applied) {
      continue;
    }

    const sql = migrations[migrationKey(entry.idx)];
    if (typeof sql !== 'string') {
      throw new Error(`Migration SQL not found: ${entry.tag}`);
    }

    // drizzle-kit は複数ステートメントを --> statement-breakpoint で区切って出力する
    const statements = sql
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    await db.withTransactionAsync(async () => {
      for (const statement of statements) {
        await db.execAsync(statement);
      }
      await db.runAsync(
        `INSERT INTO ${MIGRATIONS_TABLE} (tag, applied_at) VALUES (?, ?)`,
        entry.tag,
        new Date().toISOString(),
      );
    });
  }
}
