.PHONY: setup build up-native down-native emu-up down db-up db-down db-migrate db-studio lint typecheck test

# ネイティブ開発用の設定（環境に合わせて上書き可能）
ANDROID_HOME ?= $(HOME)/Library/Android/sdk
ADB := $(ANDROID_HOME)/platform-tools/adb
EMULATOR := $(ANDROID_HOME)/emulator/emulator
AVD ?= Pixel_9
METRO_PORT ?= 8081

# 初回セットアップ: 依存関係インストール + .env雛形 + Supabaseローカル環境起動
setup:
	npm install
	[ -f .env ] || cp .env.example .env
	npx supabase start

# Web開発サーバー（docker compose）
build:
	docker compose up --build web

# Androidエミュレータをバックグラウンド起動（AVD=<名前> で切り替え）
emu-up:
	$(EMULATOR) -avd $(AVD) > /dev/null 2>&1 &

# iOS/AndroidのMetro起動（ホスト側で実行。開発ビルドを端末に入れてあることが前提）
# adb reverse は端末が繋がっていない場合に失敗するが、動作に影響しないため無視する
up-native:
	-$(ADB) reverse tcp:$(METRO_PORT) tcp:$(METRO_PORT)
	npx expo start --dev-client --port $(METRO_PORT)

# ネイティブ確認環境の終了（Metro停止 + adb reverse解除 + エミュレータ終了）
down-native:
	-pkill -f "expo start --dev-client"
	-$(ADB) reverse --remove tcp:$(METRO_PORT)
	-for s in $$($(ADB) devices | awk '/^emulator-/ {print $$1}'); do $(ADB) -s $$s emu kill; done

# buildで起動したWebコンテナの停止
down:
	docker compose down

# Supabaseローカル環境の起動/停止
db-up:
	npx supabase start

db-down:
	npx supabase stop

# Postgres側マイグレーション適用（ローカルSQLite側はアプリ起動時に自動実行）
db-migrate:
	npx supabase db push

db-studio:
	npx supabase status

lint:
	npx expo lint

typecheck:
	npx tsc --noEmit

test:
	npx jest
