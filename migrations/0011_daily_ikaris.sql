CREATE TABLE `guestbook` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`user_id` text,
	`nickname` text,
	`root_id` integer,
	`reply_to_user_id` text,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`root_id`) REFERENCES `guestbook`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reply_to_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `guestbook_root_created_idx` ON `guestbook` (`root_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `guestbook_user_created_idx` ON `guestbook` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `guestbook_status_created_idx` ON `guestbook` (`status`,`created_at`);