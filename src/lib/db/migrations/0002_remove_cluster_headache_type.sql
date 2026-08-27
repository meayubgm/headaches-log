-- 頭痛の種類マスタから「群発」（id=3）を削除し、片頭痛 / 緊張型 / その他 の3種類にする。
-- 一般ユーザーが自己判断しづらい選択肢を外して、記録時の迷いを減らすため。
-- 「その他」は id=4 のまま据え置く（Supabase 側 serial の採番と id を一致させる方針を維持）。
-- 参照している紐付けを先に外してから本体を消す。
DELETE FROM `headache_headache_types` WHERE `headache_type_id` = 3;
--> statement-breakpoint
DELETE FROM `headache_types` WHERE `id` = 3;
