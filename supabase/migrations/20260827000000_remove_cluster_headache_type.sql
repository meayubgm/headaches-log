-- 頭痛の種類マスタから「群発」を削除し、片頭痛 / 緊張型 / その他 の3種類にする。
-- ローカルSQLite側のマイグレーション 0002 と対になる変更。
-- 「その他」は id=4 のまま据え置き、再採番はしない（ローカルと id を一致させるため）。
delete from headache_headache_types
  where headache_type_id = (select id from headache_types where name = '群発');

delete from headache_types where name = '群発';
