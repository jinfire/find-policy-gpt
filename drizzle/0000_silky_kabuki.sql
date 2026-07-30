CREATE TABLE `input_field_definitions` (
	`code` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`data_type` text NOT NULL,
	`unit` text,
	`enum_values` text,
	`sensitivity` text NOT NULL,
	`question_template` text NOT NULL,
	`validation_schema` text NOT NULL,
	`derived_from` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `match_results` (
	`id` text PRIMARY KEY NOT NULL,
	`match_run_id` text NOT NULL,
	`policy_version_id` text NOT NULL,
	`status` text NOT NULL,
	`reasons` text NOT NULL,
	`missing_fields` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`match_run_id`) REFERENCES `match_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`policy_version_id`) REFERENCES `policy_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `match_results_run_idx` ON `match_results` (`match_run_id`);--> statement-breakpoint
CREATE TABLE `match_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`profile_fingerprint` text NOT NULL,
	`policy_version_ids` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `policies` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`official_name` text NOT NULL,
	`summary` text NOT NULL,
	`policy_type` text NOT NULL,
	`scope` text DEFAULT 'national' NOT NULL,
	`provider_name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`catalog_level` text DEFAULT 'search_only' NOT NULL,
	`canonical_policy_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policies_slug_unique` ON `policies` (`slug`);--> statement-breakpoint
CREATE INDEX `policies_status_idx` ON `policies` (`status`);--> statement-breakpoint
CREATE TABLE `policy_change_events` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_id` text NOT NULL,
	`source_id` text,
	`previous_hash` text,
	`current_hash` text NOT NULL,
	`change_summary` text,
	`detected_at` text NOT NULL,
	`review_status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `policy_sources`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `policy_change_events_review_idx` ON `policy_change_events` (`review_status`);--> statement-breakpoint
CREATE TABLE `policy_error_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_id` text NOT NULL,
	`reporter_email_hash` text,
	`category` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution_note` text,
	`resolved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `policy_error_reports_status_idx` ON `policy_error_reports` (`status`);--> statement-breakpoint
CREATE TABLE `policy_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_id` text NOT NULL,
	`source_type` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`publisher` text NOT NULL,
	`retrieved_at` text NOT NULL,
	`last_verified_at` text NOT NULL,
	`raw_snapshot_path` text,
	`content_hash` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`source_service_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `policy_sources_policy_idx` ON `policy_sources` (`policy_id`);--> statement-breakpoint
CREATE TABLE `policy_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_id` text NOT NULL,
	`version_no` integer NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`eligibility_rule` text NOT NULL,
	`benefit` text NOT NULL,
	`application` text NOT NULL,
	`required_documents` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`review_status` text DEFAULT 'draft' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`published_at` text,
	`content_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policy_versions_policy_no_unique` ON `policy_versions` (`policy_id`,`version_no`);--> statement-breakpoint
CREATE INDEX `policy_versions_effective_idx` ON `policy_versions` (`effective_from`,`effective_to`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`encrypted_payload` text NOT NULL,
	`encryption_version` integer DEFAULT 1 NOT NULL,
	`consented_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `region_classifications` (
	`id` text PRIMARY KEY NOT NULL,
	`sido_code` text NOT NULL,
	`sigungu_code` text,
	`classification` text NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`source_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `region_classifications_code_idx` ON `region_classifications` (`sido_code`,`sigungu_code`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
--> statement-breakpoint
-- generated-policy-seed
INSERT INTO policies (id, slug, official_name, summary, policy_type, scope, provider_name, status, catalog_level) VALUES ('beotimmok-jeonse', 'beotimmok-jeonse', '버팀목전세자금', '무주택 세대주의 주택 전세자금을 지원합니다.', 'loan', 'national', '주택도시기금', 'active', 'rule_ready');
--> statement-breakpoint
INSERT INTO policy_versions (id, policy_id, version_no, effective_from, effective_to, eligibility_rule, benefit, application, required_documents, review_status, reviewed_at, published_at, content_hash) VALUES ('beotimmok-jeonse-2026-01', 'beotimmok-jeonse', 1, '2026-01-01', NULL, '{"all":[{"field":"isHouseholdHead","label":"세대주 또는 예비 세대주","op":"eq","value":true,"reason":"세대주 조건을 충족한다고 입력했습니다.","question":"현재 세대주이거나 대출 실행 전 세대주가 될 예정인가요?","sourceId":"nhuf-beotimmok"},{"field":"householdHomeCount","label":"세대원 전원 무주택","op":"eq","value":0,"reason":"세대원 전원이 무주택이라고 입력했습니다.","question":"본인과 세대원이 소유한 주택은 모두 몇 채인가요?","sourceId":"nhuf-beotimmok"},{"field":"coupleIncomeAnnual","label":"기본 부부합산 연소득","op":"lte","value":50000000,"reason":"기본 부부합산 소득 기준 이내입니다.","question":"본인과 배우자의 연소득은 각각 얼마인가요?","sourceId":"nhuf-beotimmok"},{"field":"householdNetAssets","label":"부부합산 순자산","op":"lte","value":345000000,"reason":"2026년 순자산 기준 이내입니다.","question":"가구 순자산은 얼마인가요?","sourceId":"nhuf-beotimmok"},{"field":"leaseContract.signed","label":"임대차계약 체결","op":"eq","value":true,"reason":"주택 임대차계약을 체결했습니다.","question":"주택 임대차계약을 체결했나요?","sourceId":"nhuf-beotimmok"},{"field":"leaseContract.depositPaidRatio","label":"보증금 5% 이상 지급","op":"gte","value":5,"reason":"임차보증금의 5% 이상을 지급했습니다.","question":"임차보증금의 몇 %를 지급했나요?","sourceId":"nhuf-beotimmok"}]}', '{"summary":"전세자금 정책대출(지역·가구별 보증금 및 한도는 공식 심사에서 확인)"}', '{"officialUrl":"https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020101.jsp","channels":["기금e든든","수탁은행"],"confirmationRequired":true}', '[]', 'published', '2026-07-30', '2026-07-30', '317f324d2d47a9e5981e10a84579f9f9111b46cbc15f2c19d5a49aefe93fbd38');
--> statement-breakpoint
INSERT INTO policy_sources (id, policy_id, source_type, url, title, publisher, retrieved_at, last_verified_at, content_hash, is_primary) VALUES ('nhuf-beotimmok', 'beotimmok-jeonse', 'agency', 'https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020101.jsp', '버팀목전세자금', '주택도시기금', '2026-07-30', '2026-07-30', '12ba466dd2d5e3110d1d5af44189d43ef1a723349b7cd79f494544fe6d2db1a2', 1);
--> statement-breakpoint
INSERT INTO policies (id, slug, official_name, summary, policy_type, scope, provider_name, status, catalog_level) VALUES ('bogeumjari', 'bogeumjari', '보금자리론', '실수요자의 주택 구입·보전·상환 목적 장기 고정금리 대출입니다.', 'loan', 'national', '한국주택금융공사', 'active', 'rule_ready');
--> statement-breakpoint
INSERT INTO policy_versions (id, policy_id, version_no, effective_from, effective_to, eligibility_rule, benefit, application, required_documents, review_status, reviewed_at, published_at, content_hash) VALUES ('bogeumjari-2026-01', 'bogeumjari', 1, '2026-01-01', NULL, '{"all":[{"field":"isAdult","label":"민법상 성년","op":"eq","value":true,"reason":"민법상 성년입니다.","question":"생년월일은 언제인가요?","sourceId":"hf-bogeumjari"},{"field":"nationalityStatus","label":"대한민국 국민","op":"in","value":["korean","overseas_korean"],"reason":"보금자리론의 국적 범위에 해당합니다.","question":"국적 상태를 알려주세요.","sourceId":"hf-bogeumjari"},{"field":"creditScore","label":"CB점수","op":"gte","value":271,"reason":"공개된 최소 CB점수 기준 이상입니다.","question":"현재 확인 가능한 CB 신용점수는 몇 점인가요?","sourceId":"hf-bogeumjari"},{"field":"householdHomeCountExcludingTarget","label":"담보주택 외 주택 수","op":"lte","value":1,"reason":"담보주택 외 주택 수 기준 범위입니다.","question":"대상주택을 제외하고 가구가 보유한 주택은 몇 채인가요?","sourceId":"hf-bogeumjari"},{"field":"coupleIncomeAnnual","label":"기본 부부합산 연소득","op":"lte","value":70000000,"reason":"기본 부부합산 소득 기준 이내입니다.","question":"본인과 배우자의 연소득은 각각 얼마인가요?","sourceId":"hf-bogeumjari"},{"field":"targetHouse.appraisedPrice","label":"주택가격","op":"lte","value":600000000,"reason":"공개된 주택가격 기준 이내입니다.","question":"대상주택의 가격은 얼마인가요?","sourceId":"hf-bogeumjari"}]}', '{"summary":"장기 고정금리 주택담보대출(실제 금리·LTV·DTI·한도는 공식 심사에서 확인)"}', '{"officialUrl":"https://www.hf.go.kr/ko/sub01/sub01_01_01.do","channels":["한국주택금융공사 인터넷금융서비스","취급 금융기관"],"confirmationRequired":true}', '[]', 'published', '2026-07-30', '2026-07-30', 'e2bc42b4db63230adc77bbaf026b5940fef57cd241bb82350e87dca57cdb6a1a');
--> statement-breakpoint
INSERT INTO policy_sources (id, policy_id, source_type, url, title, publisher, retrieved_at, last_verified_at, content_hash, is_primary) VALUES ('hf-bogeumjari', 'bogeumjari', 'agency', 'https://www.hf.go.kr/ko/sub01/sub01_01_01.do', '보금자리론', '한국주택금융공사', '2026-07-30', '2026-07-30', 'd43d94d84d1ee37fc6c651cabf3640a16c369c2e54dab29319b59f4c78db8a86', 1);
--> statement-breakpoint
INSERT INTO policies (id, slug, official_name, summary, policy_type, scope, provider_name, status, catalog_level) VALUES ('child-allowance', 'child-allowance', '아동수당', '만 9세 미만 아동에게 지역에 따라 매월 수당을 지급합니다.', 'grant', 'national', '보건복지부', 'active', 'rule_ready');
--> statement-breakpoint
INSERT INTO policy_versions (id, policy_id, version_no, effective_from, effective_to, eligibility_rule, benefit, application, required_documents, review_status, reviewed_at, published_at, content_hash) VALUES ('child-allowance-2026-03', 'child-allowance', 1, '2026-03-20', NULL, '{"all":[{"field":"youngestChildAgeMonths","label":"만 9세 미만 아동","op":"lte","value":107,"reason":"만 9세 미만 자녀가 있습니다.","question":"자녀의 생년월일은 언제인가요?","sourceId":"mohw-child-allowance"},{"field":"youngestChildNationalityStatus","label":"아동 국적","op":"in","value":["korean","dual","refugee"],"reason":"아동 국적이 공식 지원 범위에 해당합니다.","question":"해당 자녀의 국적 상태를 알려주세요.","sourceId":"mohw-child-allowance"},{"field":"youngestChildResidentRegistered","label":"주민등록","op":"eq","value":true,"reason":"아동의 주민등록 상태가 확인됐습니다.","question":"해당 자녀의 주민등록이 완료됐나요?","sourceId":"mohw-child-allowance"}]}', '{"summary":"아동 1인당 월 10만~13만 원(지역 구분과 지급수단에 따라 다름)"}', '{"officialUrl":"https://www.mohw.go.kr/menu.es?mid=a10711030100","channels":["복지로","읍면동 주민센터"],"confirmationRequired":true}', '[]', 'published', '2026-07-30', '2026-07-30', '4e9b15dad3918b8759a7f29c1b5255a0f04a8e0c484d6c8050cb9c678fbe5e70');
--> statement-breakpoint
INSERT INTO policy_sources (id, policy_id, source_type, url, title, publisher, retrieved_at, last_verified_at, content_hash, is_primary) VALUES ('mohw-child-allowance', 'child-allowance', 'agency', 'https://www.mohw.go.kr/menu.es?mid=a10711030100', '아동수당 지급', '보건복지부', '2026-07-30', '2026-07-30', 'dc9b90bda612503f7949886732b38e6bbab0df4713d15add71c11ee1049339b9', 1);
--> statement-breakpoint
INSERT INTO policies (id, slug, official_name, summary, policy_type, scope, provider_name, status, catalog_level) VALUES ('didimdol', 'didimdol', '내집마련 디딤돌대출', '무주택 서민·실수요자의 주택 구입자금을 지원합니다.', 'loan', 'national', '주택도시기금', 'active', 'rule_ready');
--> statement-breakpoint
INSERT INTO policy_versions (id, policy_id, version_no, effective_from, effective_to, eligibility_rule, benefit, application, required_documents, review_status, reviewed_at, published_at, content_hash) VALUES ('didimdol-2026-01', 'didimdol', 1, '2026-01-01', NULL, '{"all":[{"field":"isAdult","label":"민법상 성년","op":"eq","value":true,"reason":"민법상 성년입니다.","question":"생년월일은 언제인가요?","sourceId":"nhuf-didimdol"},{"field":"isHouseholdHead","label":"세대주","op":"eq","value":true,"reason":"세대주 조건을 충족한다고 입력했습니다.","question":"현재 세대주인가요?","sourceId":"nhuf-didimdol"},{"field":"householdHomeCount","label":"세대원 전원 무주택","op":"eq","value":0,"reason":"세대원 전원이 무주택이라고 입력했습니다.","question":"본인과 세대원이 소유한 주택은 모두 몇 채인가요?","sourceId":"nhuf-didimdol"},{"any":[{"field":"coupleIncomeAnnual","label":"기본 부부합산 연소득","op":"lte","value":60000000,"reason":"기본 부부합산 소득 기준 이내입니다.","question":"본인과 배우자의 연소득은 각각 얼마인가요?","sourceId":"nhuf-didimdol"},{"all":[{"field":"isNewlywedWithin7Years","label":"신혼가구","op":"eq","value":true,"reason":"혼인 7년 이내 신혼가구입니다.","question":"혼인신고일은 언제인가요?","sourceId":"nhuf-didimdol"},{"field":"coupleIncomeAnnual","label":"신혼가구 부부합산 연소득","op":"lte","value":85000000,"reason":"신혼가구 완화 소득 기준 이내입니다.","question":"본인과 배우자의 연소득은 각각 얼마인가요?","sourceId":"nhuf-didimdol"}]},{"all":[{"field":"minorChildCount","label":"2자녀 이상","op":"gte","value":2,"reason":"미성년 자녀가 2명 이상입니다.","question":"미성년 자녀가 몇 명인가요?","sourceId":"nhuf-didimdol"},{"field":"coupleIncomeAnnual","label":"2자녀 가구 부부합산 연소득","op":"lte","value":70000000,"reason":"2자녀 이상 가구 완화 소득 기준 이내입니다.","question":"본인과 배우자의 연소득은 각각 얼마인가요?","sourceId":"nhuf-didimdol"}]}]},{"field":"householdNetAssets","label":"부부합산 순자산","op":"lte","value":511000000,"reason":"2026년 순자산 기준 이내입니다.","question":"가구 순자산은 얼마인가요?","sourceId":"nhuf-didimdol"},{"any":[{"field":"targetHouse.appraisedPrice","label":"기본 대상주택 평가액","op":"lte","value":500000000,"reason":"기본 대상주택 평가액 기준 이내입니다.","question":"구입할 주택의 평가액은 얼마인가요?","sourceId":"nhuf-didimdol"},{"all":[{"any":[{"field":"isNewlywedWithin7Years","label":"신혼가구","op":"eq","value":true,"reason":"혼인 7년 이내 신혼가구입니다.","question":"혼인신고일은 언제인가요?","sourceId":"nhuf-didimdol"},{"field":"minorChildCount","label":"2자녀 이상","op":"gte","value":2,"reason":"미성년 자녀가 2명 이상입니다.","question":"미성년 자녀가 몇 명인가요?","sourceId":"nhuf-didimdol"}]},{"field":"targetHouse.appraisedPrice","label":"우대가구 대상주택 평가액","op":"lte","value":600000000,"reason":"신혼·2자녀 이상 가구의 주택 평가액 기준 이내입니다.","question":"구입할 주택의 평가액은 얼마인가요?","sourceId":"nhuf-didimdol"}]}]}]}', '{"summary":"주택 구입자금 정책대출(가구 특성별 완화 기준과 실제 한도는 공식 심사에서 확인)"}', '{"officialUrl":"https://nhuf.molit.go.kr/FP/FP05/FP0503/FP05030101.jsp","channels":["기금e든든","수탁은행"],"confirmationRequired":true}', '[]', 'published', '2026-07-30', '2026-07-30', '27bbc76bdacb39e943f6ad28f58d45ff05641b37cf075a891afa91a564776cb5');
--> statement-breakpoint
INSERT INTO policy_sources (id, policy_id, source_type, url, title, publisher, retrieved_at, last_verified_at, content_hash, is_primary) VALUES ('nhuf-didimdol', 'didimdol', 'agency', 'https://nhuf.molit.go.kr/FP/FP05/FP0503/FP05030101.jsp', '내집마련 디딤돌대출', '주택도시기금', '2026-07-30', '2026-07-30', '898da564cbba5444be9eb3a278b1af83036fa3bdc6034d0f0bd850369c54cea8', 1);
--> statement-breakpoint
INSERT INTO policies (id, slug, official_name, summary, policy_type, scope, provider_name, status, catalog_level) VALUES ('first-meeting-voucher', 'first-meeting-voucher', '첫만남이용권', '출생아에게 첫 양육비용을 국민행복카드 바우처로 지원합니다.', 'voucher', 'national', '보건복지부', 'active', 'rule_ready');
--> statement-breakpoint
INSERT INTO policy_versions (id, policy_id, version_no, effective_from, effective_to, eligibility_rule, benefit, application, required_documents, review_status, reviewed_at, published_at, content_hash) VALUES ('first-meeting-voucher-2026-01', 'first-meeting-voucher', 1, '2026-01-01', NULL, '{"all":[{"field":"youngestChildAgeMonths","label":"출생 후 2년 이내","op":"lte","value":23,"reason":"출생 후 2년이 지나지 않은 자녀가 있습니다.","question":"가장 어린 자녀의 생년월일은 언제인가요?","sourceId":"bokjiro-first-meeting"},{"field":"youngestChildResidentRegistered","label":"출생신고 및 주민등록","op":"eq","value":true,"reason":"자녀가 출생신고되어 주민등록번호를 부여받았습니다.","question":"해당 자녀는 출생신고와 주민등록이 완료됐나요?","sourceId":"bokjiro-first-meeting"}]}', '{"summary":"첫째 200만 원, 둘째 이상 300만 원 상당의 1회 바우처"}', '{"officialUrl":"https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004656&wlfareInfoReldBztpCd=01","channels":["복지로","정부24","읍면동 행정복지센터"],"confirmationRequired":true}', '[]', 'published', '2026-07-30', '2026-07-30', 'fbf9d3762338bfdd9854c4a129435e9796f85c43475a9e38dc29eaee60cca3e9');
--> statement-breakpoint
INSERT INTO policy_sources (id, policy_id, source_type, url, title, publisher, retrieved_at, last_verified_at, content_hash, is_primary) VALUES ('bokjiro-first-meeting', 'first-meeting-voucher', 'agency', 'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004656&wlfareInfoReldBztpCd=01', '첫만남이용권', '복지로', '2026-07-30', '2026-07-30', '554ebbc07e85cf898e7f0dde022ffdfa4f033197ed8c306ff9d4630635d43e7c', 1);
--> statement-breakpoint
INSERT INTO policies (id, slug, official_name, summary, policy_type, scope, provider_name, status, catalog_level) VALUES ('national-employment-support', 'national-employment-support', '국민취업지원제도', '구직자에게 취업지원서비스와 유형별 생계·활동비를 지원합니다.', 'service', 'national', '고용노동부', 'active', 'rule_ready');
--> statement-breakpoint
INSERT INTO policy_versions (id, policy_id, version_no, effective_from, effective_to, eligibility_rule, benefit, application, required_documents, review_status, reviewed_at, published_at, content_hash) VALUES ('national-employment-support-2026-01', 'national-employment-support', 1, '2026-01-01', NULL, '{"all":[{"field":"jobSeeking","label":"구직 의사","op":"eq","value":true,"reason":"현재 취업을 원하고 있어 취업지원 대상 검토가 가능합니다.","question":"현재 취업을 원하고 있나요?","sourceId":"work24-kua"},{"field":"age","label":"참여 연령","op":"between","value":[15,69],"reason":"국민취업지원제도 참여 연령 범위에 해당합니다.","question":"생년월일은 언제인가요?","sourceId":"work24-kua"},{"any":[{"field":"age","label":"청년 연령","op":"between","value":[15,34],"reason":"청년 대상 Ⅱ유형은 소득·재산과 관계없이 검토할 수 있습니다.","question":"생년월일은 언제인가요?","sourceId":"work24-kua"},{"field":"householdMedianIncomeRatio","label":"중장년 가구소득","op":"lte","value":100,"reason":"중장년 Ⅱ유형의 기준 중위소득 조건 범위입니다.","question":"가구소득은 기준 중위소득의 몇 %인가요?","sourceId":"work24-kua"}]}]}', '{"summary":"취업지원서비스, 유형에 따라 구직촉진수당 또는 취업활동비용"}', '{"officialUrl":"https://www.work24.go.kr/ua/z/z/1300/selectEmssRqutIntro.do","channels":["고용24","고용복지플러스센터"],"confirmationRequired":true}', '[]', 'published', '2026-07-30', '2026-07-30', 'eb66686865a585f30219514192239a85fa50da84aaa22c340a507b6d50082643');
--> statement-breakpoint
INSERT INTO policy_sources (id, policy_id, source_type, url, title, publisher, retrieved_at, last_verified_at, content_hash, is_primary) VALUES ('work24-kua', 'national-employment-support', 'agency', 'https://www.work24.go.kr/ua/z/z/1300/selectEmssRqutIntro.do', '국민취업지원제도 취업지원신청', '고용24', '2026-07-30', '2026-07-30', 'cb630839c14817a172c3d0c96e96d8ec957022445e9ae3ac80c193eb2e441fc7', 1);
--> statement-breakpoint
INSERT INTO policies (id, slug, official_name, summary, policy_type, scope, provider_name, status, catalog_level) VALUES ('newborn-special-didimdol', 'newborn-special-didimdol', '신생아 특례 디딤돌대출', '최근 출산·입양한 무주택 가구의 주택 구입자금을 지원합니다.', 'loan', 'national', '주택도시기금', 'active', 'rule_ready');
--> statement-breakpoint
INSERT INTO policy_versions (id, policy_id, version_no, effective_from, effective_to, eligibility_rule, benefit, application, required_documents, review_status, reviewed_at, published_at, content_hash) VALUES ('newborn-special-didimdol-2026-01', 'newborn-special-didimdol', 1, '2026-01-01', NULL, '{"all":[{"field":"isAdult","label":"민법상 성년","op":"eq","value":true,"reason":"민법상 성년입니다.","question":"생년월일은 언제인가요?","sourceId":"nhuf-newborn-didimdol"},{"field":"isHouseholdHead","label":"세대주","op":"eq","value":true,"reason":"세대주 조건을 충족한다고 입력했습니다.","question":"현재 세대주인가요?","sourceId":"nhuf-newborn-didimdol"},{"field":"hasChildBornWithin2Years","label":"접수일 기준 2년 내 출산·입양","op":"eq","value":true,"reason":"최근 2년 내 출산·입양한 가구입니다.","question":"최근 2년 내 출산하거나 입양한 자녀가 있나요?","sourceId":"nhuf-newborn-didimdol"},{"field":"householdHomeCount","label":"세대원 전원 무주택","op":"eq","value":0,"reason":"세대원 전원이 무주택이라고 입력했습니다.","question":"본인과 세대원이 소유한 주택은 모두 몇 채인가요?","sourceId":"nhuf-newborn-didimdol"},{"any":[{"field":"coupleIncomeAnnual","label":"기본 부부합산 연소득","op":"lte","value":130000000,"reason":"기본 부부합산 소득 기준 이내입니다.","question":"본인과 배우자의 연소득은 각각 얼마인가요?","sourceId":"nhuf-newborn-didimdol"},{"all":[{"field":"isDualIncome","label":"맞벌이","op":"eq","value":true,"reason":"부부가 모두 소득이 있는 맞벌이 가구입니다.","question":"본인과 배우자 모두 소득이 있나요?","sourceId":"nhuf-newborn-didimdol"},{"field":"coupleIncomeAnnual","label":"맞벌이 합산 연소득","op":"lte","value":200000000,"reason":"맞벌이 합산 소득 기준 이내입니다.","question":"본인과 배우자의 연소득은 각각 얼마인가요?","sourceId":"nhuf-newborn-didimdol"},{"field":"applicantIncomeAnnual","label":"신청인 연소득","op":"lte","value":130000000,"reason":"신청인 개인소득 기준 이내입니다.","question":"본인의 연소득은 얼마인가요?","sourceId":"nhuf-newborn-didimdol"},{"field":"spouseIncomeAnnual","label":"배우자 연소득","op":"lte","value":130000000,"reason":"배우자 개인소득 기준 이내입니다.","question":"배우자의 연소득은 얼마인가요?","sourceId":"nhuf-newborn-didimdol"}]}]},{"field":"householdNetAssets","label":"부부합산 순자산","op":"lte","value":511000000,"reason":"2026년 순자산 기준 이내입니다.","question":"가구의 부동산·금융자산에서 부채를 뺀 순자산은 얼마인가요?","sourceId":"nhuf-newborn-didimdol"}]}', '{"summary":"주택 구입자금 정책대출(금리·한도는 공식 심사에서 확인)"}', '{"officialUrl":"https://nhuf.molit.go.kr/FP/FP05/FP0503/FP05030801.jsp","channels":["기금e든든","수탁은행"],"confirmationRequired":true}', '[]', 'published', '2026-07-30', '2026-07-30', '92887ec0ae7c21420b4832210438cc052d219de09de19af3fe117cb375f38aed');
--> statement-breakpoint
INSERT INTO policy_sources (id, policy_id, source_type, url, title, publisher, retrieved_at, last_verified_at, content_hash, is_primary) VALUES ('nhuf-newborn-didimdol', 'newborn-special-didimdol', 'agency', 'https://nhuf.molit.go.kr/FP/FP05/FP0503/FP05030801.jsp', '신생아 특례 디딤돌대출', '주택도시기금', '2026-07-30', '2026-07-30', 'a33eed4368c38fa0d9c750b7bed6930ff6f9d7ac798deb7c212eee932665bfec', 1);
--> statement-breakpoint
INSERT INTO policies (id, slug, official_name, summary, policy_type, scope, provider_name, status, catalog_level) VALUES ('newlywed-jeonse', 'newlywed-jeonse', '신혼부부전용 전세자금', '혼인 7년 이내 또는 결혼 예정인 무주택 가구의 전세자금을 지원합니다.', 'loan', 'national', '주택도시기금', 'active', 'rule_ready');
--> statement-breakpoint
INSERT INTO policy_versions (id, policy_id, version_no, effective_from, effective_to, eligibility_rule, benefit, application, required_documents, review_status, reviewed_at, published_at, content_hash) VALUES ('newlywed-jeonse-2026-01', 'newlywed-jeonse', 1, '2026-01-01', NULL, '{"all":[{"any":[{"field":"isNewlywedWithin7Years","label":"혼인 7년 이내","op":"eq","value":true,"reason":"혼인기간이 7년 이내입니다.","question":"혼인신고일은 언제인가요?","sourceId":"nhuf-newlywed-jeonse"},{"field":"plannedMarriageWithin3Months","label":"3개월 이내 결혼 예정","op":"eq","value":true,"reason":"3개월 이내 결혼 예정입니다.","question":"결혼 예정일은 언제인가요?","sourceId":"nhuf-newlywed-jeonse"}]},{"field":"isHouseholdHead","label":"세대주 또는 예비 세대주","op":"eq","value":true,"reason":"세대주 조건을 충족한다고 입력했습니다.","question":"현재 세대주이거나 대출 실행 전 세대주가 될 예정인가요?","sourceId":"nhuf-newlywed-jeonse"},{"field":"householdHomeCount","label":"세대원 전원 무주택","op":"eq","value":0,"reason":"세대원 전원이 무주택이라고 입력했습니다.","question":"본인과 세대원이 소유한 주택은 모두 몇 채인가요?","sourceId":"nhuf-newlywed-jeonse"},{"field":"coupleIncomeAnnual","label":"부부합산 연소득","op":"lte","value":75000000,"reason":"신혼부부 부부합산 소득 기준 이내입니다.","question":"본인과 배우자의 연소득은 각각 얼마인가요?","sourceId":"nhuf-newlywed-jeonse"},{"field":"householdNetAssets","label":"부부합산 순자산","op":"lte","value":345000000,"reason":"2026년 순자산 기준 이내입니다.","question":"가구 순자산은 얼마인가요?","sourceId":"nhuf-newlywed-jeonse"},{"field":"leaseContract.signed","label":"임대차계약 체결","op":"eq","value":true,"reason":"주택 임대차계약을 체결했습니다.","question":"주택 임대차계약을 체결했나요?","sourceId":"nhuf-newlywed-jeonse"}]}', '{"summary":"신혼부부 전세자금 정책대출(실제 금리·한도는 공식 심사에서 확인)"}', '{"officialUrl":"https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020401.jsp","channels":["기금e든든","수탁은행"],"confirmationRequired":true}', '[]', 'published', '2026-07-30', '2026-07-30', '3befd4dfcae2caf165457ab623292b9e9507c9c20db119b84e22e1ab8d39a7eb');
--> statement-breakpoint
INSERT INTO policy_sources (id, policy_id, source_type, url, title, publisher, retrieved_at, last_verified_at, content_hash, is_primary) VALUES ('nhuf-newlywed-jeonse', 'newlywed-jeonse', 'agency', 'https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020401.jsp', '신혼부부전용 전세자금', '주택도시기금', '2026-07-30', '2026-07-30', '38b08b1ea144e8b8cd23b4833d1e0e5e85f9aedd97e3c9b633fe716f04edbd53', 1);
--> statement-breakpoint
INSERT INTO policies (id, slug, official_name, summary, policy_type, scope, provider_name, status, catalog_level) VALUES ('parent-benefit', 'parent-benefit', '부모급여', '0~1세 아동 가정에 현금 또는 보육료 형태로 매월 지원합니다.', 'grant', 'national', '보건복지부', 'active', 'rule_ready');
--> statement-breakpoint
INSERT INTO policy_versions (id, policy_id, version_no, effective_from, effective_to, eligibility_rule, benefit, application, required_documents, review_status, reviewed_at, published_at, content_hash) VALUES ('parent-benefit-2026-01', 'parent-benefit', 1, '2026-01-01', NULL, '{"all":[{"field":"youngestChildAgeMonths","label":"0~23개월 아동","op":"lte","value":23,"reason":"0~23개월 자녀가 있어 부모급여 연령 조건에 해당합니다.","question":"가장 어린 자녀의 생년월일은 언제인가요?","sourceId":"bokjiro-parent-benefit"},{"field":"youngestChildNationalityStatus","label":"아동 국적","op":"in","value":["korean","dual","refugee"],"reason":"아동 국적이 공식 지원 범위에 해당합니다.","question":"해당 자녀의 국적 상태를 알려주세요.","sourceId":"bokjiro-parent-benefit"},{"field":"youngestChildResidentRegistered","label":"주민등록","op":"eq","value":true,"reason":"아동의 주민등록 상태가 확인됐습니다.","question":"해당 자녀의 주민등록이 완료됐나요?","sourceId":"bokjiro-parent-benefit"}]}', '{"summary":"만 0세 월 100만 원, 만 1세 월 50만 원(보육서비스 이용 시 지급 방식 조정)"}', '{"officialUrl":"https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004657&wlfareInfoReldBztpCd=01","channels":["복지로","정부24","읍면동 행정복지센터"],"confirmationRequired":true}', '[]', 'published', '2026-07-30', '2026-07-30', '698b741fab0d8f6bde20f4e3c39c79d79c46504d96d14862a2b2a3d06d821d77');
--> statement-breakpoint
INSERT INTO policy_sources (id, policy_id, source_type, url, title, publisher, retrieved_at, last_verified_at, content_hash, is_primary) VALUES ('bokjiro-parent-benefit', 'parent-benefit', 'agency', 'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004657&wlfareInfoReldBztpCd=01', '부모급여', '복지로', '2026-07-30', '2026-07-30', '29cbccb6a662e812ec0409c02ebe13ef81a0eded3a6b217c8913c3df8a7d102d', 1);
--> statement-breakpoint
INSERT INTO policies (id, slug, official_name, summary, policy_type, scope, provider_name, status, catalog_level) VALUES ('youth-beotimmok', 'youth-beotimmok', '청년전용 버팀목전세자금', '만 19~34세 무주택 청년 세대주의 전세자금을 지원합니다.', 'loan', 'national', '주택도시기금', 'active', 'rule_ready');
--> statement-breakpoint
INSERT INTO policy_versions (id, policy_id, version_no, effective_from, effective_to, eligibility_rule, benefit, application, required_documents, review_status, reviewed_at, published_at, content_hash) VALUES ('youth-beotimmok-2026-01', 'youth-beotimmok', 1, '2026-01-01', NULL, '{"all":[{"field":"age","label":"만 19~34세","op":"between","value":[19,34],"reason":"청년전용 버팀목의 연령 범위에 해당합니다.","question":"생년월일은 언제인가요?","sourceId":"nhuf-youth-beotimmok"},{"field":"isHouseholdHead","label":"세대주 또는 예비 세대주","op":"eq","value":true,"reason":"세대주 조건을 충족한다고 입력했습니다.","question":"현재 세대주이거나 대출 실행 전 세대주가 될 예정인가요?","sourceId":"nhuf-youth-beotimmok"},{"field":"householdHomeCount","label":"세대원 전원 무주택","op":"eq","value":0,"reason":"세대원 전원이 무주택이라고 입력했습니다.","question":"본인과 세대원이 소유한 주택은 모두 몇 채인가요?","sourceId":"nhuf-youth-beotimmok"},{"field":"coupleIncomeAnnual","label":"기본 부부합산 연소득","op":"lte","value":50000000,"reason":"기본 부부합산 소득 기준 이내입니다.","question":"본인과 배우자의 연소득은 각각 얼마인가요?","sourceId":"nhuf-youth-beotimmok"},{"field":"householdNetAssets","label":"부부합산 순자산","op":"lte","value":345000000,"reason":"2026년 순자산 기준 이내입니다.","question":"가구 순자산은 얼마인가요?","sourceId":"nhuf-youth-beotimmok"},{"field":"leaseContract.deposit","label":"임차보증금","op":"lte","value":300000000,"reason":"임차보증금 기준 이내입니다.","question":"임차보증금은 얼마인가요?","sourceId":"nhuf-youth-beotimmok"}]}', '{"summary":"청년 전세자금 정책대출(실제 금리·한도는 공식 심사에서 확인)"}', '{"officialUrl":"https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020301.jsp","channels":["기금e든든","수탁은행"],"confirmationRequired":true}', '[]', 'published', '2026-07-30', '2026-07-30', '1627c37e763bfa2e8ec7b1ec920b3584d659a5ae49a74d7b12b0d86e92f9c0f3');
--> statement-breakpoint
INSERT INTO policy_sources (id, policy_id, source_type, url, title, publisher, retrieved_at, last_verified_at, content_hash, is_primary) VALUES ('nhuf-youth-beotimmok', 'youth-beotimmok', 'agency', 'https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020301.jsp', '청년전용 버팀목전세자금', '주택도시기금', '2026-07-30', '2026-07-30', 'eb9368b3216ea3961d5468532f926fc387ea4497c069e459c867731c092023cc', 1);
--> statement-breakpoint
