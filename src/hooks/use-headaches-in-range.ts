import { useEffect, useState } from 'react';

import { useDbRevision } from '@/lib/db/db-revision';
import { listHeadachesBetween } from '@/lib/db/repositories/headaches';
import type { HeadacheRecord } from '@/lib/db/repositories/types';

import type { AsyncState } from './async-state';

const LOADING: AsyncState<HeadacheRecord[]> = { status: 'loading' };

/**
 * 半開区間 [fromIso, toIso) の記録。カレンダーは表示中のグリッド全体を一度に引き、
 * ドット表示と日別一覧の両方をこの1件の結果から導出する。
 *
 * 取得結果には「どの範囲のものか」を持たせ、範囲が変わったら描画側で loading に落とす。
 * effect の中で state を loading に戻す実装は cascading render になるため使わない。
 * 一方、範囲が同じまま revision だけ変わった場合（書き込み後の再読み込み）は
 * 前回の結果を出したまま差し替わるので、記録の追加・編集でリストがちらつかない。
 */
export function useHeadachesInRange(
  fromIso: string,
  toIso: string,
): AsyncState<HeadacheRecord[]> {
  const revision = useDbRevision();
  const rangeKey = `${fromIso}/${toIso}`;

  const [result, setResult] = useState<{
    rangeKey: string;
    state: AsyncState<HeadacheRecord[]>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    listHeadachesBetween(fromIso, toIso)
      .then((data) => {
        if (!cancelled) {
          setResult({ rangeKey, state: { status: 'ready', data } });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResult({ rangeKey, state: { status: 'error', error } });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [revision, fromIso, toIso, rangeKey]);

  if (result === null || result.rangeKey !== rangeKey) {
    return LOADING;
  }

  return result.state;
}
