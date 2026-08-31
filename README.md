# 頭痛ログ

無料・シンプル・サクサク動く頭痛記録アプリ。「ワンタップで記録できる手軽さ」と「通院時に医師へ見せられるデータ精度」の両立をコンセプトにしています。

- 日本語・英語対応（端末の言語に追従。それ以外の言語では英語で表示）
- オフライン時も含めて全機能が使えるオフラインファースト構成
- ログインなし（ゲスト）でも全機能が使え、あとからアカウントに紐付け可能
- 詳しい要件定義は `docs/頭痛ログ_要件定義.md` を参照（Git管理外）

> 現在の実装状況: タグ管理（Phase 3）まで完了。ホーム画面から痛みの度合い・頭痛の種類・原因タグ・服薬タグ・メモ・発生時刻を記録でき、カレンダー画面では月ごとの分布（痛み度合いの色ドット＋件数）と日別の記録一覧を確認できます。カレンダーで日付を選ぶと「この日に記録を追加」からその日の記録を作成でき、記録をタップすると詳細画面で編集・削除ができます。タグは設定タブのタグ管理画面で追加・名前の変更・削除ができ、記録画面のチップからその場で追加することもできます。ここまでオフラインのまま動作します。表示言語は端末の設定に追従します（日本語／英語）。クラウド同期・認証は未実装です。

## 技術スタック

- [Expo](https://expo.dev) SDK 57 + [Expo Router](https://docs.expo.dev/router/introduction/)（TypeScript strict）
- スタイリング: [NativeWind](https://www.nativewind.dev/)（Tailwind CSS for React Native）
- 多言語化: [expo-localization](https://docs.expo.dev/versions/latest/sdk/localization/) + [i18n-js](https://github.com/fnando/i18n)（辞書は `src/lib/i18n/locales/`）
- ローカルDB: [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)（オフラインファーストの正データ）。[drizzle-orm](https://orm.drizzle.team/) はスキーマ定義とマイグレーションSQLの生成に使用
- バックエンド: [Supabase](https://supabase.com/)（Postgres, Auth, Row Level Security）

iOS/Android/Web を単一コードベースでカバーしています。`expo-sqlite` などネイティブ機能を使うため **Expo Go では動作しません**。ネイティブ実行には `expo-dev-client` を含む開発ビルドが必要です。開発ビルドはローカルビルド（`npx expo run:android` / `npx expo run:ios`）でも EAS Build でも作成できます。

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
make up-web           # Web開発サーバーをdocker composeで起動
make up-emu           # Androidエミュレータを起動（AVD=<名前> で切り替え）
make run-android      # Android開発ビルドを作成して端末/エミュレータにインストール
make run-ios          # iOS開発ビルドを作成してシミュレータにインストール（SIMULATOR=<名前> で切り替え）
make up-native        # ホスト側で Metro を起動（iOS/Android向け）
make reconnect-native # 起動中のアプリを Metro に繋ぎ直す
make down-native      # Metro停止 + adb reverse解除 + エミュレータ終了
```

ネイティブビルド（`make run-android` / `make run-ios`）が必要なのは、その端末に初めてアプリを入れるとき、ネイティブ依存を追加・更新したとき、`app.json` のネイティブ設定や Expo SDK を変えたときだけです。この2つは Metro も一緒に起動するため、直後に `make up-native` を重ねる必要はありません。JS/TS だけの変更は Metro の再バンドルで反映されるので、普段は「Metro を起動 → アプリを起動」の手順で足ります。

### iOS Simulator で確認する

初回・ネイティブ設定を変えたとき:

```bash
make run-ios
```

JS/TS の変更だけを確認するとき:

```bash
make up-native   # Metro を起動
```

そのうえでシミュレータのアプリを起動します。

既定のシミュレータは Makefile の `SIMULATOR ?= iPhone 17 Pro` です。動作確認は **iPhone 17 Pro / iOS 26.2** で行っています。別の機種を使う場合は `make run-ios SIMULATOR="<名前>"`（名前は `xcrun simctl list devices` で確認）。

ビルドには Xcode が必要です。Xcode を更新した直後は iOS プラットフォーム（SDK 実体とシミュレータランタイム）が未インストールで、`Unable to find a destination matching the provided destination specifier` になることがあります。その場合は `xcodebuild -downloadPlatform iOS` を実行してから `make run-ios` を叩いてください。

### Android エミュレータで確認する

初回・ネイティブ設定を変えたとき:

```bash
make up-emu      # エミュレータを起動し、立ち上がりきるまで待つ
make run-android
```

JS/TS の変更だけを確認するとき:

```bash
make up-emu      # 起動していなければ
make up-native   # adb reverse + Metro
```

そのうえでエミュレータのアプリを起動します。

AVD を変えるときは `make up-emu AVD=<名前>`、実機に入れるときは `make run-android DEVICE=<adb で見えるデバイス名>` を使います。

ビルドには Android SDK（platform 36 と NDK）と JDK 17/21 が必要です。Makefile は `ANDROID_HOME` を `~/Library/Android/sdk`、`JAVA_HOME` を Android Studio 同梱の JDK にそれぞれ既定値として設定し、Gradle へ渡します。別の場所に入れている場合は `make run-android ANDROID_HOME=<パス> JAVA_HOME=<パス>` のように上書きしてください。

### 挙動が変わらないときは古いバンドルを疑う

コードを直したのに端末上の挙動が変わらないときは、アプリが Metro ではなくビルド時に埋め込まれた古いバンドルを再生している可能性があります（Metro より先にアプリを起動した場合など）。Metro のログに `Android Bundled ...` / `iOS Bundled ...` が出ているかを確認し、出ていなければ `make reconnect-native` で繋ぎ直してください。iOS はアプリが起動していないと確認ダイアログが出るので「開く」をタップします。

### Web版

`http://localhost:8081` でアクセスしてください。`expo-sqlite` の Web 実装（OPFS）は secure context（`localhost` または HTTPS）でのみ動作するため、LAN の IP アドレス経由では記録が保存できません。

その他の主なコマンド:

```bash
make down-web          # up-webで起動したWebコンテナの停止
make up-db             # Supabaseローカル環境の起動
make down-db           # Supabaseローカル環境の停止
make migrate-db-local  # Postgres側マイグレーションをローカル環境へ適用
make migrate-db        # Postgres側マイグレーションをリンク済みリモートへ適用
make lint              # ESLint
make typecheck         # 型チェック（tsc --noEmit）
```

ローカルDBのスキーマ（`src/lib/db/schema.ts`）を変更した場合は、`npx drizzle-kit generate` でマイグレーションを生成してください。データ投入など手書きのSQLが必要なときは `npx drizzle-kit generate --custom --name=<name>` を使います（列のリネームは drizzle-kit が対話プロンプトを出すため、非対話のシェルからは実行できません。詳細は [`CLAUDE.md`](./CLAUDE.md)）。Supabase側のスキーマ・RLSポリシーは `supabase/migrations/` に追加し、ローカル環境へは `make migrate-db-local` で適用します。`make migrate-db`（`supabase db push`）はリンク済みのリモートプロジェクト向けで、ローカルには効きません。

なお、アプリからのDBアクセスは drizzle のクエリビルダではなく `src/lib/db/repositories/` の生SQL（expo-sqlite の非同期API）で行います。理由は [`CLAUDE.md`](./CLAUDE.md) の「ローカルDBアクセス方針」を参照してください。

開発ルールや設計方針の詳細は [`CLAUDE.md`](./CLAUDE.md) を参照してください。
