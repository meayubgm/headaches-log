import { useEffect, useState } from 'react';

import { useDbRevision } from '@/lib/db/db-revision';
import { listTags } from '@/lib/db/repositories/tags';
import type { TagRecord } from '@/lib/db/repositories/types';

import type { AsyncState } from './async-state';

/** タグ一覧。タグの追加・リネーム・削除後（bumpDbRevision）に自動で再読み込みされる */
export function useTags(): AsyncState<TagRecord[]> {
  const revision = useDbRevision();
  const [state, setState] = useState<AsyncState<TagRecord[]>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    listTags()
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
  }, [revision]);

  return state;
}
