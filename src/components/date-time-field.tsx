import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { formatMonthDayTime } from '@/lib/format-date';

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

/** Android の time ピッカーは maximumDate を無視するため、確定値をこちら側で丸める */
function clampToMaximum(date: Date, maximumDate?: Date): Date {
  if (maximumDate && date.getTime() > maximumDate.getTime()) {
    return new Date(maximumDate);
  }

  return date;
}

/**
 * 発生時刻の編集。Web 版は date-time-field.web.tsx（<input type="datetime-local">）。
 * Android は日付と時刻を同じダイアログで出せないため date → time の2段で開く。
 */
export function DateTimeField({ value, onChange, getMaximumDate }: DateTimeFieldProps) {
  const [isPickerVisible, setPickerVisible] = useState(false);
  // iOS はピッカーを開いている間ずっと上限が要るので、開いた時点の値を保持する
  const [pickerMaximum, setPickerMaximum] = useState<Date | undefined>(undefined);

  /**
   * Android は命令型APIでダイアログを開く。宣言的レンダリングで mode prop を
   * date → time と差し替える方式では、閉じたダイアログが再オープンしない。
   */
  const openAndroidPicker = () => {
    const maximumDate = getMaximumDate?.();

    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      maximumDate,
      onChange: (dateEvent, selectedDate) => {
        if (dateEvent.type !== 'set' || !selectedDate) {
          return;
        }

        DateTimePickerAndroid.open({
          value: selectedDate,
          mode: 'time',
          onChange: (timeEvent, selectedTime) => {
            if (timeEvent.type !== 'set' || !selectedTime) {
              return;
            }

            const merged = new Date(selectedDate);
            merged.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
            onChange(clampToMaximum(merged, maximumDate));
          },
        });
      },
    });
  };

  /**
   * iOS の datetime ピッカーは値が変わるたびに onChange を出す。ここで閉じてしまうと
   * 日付を選んだ時点でアンマウントされ、時刻を合わせられない（実機で再現確認済み）。
   * 開閉は「変更」/「完了」ボタン側に持たせ、onChange では値の反映だけを行う。
   */
  const handleIosChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      setPickerVisible(false);
      return;
    }

    if (event.type !== 'set' || !selected) {
      return;
    }

    onChange(clampToMaximum(selected, pickerMaximum));
  };

  const togglePicker = () => {
    if (isPickerVisible) {
      setPickerVisible(false);
      return;
    }

    setPickerMaximum(getMaximumDate?.());
    setPickerVisible(true);
  };

  return (
    <View className="gap-two">
      <View className="flex-row items-center gap-three">
        <Text className="flex-1 text-base text-fg dark:text-fg-dark">
          {formatMonthDayTime(value)}
        </Text>
        <Pressable
          onPress={() => {
            if (Platform.OS === 'android') {
              openAndroidPicker();
              return;
            }

            togglePicker();
          }}
          accessibilityRole="button"
          accessibilityLabel={isPickerVisible ? '発生時刻の変更を完了' : '発生時刻を変更'}
          className="min-h-[44px] justify-center rounded-full bg-surface px-four dark:bg-surface-dark">
          <Text className="text-sm text-fg dark:text-fg-dark">
            {isPickerVisible ? '完了' : '変更'}
          </Text>
        </Pressable>
      </View>

      {isPickerVisible && (
        <DateTimePicker
          value={value}
          mode="datetime"
          maximumDate={pickerMaximum}
          locale="ja-JP"
          onChange={handleIosChange}
        />
      )}
    </View>
  );
}
