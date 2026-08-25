# セッションサマリー: Phase 1（クイック記録＋ローカル保存）の実装とコードレビュー対応

- 日時: 2026-08-25 10:42
- プロジェクト: headaches-log（頭痛ログ）

## 目的

`docs/docs-md-glistening-mountain.md` の実装計画に沿って Phase 1「クイック記録＋ローカル保存（認証・同期なし）」を実装し、「オフラインで頭痛記録を作成し、一覧で確認できる」状態にする。あわせて `/code-review` による指摘の対応までを行う。

## 実施内容

### 計画フェーズ

- Explore エージェントでコードベースの現状を調査（`src/app/` はExpoテンプレートのまま、`PainFaceIcon` もローカルDBも未使用、`useDbMigrations()` が `_layout.tsx` から未呼び出しでマイグレーション実行経路が存在しない状態）
- Phase 0.6 で作成した Figma モックアップを参照しようとしたが、Figma MCP が Starter プランのツール呼び出し上限に達しており取得不可
- Plan エージェントで実装設計を作成し、ユーザーと以下を合意（詳細は `/Users/meayu/.claude/plans/docs-docs-md-glistening-mountain-md-pha-tingly-wind.md`）
  - Figma は参照せず、要件定義とデザイントークンのみを根拠にレイアウトを組む
  - スタイリングは NativeWind に統一（テンプレート由来の `ThemedText`/`ThemedView` は削除）
  - 詳細入力は「頭痛の種類・メモ・発生時刻」まで（タグは Phase 3）
  - タブバーは廃止し `<Stack>` 1画面構成に
  - 顔アイコンのタップは選択のみ。保存は必ず「記録する」ボタン

### 実装フェーズ

**基盤配線**
- `metro.config.js` — `resolver.sourceExts` に `sql`、`assetExts` に `wasm` を追加
- `babel.config.js` — `babel-plugin-inline-import`（`.sql` を文字列としてバンドルに取り込む）を追加
- `app.json` — expo-router プラグインに COOP/COEP ヘッダー（`credentialless` / `same-origin`）を設定
- Web で `crossOriginIsolated === true` を確認してから先へ進んだ

**データ層**
- `src/lib/db/client.ts` — トップレベル await を廃止。最終的に `openDatabaseAsync` による遅延初期化（`initDb()` / `getDb()`）に
- `src/lib/db/migrate.ts` — drizzle の `useMigrations` を廃し、`migrations/` を適用する自前ランナー `runMigrations()` を実装（適用済みは独自の `__migrations` テーブルで管理、`--> statement-breakpoint` で分割）
- `src/lib/db/bootstrap.ts`（新規） — DB初期化→マイグレーション→ローカルuser_id初期化を Promise ごとキャッシュして1回だけ実行する `bootstrapDb()`
- `src/lib/db/db-revision.ts`（新規） — `useSyncExternalStore` ベースの書き込み通知（`bumpDbRevision()` / `useDbRevision()`）
- `src/lib/db/repositories/`（新規） — `types.ts` / `headaches.ts` / `headache-types.ts` / `sync-meta.ts` / `local-user.ts`。生SQLをここに閉じ込め、全関数が `Promise` を返す
- `src/lib/db/migrations/0001_seed_headache_types.sql`（新規） — 頭痛の種類マスタを **id 明示**でシード（Supabase 側の serial 採番 1〜4 と一致させるため）
- `src/hooks/` — `async-state.ts` / `use-recent-headaches.ts` / `use-headache-types.ts`（新規）

**デザイントークン統合**
- `src/constants/design-tokens.json`（新規） — 色・スペーシングの唯一の出所
- `src/constants/theme.ts` — JSON からの再エクスポート層に変更
- `tailwind.config.js` — JSON を require して `colors` / `spacing` に展開（`fg` / `bg` / `surface` / `accent` / `pain-1..4` と各 dark バリアント）
- `src/hooks/use-pain-color.ts`（新規） — アイコンの `color` prop は className で制御できないための例外

**UI**
- `src/app/index.tsx` — ホーム画面を全面的に実装
- `src/app/_layout.tsx` — `<SplashGate>` + `<Stack screenOptions={{ headerShown: false }} />` に
- 新規コンポーネント: `splash-gate.tsx` / `pain-level-selector.tsx` / `headache-detail-form.tsx` / `headache-type-chips.tsx` / `date-time-field.tsx` / `date-time-field.web.tsx` / `recent-headache-list.tsx` / `toast-banner.tsx`
- `src/constants/pain-levels.ts` / `src/lib/format-date.ts`（新規）
- `src/components/pain-face-icon.tsx` — `usePainColor` 利用にリファクタ
- テンプレート由来の13ファイルを削除（`src/app/explore.tsx`、`themed-text.tsx`、`themed-view.tsx`、`app-tabs.tsx`、`app-tabs.web.tsx`、`animated-icon.*`、`hint-row.tsx`、`web-badge.tsx`、`external-link.tsx`、`ui/collapsible.tsx`、`hooks/use-theme.ts`）
- `@react-native-community/datetimepicker` 9.1.0 を追加（Web は `<input type="datetime-local">` で分岐）

