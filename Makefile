.PHONY: setup dev-web dev-native down db-up db-down db-migrate db-studio lint typecheck test

# 初回セットアップ: 依存関係インストール + .env雛形 + Supabaseローカル環境起動
setup:
	npm install
	[ -f .env ] || cp .env.example .env
	npx supabase start

# Web開発サーバー（docker compose）
dev-web:
	docker compose up --build web

# iOS/Androidの開発ビルド起動（ホスト側で実行。EAS dev client前提）
dev-native:
	npx expo start --dev-client

# dev-webで起動したWebコンテナの停止
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
