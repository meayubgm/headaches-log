import * as Crypto from 'expo-crypto';

import { isTagType, type TagType } from '@/constants/tag-types';
import { locale } from '@/lib/i18n';

import { getDb } from '../client';
import { bumpDbRevision } from '../db-revision';
import { DuplicateTagNameError, TagNotFoundError } from './errors';
import { getLocalUserId } from './local-user';
import { getSyncMeta, setSyncMeta } from './sync-meta';
import type { CreateTagInput, TagRecord } from './types';

type TagRow = {
  id: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
};

const SEEDED_KEY = 'default_tags_seeded';

/**
 * 初回起動時に投入する原因タグ。tags.name は言語非依存コードを持たないので、
 * ここで端末の言語に応じた文字列を1回だけ確定させる（以後リネーム可能なユーザーデータ）。
 * 服薬タグは薬名が個人・地域ごとに異なり汎用的な既定値を置けないため空で始める。
 */
const DEFAULT_CAUSE_TAGS: Record<'ja' | 'en', string[]> = {
  ja: ['睡眠不足', '寝すぎ', 'ストレス', '天候', '月経', '肩こり', '空腹', '飲酒'],
  en: [
    'Lack of sleep',
    'Oversleep',
    'Stress',
    'Weather',
    'Menstruation',
    'Neck & shoulder tension',
    'Hunger',
    'Alcohol',
  ],
};

/** 区分はマイグレーション時点の値ではなくユーザーデータなので、未知の値はバグとして落とす */
function toTagType(value: string): TagType {
  if (!isTagType(value)) {
    throw new Error(`Invalid tags.type: ${value}`);
  }

  return value;
}

function toRecord(row: TagRow): TagRecord {
  return {
    id: row.id,
    name: row.name,
    type: toTagType(row.type),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 同じ区分に同名の生存タグがあるか。UNIQUE 索引ではなくここで見ているのは、
 * 論理削除済み（deleted_at あり）の行と衝突させないため。
 */
async function assertNameIsFree(name: string, type: TagType, excludeId?: string): Promise<void> {
  const params: string[] = [getLocalUserId(), type, name];
  let excludeClause = '';

  if (excludeId !== undefined) {
    excludeClause = ' AND id <> ?';
    params.push(excludeId);
  }

  const row = await getDb().getFirstAsync<{ id: string }>(
    `SELECT id FROM tags
      WHERE user_id = ? AND type = ? AND deleted_at IS NULL AND name = ?${excludeClause}`,
    ...params,
  );

  if (row) {
    throw new DuplicateTagNameError(name);
  }
}

export async function listTags(): Promise<TagRecord[]> {
  const rows = await getDb().getAllAsync<TagRow>(
    `SELECT id, name, type, created_at, updated_at
       FROM tags
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY created_at ASC`,
    getLocalUserId(),
  );

  return rows.map(toRecord);
}

export async function createTag(input: CreateTagInput): Promise<TagRecord> {
  const name = input.name.trim();
  if (name === '') {
    throw new Error('Tag name must not be empty.');
  }

  await assertNameIsFree(name, input.type);

  const now = new Date().toISOString();
  const id = Crypto.randomUUID();

  // created_at / updated_at は DB の default (current_timestamp) に頼らず明示的に入れる
  // （書式が混ざると Phase 4 の LWW 文字列比較が壊れるため。headaches.ts と同じ方針）
  await getDb().runAsync(
    `INSERT INTO tags
       (id, user_id, name, type, deleted_at, created_at, updated_at, _dirty, _synced_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?, 1, NULL)`,
    id,
    getLocalUserId(),
    name,
    input.type,
    now,
    now,
  );

  bumpDbRevision();

  return { id, name, type: input.type, createdAt: now, updatedAt: now };
}

/**
 * リネーム型の編集。tags.name を書き換えるだけで、中間テーブルは id 参照なので
 * 過去記録の表示もそのまま追従する（要件 2-2「編集時は過去記録のタグ名も一括で追従」）。
 */
export async function renameTag(id: string, name: string): Promise<TagRecord> {
  const trimmed = name.trim();
  if (trimmed === '') {
    throw new Error('Tag name must not be empty.');
  }

  const current = await getDb().getFirstAsync<TagRow>(
    `SELECT id, name, type, created_at, updated_at
       FROM tags
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    id,
    getLocalUserId(),
  );

  if (!current) {
    throw new TagNotFoundError(id);
  }

  await assertNameIsFree(trimmed, toTagType(current.type), id);

  const now = new Date().toISOString();

  const result = await getDb().runAsync(
    `UPDATE tags SET name = ?, updated_at = ?, _dirty = 1
      WHERE id = ? AND user_id = ?`,
    trimmed,
    now,
    id,
    getLocalUserId(),
  );

  if (result.changes === 0) {
    throw new TagNotFoundError(id);
  }

  bumpDbRevision();

  return { ...toRecord(current), name: trimmed, updatedAt: now };
}

/** 削除確認ダイアログで「何件の記録で使われているか」を出すために数える */
export async function countHeadachesUsingTag(id: string): Promise<number> {
  const row = await getDb().getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
       FROM headache_tags
       JOIN headaches ON headaches.id = headache_tags.headache_id
      WHERE headache_tags.tag_id = ?
        AND headaches.user_id = ? AND headaches.deleted_at IS NULL`,
    id,
    getLocalUserId(),
  );

  return row?.count ?? 0;
}

/**
 * タグの削除。要件 2-2 の「全記録から関連付けを外してからタグを削除」に合わせ、
 * headache_tags の行は物理削除し、tags 自体は同期用トンビストーンとして論理削除する。
 */
export async function softDeleteTag(id: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM headache_tags WHERE tag_id = ?', id);

    const result = await db.runAsync(
      `UPDATE tags SET deleted_at = ?, updated_at = ?, _dirty = 1
        WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      now,
      now,
      id,
      getLocalUserId(),
    );

    // 他ユーザーの行や存在しないIDを黙って成功扱いにしない。
    // ここで throw すれば中間テーブルの DELETE ごとロールバックされる。
    if (result.changes === 0) {
      throw new TagNotFoundError(id);
    }
  });

  bumpDbRevision();
}

/**
 * 初回起動時に原因タグのプリセットを投入する。sync_meta のフラグで一度だけ実行し、
 * ユーザーが全部消したあとに復活しないようにする（タグ件数では判定しない）。
 *
 * 投入と「投入済み」フラグは**同じトランザクション**に入れる。別々にコミットすると、
 * その隙間でアプリが落ちた場合に次回起動でプリセットが二重に入るため。
 */
export async function seedDefaultTags(): Promise<void> {
  if (await getSyncMeta(SEEDED_KEY)) {
    return;
  }

  const db = getDb();
  const now = new Date().toISOString();
  const names = DEFAULT_CAUSE_TAGS[locale] ?? DEFAULT_CAUSE_TAGS.en;

  await db.withTransactionAsync(async () => {
    for (const name of names) {
      await db.runAsync(
        `INSERT INTO tags
           (id, user_id, name, type, deleted_at, created_at, updated_at, _dirty, _synced_at)
         VALUES (?, ?, ?, 'cause', NULL, ?, ?, 1, NULL)`,
        Crypto.randomUUID(),
        getLocalUserId(),
        name,
        now,
        now,
      );
    }

    await setSyncMeta(SEEDED_KEY, '1');
  });

  bumpDbRevision();
}
