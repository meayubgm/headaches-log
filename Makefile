.PHONY: setup up-web down-web run-android run-ios up-emu up-native reconnect-native down-native up-db down-db migrate-db studio-db lint typecheck test

# ネイティブ開発用の設定（環境に合わせて上書き可能）
ANDROID_HOME ?= $(HOME)/Library/Android/sdk
ADB := $(ANDROID_HOME)/platform-tools/adb
EMULATOR := $(ANDROID_HOME)/emulator/emulator
AVD ?= Pixel_9
METRO_PORT ?= 8081
# app.json の expo.scheme。開発サーバーへの繋ぎ直し（reconnect-native）で使う
SCHEME ?= headacheslog
# 実機の場合は DEVICE=<adb で見えるデバイス名> を指定する
DEVICE ?= $(AVD)
# iOSシミュレータ名（xcrun simctl list devices で確認できる）
SIMULATOR ?= iPhone 17 Pro
# Gradle/AGP は JDK 17 か 21 を要求するため、Android Studio 同梱の JDK を既定にする
JAVA_HOME ?= /Applications/Android Studio.app/Contents/jbr/Contents/Home
# Gradle は環境変数の ANDROID_HOME / JAVA_HOME を参照するので子プロセスへ渡す
export ANDROID_HOME
export JAVA_HOME

# 初回セットアップ: 依存関係インストール + .env雛形 + Supabaseローカル環境起動
setup:
	npm install
	[ -f .env ] || cp .env.example .env
	npx supabase start

# Web開発サーバー（docker compose）
up-web:
	docker compose up --build web

# Androidエミュレータをバックグラウンド起動（AVD=<名前> で切り替え）
up-emu:
	$(EMULATOR) -avd $(AVD) > /dev/null 2>&1 &

# Android開発ビルドを作成して端末/エミュレータにインストールする
# 初回と、ネイティブ依存やapp.jsonのネイティブ設定を変えたときに実行する（JS/TSの変更だけなら不要）
run-android:
	npx expo run:android --device "$(DEVICE)"

# iOS開発ビルドを作成してシミュレータにインストールする
# 初回と、ネイティブ依存やapp.jsonのネイティブ設定を変えたときに実行する（JS/TSの変更だけなら不要）
# Xcodeを更新した直後は iOS プラットフォームが未インストールなことがある。
# その場合は `xcodebuild -downloadPlatform iOS` を先に実行する
run-ios:
	npx expo run:ios --device "$(SIMULATOR)"

# iOS/AndroidのMetro起動（ホスト側で実行。開発ビルドを端末に入れてあることが前提）
# adb reverse は端末が繋がっていない場合に失敗するが、動作に影響しないため無視する
up-native:
	-$(ADB) reverse tcp:$(METRO_PORT) tcp:$(METRO_PORT)
	npx expo start --dev-client --port $(METRO_PORT)

# 起動中のアプリを開発サーバーへ繋ぎ直す（Metroは別ターミナルで起動しておくこと）
# Metroより先にアプリを起動した等の理由で開発サーバーに繋がらないと、
# アプリはビルド時にAPK/IPAへ埋め込まれた古いバンドルを再生し続ける。
# コードを直したのに挙動が変わらないときは、Metroのログに
# `Android Bundled ...` / `iOS Bundled ...` が出ているかを見て、出ていなければこれを実行する。
# 端末が繋がっていない側は失敗するが、動作に影響しないため無視する。
# iOSシミュレータはアプリが起動していないと「"headaches-log" で開きますか？」の確認が出るので、
# その場合は「開く」をタップする（起動中ならそのまま繋ぎ直る）
reconnect-native:
	-$(ADB) reverse tcp:$(METRO_PORT) tcp:$(METRO_PORT)
	-$(ADB) shell am start -a android.intent.action.VIEW \
		-d "$(SCHEME)://expo-development-client/?url=http%3A%2F%2Flocalhost%3A$(METRO_PORT)"
	-xcrun simctl openurl booted "$(SCHEME)://expo-development-client/?url=http://localhost:$(METRO_PORT)"

# ネイティブ確認環境の終了（Metro停止 + adb reverse解除 + エミュレータ終了）
down-native:
	-pkill -f "expo start --dev-client"
	-$(ADB) reverse --remove tcp:$(METRO_PORT)
	-for s in $$($(ADB) devices | awk '/^emulator-/ {print $$1}'); do $(ADB) -s $$s emu kill; done

# up-webで起動したWebコンテナの停止
down-web:
	docker compose down

# Supabaseローカル環境の起動/停止
up-db:
	npx supabase start

down-db:
	npx supabase stop

# Postgres側マイグレーション適用（ローカルSQLite側はアプリ起動時に自動実行）
migrate-db:
	npx supabase db push

studio-db:
	npx supabase status

lint:
	npx expo lint

typecheck:
	npx tsc --noEmit

test:
	npx jest
