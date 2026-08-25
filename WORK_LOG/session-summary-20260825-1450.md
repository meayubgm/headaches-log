# セッションサマリー: iOS/Android のネイティブ実行環境整備と Android での初動作確認

- 日時: 2026-08-25 14:50
- プロジェクト: headaches-log（頭痛ログ）

## 目的

Android 実機テストの手順を確認し、iOS が Simulator で動作確認可能かを明らかにする。あわせて、必要な環境構築を実際に行ってネイティブでの動作確認まで到達する。

## 実施内容

### 環境調査

ローカルのツールチェーンを実測して、何が揃っていて何が足りないかを確認した。

| 項目 | 調査結果 |
|---|---|
| Xcode | 26.3（Build 17C529）、iOS 26.2 / 18.4 のシミュレータあり |
| CocoaPods | rbenv 経由で導入済み |
| Android SDK | `~/Library/Android/sdk` に存在。ただし `ANDROID_HOME` 未設定、`adb` が PATH 外 |
| Android platforms | android-33/34/35 のみ（Expo SDK 57 が要求する 36 が無い） |
| JDK | PATH 上は Homebrew の openjdk 23（AGP/Gradle は 17 か 21 が必要）。Android Studio 同梱の JDK 21 は存在 |
| AVD | `Pixel_9` / `Medium_Phone_API_36` |
| eas-cli | 未インストール |
| `ios/` `android/` | 未生成（CNG 構成） |

結論として、**EAS Build を使わずローカルビルド（`npx expo run:ios` / `npx expo run:android`）で両プラットフォームの動作確認が可能**であり、iOS は Simulator で確認できると判断した。

### 環境構築

- `~/.zshrc` に環境変数を追記（バックアップ `~/.zshrc.bak.20260825` を作成）
  - `ANDROID_HOME`、`PATH` に `platform-tools` / `emulator` / `cmdline-tools/latest/bin`
  - `JAVA_HOME` に Android Studio 同梱の JDK 21
- `npx expo install expo-dev-client` — `package.json` に `~57.0.15` を追加
- `sdkmanager "platforms;android-36"` — インストール完了
- `sdkmanager "ndk;27.1.12297006"` — 1回目・2回目は失敗、3回目で成功（詳細は後述）

### bundleIdentifier の変更

prebuild が自動生成した `com.anonymous.*` から独自のドメイン形式に変更した。

- `app.json` の `ios.bundleIdentifier`: `com.anonymous.headaches-log` → `com.meayu.headacheslog`
- `app.json` の `android.package`: `com.anonymous.headacheslog` → `com.meayu.headacheslog`

iOS 側がハイフン入り、Android 側がハイフン無しで不揃いだったため、両方 `headacheslog` に揃えた。`npx expo prebuild --clean -p android` で `android/` を再生成し、`android/app/build.gradle` の `namespace` / `applicationId` が新しい値になっていることを確認した。

### iOS ビルド（失敗・保留）

`npx expo run:ios --device "iPhone 17 Pro"` を実行。prebuild と CocoaPods は通ったが、xcodebuild がエラーコード 65 で失敗した。

```
node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h:53:26
'RuntimeScheduler' cannot be annotated with either SWIFT_RETURNS_RETAINED or
SWIFT_RETURNS_UNRETAINED because it is not returning a SWIFT_SHARED_REFERENCE type
```

Xcode 26.3 の Swift C++ interop が厳格化され、コンストラクタに付いた `SWIFT_RETURNS_RETAINED` が2箇所（53行目・61行目）でエラーになる。

調査した結果:

- インストール済みの `expo-modules-jsi` は 57.0.5 で、これが npm 上の最新
- `expo` を 57.0.16（最新）に上げても、`expo-modules-core@57.0.13` が引く `expo-modules-jsi` は同じ `~57.0.5` のため解消しない
- 同一エラーの既知報告は Web 検索では見つからなかった
- ローカルに Xcode は 26.3 の1つのみ

対応方針を「node_modules のヘッダを一時パッチ」「Xcode を 26.4 に更新」「iOS 保留で Android を先行」の3択で確認し、**iOS 保留**を選択した。

### Android ビルド（成功）

複数回の失敗を経て成功した。

1回目 — ディスク容量不足。NDK 27.1.12297006 のインストールが `No space left on device` で失敗し、空ディレクトリだけが残った状態で Gradle デーモンも巻き添えでクラッシュした。

2回目（NDK 単独インストール）— 展開 55% の `python3-intel64` で失敗。

3回目（NDK 単独インストール）— 成功（2.5GB）。1回目・2回目とも実質的な原因は容量不足だった。

4回目（ビルド）— `--device emulator-5554` の指定誤り。このオプションは AVD 名を期待するため、adb のシリアルでは `Could not find device with name` になる。

5回目（ビルド）— **成功**。`BUILD SUCCESSFUL in 8m 56s`、APK をエミュレータ Pixel_9 にインストール。

その後の動作確認:

- `adb reverse tcp:8081 tcp:8081` を設定し `npx expo start --dev-client --port 8081` で Metro を起動
- dev client を deep link で起動し、`Android Bundled 15095ms node_modules/expo-router/entry.js (1884 modules)` を確認
- ホーム画面が正常に描画されることをスクリーンショットで確認
- 「軽い」を選択して「記録する」をタップ → `最近の記録` に `8/25 14:37 軽い` が追加されることを確認。expo-sqlite への書き込みと `db-revision` 経由の一覧再読み込みがネイティブで動作している

