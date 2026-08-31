# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## プロジェクト概要

「頭痛ログ」— 無料・シンプルな頭痛記録アプリ。要件定義は `docs/頭痛ログ_要件定義.md`（Git管理外。ローカルには存在するので参照可能）にまとまっている。コンセプトは「ワンタップで記録できる手軽さ」と「通院時に医師へ見せられるデータ精度」の両立。

最重要制約:
- オフライン時に全機能が使えること（記録・タグ管理・カレンダー閲覧すべてローカルDBで完結）
- ログインなし（ゲスト＝端末単位）でも全機能利用可能、あとからアカウントへ一括紐付け
- 複数端末競合は Last Write Wins（`updated_at` 比較）で解決

対応言語は日本語と英語。端末の言語に追従し、それ以外の言語では英語で表示する（アプリ内の言語切り替えUIは持たない）。

現在の実装状況: Phase 2（カレンダー表示）まで完了。ホーム画面から痛み度合い・頭痛の種類（片頭痛／緊張型／その他）・メモ・発生時刻を記録し、ローカルSQLiteに保存して一覧表示できる。カレンダー画面では月グリッドに痛み度合いの色ドットと件数を表示し、日付を選ぶとその日の記録一覧が出て、項目から詳細画面（編集・論理削除）へ遷移できる。選択日が今日以前なら「この日に記録を追加」から新規作成画面へ進み、その日を発生時刻の初期値（今日は現在時刻、過去日は12:00）として記録できる。タグ管理・Supabase同期・認証は未実装。

## 技術スタック

- Expo SDK 57 + Expo Router（file-based routing）+ TypeScript strict、単一コードベースで iOS/Android/Web をカバー（react-native-web）
- スタイリング: NativeWind（Tailwind for RN）。グローバルCSSは `src/global.css`
- 多言語化: `expo-localization`（端末言語の取得）+ `i18n-js`（辞書と `%{name}` の差し込み）。辞書は `src/lib/i18n/locales/`
- ローカルDB: `expo-sqlite`（オフラインファーストの正データ）。`drizzle-orm` / `drizzle-kit` は**スキーマ定義とマイグレーションSQLの生成にのみ**使い、クエリは expo-sqlite の非同期API＋生SQLで書く（理由は下記「ローカルDBアクセス方針」）
- バックエンド: Supabase（Postgres, Auth, RLS）。認証は匿名サインインをデフォルトにし、本登録時に同一 `auth.users.id` のままリンク昇格させる設計
- **Expo Go では動作しない**（`expo-sqlite` 等ネイティブ機能を使うため）。ネイティブ実行には `expo-dev-client` を含む開発ビルドが必要で、ローカルビルド（`npx expo run:android` / `npx expo run:ios`）でも EAS Build でも作成できる

## よく使うコマンド

```bash
npm install                  # 依存関係インストール
npx expo start --web         # Web開発サーバー（ホスト側で直接）
npx expo start --dev-client  # iOS/Android開発ビルド起動（ホスト側、開発ビルドを端末に入れてあること）
npx expo lint                # ESLint
npx tsc --noEmit             # 型チェック
npx expo export --platform web  # Webビルド確認
```

Makefile に開発コマンドを集約している（`make <target>` で実行）:
- `make setup` — `npm install` + `.env` 雛形コピー + Supabaseローカル環境起動
- `make up-web` — Web開発サーバーをdocker composeで起動
- `make up-emu` — Androidエミュレータをバックグラウンド起動（`AVD=<名前>` で切り替え）
- `make run-android` — Android開発ビルドを作成して端末/エミュレータにインストール（初回・ネイティブ依存や `app.json` のネイティブ設定を変えたときのみ。JS/TSの変更だけなら不要）。Gradle 向けに `ANDROID_HOME` と `JAVA_HOME`（Android Studio 同梱のJDK 21）を Makefile から export している。実機は `DEVICE=<デバイス名>` で指定
- `make run-ios` — iOS開発ビルドを作成してシミュレータにインストール（`SIMULATOR=<名前>` で切り替え。既定は `iPhone 17 Pro`）。実行条件は `make run-android` と同じ
- `make up-native` — ホスト側で `expo start --dev-client`（`adb reverse` も併せて実行）
- `make reconnect-native` — 起動中のアプリを開発サーバーへ繋ぎ直す。Metro より先にアプリを起動した等で開発サーバーに繋がらないと、アプリはビルド時に埋め込まれた古いバンドルを再生し続ける（コードを直しても挙動が変わらない）。Metro のログに `Android Bundled ...` / `iOS Bundled ...` が出ているかが判別の目印
- `make down-native` — Metro停止 + `adb reverse` 解除 + エミュレータ終了
- `make up-db` / `make down-db` — Supabaseローカル環境（Postgres/Auth/Realtime等）の起動/停止
- `make migrate-db-local` — `supabase migration up --local`（Postgres側マイグレーションをローカル環境へ適用）
- `make migrate-db` — `supabase db push`（Postgres側マイグレーションをリンク済みのリモートプロジェクトへ適用）
- `make lint` / `make typecheck`

