CREATE TABLE `catalog_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`license_url` text,
	`review_months` text DEFAULT '[6,12]' NOT NULL,
	`last_successful_sync_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`source_count` integer DEFAULT 0 NOT NULL,
	`upserted_count` integer DEFAULT 0 NOT NULL,
	`deactivated_count` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `catalog_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `catalog_sync_runs_source_idx` ON `catalog_sync_runs` (`source_id`);--> statement-breakpoint
CREATE TABLE `policy_catalog_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_id` text NOT NULL,
	`source_catalog_service_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_catalog_service_id`) REFERENCES `source_catalog_services`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policy_catalog_mappings_pair_unique` ON `policy_catalog_mappings` (`policy_id`,`source_catalog_service_id`);--> statement-breakpoint
CREATE TABLE `source_catalog_services` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`source_service_id` text NOT NULL,
	`name` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`support_type` text,
	`target_text` text,
	`criteria_text` text,
	`benefit_text` text,
	`application_method` text,
	`deadline_text` text,
	`detail_url` text,
	`online_application_url` text,
	`required_documents` text,
	`provider_code` text,
	`provider_name` text NOT NULL,
	`provider_type` text,
	`department_name` text,
	`audience_type` text,
	`service_field` text,
	`receiving_agency` text,
	`phone` text,
	`view_count` integer,
	`scope` text NOT NULL,
	`condition_codes` text DEFAULT '[]' NOT NULL,
	`legal_basis` text DEFAULT '[]' NOT NULL,
	`raw_payload` text NOT NULL,
	`content_hash` text NOT NULL,
	`catalog_level` text DEFAULT 'search_only' NOT NULL,
	`source_registered_at` text,
	`source_modified_at` text,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `catalog_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_catalog_services_source_service_unique` ON `source_catalog_services` (`source_id`,`source_service_id`);--> statement-breakpoint
CREATE INDEX `source_catalog_services_name_idx` ON `source_catalog_services` (`name`);--> statement-breakpoint
CREATE INDEX `source_catalog_services_provider_idx` ON `source_catalog_services` (`provider_name`);--> statement-breakpoint
CREATE INDEX `source_catalog_services_field_idx` ON `source_catalog_services` (`service_field`);--> statement-breakpoint
CREATE INDEX `source_catalog_services_active_idx` ON `source_catalog_services` (`is_active`);
--> statement-breakpoint
INSERT INTO `catalog_sources` (`id`, `name`, `base_url`, `license_url`, `review_months`)
VALUES (
	'gov24',
	'행정안전부 대한민국 공공서비스(혜택) 정보',
	'https://api.odcloud.kr/api/gov24/v3',
	'https://www.data.go.kr/data/15113968/openapi.do',
	'[6,12]'
);
