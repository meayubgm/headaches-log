import { getDb } from '../client';
import type { HeadacheType, HeadacheTypeId } from './types';

type Row = { id: number; name: string };

/** 頭痛の種類マスタ。マイグレーション 0001 でシード済み */
export async function listHeadacheTypes(): Promise<HeadacheType[]> {
  const rows = await getDb().getAllAsync<Row>('SELECT id, name FROM headache_types ORDER BY id ASC');

  return rows.map((row) => ({ id: row.id as HeadacheTypeId, name: row.name }));
}
