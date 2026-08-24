# 頭痛ログ

無料・シンプル・サクサク動く頭痛記録アプリ。「ワンタップで記録できる手軽さ」と「通院時に医師へ見せられるデータ精度」の両立をコンセプトにしています。

- オフライン時も含めて全機能が使えるオフラインファースト構成
- ログインなし（ゲスト）でも全機能が使え、あとからアカウントに紐付け可能
- 詳しい要件定義は `docs/頭痛ログ_要件定義.md` を参照（Git管理外）

> 現在の実装状況: プロジェクトの基盤構築（初期化、DB/同期基盤のスキーマ、Docker/Makefile整備）のみ完了。画面・同期ロジック本体は未実装です。

## 技術スタック

- [Expo](https://expo.dev) SDK 57 + [Expo Router](https://docs.expo.dev/router/introduction/)（TypeScript strict）
- スタイリング: [NativeWind](https://www.nativewind.dev/)（Tailwind CSS for React Native）
- ローカルDB: [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [drizzle-orm](https://orm.drizzle.team/)（オフラインファーストの正データ）
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
make dev-web     # Web開発サーバーをdocker composeで起動
make dev-native  # ホスト側で expo start --dev-client（iOS/Android向け）
```

その他の主なコマンド:

```bash
make down        # dev-webで起動したWebコンテナの停止
make db-up       # Supabaseローカル環境の起動
make db-down     # Supabaseローカル環境の停止
make db-migrate  # Postgres側マイグレーション適用（supabase db push）
make lint        # ESLint
make typecheck   # 型チェック（tsc --noEmit）
```

ローカルDBのスキーマ（`src/lib/db/schema.ts`）を変更した場合は、`npx drizzle-kit generate` でマイグレーションを生成してください。Supabase側のスキーマ・RLSポリシーは `supabase/migrations/` に追加します。

開発ルールや設計方針の詳細は [`CLAUDE.md`](./CLAUDE.md) を参照してください。
