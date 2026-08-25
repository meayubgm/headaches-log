/** 画面に出すためのエラーメッセージ化。unknown を安全に文字列へ落とす */
export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
