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
  maximumDate?: Date;
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
export function DateTimeField({ value, onChange, maximumDate }: DateTimeFieldProps) {
  const [isPickerVisible, setPickerVisible] = useState(false);

  /**
   * Android は命令型APIでダイアログを開く。宣言的レンダリングで mode prop を
   * date → time と差し替える方式では、閉じたダイアログが再オープンしない。
   */
  const openAndroidPicker = () => {
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

  const handleIosChange = (event: DateTimePickerEvent, selected?: Date) => {
    setPickerVisible(false);

    if (event.type !== 'set' || !selected) {
      return;
    }

    onChange(clampToMaximum(selected, maximumDate));
  };

  return (
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

          setPickerVisible(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="発生時刻を変更"
        className="min-h-[44px] justify-center rounded-full bg-surface px-four dark:bg-surface-dark">
        <Text className="text-sm text-fg dark:text-fg-dark">変更</Text>
      </Pressable>

      {isPickerVisible && (
        <DateTimePicker
          value={value}
          mode="datetime"
          maximumDate={maximumDate}
          onChange={handleIosChange}
        />
      )}
    </View>
  );
}
