import { FontAwesome6 } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type DetailToggleProps = {
  open: boolean;
  onPress: () => void;
};

/** 1回の開閉で回す角度 */
const STEP_DEGREES = 180;

/**
 * 詳細入力パネルの開閉トグル。開閉は文言と、angle-down アイコンの回転で示す。
 * react-native-reanimated は babel プラグイン未設定のため、RN コアの Animated を使う。
 */
export function DetailToggle({ open, onPress }: DetailToggleProps) {
  // 0↔180 を往復させると閉じるときだけ反時計回りになるため、角度を累積させて
  // 開くときも閉じるときも時計回りにする（1周したら 360 を引いて戻す）。
  // useRef(new Animated.Value(...)).current は「レンダー中の ref 参照」として
  // lint に弾かれるため、遅延初期化した state で1つの Animated.Value を保持する
  const [degrees] = useState(() => new Animated.Value(open ? STEP_DEGREES : 0));
  const currentDegrees = useRef(open ? STEP_DEGREES : 0);
  const previousOpen = useRef(open);
  const iconColor = useThemeColor('text');

  useEffect(() => {
    // マウント時や open 以外の再レンダーでは回さない
    if (previousOpen.current === open) {
      return;
    }
    previousOpen.current = open;

    const next = currentDegrees.current + STEP_DEGREES;
    currentDegrees.current = next;

    Animated.timing(degrees, {
      toValue: next,
      duration: 180,
      // react-native-web にはネイティブアニメーションモジュールが無く、
      // true のままだと毎回フォールバックの警告が出る
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      // 見た目が同じ 1周分を畳んで、値が無限に増えないようにする。
      // 連打で次のアニメーションが始まっていたら（finished=false）触らない
      if (finished && currentDegrees.current >= 360) {
        currentDegrees.current -= 360;
        degrees.setValue(currentDegrees.current);
      }
    });
  }, [open, degrees]);

  const rotate = degrees.interpolate({
    inputRange: [0, STEP_DEGREES],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      className="min-h-[44px] flex-row items-center justify-between rounded-xl bg-surface px-four dark:bg-surface-dark">
      <Text className="text-sm text-fg dark:text-fg-dark">
        {open ? '詳細を閉じる' : '詳細を入力（任意）'}
      </Text>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <FontAwesome6 name="angle-down" solid size={16} color={iconColor} />
      </Animated.View>
    </Pressable>
  );
}
