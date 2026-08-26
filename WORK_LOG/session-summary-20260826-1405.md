# セッションサマリー: iOSビルドの復旧とシミュレータでの動作確認

- 日時: 2026-08-26 14:05
- プロジェクト: headaches-log（頭痛ログ） / `/Users/meayu/development/headaches-log`

## 目的

前セッションから繰り越していた **iOS ビルドの復旧**。ユーザー側で Xcode を 26.6 に更新し、ディスク容量も確保済みの状態からスタートした。ゴールは「iOS Simulator でアプリが起動し、動作確認ができる状態にすること」。

## 実施内容

### 事前調査

- Xcode 26.6（Build 17F113）／Swift 6.3.3／macOS 26.6.2、空き容量 112GB を確認
- `expo-modules-jsi` は npm 上も **57.0.5 のまま**で、Expo 側の修正は出ていないことを確認（`expo` 57.0.15 / `expo-modules-core` 57.0.12）
- `ios/` と `android/` は `.gitignore` 済み（prebuild の生成物）なので、`Podfile` 直接編集では永続化できないことを確認。恒久パッチが必要なら patch-package しか手がない、という前提で計画を立てた

計画は `/Users/meayu/.claude/plans/ios-xcode-26-6-simulator-ok-linear-sedgewick.md` に保存済み。

### 原因の特定（当初の想定と違った）

前セッションから引き継いだ `RuntimeScheduler.h` の Swift C++ interop エラーは、**Xcode 26.6 で解消していた**（ビルドログ中に `RuntimeScheduler` の出現がゼロ）。patch-package は不要だった。

実際に詰まっていたのは別件で、Xcode 26.6 の **iOS プラットフォーム（SDK 実体とシミュレータランタイム）が未インストール**だった。

```
xcodebuild: error: Unable to find a destination matching the provided destination specifier:
		{ id:6B2ED6A7-... }
	Ineligible destinations for the "headacheslog" scheme:
		{ platform:iOS, ..., error:iOS 26.5 is not installed. }
```

紛らわしい点として、`xcodebuild -showsdks` には iOS 26.5 が並ぶのに `-showdestinations` は空になる。`xcrun simctl list runtimes` 側は iOS 26.2 が Ready だったため、シミュレータの問題にも見えなかった。

### 復旧手順（実行した順）

1. 旧 Xcode 由来の成果物を退避（DerivedData の `headacheslog-*` と `ios/build`）
   - なお `rm -rf` はパーミッション設定で拒否されたため、scratchpad へ `mv` して退避した
2. `xcodebuild -downloadPlatform iOS` — iOS 26.5 Simulator（8.52GB）をダウンロード。これで `-showdestinations` にシミュレータが出るようになった
3. 1回目のビルド → `ReactCodegen` の生成ソース（`ios/build/generated/ios/...`）が無く `Build input file cannot be found` で失敗。手順1で `ios/build` を退避したのが原因
4. `npx pod-install` で codegen を再生成 → **Build Succeeded**、シミュレータへのインストールと起動まで成功
5. 起動ログで **バンドル ID が `com.anonymous.headaches-log` のまま**であることに気づく。`app.json` は `com.meayu.headacheslog` なので、`ios/` が `app.json` 修正前に prebuild された残骸だった
6. `npx expo prebuild --platform ios` で同期 → `PRODUCT_BUNDLE_IDENTIFIER = com.meayu.headacheslog` に修正され、再ビルドも成功
7. 旧バンドル ID のアプリをシミュレータからアンインストール

### 変更したファイル

| ファイル | 内容 |
|---|---|
| `Makefile` | `SIMULATOR ?= iPhone 17 Pro` と `run-ios` ターゲットを追加（`.PHONY` にも追記）。Xcode 更新直後は `xcodebuild -downloadPlatform iOS` が要る旨をコメントで併記 |
| `CLAUDE.md` | 「よく使うコマンド」に `make run-ios` を追加。新規セクション「iOSビルドの注意」で、プラットフォーム未インストール問題の症状と対処、`ios/build/generated/` を消すと codegen が失われる点を記載 |
| `README.md` | 開発コマンド一覧に `make run-ios` を追加、`make run-android` の説明を `run-ios` にも適用するよう修正、iOS ビルドの前提（Xcode／`-downloadPlatform iOS`）の段落を追加 |

ソースコード（`src/` 配下）は一切変更していない。

### README の整合性チェック

