-- 頭痛の種類マスタのシード。
-- Supabase 側（supabase/migrations/20260824000000_init_schema.sql）は serial で
-- 片頭痛→緊張型→群発→その他 の順に 1..4 が採番されるため、id を明示して一致させる。
INSERT OR IGNORE INTO `headache_types` (`id`, `name`) VALUES
  (1, '片頭痛'),
  (2, '緊張型'),
  (3, '群発'),
  (4, 'その他');
