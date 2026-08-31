import { isHeadacheTypeCode, type HeadacheTypeCode } from '@/constants/headache-types';

import { getDb } from '../client';
import type { HeadacheType, HeadacheTypeId } from './types';

type Row = { id: number; code: string };

/** マスタはマイグレーションでシードされるので、未知のコードはバグとして落とす */
function toHeadacheTypeCode(value: string): HeadacheTypeCode {
  if (!isHeadacheTypeCode(value)) {
    throw new Error(`Invalid headache_types.code: ${value}`);
  }

  return value;
}

/** 頭痛の種類マスタ。マイグレーション 0001 でシードし、0003 でコード化した */
export async function listHeadacheTypes(): Promise<HeadacheType[]> {
  const rows = await getDb().getAllAsync<Row>('SELECT id, code FROM headache_types ORDER BY id ASC');

  return rows.map((row) => ({ id: row.id as HeadacheTypeId, code: toHeadacheTypeCode(row.code) }));
}
