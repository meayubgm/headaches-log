import { FontAwesome6 } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { PainColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** 痛み度合い4段階（1=軽 〜 4=重） */
export type PainLevel = 1 | 2 | 3 | 4;

const ICON_NAMES: Record<PainLevel, ComponentProps<typeof FontAwesome6>['name']> = {
  1: 'face-meh',
  2: 'face-frown',
  3: 'face-grimace',
  4: 'face-dizzy',
};

export type PainFaceIconProps = {
  level: PainLevel;
  size?: number;
};

export function PainFaceIcon({ level, size = 32 }: PainFaceIconProps) {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  const color = PainColors[theme][level - 1];

  return <FontAwesome6 name={ICON_NAMES[level]} size={size} color={color} />;
}
