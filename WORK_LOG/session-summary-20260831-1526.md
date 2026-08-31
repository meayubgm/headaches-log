# セッションサマリー: ストア登録手続きの相談と、アプリの日英対応

- 日時: 2026-08-31 15:26
- プロジェクト: headaches-log（頭痛ログ） / `/Users/meayu/development/headaches-log`

## 目的

1. Google Play Console / Apple Developer Program の登録手続きを進めるにあたっての判断（配信種別・アカウント名義・本人確認）を整理する
2. クローズドテストのテスター12人をどう集めるかを決める
3. その流れで決まった「アプリの英語対応」を実装し、ドキュメントに反映する

## 実施内容

### 1. ストア登録の相談（コード変更なし）

Google Play Console の登録を進めるうえでの選択について、公式ドキュメント等を確認しながら判断した。

- **配信の種類はフル配信**（$25・本人確認あり・Play で一般公開可）。無料の「限定配信」はインストール20台までで一般公開できないため不可。フル配信→限定配信への変更はできない（逆は可）
- **アカウント名は `yuhamgmg`**、Google アカウントは `yuhamgmg.design@gmail.com`（git のコミット用 `meayubgm@gmail.com` とは別）
- 住所・氏名は Google の照合が通らなかったため、**マイナンバーカードの表記どおり日本語で入力**して提出。2026-08-31 にレビュー待ちの状態になった
- **Apple Developer Program は個人（Individual）で登録**。Web からの申し込みは完了し、本人確認をマイナンバーカードで進行中
- テスター12人を自作の Google アカウントで賄う案は、ポリシー違反かつ検知されうる（同一端末/IPでの一括作成、利用実態のなさ、製品版アクセス申請でのフィードバック記述）ため見送り。**知人・家族＋ SwapTest（開発者同士の相互テスト）の併用**とし、15〜18人に膨らませる方針にした

### 2. アプリの日英対応（Phase 2.5）

「海外のテスターからも意味のあるフィードバックを得たい」「市場を日本語圏に限定しない」という理由から、テストのついでではなく独立した価値のある作業として実施した。

**方針（実装前に合意）**

- 端末の言語に追従するだけ。**アプリ内の言語切り替えUIは持たない**
- 日付フォーマットは `Intl` ではなく **ja/en の手書き実装**

**追加ファイル**

- `src/lib/i18n/index.ts` — 端末言語を起動時に一度だけ解決し、型付きキーの `t()` を公開。未対応言語と辞書の欠落は英語へフォールバック
- `src/lib/i18n/locales/ja.ts` — 辞書（型の基準。`Translations` 型をエクスポート）
- `src/lib/i18n/locales/en.ts` — 辞書（`Translations` 型を課しているのでキーの取りこぼしは型エラー）
- `src/constants/headache-types.ts` — 頭痛の種類コード（`migraine` / `tension` / `other`）と表示名の解決
- `src/lib/db/repositories/errors.ts` — `HeadacheNotFoundError`（リポジトリ層のドメインエラー）
- `src/lib/db/migrations/0003_rename_headache_type_name_to_code.sql` — ローカルSQLite側のマイグレーション
- `src/lib/db/migrations/meta/0003_snapshot.json` — 同スナップショット（手書き）
- `supabase/migrations/20260831000000_rename_headache_type_name_to_code.sql` — Supabase側のマイグレーション

**変更ファイル（主なもの）**

- `package.json` / `app.json` — `expo-localization` + `i18n-js` の追加（config plugin も自動追加）
- `src/lib/db/schema.ts` — `headache_types.name` → `code`
- `src/lib/db/migrations/meta/_journal.json` / `migrations.js` — 0003 の登録
- `src/lib/db/repositories/types.ts` / `headache-types.ts` — `HeadacheType` から表示名を外し `code` に。未知のコードは例外
- `src/constants/pain-levels.ts` — `PAIN_LEVEL_LABELS`（定数）を `painLevelLabel()`（関数）へ
- `src/lib/format-date.ts` — ja/en のロケール分岐。`formatMonthDay()` を追加
- `src/lib/format-error.ts` — `HeadacheNotFoundError` を型で判別して `t()` から文言を引く
- 画面: `src/app/_layout.tsx` / `(tabs)/_layout.tsx` / `(tabs)/index.tsx` / `(tabs)/calendar.tsx` / `headaches/new.tsx` / `headaches/[id].tsx`
- コンポーネント: `confirm-dialog.tsx` / `date-time-field.tsx` / `date-time-wheel.tsx` / `detail-toggle.tsx` / `headache-detail-form.tsx` / `headache-list.tsx` / `headache-type-chips.tsx` / `month-calendar.tsx` / `pain-level-selector.tsx` / `splash-gate.tsx` / `wheel-picker-column.tsx`

