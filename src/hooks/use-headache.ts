import { useEffect, useState } from 'react';

import { useDbRevision } from '@/lib/db/db-revision';
import { getHeadache } from '@/lib/db/repositories/headaches';
import type { HeadacheRecord } from '@/lib/db/repositories/types';

import type { AsyncState } from './async-state';

/** 個別の記録。存在しない・削除済みの場合は data が null になる */
export function useHeadache(id: string): AsyncState<HeadacheRecord | null> {
  const revision = useDbRevision();
  const [state, setState] = useState<AsyncState<HeadacheRecord | null>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    getHeadache(id)
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
  }, [revision, id]);

  return state;
}