### ディスク容量の整理

一連のビルドで空き容量が 14GB → 8.6GB（使用率98%）まで低下したため、承認を得て整理した。

- Gradle デーモン（PID 42430）と Kotlin コンパイルデーモン（PID 42742）を停止。いずれも今回のビルドが起動したもので、アイドル状態でメモリを保持し続けていた
- `sdkmanager --uninstall "ndk;26.3.11579264" "ndk;27.0.12077973"` で旧 NDK 2つを削除（計 5.4GB）
- `~/.gradle`（4.8GB）は `rm -rf` が権限設定でブロックされたため、ユーザーがプロンプトから直接実行した

結果、空き容量は **23GB（使用率95%）** に回復。Android SDK 全体も 13GB → 7.3GB になった。

### README の更新

`README.md` 18行目の「ネイティブ実行には `expo-dev-client` + EAS Build が必要です。」という記述が、今回ローカルビルドで動作確認できたことにより不正確になったため修正した。

修正後: 「ネイティブ実行には `expo-dev-client` を含む開発ビルドが必要です。開発ビルドはローカルビルド（`npx expo run:android` / `npx expo run:ios`）でも EAS Build でも作成できます。」

### Makefile へのネイティブ環境ターゲット追加（サマリー作成後の追加作業）

ネイティブ確認環境の起動・終了を Makefile に集約した。

- 冒頭に設定変数を追加（`ANDROID_HOME` / `ADB` / `EMULATOR` / `AVD ?= Pixel_9` / `METRO_PORT ?= 8081`）。`AVD=<名前>` や `METRO_PORT=<番号>` で上書きできる
- `dev-native` を **`up-native`** にリネームし、`adb reverse` を先に実行するようにした（端末未接続時に失敗しても無視するよう行頭に `-` を付けている）
- `emu-up` を追加 — Androidエミュレータをバックグラウンド起動
- `down-native` を追加 — Metro停止（`pkill -f "expo start --dev-client"`）+ `adb reverse --remove` + 接続中の全エミュレータへ `emu kill`
- `.PHONY` を更新
- `README.md` と `CLAUDE.md` のコマンド一覧も新しいターゲット名に更新

`make down-native` を実際に実行し、エミュレータの終了（`adb devices` が空）と Metro の停止を確認済み。

## 主な決定事項

### ネイティブ実行はローカルビルドで行う

`expo run:*` はローカルでネイティブビルドして dev client 相当のアプリを端末に入れる方式のため、EAS アカウントもクラウドビルドも不要。CLAUDE.md および README の「EAS Build が前提」という記述は、クラウドビルドしか手段がないという意味ではなく Expo Go では不可という意味だと整理した。

### JDK は PATH ではなく JAVA_HOME だけで切り替える

`PATH` 上の Homebrew openjdk 23 はそのままにし、`JAVA_HOME` にのみ Android Studio 同梱の JDK 21 を設定した。Gradle/AGP は `JAVA_HOME` を優先して参照するため、Android ビルドだけが JDK 21 を使い、他プロジェクトでの `java` コマンドの挙動は変わらない。

### iOS は Expo の対応を待つ

Xcode 26.3 と `expo-modules-jsi@57.0.5` の非互換は、パッケージ更新では解消しない。node_modules へのパッチ適用や Xcode 26.4 への更新という手段はあるが、いずれも確実性やコストに難があるため、Android を先行させる判断をした。

## 未完了・残タスク

- **iOS Simulator での動作確認** — 上記の `RuntimeScheduler.h` の問題により未達。再開時の選択肢は「`SWIFT_RETURNS_RETAINED` を外すパッチを当てる（patch-package で永続化）」「Xcode を 26.4 に更新する」「Expo の修正版を待つ」の3つ
- **`src/components/date-time-field.tsx` のコードレビュー指摘2・3・8** — iOS の `mode="datetime"` で最初の `onChange` でピッカーが閉じる問題、Android の2段階ピッカーの再オープン、Android time ピッカーが `maximumDate` を無視する問題。Android 環境が整ったため検証可能になったが、別セッションで扱う方針
- **Android 実機での確認** — 今回はエミュレータ（Pixel_9）のみ。実機は USB デバッグを有効にして接続し `adb devices` で認識させたうえで `npx expo run:android` を実行すればよい
- **次回 Android ビルド時の再ダウンロード** — `~/.gradle` を削除したため、次の1回だけ Gradle 9.3.1 と依存関係の再取得が発生する
- Phase 2 以降（カレンダー表示、タグ管理、同期エンジン、認証、CSV出力、グラフ）は未着手
- テスト基盤（Jest等）は未導入

## 動作確認の状況

- **Android エミュレータ（Pixel_9）で実アプリの動作を確認** — ホーム画面の描画、痛み度合いの選択、「記録する」による保存、`最近の記録` への反映までスクリーンショットで確認済み
- `app.json` の変更は `node -e "JSON.parse(...)"` でパース可能なことを確認
- `android/app/build.gradle` の `namespace` / `applicationId` が `com.meayu.headacheslog` になっていることを grep で確認
- 旧 NDK 削除後に `ndk/` に残るのが `27.1.12297006` のみであること、`~/.gradle` が存在しないこと、空き容量 23GB を `df` で確認
- iOS ビルドは失敗のため未確認
- README の修正は文言のみでコードを伴わないため lint/typecheck は再実行していない
