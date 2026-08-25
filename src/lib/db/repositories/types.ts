import type { PainLevel } from '@/constants/pain-levels';

/** headache_types のマスタ id。Supabase 側の serial 採番と一致させている */
export type HeadacheTypeId = 1 | 2 | 3 | 4;

export type HeadacheType = {
  id: HeadacheTypeId;
  name: string;
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
  createdAt: string;
  updatedAt: string;
};

export type CreateHeadacheInput = {
  painLevel: PainLevel;
  /** 省略時は現在時刻 */
  occurredAt?: string;
  memo?: string | null;
  typeIds?: HeadacheTypeId[];
};

export type UpdateHeadacheInput = Partial<CreateHeadacheInput>;
