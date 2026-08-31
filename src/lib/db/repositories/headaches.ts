import * as Crypto from 'expo-crypto';

import { isPainLevel, type PainLevel } from '@/constants/pain-levels';

import { getDb } from '../client';
import { HeadacheNotFoundError } from './errors';
import { bumpDbRevision } from '../db-revision';
import { getLocalUserId } from './local-user';
import type {
  CreateHeadacheInput,
  HeadacheRecord,
  HeadacheTypeId,
  UpdateHeadacheInput,
} from './types';

type HeadacheRow = {
  id: string;
  occurred_at: string;
  pain_level: number;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_LIST_LIMIT = 20;

function toPainLevel(value: number): PainLevel {
  if (!isPainLevel(value)) {
    throw new Error(`Invalid pain_level: ${value}`);
  }

  return value;
}

function toRecord(row: HeadacheRow, typeIds: HeadacheTypeId[], tagIds: string[]): HeadacheRecord {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    painLevel: toPainLevel(row.pain_level),
    memo: row.memo,
    typeIds,
    tagIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 複数レコード分の種類 id をまとめて引き、headache_id ごとにまとめる */
async function loadTypeIdsByHeadache(
  headacheIds: string[],
): Promise<Map<string, HeadacheTypeId[]>> {
  const result = new Map<string, HeadacheTypeId[]>();
  if (headacheIds.length === 0) {
    return result;
  }

  const placeholders = headacheIds.map(() => '?').join(', ');
  const rows = await getDb().getAllAsync<{ headache_id: string; headache_type_id: number }>(
    `SELECT headache_id, headache_type_id FROM headache_headache_types
     WHERE headache_id IN (${placeholders})
     ORDER BY headache_type_id ASC`,
    ...headacheIds,
  );

  rows.forEach((row) => {
    const list = result.get(row.headache_id) ?? [];
    list.push(row.headache_type_id as HeadacheTypeId);
    result.set(row.headache_id, list);
  });

  return result;
}

async function replaceTypeLinks(headacheId: string, typeIds: HeadacheTypeId[]): Promise<void> {
  const db = getDb();

  await db.runAsync('DELETE FROM headache_headache_types WHERE headache_id = ?', headacheId);

  for (const typeId of typeIds) {
    await db.runAsync(
      'INSERT INTO headache_headache_types (headache_id, headache_type_id) VALUES (?, ?)',
      headacheId,
      typeId,
    );
  }
}

/** 複数レコード分のタグ id をまとめて引き、headache_id ごとにまとめる */
async function loadTagIdsByHeadache(headacheIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (headacheIds.length === 0) {
    return result;
  }

  const placeholders = headacheIds.map(() => '?').join(', ');
  // 削除済みタグは softDeleteTag が関連行ごと消しているが、
  // 同期で入ってきた行に備えて JOIN 側でも弾いておく
  const rows = await getDb().getAllAsync<{ headache_id: string; tag_id: string }>(
    `SELECT headache_tags.headache_id, headache_tags.tag_id
       FROM headache_tags
       JOIN tags ON tags.id = headache_tags.tag_id
      WHERE headache_tags.headache_id IN (${placeholders})
        AND tags.deleted_at IS NULL
      ORDER BY tags.created_at ASC`,
    ...headacheIds,
  );

  rows.forEach((row) => {
    const list = result.get(row.headache_id) ?? [];
    list.push(row.tag_id);
    result.set(row.headache_id, list);
  });

  return result;
}

/**
 * 渡されたタグ id のうち、このユーザーの生存タグだけを元の順で返す。
 *
 * 画面が保持している選択は、別タブ（設定→タグ管理）でそのタグが削除されても残りうる。
 * そのまま INSERT すると削除済みタグへの関連行ができ、`loadTagIdsByHeadache` が
 * JOIN で弾くため画面には出ない「見えない関連付け」になる（Phase 4 で同期もされる）。
 * 書き込みトランザクションの中で必ずこれを通す。
 */
async function filterAvailableTagIds(tagIds: string[]): Promise<string[]> {
  if (tagIds.length === 0) {
    return [];
  }

  const placeholders = tagIds.map(() => '?').join(', ');
  const rows = await getDb().getAllAsync<{ id: string }>(
    `SELECT id FROM tags
      WHERE id IN (${placeholders}) AND user_id = ? AND deleted_at IS NULL`,
    ...tagIds,
    getLocalUserId(),
  );

  const available = new Set(rows.map((row) => row.id));

  return tagIds.filter((tagId) => available.has(tagId));
}

/** 中間テーブルの張り替え。実際に張った（＝生存していた）タグ id を返す */
async function replaceTagLinks(headacheId: string, tagIds: string[]): Promise<string[]> {
  const db = getDb();

  await db.runAsync('DELETE FROM headache_tags WHERE headache_id = ?', headacheId);

  const linkedTagIds = await filterAvailableTagIds(tagIds);

  for (const tagId of linkedTagIds) {
    await db.runAsync(
      'INSERT INTO headache_tags (headache_id, tag_id) VALUES (?, ?)',
      headacheId,
      tagId,
    );
  }

  return linkedTagIds;
}

export async function createHeadache(input: CreateHeadacheInput): Promise<HeadacheRecord> {
  const db = getDb();
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();
  const typeIds = input.typeIds ?? [];
  const tagIds = input.tagIds ?? [];
  const occurredAt = input.occurredAt ?? now;
  const memo = input.memo ?? null;
  // 実際に張れたタグ（削除済みを除いたもの）をトランザクションの中から受け取る
  let linkedTagIds: string[] = [];

  // created_at / updated_at は DB の default (current_timestamp) に頼らず明示的に入れる。
  // SQLite のデフォルトは 'YYYY-MM-DD HH:MM:SS' 形式で occurred_at の ISO8601 と書式が混ざり、
  // Phase 4 の LWW（文字列比較）で事故になるため。
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO headaches
         (id, user_id, occurred_at, pain_level, memo, deleted_at, created_at, updated_at, _dirty, _synced_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 1, NULL)`,
      id,
      getLocalUserId(),
      occurredAt,
      input.painLevel,
      memo,
      now,
      now,
    );

    for (const typeId of typeIds) {
      await db.runAsync(
        'INSERT INTO headache_headache_types (headache_id, headache_type_id) VALUES (?, ?)',
        id,
        typeId,
      );
    }

    linkedTagIds = await filterAvailableTagIds(tagIds);

    for (const tagId of linkedTagIds) {
      await db.runAsync('INSERT INTO headache_tags (headache_id, tag_id) VALUES (?, ?)', id, tagId);
    }
  });

  bumpDbRevision();

  return {
    id,
    occurredAt,
    painLevel: input.painLevel,
    memo,
    typeIds,
    tagIds: linkedTagIds,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listRecentHeadaches(
  limit: number = DEFAULT_LIST_LIMIT,
): Promise<HeadacheRecord[]> {
  const rows = await getDb().getAllAsync<HeadacheRow>(
    `SELECT id, occurred_at, pain_level, memo, created_at, updated_at
       FROM headaches
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY occurred_at DESC, created_at DESC
      LIMIT ?`,
    getLocalUserId(),
    limit,
  );

  const headacheIds = rows.map((row) => row.id);
  const typeIdsByHeadache = await loadTypeIdsByHeadache(headacheIds);
  const tagIdsByHeadache = await loadTagIdsByHeadache(headacheIds);

  return rows.map((row) =>
    toRecord(row, typeIdsByHeadache.get(row.id) ?? [], tagIdsByHeadache.get(row.id) ?? []),
  );
}

/**
 * 半開区間 [fromIso, toIso) に発生した記録を古い順に返す（カレンダーの月表示・日別一覧用）。
 * 日別のグルーピングは呼び出し側（`lib/calendar.ts`）が JS のローカル日付で行う。
 */
export async function listHeadachesBetween(
  fromIso: string,
  toIso: string,
): Promise<HeadacheRecord[]> {
  const rows = await getDb().getAllAsync<HeadacheRow>(
    `SELECT id, occurred_at, pain_level, memo, created_at, updated_at
       FROM headaches
      WHERE user_id = ? AND deleted_at IS NULL
        AND occurred_at >= ? AND occurred_at < ?
      ORDER BY occurred_at ASC, created_at ASC`,
    getLocalUserId(),
    fromIso,
    toIso,
  );

  const headacheIds = rows.map((row) => row.id);
  const typeIdsByHeadache = await loadTypeIdsByHeadache(headacheIds);
  const tagIdsByHeadache = await loadTagIdsByHeadache(headacheIds);

  return rows.map((row) =>
    toRecord(row, typeIdsByHeadache.get(row.id) ?? [], tagIdsByHeadache.get(row.id) ?? []),
  );
}

export async function getHeadache(id: string): Promise<HeadacheRecord | null> {
  const row = await getDb().getFirstAsync<HeadacheRow>(
    `SELECT id, occurred_at, pain_level, memo, created_at, updated_at
       FROM headaches
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    id,
    getLocalUserId(),
  );

  if (!row) {
    return null;
  }

  const typeIdsByHeadache = await loadTypeIdsByHeadache([id]);
  const tagIdsByHeadache = await loadTagIdsByHeadache([id]);

  return toRecord(row, typeIdsByHeadache.get(id) ?? [], tagIdsByHeadache.get(id) ?? []);
}

export async function updateHeadache(
  id: string,
  input: UpdateHeadacheInput,
): Promise<HeadacheRecord> {
  const db = getDb();
  const now = new Date().toISOString();

  const assignments: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.painLevel !== undefined) {
    assignments.push('pain_level = ?');
    params.push(input.painLevel);
  }
  if (input.occurredAt !== undefined) {
    assignments.push('occurred_at = ?');
    params.push(input.occurredAt);
  }
  if (input.memo !== undefined) {
    assignments.push('memo = ?');
    params.push(input.memo);
  }

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `UPDATE headaches SET ${[...assignments, 'updated_at = ?', '_dirty = 1'].join(', ')}
        WHERE id = ? AND user_id = ?`,
      ...params,
      now,
      id,
      getLocalUserId(),
    );

    // 他ユーザーの行や存在しないIDを黙って成功扱いにしない。
    // ここで throw すると withTransactionAsync がロールバックするので、
    // 中間テーブルだけが書き換わることもない。
    if (result.changes === 0) {
      throw new HeadacheNotFoundError(id);
    }

    if (input.typeIds !== undefined) {
      await replaceTypeLinks(id, input.typeIds);
    }

    if (input.tagIds !== undefined) {
      await replaceTagLinks(id, input.tagIds);
    }
  });

  bumpDbRevision();

  const updated = await getHeadache(id);
  if (!updated) {
    throw new HeadacheNotFoundError(id);
  }

  return updated;
}

/** 物理削除はせず deleted_at を立てる（同期用トンビストーン） */
export async function softDeleteHeadache(id: string): Promise<void> {
  const now = new Date().toISOString();

  const result = await getDb().runAsync(
    `UPDATE headaches SET deleted_at = ?, updated_at = ?, _dirty = 1
      WHERE id = ? AND user_id = ?`,
    now,
    now,
    id,
    getLocalUserId(),
  );

  if (result.changes === 0) {
    throw new HeadacheNotFoundError(id);
  }

  bumpDbRevision();
}
