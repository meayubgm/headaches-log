import { t } from '@/lib/i18n';

/**
 * 頭痛の種類の言語非依存コード。DB（ローカル/Supabase とも headache_types.code）に
 * 入っている値で、表示名は端末の言語に応じてここで解決する。
 */
export const HEADACHE_TYPE_CODES = ['migraine', 'tension', 'other'] as const;

export type HeadacheTypeCode = (typeof HEADACHE_TYPE_CODES)[number];

const HEADACHE_TYPE_KEYS = {
  migraine: 'headacheTypes.migraine',
  tension: 'headacheTypes.tension',
  other: 'headacheTypes.other',
} as const;

export function isHeadacheTypeCode(value: string): value is HeadacheTypeCode {
  return HEADACHE_TYPE_CODES.some((code) => code === value);
}

export function headacheTypeName(code: HeadacheTypeCode): string {
  return t(HEADACHE_TYPE_KEYS[code]);
}
