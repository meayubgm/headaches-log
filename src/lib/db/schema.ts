import { sql } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// 同期系カラムの共通方針:
// - id は Supabase 側と共有する UUID 文字列（クライアント側で発行）
// - _dirty: 1 ならローカル変更未送信、0 なら同期済み
// - deletedAt: 論理削除（同期用トンビストーン）。物理削除はしない
// - updatedAt: LWW（Last Write Wins）競合解決の比較に使う

export const headacheTypes = sqliteTable('headache_types', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const headaches = sqliteTable('headaches', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  occurredAt: text('occurred_at').notNull(),
  painLevel: integer('pain_level').notNull(),
  memo: text('memo'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  dirty: integer('_dirty').notNull().default(1),
  syncedAt: text('_synced_at'),
});

export const headacheHeadacheTypes = sqliteTable(
  'headache_headache_types',
  {
    headacheId: text('headache_id')
      .notNull()
      .references(() => headaches.id),
    headacheTypeId: integer('headache_type_id')
      .notNull()
      .references(() => headacheTypes.id),
  },
  (table) => [primaryKey({ columns: [table.headacheId, table.headacheTypeId] })],
);

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  type: text('type', { enum: ['cause', 'medication'] }).notNull(),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  dirty: integer('_dirty').notNull().default(1),
  syncedAt: text('_synced_at'),
});

export const headacheTags = sqliteTable(
  'headache_tags',
  {
    headacheId: text('headache_id')
      .notNull()
      .references(() => headaches.id),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id),
  },
  (table) => [primaryKey({ columns: [table.headacheId, table.tagId] })],
);

export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value'),
});
