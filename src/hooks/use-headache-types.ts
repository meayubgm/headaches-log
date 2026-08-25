import { useEffect, useState } from 'react';

import { listHeadacheTypes } from '@/lib/db/repositories/headache-types';
import type { HeadacheType } from '@/lib/db/repositories/types';

import type { AsyncState } from './async-state';

/** 頭痛の種類マスタ。マイグレーションでシードされる固定値なのでマウント時に一度だけ読む */
export function useHeadacheTypes(): AsyncState<HeadacheType[]> {
  const [state, setState] = useState<AsyncState<HeadacheType[]>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    listHeadacheTypes()
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
  }, []);

  return state;
}
