import * as Crypto from 'expo-crypto';

import { getSyncMeta, setSyncMeta } from './sync-meta';

const LOCAL_USER_ID_KEY = 'local_user_id';

let cachedUserId: string | null = null;

/**
 * 端末ローカルの user_id を取得（なければ生成）する。アプリ起動時に一度だけ呼ぶ。
 *
 * Phase 1 は認証なしのため端末単位の UUID を使う。UUID 形式にしているのは、
 * Phase 4 で Supabase の匿名サインイン（auth.uid()、uuid 型）へ移行するときに
 * 書式を揃えておくため。移行は `UPDATE headaches/tags SET user_id = :authUid, _dirty = 1`
 * を一度だけ実行する想定なので、この値を他所（キャッシュキー等）に焼き込まないこと。
 */
export async function initLocalUserId(): Promise<string> {
  const stored = await getSyncMeta(LOCAL_USER_ID_KEY);
  if (stored) {
    cachedUserId = stored;
    return stored;
  }

  const generated = Crypto.randomUUID();
  await setSyncMeta(LOCAL_USER_ID_KEY, generated);
  cachedUserId = generated;

  return generated;
}

/** initLocalUserId() 完了後にのみ使える。リポジトリ層から同期的に参照する */
export function getLocalUserId(): string {
  if (!cachedUserId) {
    throw new Error('Local user_id is not initialized. Call initLocalUserId() first.');
  }

  return cachedUserId;
}
