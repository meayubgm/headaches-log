import type { PainLevel } from '@/constants/pain-levels';
import type { HeadacheRecord } from '@/lib/db/repositories/types';
import { formatDateKey } from '@/lib/format-date';

/** 1日ぶんのカレンダー表示用サマリ。件数と、その日の最大の痛み度合い */
export type DaySummary = {
  count: number;
  maxPainLevel: PainLevel;
};

/** 月グリッドの行数（6週固定。月が変わっても高さが揺れないようにする） */
const WEEKS_IN_GRID = 6;
const DAYS_IN_WEEK = 7;

/** 指定月の1日を表す Date（ローカル） */
export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

/**
 * 日曜始まりの月グリッド（6週 × 7日）を作る。
 * 前後の月の日も含むため、セルの表示側で当月かどうかを判定する。
 */
export function buildMonthGrid(year: number, month: number): Date[][] {
  // 月初の曜日ぶんだけ前へ戻した日を起点にする。
  // Date は範囲外の day を月またぎで正規化してくれるので、オフセット計算だけで済む。
  const gridStartOffset = 1 - startOfMonth(year, month).getDay();

  const weeks: Date[][] = [];
  for (let week = 0; week < WEEKS_IN_GRID; week += 1) {
    const days: Date[] = [];
    for (let day = 0; day < DAYS_IN_WEEK; day += 1) {
      days.push(new Date(year, month, gridStartOffset + week * DAYS_IN_WEEK + day));
    }
    weeks.push(days);
  }

  return weeks;
}

/**
 * グリッド全体をカバーする取得範囲（半開区間 [from, to)）を ISO8601 で返す。
 * 前後月のセルにもドットを出したいので、月単位ではなくグリッド単位で引く。
 */
export function getGridRange(grid: Date[][]): { fromIso: string; toIso: string } {
  const firstDay = grid[0][0];
  const lastDay = grid[grid.length - 1][DAYS_IN_WEEK - 1];

  return {
    fromIso: new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate()).toISOString(),
    toIso: new Date(
      lastDay.getFullYear(),
      lastDay.getMonth(),
      lastDay.getDate() + 1,
    ).toISOString(),
  };
}

/**
 * 記録をローカル日付キーごとに集計する。
 * occurred_at は UTC 文字列なので、SQLite 側ではなくここ（JS側）で日付を切る
 * （Web の wa-sqlite では date(..., 'localtime') が端末TZ通りに解決される保証がないため）。
 */
export function summarizeByDay(records: HeadacheRecord[]): Map<string, DaySummary> {
  const summaries = new Map<string, DaySummary>();

  records.forEach((record) => {
    const key = formatDateKey(new Date(record.occurredAt));
    const current = summaries.get(key);

    if (!current) {
      summaries.set(key, { count: 1, maxPainLevel: record.painLevel });
      return;
    }

    summaries.set(key, {
      count: current.count + 1,
      maxPainLevel:
        record.painLevel > current.maxPainLevel ? record.painLevel : current.maxPainLevel,
    });
  });

  return summaries;
}
