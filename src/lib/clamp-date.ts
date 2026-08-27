/**
 * 発生時刻の値を丸めるユーティリティ。
 * 日時ピッカー（ネイティブ/Web 共通）と相対時刻ボタンの双方から使う。
 */

/** 上限を超えていたら上限へ丸める */
export function clampToMaximum(date: Date, maximumDate?: Date): Date {
  if (maximumDate && date.getTime() > maximumDate.getTime()) {
    return new Date(maximumDate);
  }

  return date;
}

/** 秒・ミリ秒を切り捨てる（ピッカーの最小単位が分のため、表示と内部値をずらさない） */
export function floorToMinute(date: Date): Date {
  const floored = new Date(date);
  floored.setSeconds(0, 0);

  return floored;
}

/** 指定した年月の日数（month0 は 0 始まり） */
export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}
