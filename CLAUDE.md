# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## プロジェクト概要

「頭痛ログ」— 無料・シンプルな頭痛記録アプリ。要件定義は `docs/頭痛ログ_要件定義.md`（Git管理外。ローカルには存在するので参照可能）にまとまっている。コンセプトは「ワンタップで記録できる手軽さ」と「通院時に医師へ見せられるデータ精度」の両立。

最重要制約:
- オフライン時に全機能が使えること（記録・タグ管理・カレンダー閲覧すべてローカルDBで完結）
- ログインなし（ゲスト＝端末単位）でも全機能利用可能、あとからアカウントへ一括紐付け
- 複数端末競合は Last Write Wins（`updated_at` 比較）で解決

現在の実装状況: 基盤構築（プロジェクト初期化、DB/同期基盤のスキーマ、Docker/Makefile整備）のみ完了。画面・同期ロジック本体は未実装。

## 技術スタック

- Expo SDK 57 + Expo Router（file-based routing）+ TypeScript strict、単一コードベースで iOS/Android/Web をカバー（react-native-web）
- スタイリング: NativeWind（Tailwind for RN）。グローバルCSSは `src/global.css`
- ローカルDB: `expo-sqlite` + `drizzle-orm`（オフラインファーストの正データ）
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
- `make dev-web` — Web開発サーバーをdocker composeで起動
- `make dev-native` — ホスト側で `expo start --dev-client`
- `make db-up` / `make db-down` — Supabaseローカル環境（Postgres/Auth/Realtime等）の起動/停止
- `make db-migrate` — `supabase db push`（Postgres側マイグレーション適用）
- `make lint` / `make typecheck`

テスト基盤（Jest等）は未導入。`make test` は現状動作しない。

### ローカルDBスキーマを変更する場合

`src/lib/db/schema.ts` を編集後、`npx drizzle-kit generate` でマイグレーションSQLを `src/lib/db/migrations/` に生成する（`drizzle.config.ts` で設定）。

### Supabase側スキーマを変更する場合

`supabase/migrations/` に新しいSQLファイルを追加し、`npx supabase db push`（または `make db-migrate`）で適用する。RLSポリシーもこのマイグレーションファイル内で管理する。

## アーキテクチャ

### ディレクトリ構成

- `src/app/` — Expo Routerの画面（file-basedルーティング）。`tsconfig.json` で `@/*` → `src/*` にエイリアスされている
- `src/components/` — UIコンポーネント
- `src/lib/db/` — ローカルSQLite関連
  - `schema.ts` — drizzle-ormによるテーブル定義（`headaches`, `headache_types`, `headache_headache_types`, `tags`, `headache_tags`, `sync_meta`）
  - `client.ts` — `expo-sqlite` の非同期API（`openDatabaseAsync`）でDBクライアントを初期化。iOS/Android/Webで同じ非同期APIのみを使う設計（Web版expo-sqliteはOPFSベースの非同期APIのみ対応のため、同期APIは使わない）
  - `migrate.ts` — `useMigrations` フックのラッパー（ルートレイアウトからの呼び出しは未実装）
- `supabase/` — Supabase CLIのローカル環境設定と、Postgres側スキーマ・RLSポリシーのマイグレーション（`supabase/migrations/`）

### オフラインファースト＋同期の設計方針

ローカルSQLiteを正データとして扱う。各テーブルは同期用カラム（`_dirty`, `deletedAt`, `updatedAt`/`_synced_at`）を持つ想定で、`_dirty=1` の行をオンライン復帰時にSupabaseへpush、`updated_at` 差分をpullしてLWWでマージする（同期エンジン本体 `lib/sync/engine.ts` は未実装）。削除は物理削除ではなく `deleted_at` によるトンビストーン方式。

### 認証・user_id運用

Supabase Authの匿名サインイン（`signInAnonymously`）をアプリ起動時のデフォルトとし、ローカル/リモート双方で `auth.users.id` を一貫して `user_id` として使う。アカウント作成（メール/Google/Apple）時は匿名ユーザーを本登録にリンクし、同一IDを維持したまま昇格させることで、ゲスト時代のデータを移行処理なしに引き継ぐ設計。`supabase/config.toml` で `enable_anonymous_sign_ins = true` を設定済み。

### RLS方針

全テーブル基本形は `auth.uid() = user_id`。中間テーブル（`headache_headache_types`, `headache_tags`）は親レコード（`headaches`）経由の `exists` 句でチェックする。マスタテーブル `headache_types` は全ユーザーread-only。

### Docker構成（ハイブリッド）

- `docker-compose.yml` / `Dockerfile.web` — Web開発サーバー（Metro）のみをコンテナ化
- Supabaseのローカル環境（Postgres/Auth/Realtime等）は `supabase start` が内部で専用のdocker composeプロジェクトを管理するため、`docker-compose.yml` には含めない
- iOS/Androidのネイティブビルド・実行はホスト側（Appleの制約上iOSはmacOSホスト必須）
