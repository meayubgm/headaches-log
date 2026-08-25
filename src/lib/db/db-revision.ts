import { useSyncExternalStore } from 'react';

/**
 * ローカルDBへの書き込みを画面へ通知するための軽量なリビジョンカウンタ。
 *
 * Phase 1 の時点で扱うのはローカル SQLite の同期読み出しだけなので、
 * TanStack Query は導入せずこれで足りる（Phase 4 の Supabase 同期で導入予定）。
 * drizzle の useLiveQuery は Web の addDatabaseChangeListener 非対応リスクがあるため使わない。
 */
let revision = 0;
const listeners = new Set<() => void>();

/** 書き込み系のリポジトリ関数の末尾で必ず呼ぶ */
export function bumpDbRevision(): void {
  revision += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): number {
  return revision;
}

export function useDbRevision(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
