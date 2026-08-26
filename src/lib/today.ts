import { useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

import { formatDateKey } from './format-date';

/**
 * 「今日」のローカル日付キーを配る軽量ストア。
 *
 * 毎レンダー `new Date()` を読むだけだと、アプリをフォアグラウンドに置いたまま
 * 日付をまたいだときに再レンダーの契機がなく、カレンダーの当日強調や
 * 「次の月へ」の活性が旧日付のまま取り残される。
 * 次の深夜0時に発火するタイマーと、バックグラウンド復帰（AppState）の
 * 両方を契機に更新する（タイマーはバックグラウンド中に遅延・停止しうるため）。
 *
 * 通知の仕組みは db-revision.ts と同じ useSyncExternalStore パターン。
 */
let currentKey = formatDateKey(new Date());
const listeners = new Set<() => void>();

let timer: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: NativeEventSubscription | null = null;

/** 次の深夜0時までのミリ秒（最大24時間なので setTimeout の上限に収まる） */
function msUntilNextMidnight(now: Date): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

function scheduleNextMidnight(): void {
  if (timer !== null) {
    clearTimeout(timer);
  }

  // 端末のスリープ等でタイマーがずれても取りこぼさないよう、境界の1秒後に起こす
  timer = setTimeout(refresh, msUntilNextMidnight(new Date()) + 1_000);
}

function refresh(): void {
  const nextKey = formatDateKey(new Date());

  if (nextKey !== currentKey) {
    currentKey = nextKey;
    listeners.forEach((listener) => listener());
  }

  scheduleNextMidnight();
}

function handleAppStateChange(state: AppStateStatus): void {
  if (state === 'active') {
    refresh();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (listeners.size === 1) {
    // 購読が始まった時点でも日付が動いているかもしれないので、まず突き合わせる
    refresh();
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      appStateSubscription?.remove();
      appStateSubscription = null;
    }
  };
}

function getSnapshot(): string {
  return currentKey;
}

/** 今日のローカル日付キー（例: 2026-08-26）。日付が変わると再レンダーされる */
export function useTodayKey(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
