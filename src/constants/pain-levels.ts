/** 痛み度合い4段階（1=軽 〜 4=重）。DB の headaches.pain_level と対応する */
export type PainLevel = 1 | 2 | 3 | 4;

export const PAIN_LEVELS: readonly PainLevel[] = [1, 2, 3, 4];

/** 色だけに依存しない識別のため、アイコンには必ずこのラベルを併記する */
export const PAIN_LEVEL_LABELS: Record<PainLevel, string> = {
  1: '軽い',
  2: 'つらい',
  3: 'かなりつらい',
  4: '耐えられない',
};

export function isPainLevel(value: number): value is PainLevel {
  return value === 1 || value === 2 || value === 3 || value === 4;
}
