import { t } from '@/lib/i18n';

/** 痛み度合い4段階（1=軽 〜 4=重）。DB の headaches.pain_level と対応する */
export type PainLevel = 1 | 2 | 3 | 4;

export const PAIN_LEVELS: readonly PainLevel[] = [1, 2, 3, 4];

/** 翻訳キー。数値のままだと辞書のキーにできないため段階ごとに名前を持たせる */
const PAIN_LEVEL_KEYS = {
  1: 'painLevels.mild',
  2: 'painLevels.painful',
  3: 'painLevels.severe',
  4: 'painLevels.unbearable',
} as const;

/** 色だけに依存しない識別のため、アイコンには必ずこのラベルを併記する */
export function painLevelLabel(level: PainLevel): string {
  return t(PAIN_LEVEL_KEYS[level]);
}

export function isPainLevel(value: number): value is PainLevel {
  return value === 1 || value === 2 || value === 3 || value === 4;
}
