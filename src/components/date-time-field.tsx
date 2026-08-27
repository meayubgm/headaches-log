import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatFullDateTime } from '@/lib/format-date';

import { DateTimeWheel } from './date-time-wheel';

export type DateTimeFieldProps = {
  value: Date;
  onChange: (next: Date) => void;
  /**
   * 選べる上限。`maximumDate={new Date()}` のようにレンダー時に評価すると
   * React Compiler がマウント時の値をキャッシュし、上限が開いた瞬間の時刻で固定される。
   * 操作した瞬間に評価できるよう関数で受け取る。
   */
  getMaximumDate?: () => Date;
};

/**
 * 発生時刻の編集。iOS / Android / Web すべてで同じ月/日/時/分のホイール
 * （date-time-wheel）を使う。常時展開するとフォームが縦に伸びるため、
 * 「変更」/「完了」で開閉する。
 */
export function DateTimeField({ value, onChange, getMaximumDate }: DateTimeFieldProps) {
  const [isPickerVisible, setPickerVisible] = useState(false);

  return (
    <View className="gap-two">
      <View className="flex-row items-center gap-three">
        <Text className="flex-1 text-base text-fg dark:text-fg-dark">
          {formatFullDateTime(value)}
        </Text>
        <Pressable
          onPress={() => setPickerVisible((visible) => !visible)}
          accessibilityRole="button"
          accessibilityLabel={isPickerVisible ? '発生時刻の変更を完了' : '発生時刻を変更'}
          className="min-h-[44px] justify-center rounded-full bg-surface px-four dark:bg-surface-dark">
          <Text className="text-sm text-fg dark:text-fg-dark">
            {isPickerVisible ? '完了' : '変更'}
          </Text>
        </Pressable>
      </View>

      {isPickerVisible && (
        <DateTimeWheel value={value} onChange={onChange} getMaximumDate={getMaximumDate} />
      )}
    </View>
  );
}
