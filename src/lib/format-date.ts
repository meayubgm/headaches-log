import { locale } from './i18n';

/**
 * 日付の見せ方は言語ごとに語順が違うため、辞書の差し込みではなく
 * ロケール別の実装をここに持つ（初回リリースは端末言語に追従するだけで切り替えUIは無い）。
 */
const WEEKDAY_LABELS_BY_LOCALE = {
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
} as const;

const SHORT_MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const LONG_MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const WEEKDAY_LABELS: readonly string[] = WEEKDAY_LABELS_BY_LOCALE[locale];

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 時刻は月/日/時/分ホイールの表示（00〜23）と揃えるため、英語でも24時間表記にする */
function timePart(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function weekdayLabel(date: Date): string {
  return WEEKDAY_LABELS[date.getDay()];
}

/** 例: 2026年8月24日（月） / Mon, Aug 24, 2026 */
export function formatFullDate(date: Date): string {
  if (locale === 'ja') {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdayLabel(date)}）`;
  }

  return `${weekdayLabel(date)}, ${SHORT_MONTH_LABELS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** 例: 2026年8月24日 14:30 / Aug 24, 2026 14:30 */
export function formatFullDateTime(date: Date): string {
  if (locale === 'ja') {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${timePart(date)}`;
  }

  return `${SHORT_MONTH_LABELS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${timePart(date)}`;
}

/** 例: 8月24日 / Aug 24（読み上げラベルのように年が自明な場面で使う） */
export function formatMonthDay(date: Date): string {
  if (locale === 'ja') {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  return `${SHORT_MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

/** 例: 8月24日 14:30 / Aug 24 14:30 */
export function formatMonthDayTime(date: Date): string {
  return `${formatMonthDay(date)} ${timePart(date)}`;
}

/** 例: 8/24 14:30（数字だけなので言語によらず同じ） */
export function formatShortDateTime(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} ${timePart(date)}`;
}

/** 例: 14:30（日別一覧のように日付が自明な場面で使う） */
export function formatTime(date: Date): string {
  return timePart(date);
}

/** 例: 2026年8月 / August 2026 */
export function formatYearMonth(date: Date): string {
  if (locale === 'ja') {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  }

  return `${LONG_MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
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
