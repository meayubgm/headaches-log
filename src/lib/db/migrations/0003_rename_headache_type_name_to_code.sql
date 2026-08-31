-- 頭痛の種類マスタから表示名（日本語）を外し、言語非依存のコードに置き換える。
-- 表示名は端末の言語に応じて src/lib/i18n が解決するため、DB は言語を持たない。
-- UNIQUE 索引は列名に紐づくので張り直す。
DROP INDEX IF EXISTS `headache_types_name_unique`;--> statement-breakpoint
ALTER TABLE `headache_types` RENAME COLUMN `name` TO `code`;--> statement-breakpoint
UPDATE `headache_types` SET `code` = 'migraine' WHERE `id` = 1;--> statement-breakpoint
UPDATE `headache_types` SET `code` = 'tension' WHERE `id` = 2;--> statement-breakpoint
UPDATE `headache_types` SET `code` = 'other' WHERE `id` = 4;--> statement-breakpoint
CREATE UNIQUE INDEX `headache_types_code_unique` ON `headache_types` (`code`);
