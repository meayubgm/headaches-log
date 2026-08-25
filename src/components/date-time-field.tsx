import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { formatMonthDayTime } from '@/lib/format-date';

export type DateTimeFieldProps = {
  value: Date;
  onChange: (next: Date) => void;
  maximumDate?: Date;
};

type PickerMode = 'date' | 'time' | null;

/**
 * 発生時刻の編集。Web 版は date-time-field.web.tsx（<input type="datetime-local">）。
 * Android は日付と時刻を同じモーダルで出せないため date → time の2段で開く。
 */
export function DateTimeField({ value, onChange, maximumDate }: DateTimeFieldProps) {
  const [mode, setMode] = useState<PickerMode>(null);
  const [draft, setDraft] = useState(value);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) {
      setMode(null);
      return;
    }

    if (Platform.OS === 'ios') {
      setMode(null);
      onChange(selected);
      return;
    }

    if (mode === 'date') {
      // 日付だけ確定させ、続けて時刻ピッカーを開く
      setDraft(selected);
      setMode('time');
      return;
    }

    const merged = new Date(draft);
    merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    setMode(null);
    onChange(merged);
  };

  return (
    <View className="flex-row items-center gap-three">
      <Text className="flex-1 text-base text-fg dark:text-fg-dark">
        {formatMonthDayTime(value)}
      </Text>
      <Pressable
        onPress={() => {
          setDraft(value);
          setMode('date');
        }}
        accessibilityRole="button"
        accessibilityLabel="発生時刻を変更"
        className="min-h-[44px] justify-center rounded-full bg-surface px-four dark:bg-surface-dark">
        <Text className="text-sm text-fg dark:text-fg-dark">変更</Text>
      </Pressable>

      {mode !== null && (
        <DateTimePicker
          value={mode === 'time' ? draft : value}
          mode={Platform.OS === 'ios' ? 'datetime' : mode}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      )}
    </View>
  );
}
