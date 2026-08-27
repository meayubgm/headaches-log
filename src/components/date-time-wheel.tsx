import { Text, View } from 'react-native';

import { clampToMaximum, daysInMonth, floorToMinute } from '@/lib/clamp-date';

import {
  ITEM_HEIGHT,
  WHEEL_HEIGHT,
  WHEEL_PADDING,
  WheelPickerColumn,
  type WheelItem,
} from './wheel-picker-column';

/** 月列に並べる過去の月数（5年分） */
const MONTHS_BACK = 60;
/** 上限が無い場合に月列を未来側へ伸ばす月数 */
const MONTHS_FORWARD = 12;

export type DateTimeWheelProps = {
  value: Date;
  onChange: (next: Date) => void;
  getMaximumDate?: () => Date;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 年と月を1本の通し番号にまとめる。月列を回すと年をまたげるようにするため */
function toYearMonth(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

function yearOf(yearMonth: number): number {
  return Math.floor(yearMonth / 12);
}

function month0Of(yearMonth: number): number {
  return yearMonth - yearOf(yearMonth) * 12;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isOverMaximum(date: Date, maximumDate?: Date): boolean {
  return maximumDate !== undefined && date.getTime() > maximumDate.getTime();
}

/**
 * 月/日/時/分の4列ホイール。列に年は出さないが、月を回すと年がまたがる
 * （選択中の年は date-time-field 側の日時テキストで確認できる）。
 */
export function DateTimeWheel({ value, onChange, getMaximumDate }: DateTimeWheelProps) {
  const maximumDate = getMaximumDate?.();

  const currentYearMonth = toYearMonth(value);
  const day = value.getDate();
  const hour = value.getHours();
  const minute = value.getMinutes();
  const year = yearOf(currentYearMonth);
  const month0 = month0Of(currentYearMonth);

  // 上限（通常は現在時刻）の月を上端に、そこから5年分を下端にする。
  // 編集対象がそれより古い場合はその月まで範囲を広げる。
  const upperYearMonth = Math.max(
    maximumDate ? toYearMonth(maximumDate) : currentYearMonth + MONTHS_FORWARD,
    currentYearMonth,
  );
  const lowerYearMonth = Math.min(upperYearMonth - MONTHS_BACK, currentYearMonth);

  const monthItems: WheelItem[] = [];
  for (let yearMonth = lowerYearMonth; yearMonth <= upperYearMonth; yearMonth += 1) {
    monthItems.push({
      value: yearMonth,
      text: `${month0Of(yearMonth) + 1}月`,
      // その月の最も早い日時（1日 0:00）でも上限を超えるなら選べない
      disabled: isOverMaximum(new Date(yearOf(yearMonth), month0Of(yearMonth), 1), maximumDate),
    });
  }

  const dayItems: WheelItem[] = [];
  for (let candidate = 1; candidate <= daysInMonth(year, month0); candidate += 1) {
    dayItems.push({
      value: candidate,
      text: `${candidate}`,
      disabled: isOverMaximum(new Date(year, month0, candidate), maximumDate),
    });
  }

  const hourItems: WheelItem[] = [];
  for (let candidate = 0; candidate <= 23; candidate += 1) {
    hourItems.push({
      value: candidate,
      text: pad2(candidate),
      disabled: isOverMaximum(new Date(year, month0, day, candidate), maximumDate),
    });
  }

  const minuteItems: WheelItem[] = [];
  for (let candidate = 0; candidate <= 59; candidate += 1) {
    minuteItems.push({
      value: candidate,
      text: pad2(candidate),
      disabled: isOverMaximum(new Date(year, month0, day, hour, candidate), maximumDate),
    });
  }

  /** 列の変更を1つの Date にまとめる。存在しない日（2/30 など）は月末へ丸める */
  const commit = (next: {
    yearMonth?: number;
    day?: number;
    hour?: number;
    minute?: number;
  }): void => {
    const nextYearMonth = next.yearMonth ?? currentYearMonth;
    const nextYear = yearOf(nextYearMonth);
    const nextMonth0 = month0Of(nextYearMonth);
    const nextDay = Math.min(next.day ?? day, daysInMonth(nextYear, nextMonth0));

    const merged = new Date(
      nextYear,
      nextMonth0,
      nextDay,
      next.hour ?? hour,
      next.minute ?? minute,
    );

    onChange(floorToMinute(clampToMaximum(merged, maximumDate)));
  };

  /** テンキーで月を入力したとき、同じ月のうち今の選択にいちばん近い年を選ぶ */
  const submitMonthInput = (typed: number) => {
    const targetMonth0 = clamp(typed, 1, 12) - 1;

    let nearest: number | null = null;
    for (let yearMonth = lowerYearMonth; yearMonth <= upperYearMonth; yearMonth += 1) {
      if (month0Of(yearMonth) !== targetMonth0) {
        continue;
      }

      if (
        nearest === null ||
        Math.abs(yearMonth - currentYearMonth) < Math.abs(nearest - currentYearMonth)
      ) {
        nearest = yearMonth;
      }
    }

    if (nearest !== null) {
      commit({ yearMonth: nearest });
    }
  };

  return (
    <View className="gap-one rounded-xl bg-bg p-two dark:bg-bg-dark">
      <View className="flex-row">
        {['月', '日', '時', '分'].map((header) => (
          <Text
            key={header}
            className="flex-1 text-center text-xs text-fg-muted dark:text-fg-muted-dark">
            {header}
          </Text>
        ))}
      </View>

      <View style={{ height: WHEEL_HEIGHT }}>
        <View
          className="absolute left-0 right-0 rounded-lg bg-surface-selected dark:bg-surface-selected-dark"
          style={{ top: WHEEL_PADDING, height: ITEM_HEIGHT, pointerEvents: 'none' }}
        />

        <View className="flex-row">
          <WheelPickerColumn
            label="月"
            items={monthItems}
            value={currentYearMonth}
            onChange={(yearMonth) => commit({ yearMonth })}
            onSubmitInput={submitMonthInput}
            inputValue={month0 + 1}
          />
          <WheelPickerColumn
            label="日"
            items={dayItems}
            value={day}
            onChange={(nextDay) => commit({ day: nextDay })}
            onSubmitInput={(typed) => commit({ day: clamp(typed, 1, daysInMonth(year, month0)) })}
            inputValue={day}
          />
          <WheelPickerColumn
            label="時"
            items={hourItems}
            value={hour}
            onChange={(nextHour) => commit({ hour: nextHour })}
            onSubmitInput={(typed) => commit({ hour: clamp(typed, 0, 23) })}
            inputValue={hour}
          />
          <WheelPickerColumn
            label="分"
            items={minuteItems}
            value={minute}
            onChange={(nextMinute) => commit({ minute: nextMinute })}
            onSubmitInput={(typed) => commit({ minute: clamp(typed, 0, 59) })}
            inputValue={minute}
          />
        </View>
      </View>
    </View>
  );
}
