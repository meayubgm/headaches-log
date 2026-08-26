import { Pressable, Text, View } from 'react-native';

import { PAIN_LEVEL_LABELS, type PainLevel } from '@/constants/pain-levels';
import type { DaySummary } from '@/lib/calendar';
import { buildMonthGrid } from '@/lib/calendar';
import { WEEKDAY_LABELS, formatDateKey, formatYearMonth } from '@/lib/format-date';
import { useTodayKey } from '@/lib/today';

/**
 * 痛み度合いのドット色。`usePainColor()` を使わず className で解決できるので、
 * JS 側で色を持たずに tailwind.config.js の pain-N トークンへ委ねる。
 */
const DOT_CLASS_NAMES: Record<PainLevel, string> = {
  1: 'bg-pain-1 dark:bg-pain-dark-1',
  2: 'bg-pain-2 dark:bg-pain-dark-2',
  3: 'bg-pain-3 dark:bg-pain-dark-3',
  4: 'bg-pain-4 dark:bg-pain-dark-4',
};

export type MonthCalendarProps = {
  /** 表示中の月の1日 */
  visibleMonth: Date;
  summaries: Map<string, DaySummary>;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  onChangeMonth: (delta: -1 | 1) => void;
  /** これより先の月へは進めない（既定では未来の月に進ませない） */
  maxMonth?: Date;
};

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function MonthNavButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-surface-selected dark:bg-surface-selected-dark">
      <Text
        className={[
          'text-lg',
          disabled ? 'text-fg-muted dark:text-fg-muted-dark' : 'text-fg dark:text-fg-dark',
        ].join(' ')}>
        {label}
      </Text>
    </Pressable>
  );
}

export function MonthCalendar({
  visibleMonth,
  summaries,
  selectedDateKey,
  onSelectDate,
  onChangeMonth,
  maxMonth,
}: MonthCalendarProps) {
  const weeks = buildMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth());
  const todayKey = useTodayKey();
  const nextDisabled = maxMonth !== undefined && isSameMonth(visibleMonth, maxMonth);

  return (
    <View className="gap-three rounded-2xl bg-surface p-three dark:bg-surface-dark">
      <View className="flex-row items-center justify-between">
        <MonthNavButton
          label="‹"
          accessibilityLabel="前の月へ"
          disabled={false}
          onPress={() => onChangeMonth(-1)}
        />
        <Text className="text-base font-bold text-fg dark:text-fg-dark">
          {formatYearMonth(visibleMonth)}
        </Text>
        <MonthNavButton
          label="›"
          accessibilityLabel="次の月へ"
          disabled={nextDisabled}
          onPress={() => onChangeMonth(1)}
        />
      </View>

      <View className="flex-row">
        {WEEKDAY_LABELS.map((label) => (
          <Text
            key={label}
            className="flex-1 text-center text-xs text-fg-muted dark:text-fg-muted-dark">
            {label}
          </Text>
        ))}
      </View>

      <View>
        {weeks.map((week) => (
          <View key={formatDateKey(week[0])} className="flex-row">
            {week.map((day) => {
              const dateKey = formatDateKey(day);
              const summary = summaries.get(dateKey);
              const inMonth = isSameMonth(day, visibleMonth);
              const selected = dateKey === selectedDateKey;

              const painLabel = summary
                ? `頭痛${summary.count}件 最大${PAIN_LEVEL_LABELS[summary.maxPainLevel]}`
                : '記録なし';

              return (
                <Pressable
                  key={dateKey}
                  onPress={() => onSelectDate(dateKey)}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.getMonth() + 1}月${day.getDate()}日 ${painLabel}`}
                  accessibilityState={{ selected }}
                  className={[
                    'min-h-[52px] flex-1 items-center justify-center gap-half rounded-xl border-2',
                    selected
                      ? 'border-primary bg-surface-selected dark:border-primary-dark dark:bg-surface-selected-dark'
                      : 'border-transparent',
                  ].join(' ')}>
                  <Text
                    className={[
                      'text-sm',
                      inMonth ? 'text-fg dark:text-fg-dark' : 'text-fg-muted dark:text-fg-muted-dark',
                      dateKey === todayKey ? 'font-bold' : '',
                    ].join(' ')}>
                    {day.getDate()}
                  </Text>
                  <View className="h-[14px] flex-row items-center gap-half">
                    {summary ? (
                      <>
                        <View
                          className={`h-two w-two rounded-full ${DOT_CLASS_NAMES[summary.maxPainLevel]}`}
                        />
                        {summary.count > 1 && (
                          <Text className="text-xs text-fg-muted dark:text-fg-muted-dark">
                            {summary.count}
                          </Text>
                        )}
                      </>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
