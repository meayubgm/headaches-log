# 頭痛ログ

無料・シンプル・サクサク動く頭痛記録アプリ。「ワンタップで記録できる手軽さ」と「通院時に医師へ見せられるデータ精度」の両立をコンセプトにしています。

- オフライン時も含めて全機能が使えるオフラインファースト構成
- ログインなし（ゲスト）でも全機能が使え、あとからアカウントに紐付け可能
- 詳しい要件定義は `docs/頭痛ログ_要件定義.md` を参照（Git管理外）

> 現在の実装状況: クイック記録＋ローカル保存（Phase 1）まで完了。ホーム画面から痛みの度合い・頭痛の種類・メモ・発生時刻を記録し、オフラインのまま一覧表示できます。カレンダー・タグ管理・クラウド同期・認証は未実装です。

## 技術スタック

- [Expo](https://expo.dev) SDK 57 + [Expo Router](https://docs.expo.dev/router/introduction/)（TypeScript strict）
- スタイリング: [NativeWind](https://www.nativewind.dev/)（Tailwind CSS for React Native）
- ローカルDB: [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)（オフラインファーストの正データ）。[drizzle-orm](https://orm.drizzle.team/) はスキーマ定義とマイグレーションSQLの生成に使用
- バックエンド: [Supabase](https://supabase.com/)（Postgres, Auth, Row Level Security）

iOS/Android/Web を単一コードベースでカバーしています。`expo-sqlite` などネイティブ機能を使うため **Expo Go では動作しません**。ネイティブ実行には `expo-dev-client` + EAS Build が必要です。

## セットアップ

前提: Node.js（LTS）、Docker（Supabaseローカル環境・Web開発サーバー用）

1. `.env.example` を `.env` にコピーし、値を埋める

   ```bash
   cp .env.example .env
   ```

   ローカル開発時の値は `npx supabase start` 実行後の出力（API URL / anon key）をコピーします。

2. セットアップを実行（依存関係インストール + Supabaseローカル環境起動）

   ```bash
   make setup
   ```

## 開発

```bash
make build       # Web開発サーバーをdocker composeで起動
make dev-native  # ホスト側で expo start --dev-client（iOS/Android向け）
```

Web版は `http://localhost:8081` でアクセスしてください。`expo-sqlite` の Web 実装（OPFS）は secure context（`localhost` または HTTPS）でのみ動作するため、LAN の IP アドレス経由では記録が保存できません。

その他の主なコマンド:

```bash
make down        # buildで起動したWebコンテナの停止
make db-up       # Supabaseローカル環境の起動
make db-down     # Supabaseローカル環境の停止
make db-migrate  # Postgres側マイグレーション適用（supabase db push）
make lint        # ESLint
make typecheck   # 型チェック（tsc --noEmit）
```

ローカルDBのスキーマ（`src/lib/db/schema.ts`）を変更した場合は、`npx drizzle-kit generate` でマイグレーションを生成してください。データ投入など手書きのSQLが必要なときは `npx drizzle-kit generate --custom --name=<name>` を使います。Supabase側のスキーマ・RLSポリシーは `supabase/migrations/` に追加します。

なお、アプリからのDBアクセスは drizzle のクエリビルダではなく `src/lib/db/repositories/` の生SQL（expo-sqlite の非同期API）で行います。理由は [`CLAUDE.md`](./CLAUDE.md) の「ローカルDBアクセス方針」を参照してください。

開発ルールや設計方針の詳細は [`CLAUDE.md`](./CLAUDE.md) を参照してください。
