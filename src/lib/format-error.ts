import { HeadacheNotFoundError } from './db/repositories/errors';
import { t } from './i18n';

/**
 * 画面に出すためのエラーメッセージ化。unknown を安全に文字列へ落とす。
 *
 * ユーザーが普通の操作で踏みうるものだけ、ここで表示言語の文言に差し替える。
 * それ以外（不正なデータ、初期化順の誤りなど、バグでしか起きないもの）は
 * 英語の診断メッセージがそのまま出る。
 */
export function formatError(error: unknown): string {
  if (error instanceof HeadacheNotFoundError) {
    return t('errors.headacheNotFound');
  }

  return error instanceof Error ? error.message : String(error);
}
