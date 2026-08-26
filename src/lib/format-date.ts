export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 例: 2026年8月24日（月） */
export function formatFullDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAY_LABELS[date.getDay()]}）`;
}

/** 例: 8月24日 14:30 */
export function formatMonthDayTime(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** 例: 8/24 14:30 */
export function formatShortDateTime(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** 例: 14:30（日別一覧のように日付が自明な場面で使う） */
export function formatTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** 例: 2026年8月 */
export function formatYearMonth(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

/**
 * カレンダーの日付キー。例: 2026-08-24
 * occurred_at は ISO8601（UTC）で保存されているため、必ず**ローカル日付**でキーを作る。
 */
export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** 日付キー（例: 2026-08-24）をローカル日付の Date に戻す（new Date(文字列) は UTC 解釈になるため使わない） */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}