### 3. `/code-review`（high）の指摘対応

3件の指摘をすべて実コードで検証し、いずれも実在の問題と判断して対応した。

- **① 内部エラー文言が日本語のまま英語UIに混入** — 性質で分けて対応（下記「主な決定事項」参照）。`src/lib/db/repositories/headaches.ts`（3箇所）を `HeadacheNotFoundError` に置き換え、`headaches.ts` の pain_level 検証・`headache-types.ts` / `client.ts` / `repositories/local-user.ts` / `migrate.ts` の各例外文言を英語化
- **② `make migrate-db` がローカルに効かない** — セッション中の調査で判明した事実をドキュメント本文にだけ書いたため、コマンド表・Makefile と矛盾していた。`Makefile` に `migrate-db-local`（`supabase migration up --local`）を追加し、`.PHONY` と README/CLAUDE.md も揃えた
- **③ 英語の日付読み上げが曖昧** — `calendar.dayA11y` が英語では `Aug 24 3 headache(s)...` と区切り無しで連結されるため、英語辞書側だけ `'%{date}, %{summary}'` に変更

なお指摘①のパス記載 `src/lib/db/local-user.ts` は実際には `src/lib/db/repositories/local-user.ts`（指摘の内容自体は有効）。

### 4. ドキュメント更新

- `CLAUDE.md` — 対応言語、技術スタックへの `expo-localization` / `i18n-js`、`src/lib/i18n/` と表示名解決層、`format-date.ts` のロケール分岐、`format-error.ts` のエラー文言方針、`repositories/errors.ts`、`headache_types.code`、drizzle-kit の列リネーム手順、Supabase マイグレーションの適用先別コマンド
- `README.md` — 対応言語、技術スタック、実装状況の一文、コマンド表（`migrate-db-local` の追加と整形）、drizzle-kit の列リネームの注意
- `docs/頭痛ログ_要件定義.md` — 「2-7. 表示言語」を新設。データモデルの `headache_types` を `name` → `code`、群発削除による id=3 欠番を明記
- `docs/docs-md-glistening-mountain.md` — 技術選定表に多言語化の行、「Phase 2.5: 日英対応」、ファイル構成を現状に合わせて更新（`headaches/new.tsx`・ホイール3点・`i18n/` が抜けていた）
- `docs/ストアリリース準備チェックリスト.md` — 配信種別・登録名義・本人確認まわりの決定、テスター確保を独立項目に分離、**Phase 4.5「ストア掲載情報（日本語＋英語）」を新設**、プライバシーポリシーと免責の英語版、アカウント登録状況の更新

## 主な決定事項

### 表示言語は端末追従のみ、切り替えUIは持たない

設定画面がまだ存在せず、端末追従で用が足りるため。この前提により表示言語が実行中に変わらないので、`t()` をフックではなく素の関数として使え、`format-date.ts` も起動時に決まったロケールで分岐できる。

### DBに表示言語を持たせない（`headache_types.name` → `code`）

`migraine` / `tension` / `other` という言語非依存のコードだけを保存し、表示名は `src/constants/headache-types.ts` が `t()` から解決する。Supabase同期で端末やアカウントをまたいでも記録の意味が変わらないようにするため。ローカル（0003）と Supabase（20260831000000）の両方にマイグレーションを用意した。

### 日付フォーマットは辞書ではなくロケール別の実装

語順が言語で異なり `%{}` の差し込みでは表現できないため。時刻は日時ホイールの列（00〜23）と揃えるため英語でも24時間表記にした。

### エラー文言は「ユーザーが踏みうるもの」と「バグでしか出ないもの」で分ける

- ユーザーが通常操作で踏みうるもの（記録が見つからない）は `repositories/errors.ts` の型付きエラーにし、`formatError` が型で判別して `t()` から日本語／英語を引く。リポジトリ層に表示言語を持ち込まないため
- バグでしか起きない不変条件違反（不正な値、初期化順の誤り、マイグレーションSQLの欠落）は英語の診断メッセージをそのまま投げる。開発者向けであり、ログや issue で扱いやすいため

`Error` のサブクラスはトランスパイル環境でプロトタイプ鎖が切れて `instanceof` が効かなくなることがあるため、コンストラクタで `Object.setPrototypeOf` を呼んでいる。

