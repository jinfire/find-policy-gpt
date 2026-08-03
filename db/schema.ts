import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { ConditionNode } from "../packages/shared/src";
import type { Gov24EligibilityProfile } from "../packages/policy-catalog/src/eligibility";

const auditColumns = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const catalogSources = sqliteTable("catalog_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  licenseUrl: text("license_url"),
  reviewMonths: text("review_months", { mode: "json" })
    .$type<number[]>()
    .notNull()
    .default([6, 12]),
  lastSuccessfulSyncAt: text("last_successful_sync_at"),
  ...auditColumns,
});

export const catalogSyncRuns = sqliteTable(
  "catalog_sync_runs",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => catalogSources.id),
    status: text("status", {
      enum: ["running", "completed", "failed"],
    })
      .notNull()
      .default("running"),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
    sourceCount: integer("source_count").notNull().default(0),
    upsertedCount: integer("upserted_count").notNull().default(0),
    deactivatedCount: integer("deactivated_count").notNull().default(0),
    errorMessage: text("error_message"),
    ...auditColumns,
  },
  (table) => [index("catalog_sync_runs_source_idx").on(table.sourceId)],
);

export const sourceCatalogServices = sqliteTable(
  "source_catalog_services",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => catalogSources.id),
    sourceServiceId: text("source_service_id").notNull(),
    name: text("name").notNull(),
    summary: text("summary").notNull().default(""),
    supportType: text("support_type"),
    targetText: text("target_text"),
    criteriaText: text("criteria_text"),
    benefitText: text("benefit_text"),
    applicationMethod: text("application_method"),
    deadlineText: text("deadline_text"),
    detailUrl: text("detail_url"),
    onlineApplicationUrl: text("online_application_url"),
    requiredDocuments: text("required_documents"),
    providerCode: text("provider_code"),
    providerName: text("provider_name").notNull(),
    providerType: text("provider_type"),
    departmentName: text("department_name"),
    audienceType: text("audience_type"),
    serviceField: text("service_field"),
    receivingAgency: text("receiving_agency"),
    phone: text("phone"),
    viewCount: integer("view_count"),
    scope: text("scope", { enum: ["national", "regional"] }).notNull(),
    conditionCodes: text("condition_codes", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    eligibilityProfile: text("eligibility_profile", { mode: "json" })
      .$type<Gov24EligibilityProfile>()
      .notNull()
      .default({
        genders: [],
        medianIncomeBands: [],
        personalConditionCodes: [],
        householdConditionCodes: [],
        businessStatusCodes: [],
        businessIndustryCodes: [],
        organizationTypeCodes: [],
        organizationIndustryCodes: [],
      }),
    legalBasis: text("legal_basis", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    rawPayload: text("raw_payload", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    contentHash: text("content_hash").notNull(),
    catalogLevel: text("catalog_level", {
      enum: ["search_only", "partially_structured", "rule_ready"],
    })
      .notNull()
      .default("search_only"),
    sourceRegisteredAt: text("source_registered_at"),
    sourceModifiedAt: text("source_modified_at"),
    firstSeenAt: text("first_seen_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("source_catalog_services_source_service_unique").on(
      table.sourceId,
      table.sourceServiceId,
    ),
    index("source_catalog_services_name_idx").on(table.name),
    index("source_catalog_services_provider_idx").on(table.providerName),
    index("source_catalog_services_field_idx").on(table.serviceField),
    index("source_catalog_services_active_idx").on(table.isActive),
  ],
);

export const policies = sqliteTable(
  "policies",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    officialName: text("official_name").notNull(),
    summary: text("summary").notNull(),
    policyType: text("policy_type", {
      enum: ["grant", "voucher", "loan", "service"],
    }).notNull(),
    scope: text("scope", { enum: ["national", "regional"] })
      .notNull()
      .default("national"),
    providerName: text("provider_name").notNull(),
    status: text("status", {
      enum: ["draft", "review", "active", "expired", "suspended"],
    })
      .notNull()
      .default("draft"),
    catalogLevel: text("catalog_level", {
      enum: ["search_only", "partially_structured", "rule_ready"],
    })
      .notNull()
      .default("search_only"),
    canonicalPolicyId: text("canonical_policy_id"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("policies_slug_unique").on(table.slug),
    index("policies_status_idx").on(table.status),
  ],
);

export const policyVersions = sqliteTable(
  "policy_versions",
  {
    id: text("id").primaryKey(),
    policyId: text("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    eligibilityRule: text("eligibility_rule", { mode: "json" })
      .$type<ConditionNode>()
      .notNull(),
    benefit: text("benefit", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    application: text("application", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    requiredDocuments: text("required_documents", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    notes: text("notes"),
    reviewStatus: text("review_status", {
      enum: ["draft", "reviewed", "published"],
    })
      .notNull()
      .default("draft"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: text("reviewed_at"),
    publishedAt: text("published_at"),
    contentHash: text("content_hash").notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("policy_versions_policy_no_unique").on(
      table.policyId,
      table.versionNo,
    ),
    index("policy_versions_effective_idx").on(
      table.effectiveFrom,
      table.effectiveTo,
    ),
  ],
);

export const policySources = sqliteTable(
  "policy_sources",
  {
    id: text("id").primaryKey(),
    policyId: text("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    sourceType: text("source_type", {
      enum: ["agency", "law", "portal", "notice", "api"],
    }).notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    publisher: text("publisher").notNull(),
    retrievedAt: text("retrieved_at").notNull(),
    lastVerifiedAt: text("last_verified_at").notNull(),
    rawSnapshotPath: text("raw_snapshot_path"),
    contentHash: text("content_hash").notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" })
      .notNull()
      .default(false),
    sourceServiceId: text("source_service_id"),
    ...auditColumns,
  },
  (table) => [index("policy_sources_policy_idx").on(table.policyId)],
);

export const policyCatalogMappings = sqliteTable(
  "policy_catalog_mappings",
  {
    id: text("id").primaryKey(),
    policyId: text("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    sourceCatalogServiceId: text("source_catalog_service_id")
      .notNull()
      .references(() => sourceCatalogServices.id, { onDelete: "cascade" }),
    relationType: text("relation_type", {
      enum: ["primary", "variant", "related"],
    }).notNull(),
    verifiedAt: text("verified_at"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("policy_catalog_mappings_pair_unique").on(
      table.policyId,
      table.sourceCatalogServiceId,
    ),
  ],
);

export const inputFieldDefinitions = sqliteTable("input_field_definitions", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  dataType: text("data_type", {
    enum: ["date", "number", "boolean", "enum", "string"],
  }).notNull(),
  unit: text("unit"),
  enumValues: text("enum_values", { mode: "json" }).$type<string[]>(),
  sensitivity: text("sensitivity", {
    enum: ["normal", "personal", "sensitive"],
  }).notNull(),
  questionTemplate: text("question_template").notNull(),
  validationSchema: text("validation_schema", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull(),
  derivedFrom: text("derived_from", { mode: "json" }).$type<string[]>(),
  ...auditColumns,
});

export const regionClassifications = sqliteTable(
  "region_classifications",
  {
    id: text("id").primaryKey(),
    sidoCode: text("sido_code").notNull(),
    sigunguCode: text("sigungu_code"),
    classification: text("classification", {
      enum: [
        "capital",
        "non_capital",
        "population_decline_priority",
        "population_decline_special",
        "rural_non_capital",
      ],
    }).notNull(),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    sourceId: text("source_id"),
    ...auditColumns,
  },
  (table) => [
    index("region_classifications_code_idx").on(
      table.sidoCode,
      table.sigunguCode,
    ),
  ],
);

export const policyChangeEvents = sqliteTable(
  "policy_change_events",
  {
    id: text("id").primaryKey(),
    policyId: text("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    sourceId: text("source_id").references(() => policySources.id, {
      onDelete: "set null",
    }),
    previousHash: text("previous_hash"),
    currentHash: text("current_hash").notNull(),
    changeSummary: text("change_summary"),
    detectedAt: text("detected_at").notNull(),
    reviewStatus: text("review_status", {
      enum: ["pending", "accepted", "rejected"],
    })
      .notNull()
      .default("pending"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: text("reviewed_at"),
    ...auditColumns,
  },
  (table) => [index("policy_change_events_review_idx").on(table.reviewStatus)],
);

export const policyErrorReports = sqliteTable(
  "policy_error_reports",
  {
    id: text("id").primaryKey(),
    policyId: text("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    reporterEmailHash: text("reporter_email_hash"),
    category: text("category", {
      enum: ["outdated", "broken_link", "wrong_eligibility", "other"],
    }).notNull(),
    message: text("message").notNull(),
    status: text("status", {
      enum: ["open", "reviewing", "resolved", "rejected"],
    })
      .notNull()
      .default("open"),
    resolutionNote: text("resolution_note"),
    resolvedAt: text("resolved_at"),
    ...auditColumns,
  },
  (table) => [index("policy_error_reports_status_idx").on(table.status)],
);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  emailHash: text("email_hash").notNull(),
  ...auditColumns,
});

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  encryptedPayload: text("encrypted_payload").notNull(),
  encryptionVersion: integer("encryption_version").notNull().default(1),
  consentedAt: text("consented_at").notNull(),
  ...auditColumns,
});

export const matchRuns = sqliteTable("match_runs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  profileFingerprint: text("profile_fingerprint").notNull(),
  policyVersionIds: text("policy_version_ids", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const matchResults = sqliteTable(
  "match_results",
  {
    id: text("id").primaryKey(),
    matchRunId: text("match_run_id")
      .notNull()
      .references(() => matchRuns.id, { onDelete: "cascade" }),
    policyVersionId: text("policy_version_id")
      .notNull()
      .references(() => policyVersions.id),
    status: text("status", {
      enum: ["eligible", "needs_review", "unlikely"],
    }).notNull(),
    reasons: text("reasons", { mode: "json" }).$type<string[]>().notNull(),
    missingFields: text("missing_fields", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("match_results_run_idx").on(table.matchRunId)],
);
