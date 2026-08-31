import { t } from '@/lib/i18n';

/**
 * タグの区分。原因タグ・服薬タグを1つの tags テーブルで扱い、この値で分ける。
 * タグ名（tags.name）はユーザーの入力そのものなので i18n を通さないが、
 * 区分の表示名はアプリの文言なのでここで解決する。
 */
export const TAG_TYPES = ['cause', 'medication'] as const;

export type TagType = (typeof TAG_TYPES)[number];

const TAG_TYPE_KEYS = {
  cause: 'tagTypes.cause',
  medication: 'tagTypes.medication',
} as const;

export function isTagType(value: string): value is TagType {
  return TAG_TYPES.some((type) => type === value);
}

export function tagTypeName(type: TagType): string {
  return t(TAG_TYPE_KEYS[type]);
}