テスト基盤（Jest等）は未導入。`make test` は現状動作しない。

### iOSビルドの注意

Xcode を更新した直後は iOS プラットフォーム（SDK 実体とシミュレータランタイム）が未インストールで、`xcodebuild` が `Unable to find a destination matching the provided destination specifier`／`iOS <version> is not installed` を返すことがある。`xcodebuild -showsdks` には SDK が並ぶのに `-showdestinations` が空になるのが目印で、`xcodebuild -downloadPlatform iOS`（数GBのダウンロード）で解消する。

`ios/` は `.gitignore` 済みで prebuild の生成物なので、消しても `npx expo prebuild --platform ios` で作り直せる。ただし `ios/build/generated/` には ReactCodegen の生成ソースが入っており、ここだけ消すと `Build input file cannot be found` になる。`npx pod-install` で再生成する。

### ローカルDBスキーマを変更する場合

`src/lib/db/schema.ts` を編集後、`npx drizzle-kit generate` でマイグレーションSQLを `src/lib/db/migrations/` に生成する（`drizzle.config.ts` で設定）。データ投入など手書きのSQLが必要な場合は `npx drizzle-kit generate --custom --name=<name>`。

**列のリネームは対話プロンプトになる。** drizzle-kit は「列を作り直したのか、名前を変えたのか」を判別できず TTY で選択を求めるため、非対話のシェルからは `Interactive prompts require a TTY terminal` で失敗する。手元の端末で実行するか、`.sql` と `meta/_journal.json` / `meta/<idx>_snapshot.json` を手書きする（スナップショットのリネームは `_meta.columns` に `"table"."old"` → `"table"."new"` を書く）。0003 はこの手順で作った。

生成された `.sql` は `babel-plugin-inline-import`（`babel.config.js`）で文字列としてバンドルに取り込まれ、`metro.config.js` の `resolver.sourceExts` に `sql` を追加することで解決される。

### ローカルDBアクセス方針（重要）

**drizzle-ormのクエリビルダは使わない。** `drizzle-orm/expo-sqlite` ドライバは `prepareSync` / `executeSync` / `getAllSync` という**同期APIしか呼ばない**実装で、expo-sqlite の Web 実装（wa-sqlite + OPFS）の同期APIは SharedArrayBuffer 経由で結果を受け渡す都合上、**複数行の結果でJSONが壊れて例外になる**（実機で確認済み。1行の結果なら通るため発覚しにくい）。非同期API（`getAllAsync` / `runAsync` / `execAsync`）は同じクエリで正常に動作する。

そのため:
- クエリは `src/lib/db/repositories/` 配下に生SQLで書き、`getDb().getAllAsync()` 等の非同期APIのみを使う
- マイグレーション適用も `drizzle-orm/expo-sqlite/migrator` の `useMigrations` を使わず、`src/lib/db/migrate.ts` の自前ランナーで行う
- drizzle は `schema.ts` の定義と `drizzle-kit generate` によるSQL生成のためだけに残している

### Supabase側スキーマを変更する場合

`supabase/migrations/` に新しいSQLファイルを追加し、RLSポリシーもこのファイル内で管理する。

適用先で使うコマンドが違う:

- **ローカル環境**: `make migrate-db-local`（`supabase migration up --local`。未適用のものだけを非破壊で流す）。`supabase start` は既存ボリュームから復元するだけで、あとから追加したマイグレーションは自動では流れない
- **リンク済みのリモートプロジェクト**: `make migrate-db`（`supabase db push`）。リンクしていない状態では使えない

## アーキテクチャ

### ディレクトリ構成

- `src/app/` — Expo Routerの画面（file-basedルーティング）。`tsconfig.json` で `@/*` → `src/*` にエイリアスされている。ルートの `<Stack>` が `(tabs)`（ホーム／カレンダーの2タブ）と `headaches/new`（カレンダーから日付を指定して追加する新規作成画面）・`headaches/[id]`（詳細画面）を持つ。後者2つはタブの外に置きヘッダー付きでpushする（静的セグメントの `new` が動的セグメントの `[id]` より優先される）。`app.json` の `experiments.typedRoutes` が有効なので、`router.push()` には `{ pathname: '/headaches/[id]', params: { id } }` の形で渡す（テンプレートリテラルは型が通らない）
- `src/components/` — UIコンポーネント。`splash-gate.tsx` が `bootstrapDb()` の完了を待ってスプラッシュを閉じる（`SplashScreen.hideAsync()` を呼ぶのはここだけ）
  - 発生時刻の入力は `date-time-field.tsx` →`date-time-wheel.tsx`（月/日/時/分の4列）→`wheel-picker-column.tsx`（ScrollViewベースの1列）の3段構成。**OSのDateTimePickerは使わず iOS/Android/Web で同一実装**にしている（プラットフォームごとに見た目と操作が割れるのを避けるため）。月列は年をまたいで連続し（選択中の年は `formatFullDateTime` の表示テキストで示す）、列の中央をタップするとテンキー入力へ切り替わる。上限（未来）を超える項目は `disabled` にし、確定値は `lib/clamp-date.ts` で丸める
