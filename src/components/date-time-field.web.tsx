import { View } from 'react-native';

import type { DateTimeFieldProps } from './date-time-field';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * <input type="datetime-local"> はローカルタイムの 'YYYY-MM-DDTHH:mm' を扱う。
 * Date との変換をこのファイル内に閉じ込め、UTC との取り違えによる時差ズレを防ぐ。
 */
function toInputValue(date: Date): string {
  return [
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}`,
  ].join('T');
}

function fromInputValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day, hours, minutes] = match;

  return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
}

export function DateTimeField({ value, onChange, maximumDate }: DateTimeFieldProps) {
  return (
    <View className="flex-row items-center">
      <input
        type="datetime-local"
        aria-label="発生時刻"
        value={toInputValue(value)}
        max={maximumDate ? toInputValue(maximumDate) : undefined}
        onChange={(event) => {
          const next = fromInputValue(event.target.value);
          if (next) {
            onChange(next);
          }
        }}
        style={{
          font: 'inherit',
          fontSize: 16,
          padding: '10px 12px',
          minHeight: 44,
          borderRadius: 8,
          border: '1px solid currentColor',
          background: 'transparent',
          color: 'inherit',
          // ブラウザ標準のカレンダーUI・テキスト色をOSのテーマに追随させる
          colorScheme: 'light dark',
        }}
      />
    </View>
  );
}
