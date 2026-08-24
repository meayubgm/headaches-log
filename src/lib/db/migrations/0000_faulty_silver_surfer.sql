CREATE TABLE `headache_headache_types` (
	`headache_id` text NOT NULL,
	`headache_type_id` integer NOT NULL,
	PRIMARY KEY(`headache_id`, `headache_type_id`),
	FOREIGN KEY (`headache_id`) REFERENCES `headaches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`headache_type_id`) REFERENCES `headache_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `headache_tags` (
	`headache_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`headache_id`, `tag_id`),
	FOREIGN KEY (`headache_id`) REFERENCES `headaches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `headache_types` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `headache_types_name_unique` ON `headache_types` (`name`);--> statement-breakpoint
CREATE TABLE `headaches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`pain_level` integer NOT NULL,
	`memo` text,
	`deleted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`_dirty` integer DEFAULT 1 NOT NULL,
	`_synced_at` text
);
--> statement-breakpoint
CREATE TABLE `sync_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`_dirty` integer DEFAULT 1 NOT NULL,
	`_synced_at` text
);
