-- 頭痛の種類マスタから表示名（日本語）を外し、言語非依存のコードに置き換える。
-- 表示名は端末の言語に応じてクライアント（src/lib/i18n）が解決するため、DB は言語を持たない。
-- ローカルSQLite側のマイグレーション 0003 と対になる変更。
alter table headache_types rename column name to code;

-- 列名を変えても UNIQUE 制約の名前は追従しないので揃える
alter table headache_types rename constraint headache_types_name_key to headache_types_code_key;

update headache_types set code = 'migraine' where id = 1;
update headache_types set code = 'tension' where id = 2;
update headache_types set code = 'other' where id = 4;