### drizzle-kit の列リネームは手書きで対応

drizzle-kit は「列を作り直したのか名前を変えたのか」を TTY で問い合わせるため、非対話シェルからは `Interactive prompts require a TTY terminal` で失敗する。`script` 経由の pty でも応答できなかったため、`.sql` と `meta/_journal.json` / `meta/0003_snapshot.json` を手書きした（スナップショットの `_meta.columns` にリネームを記録し、次回の `drizzle-kit generate` が壊れないようにした）。

### Supabase のマイグレーション適用はローカルとリモートでコマンドが違う

`supabase start` は既存ボリュームから復元するだけで、あとから追加したマイグレーションは自動では流れない。ローカルは `supabase migration up --local`、`supabase db push` はリンク済みのリモートプロジェクト向け。

### クローズドテストのテスターは知人枠と SwapTest の併用

自作アカウントはポリシー違反かつ検知されうる（アカウント停止は同一人物の再登録禁止を伴う）。SwapTest は実在の開発者による実機での相互交換なので性質が異なるが、「12人が入れただけで操作されず却下された」事例があるため、フィードバックの材料になる知人枠（4〜6人）と併用し、離脱に備えて15〜18人に膨らませる。

## 未完了・残タスク

### 今回の作業に関するもの

- **iOS / Android 実機・シミュレータでの日英表示の確認**（今回は Web のみ。`expo-localization` はネイティブモジュールなので、`make run-ios` / `make run-android` で開発ビルドの再作成が必要）
- **本番 Supabase への `20260831000000_rename_headache_type_name_to_code.sql` の適用**（ローカル環境には適用済み。本番プロジェクトは未作成）

### ストアリリース関連（`docs/ストアリリース準備チェックリスト.md` を参照）

- Google Play の本人確認レビュー結果の受領、Apple の本人確認完了
- クローズドテストのテスター12人（実質15〜18人）の確保
- ストア掲載情報の日英両方の用意（Phase 4.5）
- 個人名義のため、App Store には本名が、Google Play には住所（課金アプリの場合）が公開される。バーチャルオフィス等に切り替えるなら課金アプリ公開前に判断が必要
- アプリ名の重複確認（日本語名・英語名の両方）
- ホーム画面のアプリ名を英語端末で英語にするかの判断（`expo.name` だけでは足りず config plugin が要る）

### 前セッションから継続

- iOS / Android でのホイール操作の実地確認
- static ビルドの hydration mismatch（`src/lib/today.ts`）
- Phase 3 以降（タグ管理・同期エンジン・認証・CSV出力・グラフ）
- テスト基盤（Jest等）の未導入

## 動作確認の状況

| 検証項目 | 結果 |
|---|---|
| `npx tsc --noEmit` / `npx expo lint` | OK（最終状態でクリーン） |
| `npx expo export --platform web` | OK（8ルート生成。確認後 `dist/` は削除） |
| 辞書キーの日英一致 | OK（70 / 70、差分なし） |
| Web: 日本語表示（全画面・日時ホイール・カレンダー・削除確認ダイアログ） | OK |
| Web: 英語表示（`resolveLocale` を一時的に `en` 固定して検証。検証後に撤去） | OK |
| Web: 記録の作成 → 一覧 → カレンダー反映 → 詳細 → 編集 → 削除 | OK（検証用の記録は削除済み） |
| Web: 390px 幅での英語レイアウト | OK（チップと時刻ショートカットが折り返す。横スクロールなし） |
| 新規DBへのマイグレーション適用（0000→0003、sqlite3 で実行） | OK（`(1,migraine) (2,tension) (4,other)`、索引 `headache_types_code_unique`） |
| 既存DBの更新（0002 適用済み → 0003） | OK（ブラウザの既存 OPFS で実測） |
| Supabase ローカルへの適用（`supabase migration up --local`） | OK（`code` 列・`headache_types_code_key` を確認。未適用だった `20260827000000` も併せて適用） |
| `HeadacheNotFoundError` の `instanceof` 判定（実バンドル経由） | OK（一時的に `throw` を仕込んで日英とも表示を確認。検証後に撤去） |
| 残存する日本語リテラル | `src/lib/format-date.ts` の `ja` 分岐のみ（意図どおり） |
| アプリ由来のコンソール error / warning | 0件（残る例外はブラウザ拡張のメッセージチャネル由来） |
| `make -n migrate-db-local` | OK（`npx supabase migration up --local` に解決） |
| iOS / Android 実機・シミュレータ | 未実施 |
