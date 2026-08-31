import type { HeadacheTypeCode } from '@/constants/headache-types';
import type { PainLevel } from '@/constants/pain-levels';
import type { TagType } from '@/constants/tag-types';

/**
 * headache_types のマスタ id。Supabase 側の serial 採番と一致させている。
 * 3（群発）はマイグレーション 0002 で削除したため欠番。
 */
export type HeadacheTypeId = 1 | 2 | 4;

/** 表示名は持たない。`headacheTypeName(code)` で端末の言語に応じて解決する */
export type HeadacheType = {
  id: HeadacheTypeId;
  code: HeadacheTypeCode;
};

/**
 * 画面が扱うタグ。name はユーザーが入力した文字列そのもの（言語非依存コードは持たない）。
 * リネームすると tags.name の更新だけで過去記録の表示も追従する（中間テーブルが id 参照のため）。
 */
export type TagRecord = {
  id: string;
  name: string;
  type: TagType;
  createdAt: string;
  updatedAt: string;
};

export type CreateTagInput = {
  name: string;
  type: TagType;
};

/**
 * 画面が扱う頭痛記録。drizzle のスキーマ型を画面へ漏らさないための境界。
 * 日時はすべて ISO8601（UTC）文字列。
 */
export type HeadacheRecord = {
  id: string;
  occurredAt: string;
  painLevel: PainLevel;
  memo: string | null;
  typeIds: HeadacheTypeId[];
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateHeadacheInput = {
  painLevel: PainLevel;
  /** 省略時は現在時刻 */
  occurredAt?: string;
  memo?: string | null;
  typeIds?: HeadacheTypeId[];
  tagIds?: string[];
};

export type UpdateHeadacheInput = Partial<CreateHeadacheInput>;
