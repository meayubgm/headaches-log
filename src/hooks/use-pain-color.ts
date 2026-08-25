import { PainColors } from '@/constants/theme';
import type { PainLevel } from '@/constants/pain-levels';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * 痛み度合いの色を JS 側で解決する。
 * アイコン（FontAwesome6）の `color` prop は className で制御できないため、
 * NativeWind に寄せられない例外としてこのフックを用意している。
 */
export function usePainColor(level: PainLevel): string {
  const scheme = useColorScheme();
  // useColorScheme() は null / 'unspecified' を返しうるので light に正規化する
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return PainColors[theme][level - 1];
}