### コードレビューと修正

`/code-review` を実行し8件の指摘を受領。ユーザーの指示に基づき 1・4・5・6・7 を修正した。

- **指摘1（high）** `src/app/index.tsx` — 詳細パネルを閉じてから記録すると種類・発生時刻が捨てられていた（`memo` だけ無条件保存で挙動も非対称）。保存時に `detailOpen` で分岐するのをやめ、state の値をそのまま使うよう修正
- **指摘4（medium）** `src/lib/db/client.ts` — `initDb` に in-flight Promise のキャッシュを追加。さらに `runMigrations` / `initLocalUserId` の並行実行も防ぐため `bootstrap.ts` を新設して起動処理全体を1本の Promise に集約
- **指摘5（low）** `src/app/index.tsx` — `setDetailOpen` の updater 内から `setOccurredAt` を外に出し、updater を純粋関数に
- **指摘6（low）** `src/components/toast-banner.tsx` — props を `message` から `toast: { id, message }` に変更し、effect の依存を `id` に。同じ文言の連続保存でもタイマーが再開されるように
- **指摘7（low）** — `design-tokens.json` に `danger: "#DC2626"`（Tailwind red-600）を light/dark 両方へ追加、`tailwind.config.js` に展開し、`src/app/index.tsx` のエラー表示2箇所を `text-pain-3` から `text-danger` に置き換え

### painColors 変更の検証

ユーザーが `design-tokens.json` の `painColors` を青系（`#93C5FD` / `#60A5FA` / `#818CF8` / `#6366F1`、light/dark 同値）に変更したため、コントラスト比を実測して報告した。

- カード背景（light `#F0F0F3`）に対して 1.59 / 2.24 / 2.62 / 3.93:1 で、段階4以外が WCAG 1.4.11（非テキスト 3:1）未達
- ダーク（`#212225`）に対しては 8.82 / 6.26 / 5.33 / 3.56:1 で全段階が基準を満たす
- `src/constants/theme.ts` の `PainColors` のコメントが「単一色相(赤系)」のまま古くなっている点、Phase 0.6 で accent をティールにした根拠（「痛みの赤系スケールと衝突しない寒色」）が成立しなくなった点も報告
- 配色そのものはユーザーの判断で現状維持

### アイコンの塗りつぶし対応

痛み度合いアイコンを塗りつぶし（Solid）にする要望に対し、最初 `iconStyle="solid"` を指定したが**実行時に無視されていた**。DOM の computed style を確認して原因を特定し、`solid` ブール値 prop に修正した。

- `iconStyle="solid"` → `FontAwesome6Free-Regular`（線画のまま）
- `solid` → `FontAwesome6Free-Solid`（塗りつぶし）
- `@expo/vector-icons` の FontAwesome6 は props 型が緩く `iconStyle` でも型チェックを通ってしまうため、`src/components/pain-face-icon.tsx` に注意コメントを残した

### ドキュメント更新

- `CLAUDE.md` — 実装状況、技術スタックの drizzle の位置づけ、「ローカルDBアクセス方針（重要）」セクションの新設、`src/lib/db/` の各ファイル説明、Docker/localhost 制約、`design-tokens.json` の説明を追記・更新
- `README.md` — 実装状況、drizzle の役割、localhost でアクセスする必要がある旨、`drizzle-kit generate --custom`、リポジトリ層の方針を追記・更新
- `src/lib/db/schema.ts` — 「このファイルはマイグレーション生成用でクエリには使わない」旨のコメントを追記

## 主な決定事項

### drizzle のクエリビルダを使わず、全環境で expo-sqlite の非同期API＋生SQLに統一

実装途中、Web で「保存はできるのに一覧が空」という現象が発生。調査の結果、以下が判明した。

- `drizzle-orm/expo-sqlite` ドライバは `prepareSync` / `executeSync` / `getAllSync` という**同期APIしか呼ばない**実装（非同期版が存在せず、`await db.select()` と書いても同期実行される）
- expo-sqlite の Web 実装（wa-sqlite + OPFS）の同期APIは SharedArrayBuffer 経由で結果を受け渡すため、**複数行の結果で JSON が壊れて例外になる**（1行なら通るので発覚しにくい）
- 同じクエリでも非同期API（`getAllAsync` 等）は日本語・複数行とも正常に動作することをブラウザ上で実測確認

ユーザーと相談のうえ「全環境で非同期API＋生SQL」を採用。drizzle は `schema.ts` の定義と `drizzle-kit generate` によるSQL生成のためだけに残し、マイグレーション適用も自前ランナーに置き換えた。この経緯は `CLAUDE.md` に記録済み。

