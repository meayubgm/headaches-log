const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

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
