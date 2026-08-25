# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## プロジェクト概要

「頭痛ログ」— 無料・シンプルな頭痛記録アプリ。要件定義は `docs/頭痛ログ_要件定義.md`（Git管理外。ローカルには存在するので参照可能）にまとまっている。コンセプトは「ワンタップで記録できる手軽さ」と「通院時に医師へ見せられるデータ精度」の両立。

最重要制約:
- オフライン時に全機能が使えること（記録・タグ管理・カレンダー閲覧すべてローカルDBで完結）
- ログインなし（ゲスト＝端末単位）でも全機能利用可能、あとからアカウントへ一括紐付け
- 複数端末競合は Last Write Wins（`updated_at` 比較）で解決

現在の実装状況: Phase 1（クイック記録＋ローカル保存）まで完了。ホーム画面から痛み度合い・頭痛の種類・メモ・発生時刻を記録し、ローカルSQLiteに保存して一覧表示できる。カレンダー・タグ管理・Supabase同期・認証は未実装。

## 技術スタック

- Expo SDK 57 + Expo Router（file-based routing）+ TypeScript strict、単一コードベースで iOS/Android/Web をカバー（react-native-web）
- スタイリング: NativeWind（Tailwind for RN）。グローバルCSSは `src/global.css`
- ローカルDB: `expo-sqlite`（オフラインファーストの正データ）。`drizzle-orm` / `drizzle-kit` は**スキーマ定義とマイグレーションSQLの生成にのみ**使い、クエリは expo-sqlite の非同期API＋生SQLで書く（理由は下記「ローカルDBアクセス方針」）
- バックエンド: Supabase（Postgres, Auth, RLS）。認証は匿名サインインをデフォルトにし、本登録時に同一 `auth.users.id` のままリンク昇格させる設計
- **Expo Go では動作しない**（`expo-sqlite` 等ネイティブ機能を使うため）。ネイティブ実行は `expo-dev-client` + EAS Build が前提

## よく使うコマンド

```bash
npm install                  # 依存関係インストール
npx expo start --web         # Web開発サーバー（ホスト側で直接）
npx expo start --dev-client  # iOS/Android開発ビルド起動（ホスト側、EAS dev client前提）
npx expo lint                # ESLint
npx tsc --noEmit             # 型チェック
npx expo export --platform web  # Webビルド確認
```

Makefile に開発コマンドを集約している（`make <target>` で実行）:
- `make setup` — `npm install` + `.env` 雛形コピー + Supabaseローカル環境起動
- `make build` — Web開発サーバーをdocker composeで起動
- `make emu-up` — Androidエミュレータをバックグラウンド起動（`AVD=<名前>` で切り替え）
- `make up-native` — ホスト側で `expo start --dev-client`（`adb reverse` も併せて実行）
- `make down-native` — Metro停止 + `adb reverse` 解除 + エミュレータ終了
- `make db-up` / `make db-down` — Supabaseローカル環境（Postgres/Auth/Realtime等）の起動/停止
- `make db-migrate` — `supabase db push`（Postgres側マイグレーション適用）
- `make lint` / `make typecheck`

テスト基盤（Jest等）は未導入。`make test` は現状動作しない。

### ローカルDBスキーマを変更する場合

`src/lib/db/schema.ts` を編集後、`npx drizzle-kit generate` でマイグレーションSQLを `src/lib/db/migrations/` に生成する（`drizzle.config.ts` で設定）。データ投入など手書きのSQLが必要な場合は `npx drizzle-kit generate --custom --name=<name>`。

生成された `.sql` は `babel-plugin-inline-import`（`babel.config.js`）で文字列としてバンドルに取り込まれ、`metro.config.js` の `resolver.sourceExts` に `sql` を追加することで解決される。

### ローカルDBアクセス方針（重要）

**drizzle-ormのクエリビルダは使わない。** `drizzle-orm/expo-sqlite` ドライバは `prepareSync` / `executeSync` / `getAllSync` という**同期APIしか呼ばない**実装で、expo-sqlite の Web 実装（wa-sqlite + OPFS）の同期APIは SharedArrayBuffer 経由で結果を受け渡す都合上、**複数行の結果でJSONが壊れて例外になる**（実機で確認済み。1行の結果なら通るため発覚しにくい）。非同期API（`getAllAsync` / `runAsync` / `execAsync`）は同じクエリで正常に動作する。

そのため:
- クエリは `src/lib/db/repositories/` 配下に生SQLで書き、`getDb().getAllAsync()` 等の非同期APIのみを使う
- マイグレーション適用も `drizzle-orm/expo-sqlite/migrator` の `useMigrations` を使わず、`src/lib/db/migrate.ts` の自前ランナーで行う
- drizzle は `schema.ts` の定義と `drizzle-kit generate` によるSQL生成のためだけに残している

