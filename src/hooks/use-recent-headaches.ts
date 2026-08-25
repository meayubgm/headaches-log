import { useEffect, useState } from 'react';

import { useDbRevision } from '@/lib/db/db-revision';
import { listRecentHeadaches } from '@/lib/db/repositories/headaches';
import type { HeadacheRecord } from '@/lib/db/repositories/types';

import type { AsyncState } from './async-state';

const DEFAULT_LIMIT = 20;

/** 最近の記録一覧。記録の追加・更新・削除後（bumpDbRevision）に自動で再読み込みされる */
export function useRecentHeadaches(limit: number = DEFAULT_LIMIT): AsyncState<HeadacheRecord[]> {
  const revision = useDbRevision();
  const [state, setState] = useState<AsyncState<HeadacheRecord[]>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    listRecentHeadaches(limit)
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'ready', data });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [revision, limit]);

  return state;
}
