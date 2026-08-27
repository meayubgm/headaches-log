import { Colors, type ThemeColor } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * デザイントークンの色を JS 側で解決する。
 * アイコン（FontAwesome6）の `color` prop は className で制御できないため、
 * NativeWind に寄せられない例外として usePainColor と同じ形で用意している。
 */
export function useThemeColor(name: ThemeColor): string {
  const scheme = useColorScheme();
  // useColorScheme() は null / 'unspecified' を返しうるので light に正規化する
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme][name];
}