### その他

- **TanStack Query は Phase 1 では導入しない** — 扱うのがローカルSQLiteの読み出しのみでキャッシュ・リトライの価値が効かないため。`useSyncExternalStore` ベースの `db-revision.ts` で足りる。Phase 4（Supabase同期）で導入する際、リポジトリ層が全て `Promise` を返す設計なのでそのまま `queryFn` に使える
- **`useLiveQuery`（drizzle）は不採用** — Web の `addDatabaseChangeListener` 非対応リスクのため
- **user_id は `sync_meta.local_user_id` に UUID で保持** — Phase 4 で Supabase 匿名認証の `auth.uid()` へ `UPDATE ... SET user_id = :authUid, _dirty = 1` で一括移行する前提。UUID 形式にしているのは Supabase 側が `uuid` 型のため
- **`created_at` / `updated_at` はリポジトリが明示的に ISO8601 で入れる** — SQLite の `default (current_timestamp)` は `YYYY-MM-DD HH:MM:SS` 形式で `occurred_at` と書式が混ざり、Phase 4 の LWW（文字列比較）で事故になるため
- **日時ピッカーはプラットフォーム分割の自作** — SDK 57 で iOS/Android/Web の3ターゲットに対応するライブラリが存在しないため（`@react-native-community/datetimepicker` は Web 非対応、`@expo/ui` の Universal コンポーネントにも日時ピッカーなし）
- **ダークモードは NativeWind の `dark:`（`prefers-color-scheme`）に寄せる** — Web で `use-color-scheme.web.ts` がハイドレーション前に `'light'` を返す問題（色のちらつき）を構造的に回避できるため

## 未完了・残タスク

- **コードレビュー指摘2（high）** `src/components/date-time-field.tsx` — iOS の `mode="datetime"` は値が変わるたびに `onChange` が発火するため、最初の発火で `setMode(null)` してアンマウントする現在の実装だと日付ホイールを1目盛り動かした時点で閉じ、時刻を合わせられない
- **コードレビュー指摘3（medium）** 同ファイル — Android の2段階ピッカーで、同一インスタンスの `mode` prop だけを変えても時刻ダイアログが再オープンしない可能性がある（`DateTimePickerAndroid.open()` の命令型APIか `key` によるアンマウントが必要）。要実機確認
- **コードレビュー指摘8（low）** 同ファイル — Android の time ピッカーは `maximumDate` を無視するため未来時刻を確定でき、Web版（`max` 属性）と挙動が不一致
- 2・3・8 はいずれもユーザーの判断で「実機テストができる時に着手」として保留
- **painColors の配色検討** — 青系のままライトモードの段階1〜3を濃いめに振り直すか等。あわせて `src/constants/theme.ts` の `PainColors` のコメント（「赤系」のまま）の修正が必要
- **ネイティブ（iOS/Android）での動作確認** — EAS dev client のビルドが必要なため未実施
- Phase 2 以降（カレンダー表示、タグ管理、オフライン同期エンジン `lib/sync/engine.ts`、認証、CSV出力、グラフ表示）は未着手
- テスト基盤（Jest等）は未導入

## 動作確認の状況

- `npx tsc --noEmit` / `npx expo lint`: いずれもエラーなし（各修正のたびに実行）
- Web（`localhost:8081` / 検証時は 8082）で Playwright を使い、以下を実測確認
  - `crossOriginIsolated === true` / `SharedArrayBuffer` 利用可
  - 初回起動でマイグレーションが適用され、ホーム画面が表示される
  - 痛み度合い選択 →「記録する」→ 一覧に即反映、トースト表示
  - 詳細入力（種類2つ・メモ・発生時刻1時間前）が正しく保存・表示される
  - リロード後もデータが残る（OPFS への永続化）
  - **オフライン（`setOffline(true)`）でも記録の作成・一覧表示ができる** ← Phase 1 の完了条件
  - オンライン復帰＋リロード後もデータが保持される
  - ダークモードで配色が追随する
  - キャッシュを消したクリーンビルドでコンソールエラー 0
- 修正後の再検証
  - 指摘1: 詳細を閉じてから記録しても種類・メモ・発生時刻（2時間前）が保存されることを確認
  - 指摘6: 2秒後に再保存 → その2秒後もトーストが残り、さらに1.5秒後に消える（＝2回目の保存から3秒）ことを確認
  - 指摘7: コンパイル後のCSSが `.text-danger { color: rgb(220 38 38) }` になっていることを確認
  - アイコン: DOM の computed style が `FontAwesome6Free-Solid` になり、塗りつぶし表示になることをスクリーンショットで確認
- 検証中、ポート8081が Docker（`make build`）に使用されていたため、確認用サーバーは8082で起動し終了後に停止した（8081のDockerコンテナは操作していない）
