/**
 * リポジトリ層が投げるドメインエラー。
 *
 * 文言は英語（開発者向けの診断メッセージ）に固定し、画面に出す日本語／英語の文言は
 * `src/lib/format-error.ts` が型で判別して `t()` から引く。リポジトリ層が表示言語を
 * 知らずに済むようにするため。
 */

/** 対象の記録が無い（他端末で削除された、他ユーザーのIDを指した、など） */
export class HeadacheNotFoundError extends Error {
  readonly headacheId: string;

  constructor(headacheId: string) {
    super(`Headache not found: ${headacheId}`);
    this.name = 'HeadacheNotFoundError';
    this.headacheId = headacheId;

    // Error のサブクラスは、トランスパイル環境ではプロトタイプ鎖が切れて
    // instanceof が false になることがあるため明示的に繋ぎ直す
    Object.setPrototypeOf(this, HeadacheNotFoundError.prototype);
  }
}
