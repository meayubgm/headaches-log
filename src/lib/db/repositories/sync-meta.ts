import { getDb } from '../client';

export async function getSyncMeta(key: string): Promise<string | null> {
  const row = await getDb().getFirstAsync<{ value: string | null }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    key,
  );

  return row?.value ?? null;
}

export async function setSyncMeta(key: string, value: string): Promise<void> {
  await getDb().runAsync(
    'INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}