### Supabase側スキーマを変更する場合

`supabase/migrations/` に新しいSQLファイルを追加し、`npx supabase db push`（または `make db-migrate`）で適用する。RLSポリシーもこのマイグレーションファイル内で管理する。

## アーキテクチャ

### ディレクトリ構成

- `src/app/` — Expo Routerの画面（file-basedルーティング）。`tsconfig.json` で `@/*` → `src/*` にエイリアスされている。Phase 1 時点ではタブを使わず `<Stack>` 1画面構成（Phase 2 でカレンダー画面を追加する際にタブ構成を作る）
- `src/components/` — UIコンポーネント。`splash-gate.tsx` が `bootstrapDb()` の完了を待ってスプラッシュを閉じる（`SplashScreen.hideAsync()` を呼ぶのはここだけ）
- `src/constants/design-tokens.json` — 色・スペーシングトークンの**唯一の出所**。`src/constants/theme.ts`（JS側）と `tailwind.config.js`（NativeWind）の両方がこれを読む。tailwind.config.js は素のNodeが読むためTSの theme.ts を require できないので JSON にしている
- `src/lib/db/` — ローカルSQLite関連
  - `schema.ts` — drizzle-ormによるテーブル定義（`headaches`, `headache_types`, `headache_headache_types`, `tags`, `headache_tags`, `sync_meta`）
  - `client.ts` — `openDatabaseAsync` でDBハンドルを初期化（`initDb()` / `getDb()`）。iOS/Android/Webで非同期APIのみを使う
  - `migrate.ts` — `migrations/` を適用する自前ランナー（`runMigrations`）。適用済みは独自の `__migrations` テーブルで管理
  - `repositories/` — 画面から使うDBアクセス層。生SQLをここに閉じ込め、drizzleのスキーマ型を画面に漏らさない。全関数が `Promise` を返す
  - `bootstrap.ts` — 起動処理（DB初期化→マイグレーション→ローカルuser_id初期化）を Promise ごとキャッシュして**アプリ全体で1回だけ**実行する（`bootstrapDb()`）。Fast Refresh / StrictMode で並行実行されるとマイグレーションが二重に走り `table already exists` で失敗するため
  - `db-revision.ts` — 書き込み通知用のリビジョンカウンタ（`useSyncExternalStore`）。書き込み系リポジトリ関数の末尾で `bumpDbRevision()` を呼び、`useRecentHeadaches` などが再読み込みする
- `supabase/` — Supabase CLIのローカル環境設定と、Postgres側スキーマ・RLSポリシーのマイグレーション（`supabase/migrations/`）

### オフラインファースト＋同期の設計方針

ローカルSQLiteを正データとして扱う。各テーブルは同期用カラム（`_dirty`, `deletedAt`, `updatedAt`/`_synced_at`）を持つ想定で、`_dirty=1` の行をオンライン復帰時にSupabaseへpush、`updated_at` 差分をpullしてLWWでマージする（同期エンジン本体 `lib/sync/engine.ts` は未実装）。削除は物理削除ではなく `deleted_at` によるトンビストーン方式。

### 認証・user_id運用

Supabase Authの匿名サインイン（`signInAnonymously`）をアプリ起動時のデフォルトとし、ローカル/リモート双方で `auth.users.id` を一貫して `user_id` として使う。アカウント作成（メール/Google/Apple）時は匿名ユーザーを本登録にリンクし、同一IDを維持したまま昇格させることで、ゲスト時代のデータを移行処理なしに引き継ぐ設計。`supabase/config.toml` で `enable_anonymous_sign_ins = true` を設定済み。

### RLS方針

全テーブル基本形は `auth.uid() = user_id`。中間テーブル（`headache_headache_types`, `headache_tags`）は親レコード（`headaches`）経由の `exists` 句でチェックする。マスタテーブル `headache_types` は全ユーザーread-only。

### Docker構成（ハイブリッド）

- `docker-compose.yml` / `Dockerfile.web` — Web開発サーバー（Metro）のみをコンテナ化。ただし expo-sqlite の Web 実装は **secure context**（`localhost` か HTTPS）でないと動作しないため、ブラウザからは `http://localhost:8081` でアクセスすること（LAN IP でのアクセスは不可）
- `app.json` の expo-router プラグインで COOP/COEP ヘッダー（`credentialless` / `same-origin`）を設定している。expo-sqlite の Web 実装が要求する crossOriginIsolated を満たすため
- Supabaseのローカル環境（Postgres/Auth/Realtime等）は `supabase start` が内部で専用のdocker composeプロジェクトを管理するため、`docker-compose.yml` には含めない
- iOS/Androidのネイティブビルド・実行はホスト側（Appleの制約上iOSはmacOSホスト必須）