- `src/lib/i18n/` — 多言語化。`index.ts` が端末言語を解決して `t()` を公開し、`locales/ja.ts` と `locales/en.ts` が辞書。`ja.ts` の `Translations` 型を `en.ts` に課しているので、キーの取りこぼしは型エラーになる。**表示言語は起動時に一度だけ決まる**（切り替えUIを持たないため、実行中に変わらない前提で `t()` を素の関数として使える）。未対応の言語と辞書の欠落は英語へフォールバックする
- `src/constants/pain-levels.ts` / `src/constants/headache-types.ts` — 痛み度合いと頭痛の種類の**表示名を解決する層**。DB は言語非依存の値（`pain_level` の 1〜4、`headache_types.code` の `migraine` / `tension` / `other`）だけを持ち、和訳・英訳はここから `t()` を引く
- `src/constants/design-tokens.json` — 色・スペーシングトークンの**唯一の出所**。`src/constants/theme.ts`（JS側）と `tailwind.config.js`（NativeWind）の両方がこれを読む。tailwind.config.js は素のNodeが読むためTSの theme.ts を require できないので JSON にしている
- `src/lib/db/` — ローカルSQLite関連
  - `schema.ts` — drizzle-ormによるテーブル定義（`headaches`, `headache_types`, `headache_headache_types`, `tags`, `headache_tags`, `sync_meta`）。`headache_types` が持つのは表示名ではなく言語非依存の `code`（`migraine` / `tension` / `other`）で、和訳・英訳は `src/constants/headache-types.ts` が解決する
  - `client.ts` — `openDatabaseAsync` でDBハンドルを初期化（`initDb()` / `getDb()`）。iOS/Android/Webで非同期APIのみを使う
  - `migrate.ts` — `migrations/` を適用する自前ランナー（`runMigrations`）。適用済みは独自の `__migrations` テーブルで管理
  - `repositories/` — 画面から使うDBアクセス層。生SQLをここに閉じ込め、drizzleのスキーマ型を画面に漏らさない。全関数が `Promise` を返す
  - `repositories/errors.ts` — リポジトリ層が投げるドメインエラー（`HeadacheNotFoundError`）。`Error` のサブクラスはトランスパイル環境でプロトタイプ鎖が切れることがあるため、コンストラクタで `Object.setPrototypeOf` を呼んでいる
  - `bootstrap.ts` — 起動処理（DB初期化→マイグレーション→ローカルuser_id初期化）を Promise ごとキャッシュして**アプリ全体で1回だけ**実行する（`bootstrapDb()`）。Fast Refresh / StrictMode で並行実行されるとマイグレーションが二重に走り `table already exists` で失敗するため
  - `db-revision.ts` — 書き込み通知用のリビジョンカウンタ（`useSyncExternalStore`）。書き込み系リポジトリ関数の末尾で `bumpDbRevision()` を呼び、`useRecentHeadaches` などが再読み込みする
- `src/lib/format-error.ts` — エラーの画面向け文字列化。**エラー文言の方針**は次の2種類に分ける。ユーザーが通常の操作で踏みうるもの（記録が見つからない等）は `repositories/errors.ts` の型付きエラーにし、`formatError` が型で判別して `t()` から日本語／英語の文言を引く（リポジトリ層に表示言語を持ち込まないため）。バグでしか起きない不変条件違反（不正な値、初期化順の誤り、マイグレーションSQLの欠落）は**英語の診断メッセージ**をそのまま投げる（開発者向けであり、ログや issue で扱いやすいため）
- `src/lib/format-date.ts` — 日付表示。語順が言語ごとに違うため辞書の差し込みではなく `ja` / `en` の分岐をこのファイルに閉じ込める（例: `2026年8月24日（月）` / `Mon, Aug 24, 2026`）。時刻は日時ホイールの列（00〜23）と揃えるため英語でも24時間表記
- `src/lib/calendar.ts` — 月グリッド生成（`buildMonthGrid` / `getGridRange`）と日別集計（`summarizeByDay`）の純粋関数。`occurred_at` はISO8601（UTC）で保存しているため、**日別のグルーピングはSQLiteではなくJS側でローカル日付として行う**（Webのwa-sqliteでは `date(..., 'localtime')` が端末タイムゾーン通りに解決される保証がないため）
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