上記のとおり、今回の変更（`make run-ios` の追加と iOS ビルドの前提条件）に起因する不足を README に反映した。冒頭の実装状況の記述は機能面の説明であり今回の変更で不正確になっていないため、そのままとした。

### シミュレータ操作環境の整備

シミュレータをタップ操作する手段が無かったため、ユーザーの承諾を得て以下を実施した。

- macOS の「補助アクセス（アクセシビリティ）」を許可（セッション後も許可のまま維持する方針）
- `brew install cliclick` — `osascript` の `click at` が macOS 26 では未実装（エラー -25204）だったため。不要になれば `brew uninstall cliclick` で戻せる

scratchpad に補助スクリプト `tap.sh` / `swipe.sh` / `shot.sh` を用意し、スクリーンショット（1206x2622px）の座標を `System Events` から取得した Simulator ウィンドウのスクリーン座標へ換算してクリックする方式で操作した。

## 主な決定事項

### patch-package は導入しなかった

計画では「Xcode 更新で直らなければ `RuntimeScheduler.h` の `SWIFT_RETURNS_RETAINED` を patch-package で恒久パッチ」としていたが、Xcode 26.6 でエラー自体が消えたため不要と判断し、`package.json` は無変更のままとした。

### バンドル ID の修正を今回のスコープに含めた

「iOS ビルドの復旧」に付随する不整合であり、`ios/` を作り直すだけで直る（コード変更を伴わない）ため、その場で対処した。Android 側は `com.meayu.headacheslog` で正しく、iOS だけが取り残されていた。

## 未完了・残タスク

### 今回のセッションで新たに見つかった iOS 固有の不具合（次回以降の引き継ぎ）

1. **詳細画面の戻るボタンが「(tabs)」と表示される** — Expo Router のルートグループ名が back title にそのまま出ている。Android は矢印のみのため気づかなかった。`src/app/_layout.tsx` の `headaches/[id]` の `options` に `headerBackTitle` を指定すれば直る見込み
2. **日時ピッカーが英語ロケール** — 詳細画面の「変更」で出るピッカーが `Aug 26, 2026` と表示される。`src/components/date-time-field.tsx` の `DateTimePicker` に `locale="ja-JP"` が渡っていない

### 前セッションからの繰り越し

- **コードレビュー指摘2（iOS の日時ピッカー）** — `mode="datetime"` で最初の `onChange` によりピッカーが閉じる問題。今回 iOS 実機（シミュレータ）で確認したところ、コンパクト形式のインラインピッカーとして描画されており**再現しなかった**。修正に着手する前に、まず挙動の再確認が必要
- **指摘4の完全な対処** — アプリをフォアグラウンドで放置したまま日付をまたぐケース。タイマーか focus リスナーが必要
- **指摘5の throw パスの実地検証** — `changes === 0` の経路は UI から到達できないため未確認。Phase 4 で複数 `user_id` が入ってから
- Phase 3 以降（タグ管理、同期エンジン、認証、CSV出力、グラフ）は未着手
- テスト基盤（Jest等）は未導入

## 動作確認の状況

`npx tsc --noEmit` / `npx expo lint` ともエラーなし。`make -n run-ios` でターゲットの展開も確認した。

### iOS Simulator（iPhone 17 Pro / iOS 26.2、ライトモード）

すべてスクリーンショットで確認した。

| 検証項目 | 結果 |
|---|---|
| `npx expo run:ios --device "iPhone 17 Pro"` が Build Succeeded → インストール → 起動 | OK |
| スプラッシュが閉じてホーム画面が描画される（＝`bootstrapDb()` が iOS の expo-sqlite 上で成功） | OK |
| 「かなりつらい」を選択 →「記録する」→ 最近の記録に `8/26 13:57 かなりつらい` が出る | OK |
| カレンダータブ：26日に痛み度合いの色ドット、日別一覧に時刻のみ表示 | OK |
| 日別一覧の項目 → 詳細画面へ遷移し、痛み度合い・発生時刻が入っている | OK |
| 「変更」→ iOS ネイティブ日時ピッカーがインライン表示される | OK（ただしロケールが英語） |
| 「この記録を削除」→ 確認ダイアログ（`Modal`）が表示される | OK |
| 「削除する」→ カレンダーへ戻り、ドットが消え「この日の記録はありません。」になる | OK |

### 未確認

- iOS のダークモード（Web / Android で片方ずつ確認済みのため足りると判断）
- iOS 実機（シミュレータのみ）
